from __future__ import annotations

import json
from datetime import date, datetime, timedelta
from io import BytesIO

from flask import Blueprint, flash, jsonify, redirect, render_template, request, send_file, url_for

from . import db
from .calendar_utils import (
    AUDIENCE_COLORS,
    AUDIENCE_CHOICES,
    MONTH_NAMES,
    RECURRENCE_CHOICES,
    WEEKDAY_CHOICES,
    day_in_weekly_pattern,
    first_visible_month,
    month_context,
)
from .event_utils import ValidationError, parse_event_form
from .models import DateStyle, Event, EventDayLabel

bp = Blueprint('calendar', __name__)


@bp.get('/')
def index():
    default_year, default_month = first_visible_month()
    month_year = (request.args.get('month_year') or '').strip()
    if month_year:
        try:
            parsed_year, parsed_month = month_year.split('-', 1)
            year = int(parsed_year)
            month = int(parsed_month)
        except (TypeError, ValueError):
            year, month = default_year, default_month
    else:
        year = request.args.get('year', default=default_year, type=int)
        month = request.args.get('month', default=default_month, type=int)

    today = date.today().replace(day=1)
    min_month = _add_months(today, -6)
    max_month = _add_months(today, 12)
    try:
        selected_month_date = date(year, month, 1)
    except ValueError:
        year, month = default_year, default_month
        selected_month_date = date(year, month, 1)
    if selected_month_date < min_month or selected_month_date > max_month:
        year, month = default_year, default_month
        selected_month_date = date(year, month, 1)

    include_holidays = request.args.get('holidays', '1') == '1'
    islamic_mode = (request.args.get('islamic', 'partial') or 'partial').strip().lower()
    if islamic_mode not in {'off', 'full', 'partial'}:
        islamic_mode = 'partial'
    include_islamic = islamic_mode != 'off'
    context = month_context(year, month, include_holidays)
    selected_month_start = date(year, month, 1)
    selected_month_end = _add_months(selected_month_start, 1) - timedelta(days=1)
    month_year_options = []
    cursor = min_month
    while cursor <= max_month:
        month_year_options.append(
            {
                'value': f'{cursor.year}-{cursor.month:02d}',
                'label': cursor.strftime('%B %Y'),
            }
        )
        cursor = _add_months(cursor, 1)

    return render_template(
        'index.html',
        selected_year=year,
        selected_month=month,
        selected_month_start=selected_month_start.isoformat(),
        selected_month_end=selected_month_end.isoformat(),
        selected_month_year=f'{selected_month_date.year}-{selected_month_date.month:02d}',
        month_year_options=month_year_options,
        month_names=MONTH_NAMES,
        include_holidays=include_holidays,
        islamic_mode=islamic_mode,
        include_islamic=include_islamic,
        audience_choices=AUDIENCE_CHOICES,
        audience_default_colors=AUDIENCE_COLORS,
        recurrence_choices=RECURRENCE_CHOICES,
        weekday_choices=WEEKDAY_CHOICES,
        event_json=json.dumps(context['occurrences']),
        styles_json=json.dumps(context['styles']),
        holiday_json=json.dumps({key.isoformat(): value for key, value in context['holiday_map'].items()}),
        long_weekend_json=json.dumps(list(context['long_weekends'])),
        week_json=json.dumps(context['weeks']),
        grid=context['grid'],
        weeks=context['weeks'],
        weekday_names=context['weekday_names'],
        month_name=context['month_name'],
    )


def _add_months(value: date, delta_months: int) -> date:
    total_months = (value.year * 12 + (value.month - 1)) + delta_months
    year, month_index = divmod(total_months, 12)
    return date(year, month_index + 1, 1)


def _return_month_bounds() -> tuple[date, date] | None:
    try:
        year = int((request.form.get('return_year') or '').strip())
        month = int((request.form.get('return_month') or '').strip())
        month_start = date(year, month, 1)
    except (TypeError, ValueError):
        return None

    next_month = _add_months(month_start, 1)
    month_end = next_month - timedelta(days=1)
    return month_start, month_end


@bp.get('/api/event/<int:event_id>')
def get_event(event_id: int):
    event = Event.query.get_or_404(event_id)
    labels = {label.day_offset: label.label for label in event.day_labels}
    return jsonify(
        {
            'id': event.id,
            'title': event.title,
            'start_date': event.start_date.isoformat(),
            'end_date': event.end_date.isoformat(),
            'start_time': event.start_time.strftime('%H:%M') if event.start_time else '',
            'end_time': event.end_time.strftime('%H:%M') if event.end_time else '',
            'all_day': event.all_day,
            'location': event.location or '',
            'audience': event.audience,
            'notes': event.notes or '',
            'color': event.color or '',
            'recurrence_type': event.recurrence_type,
            'recurrence_weekdays': event.recurrence_weekdays or '',
            'labels': labels,
        }
    )


