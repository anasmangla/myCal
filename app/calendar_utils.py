from __future__ import annotations

import calendar
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, time, timedelta

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
WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
HOLIDAY_NOTE = 'U.S. federal holiday'


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


@dataclass
class CalendarWeek:
    index: int
    days: list[date]
    label: str
    includes_current_month: bool
    start_iso: str
    end_iso: str


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


def build_week_metadata(grid: list[list[date]], month: int) -> list[CalendarWeek]:
    weeks: list[CalendarWeek] = []
    for index, week_days in enumerate(grid):
        in_month_days = [day for day in week_days if day.month == month]
        label_start = in_month_days[0] if in_month_days else week_days[0]
        label_end = in_month_days[-1] if in_month_days else week_days[-1]
        weeks.append(
            CalendarWeek(
                index=index,
                days=week_days,
                label=f"{label_start.strftime('%b %-d')} – {label_end.strftime('%b %-d')}",
                includes_current_month=bool(in_month_days),
                start_iso=week_days[0].isoformat(),
                end_iso=week_days[-1].isoformat(),
            )
        )
    return weeks


def format_time(value: time | None) -> str | None:
    if value is None:
        return None
    text = value.strftime('%I:%M%p').lower()
    return text.lstrip('0')


def format_occurrence_display(label: str, start_time: time | None, location: str | None, all_day: bool) -> str:
    prefix = 'All Day' if all_day or start_time is None else format_time(start_time)
    return f'{prefix} {label}' + (f' @ {location}' if location else '')


def event_label_map(event: Event) -> dict[int, str]:
    return {item.day_offset: item.label for item in event.day_labels}


def occurrence_color(audience: str) -> str:
    return AUDIENCE_COLORS.get(audience, AUDIENCE_COLORS['Unspecified'])


def build_occurrence(event: Event, current_day: date, label: str) -> Occurrence:
    return Occurrence(
        event_id=f'event-{event.id}-{current_day.isoformat()}',
        source_event_id=event.id,
        date=current_day,
        title=event.title,
        label=label,
        display_text=format_occurrence_display(label, event.start_time, event.location, event.all_day),
        start_time=format_time(event.start_time),
        end_time=format_time(event.end_time),
        all_day=event.all_day,
        audience=event.audience,
        color=occurrence_color(event.audience),
        location=event.location,
        notes=event.notes,
    )


def day_in_weekly_pattern(current_day: date, weekdays_csv: str | None) -> bool:
    weekdays = {int(item) for item in (weekdays_csv or '').split(',') if item != ''}
    mapped_weekday = (current_day.weekday() + 1) % 7
    return mapped_weekday in weekdays


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
                grouped[current_day].append(build_occurrence(event, current_day, label))
            continue

        current_day = max(event.start_date, visible_start)
        recurrence_end = min(event.end_date, visible_end)
        while current_day <= recurrence_end:
            if event.recurrence_type == 'daily':
                grouped[current_day].append(build_occurrence(event, current_day, event.title))
            elif event.recurrence_type == 'weekly' and day_in_weekly_pattern(current_day, event.recurrence_weekdays):
                grouped[current_day].append(build_occurrence(event, current_day, event.title))
            current_day += timedelta(days=1)

    for day, items in grouped.items():
        items.sort(key=lambda item: (not item.all_day, item.start_time or '99:99', item.title))
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


def holiday_occurrence(holiday_day: date, name: str) -> Occurrence:
    return Occurrence(
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
        notes=HOLIDAY_NOTE,
        is_holiday=True,
    )


def serialize_occurrence(item: Occurrence) -> dict:
    return {
        'event_id': item.event_id,
        'source_event_id': item.source_event_id,
        'date': item.date.isoformat(),
        'title': item.title,
        'label': item.label,
        'display_text': item.display_text,
        'start_time': item.start_time,
        'end_time': item.end_time,
        'all_day': item.all_day,
        'audience': item.audience,
        'color': item.color,
        'location': item.location,
        'notes': item.notes,
        'is_holiday': item.is_holiday,
    }


def serialize_week(week: CalendarWeek) -> dict:
    return {
        'index': week.index,
        'label': week.label,
        'includes_current_month': week.includes_current_month,
        'start_iso': week.start_iso,
        'end_iso': week.end_iso,
    }

def load_date_styles() -> dict[str, str]:
    return {style.day.isoformat(): style.background_color for style in DateStyle.query.all()}


def month_context(year: int, month: int, include_holidays: bool) -> dict:
    start, end = month_bounds(year, month)
    grid = build_month_grid(year, month)
    weeks = build_week_metadata(grid, month)
    visible_start = grid[0][0]
    visible_end = grid[-1][-1]
    holiday_map = get_us_holidays(year, month) if include_holidays else {}
    long_weekends = detect_long_weekends(holiday_map) if include_holidays else set()
    styles = load_date_styles()
    events = Event.query.filter(Event.end_date >= visible_start, Event.start_date <= visible_end).all()
    occurrences = expand_event_occurrences(events, visible_start, visible_end)

    if include_holidays:
        for holiday_day, name in holiday_map.items():
            occurrences.setdefault(holiday_day, []).insert(0, holiday_occurrence(holiday_day, name))

    return {
        'month_start': start,
        'month_end': end,
        'grid': grid,
        'weeks': [serialize_week(week) for week in weeks],
        'visible_start': visible_start,
        'visible_end': visible_end,
        'holiday_map': holiday_map,
        'long_weekends': {day.isoformat() for day in long_weekends},
        'styles': styles,
        'occurrences': {day.isoformat(): [serialize_occurrence(item) for item in items] for day, items in occurrences.items()},
        'month_name': MONTH_NAMES[month - 1],
        'weekday_names': WEEKDAY_NAMES,
    }
