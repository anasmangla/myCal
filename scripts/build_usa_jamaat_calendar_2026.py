from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

from pypdf import PdfReader


REPO_ROOT = Path(__file__).resolve().parents[1]
PDF_PATH = Path.home() / 'Downloads' / "USA Jama'at Calendar 2026 Final.pdf"
JSON_OUTPUT_PATH = REPO_ROOT / 'app' / 'static' / 'data' / 'usa-jamaat-calendar-2026.json'
JS_OUTPUT_PATH = REPO_ROOT / 'app' / 'static' / 'js' / 'data' / 'usa-jamaat-calendar-2026.js'
YEAR = 2026
MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
MONTH_ABBR_TO_NUMBER = {
    'Jan': 1,
    'Feb': 2,
    'Mar': 3,
    'Apr': 4,
    'May': 5,
    'Jun': 6,
    'Jul': 7,
    'Aug': 8,
    'Sep': 9,
    'Oct': 10,
    'Nov': 11,
    'Dec': 12,
}
MONTH_TOKENS = tuple(MONTH_ABBR_TO_NUMBER)


@dataclass
class ParsedRow:
    month: str | None
    date_text: str
    weekday_text: str
    title_parts: list[str] = field(default_factory=list)
    scope_parts: list[str] = field(default_factory=list)
    venue_parts: list[str] = field(default_factory=list)


def normalize_layout_line(value: str) -> str:
    replacements = {
        '\u2013': '-',
        '\u2014': '-',
        '\u2018': "'",
        '\u2019': "'",
        '\u201c': '"',
        '\u201d': '"',
        '\u00a0': ' ',
        ' \ufffd ': ' - ',
        'Jama\ufffdat': "Jama'at",
        'Ima\ufffdillah': "Ima'illah",
        'Isha\ufffdat': "Isha'at",
        'Ijtema\ufffdat': "Ijtema'at",
        'Zira\ufffdat': "Zira'at",
        'Mao\ufffdud': "Mao'ud",
    }
    normalized = value
    for source, target in replacements.items():
        normalized = normalized.replace(source, target)
    return normalized.rstrip()


def normalize_text(value: str) -> str:
    normalized = normalize_layout_line(value)
    normalized = re.sub(r'\s+', ' ', normalized)
    normalized = normalized.replace(' - ', ' - ')
    normalized = normalized.replace(' ,', ',')
    normalized = normalized.replace('( ', '(').replace(' )', ')')
    return normalized.strip()


def split_columns(line: str) -> tuple[str, str, str, str, str]:
    if not line.strip():
        return '', '', '', '', ''
    return (
        line[:16].strip(),
        line[16:32].strip(),
        line[32:70].strip(),
        line[70:88].strip(),
        line[88:].strip(),
    )


def parse_pdf_rows(pdf_path: Path) -> list[ParsedRow]:
    text = ''
    for page in PdfReader(str(pdf_path)).pages:
        text += (page.extract_text(extraction_mode='layout') or '') + '\n'

    rows: list[ParsedRow] = []
    current_month: str | None = None
    current_row: ParsedRow | None = None

    for raw_line in text.splitlines():
        line = normalize_layout_line(raw_line)
        stripped = line.strip()
        if not stripped:
            continue

        if stripped in MONTH_NAMES:
            if current_row is not None:
                rows.append(current_row)
                current_row = None
            current_month = stripped
            continue

        if stripped.startswith('January') and 'Event' in stripped and 'Venue' in stripped:
            current_month = 'January'
            continue

        if stripped.isdigit() or stripped.startswith('NATIONAL CALENDAR') or stripped.startswith('As of:'):
            continue

        date_col, weekday_col, title_col, scope_col, venue_col = split_columns(line)
        is_new_row = bool(date_col and any(char.isdigit() for char in date_col))

        if is_new_row:
            if current_row is not None:
                rows.append(current_row)
            current_row = ParsedRow(
                month=current_month,
                date_text=date_col,
                weekday_text=weekday_col,
                title_parts=[title_col] if title_col else [],
                scope_parts=[scope_col] if scope_col else [],
                venue_parts=[venue_col] if venue_col else [],
            )
            continue

        if current_row is None:
            continue

        if date_col:
            if date_col.startswith('('):
                current_row.title_parts.append(date_col)
            elif not current_row.date_text.endswith(MONTH_TOKENS) and len(date_col) <= 12:
                current_row.date_text = f'{current_row.date_text} {date_col}'.strip()

        if weekday_col and not current_row.weekday_text:
            current_row.weekday_text = weekday_col
        if title_col:
            current_row.title_parts.append(title_col)
        if scope_col:
            current_row.scope_parts.append(scope_col)
        if venue_col:
            current_row.venue_parts.append(venue_col)

    if current_row is not None:
        rows.append(current_row)

    return rows