@bp.post('/events/save')
def save_event():
    form = request.form
    try:
        payload = parse_event_form(form)
        month_bounds = _return_month_bounds()
        if month_bounds is not None:
            month_start, month_end = month_bounds
            if payload.start_date < month_start or payload.end_date > month_end:
                raise ValidationError('Event dates for add/edit must stay within the current month.')

        event = Event.query.get(payload.event_id) if payload.event_id else Event()
        if payload.event_id and event is None:
            raise ValidationError('The event you tried to edit no longer exists.')
        if not payload.event_id:
            db.session.add(event)

        event.title = payload.title
        event.start_date = payload.start_date
        event.end_date = payload.end_date
        event.start_time = payload.start_time
        event.end_time = payload.end_time
        event.all_day = payload.all_day
        event.location = payload.location
        event.audience = payload.audience
        event.notes = payload.notes
        event.color = payload.color
        event.recurrence_type = payload.recurrence_type
        event.recurrence_weekdays = payload.recurrence_weekdays

        db.session.flush()
        EventDayLabel.query.filter_by(event_id=event.id).delete()
        for offset, label_text in payload.labels.items():
            db.session.add(EventDayLabel(event_id=event.id, day_offset=offset, label=label_text))

        db.session.commit()
        flash('Event saved successfully.', 'success')
    except ValidationError as exc:
        db.session.rollback()
        flash(str(exc), 'danger')

    return redirect(_return_url())


@bp.post('/events/delete/<int:event_id>')
def delete_event(event_id: int):
    event = Event.query.get_or_404(event_id)
    delete_mode = (request.form.get('delete_mode') or 'all').strip().lower()
    occurrence_raw = request.form.get('occurrence_date')

    if event.recurrence_type == 'none' or delete_mode != 'single':
        db.session.delete(event)
        db.session.commit()
        flash('Event deleted.', 'success')
        return redirect(_return_url())

    try:
        occurrence_day = _parse_day(occurrence_raw)
    except ValidationError:
        db.session.delete(event)
        db.session.commit()
        flash('Event deleted.', 'success')
        return redirect(_return_url())

    if not _is_valid_occurrence_date(event, occurrence_day):
        flash('The selected recurring occurrence could not be deleted.', 'danger')
        return redirect(_return_url())

    _delete_single_occurrence(event, occurrence_day)
    db.session.commit()
    flash('Recurring event occurrence deleted.', 'success')
    return redirect(_return_url())


@bp.post('/events/duplicate/<int:event_id>')
def duplicate_event(event_id: int):
    source = Event.query.get_or_404(event_id)
    duplicate = _clone_event(source)
    duplicate.title = f'Copy of {source.title}'
    db.session.add(duplicate)
    db.session.commit()
    flash('Event duplicated.', 'success')
    return redirect(_return_url())


@bp.post('/events/move/<int:event_id>')
def move_event(event_id: int):
    event = Event.query.get_or_404(event_id)
    try:
        target_date = _parse_day(request.form.get('target_date'))
        anchor_raw = request.form.get('anchor_date')
        anchor_date = _parse_day(anchor_raw) if anchor_raw else event.start_date
    except ValidationError as exc:
        flash(str(exc), 'danger')
        return redirect(_return_url())

    if event.recurrence_type != 'none' and anchor_raw:
        if not _is_valid_occurrence_date(event, anchor_date):
            flash('The selected recurring occurrence could not be moved.', 'danger')
            return redirect(_return_url())

        moved_event = _clone_event(event)
        moved_event.start_date = target_date
        moved_event.end_date = target_date
        moved_event.recurrence_type = 'none'
        moved_event.recurrence_weekdays = None
        moved_event.day_labels = []
        db.session.add(moved_event)

        _delete_single_occurrence(event, anchor_date)
        db.session.commit()
        flash('Recurring occurrence moved as a standalone event.', 'success')
        return redirect(_return_url())

    delta_days = (target_date - anchor_date).days
    event.start_date = event.start_date + timedelta(days=delta_days)
    event.end_date = event.end_date + timedelta(days=delta_days)
    db.session.commit()
    flash('Event moved.', 'success')
    return redirect(_return_url())


