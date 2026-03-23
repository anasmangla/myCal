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
        grid=context['grid'],
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
        event_id = form.get('event_id', type=int)
        title = (form.get('title') or '').strip()
        start_date = datetime.strptime(form['start_date'], '%Y-%m-%d').date()
        end_date = datetime.strptime(form['end_date'], '%Y-%m-%d').date()
        all_day = form.get('all_day') == 'on'
        start_time = datetime.strptime(form['start_time'], '%H:%M').time() if form.get('start_time') else None
        end_time = datetime.strptime(form['end_time'], '%H:%M').time() if form.get('end_time') else None
        recurrence_type = form.get('recurrence_type', 'none')
        recurrence_weekdays = ','.join(request.form.getlist('recurrence_weekdays')) if recurrence_type == 'weekly' else ''
        span_days = (end_date - start_date).days + 1

        if not title:
            raise ValueError('Title is required.')
        if end_date < start_date:
            raise ValueError('End date cannot be before start date.')
        if recurrence_type == 'none' and span_days > 10:
            raise ValueError('Multi-day events cannot exceed 10 days.')

        event = Event.query.get(event_id) if event_id else Event()
        if not event_id:
            db.session.add(event)

        event.title = title
        event.start_date = start_date
        event.end_date = end_date
        event.start_time = None if all_day else start_time
        event.end_time = None if all_day else end_time
        event.all_day = all_day
        event.location = (form.get('location') or '').strip() or None
        event.audience = form.get('audience', 'Unspecified')
        event.notes = (form.get('notes') or '').strip() or None
        event.recurrence_type = recurrence_type
        event.recurrence_weekdays = recurrence_weekdays

        db.session.flush()
        EventDayLabel.query.filter_by(event_id=event.id).delete()

        for key, value in form.items():
            if not key.startswith('label_'):
                continue
            label_text = value.strip()
            if not label_text:
                continue
            offset = int(key.split('_', 1)[1])
            db.session.add(EventDayLabel(event_id=event.id, day_offset=offset, label=label_text))

        db.session.commit()
        flash('Event saved.', 'success')
    except ValueError as exc:
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
    day = datetime.strptime(request.form['day'], '%Y-%m-%d').date()
    color = request.form['background_color']
    style = DateStyle.query.filter_by(day=day).first()
    if style:
        style.background_color = color
    else:
        db.session.add(DateStyle(day=day, background_color=color))
    db.session.commit()
    return jsonify({'status': 'ok'})


@bp.post('/date-style/clear')
def clear_date_style():
    day = datetime.strptime(request.form['day'], '%Y-%m-%d').date()
    style = DateStyle.query.filter_by(day=day).first()
    if style:
        db.session.delete(style)
        db.session.commit()
    return jsonify({'status': 'ok'})


def _return_url():
    year = request.form.get('return_year')
    month = request.form.get('return_month')
    holidays = request.form.get('return_holidays', '1')
    return url_for('calendar.index', year=year, month=month, holidays=holidays)
