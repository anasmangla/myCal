from __future__ import annotations

import calendar
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

import holidays

from .models import DateStyle, Event

AUDIENCE_COLORS = {
    'Lajna': '#b03060',
    'Nasirat': '#f4a6c1',
    'Ansar': '#1d4e89',
    'Khuddam': '#1f3a5f',
    'Atfal': '#75b8ff',
    'Tahir Academy': '#2f855a',
    'All': '#1f2937',
    'Unspecified': '#4b5563',
}

AUDIENCE_CHOICES = [
    'All',
    'Ansar',
    'Khuddam',
    'Atfal',
    'Nasirat',
    'Lajna',
    'Tahir Academy',
    'Unspecified',
]

RECURRENCE_CHOICES = ['none', 'daily', 'weekly']
WEEKDAY_CHOICES = [
    ('0', 'Sunday'),
    ('1', 'Monday'),
    ('2', 'Tuesday'),
    ('3', 'Wednesday'),
    ('4', 'Thursday'),
    ('5', 'Friday'),
    ('6', 'Saturday'),
]
MONTH_NAMES = list(calendar.month_name)[1:]


@dataclass
class Occurrence:
    event_id: str
    source_event_id: int | None
    date: date
    title: str
    label: str
    display_text: str
    start_time: str | None
    end_time: str | None
    all_day: bool
    audience: str
    color: str
    location: str | None
    notes: str | None
    is_holiday: bool = False


def first_visible_month(today: date | None = None) -> tuple[int, int]:
    today = today or date.today()
    year = today.year + (1 if today.month == 12 else 0)
    month = 1 if today.month == 12 else today.month + 1
    return year, month


def month_bounds(year: int, month: int) -> tuple[date, date]:
    _, last_day = calendar.monthrange(year, month)
    return date(year, month, 1), date(year, month, last_day)


def build_month_grid(year: int, month: int) -> list[list[date]]:
    cal = calendar.Calendar(firstweekday=6)
    days = list(cal.itermonthdates(year, month))
    return [days[index:index + 7] for index in range(0, len(days), 7)]


def format_time(value: time | None) -> str | None:
    if value is None:
        return None
    text = value.strftime('%I:%M%p').lower()
    return text.lstrip('0')


def build_display_text(label: str, start_time: time | None, location: str | None, all_day: bool) -> str:
    prefix = 'All Day' if all_day or start_time is None else format_time(start_time)
    if location:
        return f'{prefix} {label} @ {location}'
    return f'{prefix} {label}'


def event_label_map(event: Event) -> dict[int, str]:
    return {item.day_offset: item.label for item in event.day_labels}


