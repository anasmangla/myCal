from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import date, datetime, time

from werkzeug.datastructures import ImmutableMultiDict

from .calendar_utils import AUDIENCE_CHOICES, RECURRENCE_CHOICES

MAX_MULTI_DAY_SPAN = 10
MAX_TITLE_LENGTH = 200
MAX_LOCATION_LENGTH = 200
MAX_NOTES_LENGTH = 5000
VALID_WEEKDAY_VALUES = {str(index) for index in range(7)}


class ValidationError(ValueError):
    """Raised when submitted event data is invalid."""


@dataclass
class EventMonthScope:
    year: int
    month: int

    @property
    def start(self) -> date:
        return date(self.year, self.month, 1)

    @property
    def end(self) -> date:
        return date(self.year, self.month, calendar.monthrange(self.year, self.month)[1])


@dataclass
class EventPayload:
    event_id: int | None
    title: str
    start_date: date
    end_date: date
    start_time: time | None
    end_time: time | None
    all_day: bool
    location: str | None
    audience: str
    notes: str | None
    recurrence_type: str
    recurrence_weekdays: str
    labels: dict[int, str]


def parse_iso_date(raw_value: str | None, field_name: str) -> date:
    if not raw_value:
        raise ValidationError(f'{field_name} is required.')
    try:
        return datetime.strptime(raw_value, '%Y-%m-%d').date()
    except ValueError as exc:
        raise ValidationError(f'{field_name} must use YYYY-MM-DD format.') from exc


def parse_hhmm_time(raw_value: str | None, field_name: str) -> time | None:
    if not raw_value:
        return None
    try:
        return datetime.strptime(raw_value, '%H:%M').time()
    except ValueError as exc:
        raise ValidationError(f'{field_name} must use HH:MM format.') from exc


def sanitize_optional_text(raw_value: str | None, *, max_length: int) -> str | None:
    value = (raw_value or '').strip()
    if not value:
        return None
    if len(value) > max_length:
        raise ValidationError(f'Value cannot exceed {max_length} characters.')
    return value


def parse_month_scope(form: ImmutableMultiDict[str, str]) -> EventMonthScope:
    year = form.get('return_year', type=int)
    month = form.get('return_month', type=int)
    if year is None or month is None or not 1 <= month <= 12:
        raise ValidationError('Choose a valid calendar month before saving an event.')
    return EventMonthScope(year=year, month=month)


def parse_event_form(form: ImmutableMultiDict[str, str]) -> EventPayload:
    month_scope = parse_month_scope(form)
    title = (form.get('title') or '').strip()
    start_date = parse_iso_date(form.get('start_date'), 'Start date')
    end_date = parse_iso_date(form.get('end_date'), 'End date')
    recurrence_type = (form.get('recurrence_type') or 'none').strip().lower()
    all_day = form.get('all_day') == 'on'
    selected_weekdays = [item for item in form.getlist('recurrence_weekdays') if item in VALID_WEEKDAY_VALUES]

    payload = EventPayload(
        event_id=form.get('event_id', type=int),
        title=title,
        start_date=start_date,
        end_date=end_date,
        start_time=None if all_day else parse_hhmm_time(form.get('start_time'), 'Start time'),
        end_time=None if all_day else parse_hhmm_time(form.get('end_time'), 'End time'),
        all_day=all_day,
        location=sanitize_optional_text(form.get('location'), max_length=MAX_LOCATION_LENGTH),
        audience=(form.get('audience') or 'Unspecified').strip(),
        notes=sanitize_optional_text(form.get('notes'), max_length=MAX_NOTES_LENGTH),
        recurrence_type=recurrence_type,
        recurrence_weekdays=','.join(selected_weekdays) if recurrence_type == 'weekly' else '',
        labels=parse_day_labels(form),
    )
    validate_event_payload(payload, month_scope, raw_weekday_count=len(form.getlist('recurrence_weekdays')))
    return payload


def parse_day_labels(form: ImmutableMultiDict[str, str]) -> dict[int, str]:
    labels: dict[int, str] = {}
    for key, value in form.items():
        if not key.startswith('label_'):
            continue
        label_text = value.strip()
        if not label_text:
            continue
        try:
            offset = int(key.split('_', 1)[1])
        except (IndexError, ValueError) as exc:
            raise ValidationError('Invalid custom day label.') from exc
        if offset < 0 or len(label_text) > MAX_TITLE_LENGTH:
            raise ValidationError('Custom day labels must be short and tied to a valid event day.')
        labels[offset] = label_text
    return labels


def validate_event_payload(payload: EventPayload, month_scope: EventMonthScope, *, raw_weekday_count: int) -> None:
    if not payload.title:
        raise ValidationError('Title is required.')
    if len(payload.title) > MAX_TITLE_LENGTH:
        raise ValidationError(f'Title cannot exceed {MAX_TITLE_LENGTH} characters.')
    if payload.end_date < payload.start_date:
        raise ValidationError('End date cannot be before start date.')
    if payload.start_date < month_scope.start or payload.start_date > month_scope.end:
        raise ValidationError('Events must start within the selected month.')
    if payload.end_date < month_scope.start or payload.end_date > month_scope.end:
        raise ValidationError('Events must end within the selected month.')
    if payload.audience not in AUDIENCE_CHOICES:
        raise ValidationError('Choose a valid audience.')
    if payload.recurrence_type not in RECURRENCE_CHOICES:
        raise ValidationError('Choose a valid recurrence option.')

    span_days = event_span_days(payload.start_date, payload.end_date)
    if payload.recurrence_type == 'none' and span_days > MAX_MULTI_DAY_SPAN:
        raise ValidationError(f'Multi-day events cannot exceed {MAX_MULTI_DAY_SPAN} days.')

    if not payload.all_day and payload.start_time and payload.end_time and payload.end_time < payload.start_time:
        raise ValidationError('End time cannot be earlier than start time for the same day.')

    if payload.recurrence_type == 'weekly':
        if raw_weekday_count == 0:
            raise ValidationError('Choose at least one weekday for a weekly recurring event.')
        if not payload.recurrence_weekdays:
            raise ValidationError('One or more selected recurrence weekdays were invalid.')
    elif raw_weekday_count:
        raise ValidationError('Weekly recurrence weekdays can only be used with weekly recurring events.')

    for offset in payload.labels:
        if offset >= span_days:
            raise ValidationError('Custom day labels must stay within the event date range.')


def event_span_days(start_date: date, end_date: date) -> int:
    return (end_date - start_date).days + 1
