from __future__ import annotations

import json
from datetime import date
from functools import lru_cache
from pathlib import Path


USA_JAMAAT_COLOR = '#fff7ed'
DATA_FILE = Path(__file__).resolve().parent / 'static' / 'data' / 'usa-jamaat-calendar-2026.json'


@lru_cache(maxsize=1)
def load_usa_jamaat_calendar() -> dict:
    if not DATA_FILE.exists():
        return {'year': 2026, 'eventCount': 0, 'events': []}
    return json.loads(DATA_FILE.read_text(encoding='utf-8'))


@lru_cache(maxsize=1)
def load_usa_jamaat_events() -> tuple[dict, ...]:
    payload = load_usa_jamaat_calendar()
    events = []
    for item in payload.get('events', []):
        events.append(
            {
                **item,
                'start_date': date.fromisoformat(item['startDate']),
                'end_date': date.fromisoformat(item['endDate']),
            }
        )
    return tuple(events)


def usa_jamaat_events_for_month(visible_start: date, visible_end: date) -> list[dict]:
    return [
        item
        for item in load_usa_jamaat_events()
        if item['end_date'] >= visible_start and item['start_date'] <= visible_end
    ]