def parse_date_range(date_text: str) -> tuple[date, date]:
    compact = normalize_text(re.sub(r'\s*-\s*', ' - ', date_text))

    patterns = [
        re.compile(r'^(?P<start_month>[A-Z][a-z]{2}) (?P<start_day>\d{1,2}) - (?P<end_day>\d{1,2}) (?P<end_month>[A-Z][a-z]{2})$'),
        re.compile(r'^(?P<start_day>\d{1,2}) (?P<start_month>[A-Z][a-z]{2}) - (?P<end_day>\d{1,2}) (?P<end_month>[A-Z][a-z]{2})$'),
        re.compile(r'^(?P<start_day>\d{1,2}) - (?P<end_day>\d{1,2}) (?P<month>[A-Z][a-z]{2})$'),
        re.compile(r'^(?P<day>\d{1,2}) (?P<month>[A-Z][a-z]{2})$'),
    ]

    for index, pattern in enumerate(patterns):
        match = pattern.match(compact)
        if not match:
            continue
        data = match.groupdict()
        if index in {0, 1}:
            start_month = MONTH_ABBR_TO_NUMBER[data['start_month']]
            end_month = MONTH_ABBR_TO_NUMBER[data['end_month']]
            return date(YEAR, start_month, int(data['start_day'])), date(YEAR, end_month, int(data['end_day']))
        if index == 2:
            month = MONTH_ABBR_TO_NUMBER[data['month']]
            return date(YEAR, month, int(data['start_day'])), date(YEAR, month, int(data['end_day']))
        month = MONTH_ABBR_TO_NUMBER[data['month']]
        day_value = date(YEAR, month, int(data['day']))
        return day_value, day_value

    raise ValueError(f'Unsupported date format: {date_text!r}')


def clean_join(parts: list[str]) -> str:
    joined = ' '.join(normalize_text(part) for part in parts if normalize_text(part))
    joined = re.sub(r'\s{2,}', ' ', joined)
    return joined.strip()


def row_to_event(row: ParsedRow, index: int) -> dict:
    start_date, end_date = parse_date_range(row.date_text)

    title_flags = {'Long Weekend', '(Tentative)'}
    title_parts = [part for part in row.title_parts if normalize_text(part) not in title_flags]
    flag_parts = [part for part in row.title_parts if normalize_text(part) in title_flags]

    title = clean_join(title_parts)
    scope = clean_join(row.scope_parts)
    venue = clean_join(row.venue_parts)

    notes_parts: list[str] = []
    notes_parts.extend(clean_join([part]) for part in flag_parts)
    if scope:
        notes_parts.append(f'Organizer: {scope}')
    if venue:
        notes_parts.append(f'Venue: {venue}')

    return {
        'id': f'usa-jamaat-2026-{index:03d}',
        'source': 'usa-jamaat',
        'startDate': start_date.isoformat(),
        'endDate': end_date.isoformat(),
        'title': title,
        'allDay': True,
        'startTime': '',
        'location': venue or '',
        'notes': '\n'.join(part for part in notes_parts if part),
        'audience': 'All',
        'category': scope,
        'weekdayText': row.weekday_text,
        'rawDateText': row.date_text,
    }


def build_payload(pdf_path: Path) -> dict:
    rows = parse_pdf_rows(pdf_path)
    events = [row_to_event(row, index + 1) for index, row in enumerate(rows)]
    return {
        'year': YEAR,
        'sourcePdf': pdf_path.name,
        'eventCount': len(events),
        'events': events,
    }


def write_outputs(payload: dict) -> None:
    JSON_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    JS_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    JSON_OUTPUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    js_contents = (
        '// Generated by scripts/build_usa_jamaat_calendar_2026.py\n'
        f'export const USA_JAMAAT_CALENDAR_2026 = {json.dumps(payload, indent=2, ensure_ascii=False)};\n'
        'export const USA_JAMAAT_EVENTS_2026 = USA_JAMAAT_CALENDAR_2026.events;\n'
    )
    JS_OUTPUT_PATH.write_text(js_contents, encoding='utf-8')


def main() -> None:
    if not PDF_PATH.exists():
        raise FileNotFoundError(f'PDF not found: {PDF_PATH}')
    payload = build_payload(PDF_PATH)
    write_outputs(payload)
    print(f"Wrote {payload['eventCount']} events to {JSON_OUTPUT_PATH}")
    print(f'Wrote JS module to {JS_OUTPUT_PATH}')


if __name__ == '__main__':
    main()
