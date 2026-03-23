from __future__ import annotations

import json
from datetime import datetime

from flask import Blueprint, flash, jsonify, redirect, render_template, request, url_for

from . import db
from .calendar_utils import (
    AUDIENCE_CHOICES,
    MONTH_NAMES,
    RECURRENCE_CHOICES,
    WEEKDAY_CHOICES,
    first_visible_month,
    month_context,
)
from .event_utils import ValidationError, parse_event_form
from .models import DateStyle, Event, EventDayLabel

bp = Blueprint('calendar', __name__)


@bp.get('/')
def index():
    default_year, default_month = first_visible_month()
    year = request.args.get('year', default=default_year, type=int)
    month = request.args.get('month', default=default_month, type=int)
    include_holidays = request.args.get('holidays', '1') == '1'
    context = month_context(year, month, include_holidays)
    years = list(range(default_year - 3, default_year + 8))
    return render_template(
        'index.html',
        selected_year=year,
        selected_month=month,
        years=years,
        month_names=MONTH_NAMES,
        include_holidays=include_holidays,
        audience_choices=AUDIENCE_CHOICES,
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
    db.session.delete(event)
    db.session.commit()
    flash('Event deleted.', 'success')
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

def _parse_day(raw_value: str | None):
    if not raw_value:
        raise ValidationError('Choose a valid calendar date.')
    try:
        return datetime.strptime(raw_value, '%Y-%m-%d').date()
    except ValueError as exc:
        raise ValidationError('Choose a valid calendar date.') from exc

def _validate_color(raw_value: str | None) -> str:
    value = (raw_value or '').strip()
    if len(value) != 7 or not value.startswith('#'):
        raise ValidationError('Choose a valid hex color.')
    allowed = set('0123456789abcdefABCDEF')
    if any(char not in allowed for char in value[1:]):
        raise ValidationError('Choose a valid hex color.')
    return value.lower()



def _return_url():
    year = request.form.get('return_year')
    month = request.form.get('return_month')
    holidays = request.form.get('return_holidays', '1')
    return url_for('calendar.index', year=year, month=month, holidays=holidays)