@bp.post('/date-style')
def save_date_style():
    try:
        day = _parse_day(request.form.get('day'))
        color = _validate_color(request.form.get('background_color'))
    except ValidationError as exc:
        return jsonify({'status': 'error', 'message': str(exc)}), 400

    style = DateStyle.query.filter_by(day=day).first()
    if style:
        style.background_color = color
    else:
        db.session.add(DateStyle(day=day, background_color=color))
    db.session.commit()
    return jsonify({'status': 'ok', 'message': 'Date color saved.'})


@bp.post('/date-style/clear')
def clear_date_style():
    try:
        day = _parse_day(request.form.get('day'))
    except ValidationError as exc:
        return jsonify({'status': 'error', 'message': str(exc)}), 400

    style = DateStyle.query.filter_by(day=day).first()
    if style:
        db.session.delete(style)
        db.session.commit()
    return jsonify({'status': 'ok', 'message': 'Custom date color cleared.'})


@bp.get('/data/export')
def export_data():
    events = []
    for event in Event.query.order_by(Event.start_date.asc(), Event.id.asc()).all():
        events.append(
            {
                'title': event.title,
                'start_date': event.start_date.isoformat(),
                'end_date': event.end_date.isoformat(),
                'start_time': event.start_time.strftime('%H:%M') if event.start_time else None,
                'end_time': event.end_time.strftime('%H:%M') if event.end_time else None,
                'all_day': bool(event.all_day),
                'location': event.location,
                'audience': event.audience,
                'notes': event.notes,
                'recurrence_type': event.recurrence_type,
                'recurrence_weekdays': event.recurrence_weekdays,
                'day_labels': [
                    {'day_offset': label.day_offset, 'label': label.label}
                    for label in sorted(event.day_labels, key=lambda item: item.day_offset)
                ],
            }
        )

    styles = [
        {'day': style.day.isoformat(), 'background_color': style.background_color}
        for style in DateStyle.query.order_by(DateStyle.day.asc()).all()
    ]
    payload = {
        'version': 1,
        'exported_at': datetime.utcnow().replace(microsecond=0).isoformat() + 'Z',
        'events': events,
        'date_styles': styles,
    }
    filename = f"mycal-export-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}.json"
    content = json.dumps(payload, indent=2, ensure_ascii=False)
    return send_file(
        BytesIO(content.encode('utf-8')),
        mimetype='application/json',
        as_attachment=True,
        download_name=filename,
    )


@bp.post('/data/import')
def import_data():
    upload = request.files.get('calendar_file')
    if not upload or not upload.filename:
        flash('Please choose a JSON file to import.', 'danger')
        return redirect(_return_url())

    try:
        payload = json.loads(upload.read().decode('utf-8'))
    except (UnicodeDecodeError, json.JSONDecodeError):
        flash('Invalid JSON file. Please upload a valid myCal export file.', 'danger')
        return redirect(_return_url())

    try:
        events_payload = payload.get('events', [])
        styles_payload = payload.get('date_styles', [])
        if not isinstance(events_payload, list) or not isinstance(styles_payload, list):
            raise ValidationError('Import file must contain "events" and "date_styles" arrays.')

        EventDayLabel.query.delete()
        Event.query.delete()
        DateStyle.query.delete()

        for item in events_payload:
            event = _build_event_from_import(item)
            db.session.add(event)

        for style_item in styles_payload:
            style = _build_date_style_from_import(style_item)
            db.session.add(style)

        db.session.commit()
        flash(f'Imported {len(events_payload)} events and {len(styles_payload)} date styles.', 'success')
    except ValidationError as exc:
        db.session.rollback()
        flash(f'Import failed: {exc}', 'danger')

    return redirect(_return_url())


def _parse_day(raw_value: str | None):
    if not raw_value:
        raise ValidationError('Choose a valid calendar date.')
    try:
        return datetime.strptime(raw_value, '%Y-%m-%d').date()
    except ValueError as exc:
        raise ValidationError('Choose a valid calendar date.') from exc


def _parse_optional_time(raw_value):
    value = (raw_value or '').strip()
    if not value:
        return None
    try:
        return datetime.strptime(value, '%H:%M').time()
    except ValueError as exc:
        raise ValidationError(f'Invalid time value: {raw_value}') from exc


def _validate_color(raw_value: str | None) -> str:
    value = (raw_value or '').strip()
    if len(value) != 7 or not value.startswith('#'):
        raise ValidationError('Choose a valid hex color.')
    allowed = set('0123456789abcdefABCDEF')
    if any(char not in allowed for char in value[1:]):
        raise ValidationError('Choose a valid hex color.')
    return value.lower()