def expand_event_occurrences(events: list[Event], visible_start: date, visible_end: date) -> dict[date, list[Occurrence]]:
    grouped: dict[date, list[Occurrence]] = defaultdict(list)

    for event in events:
        custom_labels = event_label_map(event)
        if event.recurrence_type == 'none':
            span_days = (event.end_date - event.start_date).days + 1
            for offset in range(span_days):
                current_day = event.start_date + timedelta(days=offset)
                if current_day < visible_start or current_day > visible_end:
                    continue
                label = custom_labels.get(offset, f'Day {offset + 1}: {event.title}' if span_days > 1 else event.title)
                grouped[current_day].append(
                    Occurrence(
                        event_id=f'event-{event.id}-{current_day.isoformat()}',
                        source_event_id=event.id,
                        date=current_day,
                        title=event.title,
                        label=label,
                        display_text=build_display_text(label, event.start_time, event.location, event.all_day),
                        start_time=format_time(event.start_time),
                        end_time=format_time(event.end_time),
                        all_day=event.all_day,
                        audience=event.audience,
                        color=AUDIENCE_COLORS.get(event.audience, AUDIENCE_COLORS['Unspecified']),
                        location=event.location,
                        notes=event.notes,
                    )
                )
        elif event.recurrence_type == 'daily':
            current_day = max(event.start_date, visible_start)
            while current_day <= min(event.end_date, visible_end):
                grouped[current_day].append(
                    Occurrence(
                        event_id=f'event-{event.id}-{current_day.isoformat()}',
                        source_event_id=event.id,
                        date=current_day,
                        title=event.title,
                        label=event.title,
                        display_text=build_display_text(event.title, event.start_time, event.location, event.all_day),
                        start_time=format_time(event.start_time),
                        end_time=format_time(event.end_time),
                        all_day=event.all_day,
                        audience=event.audience,
                        color=AUDIENCE_COLORS.get(event.audience, AUDIENCE_COLORS['Unspecified']),
                        location=event.location,
                        notes=event.notes,
                    )
                )
                current_day += timedelta(days=1)
        elif event.recurrence_type == 'weekly':
            weekdays = {int(item) for item in (event.recurrence_weekdays or '').split(',') if item != ''}
            current_day = max(event.start_date, visible_start)
            while current_day <= min(event.end_date, visible_end):
                mapped_weekday = (current_day.weekday() + 1) % 7
                if mapped_weekday in weekdays:
                    grouped[current_day].append(
                        Occurrence(
                            event_id=f'event-{event.id}-{current_day.isoformat()}',
                            source_event_id=event.id,
                            date=current_day,
                            title=event.title,
                            label=event.title,
                            display_text=build_display_text(event.title, event.start_time, event.location, event.all_day),
                            start_time=format_time(event.start_time),
                            end_time=format_time(event.end_time),
                            all_day=event.all_day,
                            audience=event.audience,
                            color=AUDIENCE_COLORS.get(event.audience, AUDIENCE_COLORS['Unspecified']),
                            location=event.location,
                            notes=event.notes,
                        )
                    )
                current_day += timedelta(days=1)

    for day, items in grouped.items():
        items.sort(key=lambda item: (item.all_day, item.start_time or '99:99', item.title))
    return grouped


def get_us_holidays(year: int, month: int) -> dict[date, str]:
    start, end = month_bounds(year, month)
    us_holidays = holidays.US(years=[year])
    return {day: name for day, name in us_holidays.items() if start <= day <= end}


def detect_long_weekends(holiday_map: dict[date, str]) -> set[date]:
    highlighted = set()
    for holiday_day in holiday_map:
        weekday = holiday_day.weekday()
        if weekday == 0:
            highlighted.update({holiday_day - timedelta(days=2), holiday_day - timedelta(days=1), holiday_day})
        elif weekday == 4:
            highlighted.update({holiday_day, holiday_day + timedelta(days=1), holiday_day + timedelta(days=2)})
    return highlighted


def month_context(year: int, month: int, include_holidays: bool) -> dict:
    start, end = month_bounds(year, month)
    grid = build_month_grid(year, month)
    visible_start = grid[0][0]
    visible_end = grid[-1][-1]
    holiday_map = get_us_holidays(year, month) if include_holidays else {}
    long_weekends = detect_long_weekends(holiday_map) if include_holidays else set()
    styles = {style.day.isoformat(): style.background_color for style in DateStyle.query.all()}
    events = Event.query.filter(Event.end_date >= visible_start, Event.start_date <= visible_end).all()
    occurrences = expand_event_occurrences(events, visible_start, visible_end)

    if include_holidays:
        for holiday_day, name in holiday_map.items():
            occurrences.setdefault(holiday_day, []).insert(
                0,
                Occurrence(
                    event_id=f'holiday-{holiday_day.isoformat()}',
                    source_event_id=None,
                    date=holiday_day,
                    title=name,
                    label=name,
                    display_text=f'All Day {name}',
                    start_time=None,
                    end_time=None,
                    all_day=True,
                    audience='All',
                    color='#7c3aed',
                    location=None,
                    notes='U.S. federal holiday',
                    is_holiday=True,
                ),
            )

    return {
        'grid': grid,
        'visible_start': visible_start,
        'visible_end': visible_end,
        'holiday_map': holiday_map,
        'long_weekends': {day.isoformat() for day in long_weekends},
        'styles': styles,
        'occurrences': {day.isoformat(): [item.__dict__ for item in items] for day, items in occurrences.items()},
        'month_name': MONTH_NAMES[month - 1],
    }