def _clone_event(source: Event) -> Event:
    duplicate = Event(
        title=source.title,
        start_date=source.start_date,
        end_date=source.end_date,
        start_time=source.start_time,
        end_time=source.end_time,
        all_day=source.all_day,
        location=source.location,
        audience=source.audience,
        notes=source.notes,
        color=source.color,
        recurrence_type=source.recurrence_type,
        recurrence_weekdays=source.recurrence_weekdays,
    )
    duplicate.day_labels = [
        EventDayLabel(day_offset=label.day_offset, label=label.label)
        for label in source.day_labels
    ]
    return duplicate


def _is_valid_occurrence_date(event: Event, occurrence_day):
    if occurrence_day < event.start_date or occurrence_day > event.end_date:
        return False
    if event.recurrence_type == 'daily':
        return True
    if event.recurrence_type == 'weekly':
        return day_in_weekly_pattern(occurrence_day, event.recurrence_weekdays)
    return False


def _delete_single_occurrence(event: Event, occurrence_day):
    original_end = event.end_date
    before_end = occurrence_day - timedelta(days=1)
    after_start = occurrence_day + timedelta(days=1)

    keep_before = before_end >= event.start_date
    keep_after = after_start <= original_end

    if keep_before and keep_after:
        follow_up = _clone_event(event)
        follow_up.start_date = after_start
        follow_up.end_date = original_end
        event.end_date = before_end
        db.session.add(follow_up)
        return

    if keep_before:
        event.end_date = before_end
        return

    if keep_after:
        event.start_date = after_start
        return

    db.session.delete(event)
def _build_event_from_import(item):
    if not isinstance(item, dict):
        raise ValidationError('Each event must be an object.')

    title = (item.get('title') or '').strip()
    if not title:
        raise ValidationError('Every event must include a title.')

    start_date = _parse_day(item.get('start_date'))
    end_date = _parse_day(item.get('end_date'))
    if end_date < start_date:
        raise ValidationError(f'Event "{title}" has an end date before its start date.')

    recurrence_type = (item.get('recurrence_type') or 'none').strip().lower()
    if recurrence_type not in RECURRENCE_CHOICES:
        raise ValidationError(f'Event "{title}" has an invalid recurrence type: {recurrence_type}.')

    audience = (item.get('audience') or 'Unspecified').strip()
    if audience not in AUDIENCE_CHOICES:
        audience = 'Unspecified'

    recurrence_weekdays = (item.get('recurrence_weekdays') or '').strip()
    if recurrence_weekdays:
        allowed_weekdays = {str(day) for day, _ in WEEKDAY_CHOICES}
        weekdays = {day.strip() for day in recurrence_weekdays.split(',') if day.strip()}
        if any(day not in allowed_weekdays for day in weekdays):
            raise ValidationError(f'Event "{title}" has invalid recurrence weekdays.')
        recurrence_weekdays = ','.join(sorted(weekdays, key=int))

    event = Event(
        title=title[:200],
        start_date=start_date,
        end_date=end_date,
        start_time=_parse_optional_time(item.get('start_time')),
        end_time=_parse_optional_time(item.get('end_time')),
        all_day=bool(item.get('all_day')),
        location=((item.get('location') or '').strip() or None),
        audience=audience,
        notes=((item.get('notes') or '').strip() or None),
        recurrence_type=recurrence_type,
        recurrence_weekdays=recurrence_weekdays or None,
    )

    labels = item.get('day_labels', [])
    if labels and not isinstance(labels, list):
        raise ValidationError(f'Event "{title}" has invalid day_labels data.')
    for label_item in labels:
        if not isinstance(label_item, dict):
            raise ValidationError(f'Event "{title}" has an invalid day label.')
        try:
            offset = int(label_item.get('day_offset'))
        except (TypeError, ValueError) as exc:
            raise ValidationError(f'Event "{title}" has a day label with invalid offset.') from exc
        label_text = (label_item.get('label') or '').strip()
        if not label_text:
            continue
        event.day_labels.append(EventDayLabel(day_offset=offset, label=label_text[:200]))

    return event


def _build_date_style_from_import(item):
    if not isinstance(item, dict):
        raise ValidationError('Each date style must be an object.')
    day = _parse_day(item.get('day'))
    color = _validate_color(item.get('background_color'))
    return DateStyle(day=day, background_color=color)


def _return_url():
    year = request.form.get('return_year')
    month = request.form.get('return_month')
    holidays = request.form.get('return_holidays', '1')
    islamic = request.form.get('return_islamic', 'partial')
    return url_for('calendar.index', year=year, month=month, holidays=holidays, islamic=islamic)
