from __future__ import annotations

import json
import unittest
from datetime import date, time
from io import BytesIO

from app import create_app, db
from app.calendar_utils import build_month_grid, build_week_metadata, month_context
from app.event_utils import ValidationError, parse_event_form
from app.models import Event, EventDayLabel
from app.routes import _build_event_from_import
from werkzeug.datastructures import ImmutableMultiDict


class BackendRegressionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.app = create_app(
            {
                'TESTING': True,
                'SECRET_KEY': 'test-secret',
                'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
            }
        )
        self.client = self.app.test_client()

    def tearDown(self) -> None:
        with self.app.app_context():
            db.session.remove()
            db.drop_all()
            db.engine.dispose()

    def test_export_and_import_preserve_event_color(self) -> None:
        with self.app.app_context():
            db.session.add(
                Event(
                    title='Board meeting',
                    start_date=date(2026, 4, 10),
                    end_date=date(2026, 4, 10),
                    audience='All',
                    color='#123abc',
                    recurrence_type='none',
                )
            )
            db.session.commit()

        export_response = self.client.get('/data/export')
        self.assertEqual(export_response.status_code, 200)
        export_payload = json.loads(export_response.data)
        self.assertEqual(export_payload['events'][0]['color'], '#123abc')

        import_response = self.client.post(
            '/data/import',
            data={
                'calendar_file': (BytesIO(export_response.data), 'calendar.json'),
                'return_year': '2026',
                'return_month': '04',
            },
            content_type='multipart/form-data',
        )
        self.assertEqual(import_response.status_code, 302)

        with self.app.app_context():
            event = Event.query.one()
            self.assertEqual(event.color, '#123abc')

    def test_import_requires_weekdays_for_weekly_events(self) -> None:
        with self.assertRaises(ValidationError):
            _build_event_from_import(
                {
                    'title': 'Weekly class',
                    'start_date': '2026-04-01',
                    'end_date': '2026-04-30',
                    'recurrence_type': 'weekly',
                }
            )

    def test_import_normalizes_weekdays_for_non_weekly_events(self) -> None:
        event = _build_event_from_import(
            {
                'title': 'Daily reminder',
                'start_date': '2026-04-01',
                'end_date': '2026-04-03',
                'color': '#ABCDEF',
                'recurrence_type': 'daily',
                'recurrence_weekdays': '1,3,5',
            }
        )

        self.assertIsNone(event.recurrence_weekdays)
        self.assertEqual(event.color, '#abcdef')

    def test_move_event_rejects_dates_outside_selected_month(self) -> None:
        with self.app.app_context():
            event = Event(
                title='Planning session',
                start_date=date(2026, 4, 20),
                end_date=date(2026, 4, 21),
                audience='All',
                recurrence_type='none',
            )
            db.session.add(event)
            db.session.commit()
            event_id = event.id

        response = self.client.post(
            f'/events/move/{event_id}',
            data={
                'target_date': '2026-05-01',
                'return_year': '2026',
                'return_month': '04',
            },
        )
        self.assertEqual(response.status_code, 302)

        with self.app.app_context():
            event = db.session.get(Event, event_id)
            self.assertEqual(str(event.start_date), '2026-04-20')
            self.assertEqual(str(event.end_date), '2026-04-21')

    def test_week_labels_are_portable_and_human_readable(self) -> None:
        weeks = build_week_metadata(build_month_grid(2026, 4), 4)
        self.assertEqual(weeks[0].label, 'Apr 1 - Apr 4')

    def test_parse_event_form_treats_blank_start_time_as_all_day(self) -> None:
        payload = parse_event_form(
            ImmutableMultiDict(
                [
                    ('title', 'Board retreat'),
                    ('start_date', '2026-04-10'),
                    ('end_date', '2026-04-10'),
                    ('start_time', ''),
                    ('audience', 'All'),
                    ('return_year', '2026'),
                    ('return_month', '4'),
                ]
            )
        )

        self.assertTrue(payload.all_day)
        self.assertIsNone(payload.start_time)
        self.assertIsNone(payload.end_time)

    def test_export_ics_includes_visible_month_occurrences(self) -> None:
        with self.app.app_context():
            db.session.add(
                Event(
                    title='Retreat',
                    start_date=date(2026, 4, 10),
                    end_date=date(2026, 4, 12),
                    audience='All',
                    recurrence_type='none',
                    all_day=True,
                )
            )
            db.session.add(
                Event(
                    title='Team sync',
                    start_date=date(2026, 4, 15),
                    end_date=date(2026, 4, 15),
                    start_time=time(18, 30),
                    audience='All',
                    recurrence_type='none',
                    all_day=False,
                )
            )
            db.session.add(
                Event(
                    title='May planning',
                    start_date=date(2026, 5, 1),
                    end_date=date(2026, 5, 1),
                    audience='All',
                    recurrence_type='none',
                    all_day=True,
                )
            )
            db.session.commit()

        response = self.client.get('/data/export.ics?month_year=2026-04&holidays=0&usa_jamaat=0')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.mimetype, 'text/calendar')

        content = response.data.decode('utf-8')
        self.assertIn('BEGIN:VCALENDAR', content)
        self.assertEqual(content.count('BEGIN:VEVENT'), 4)
        self.assertIn('DTSTART;VALUE=DATE:20260410', content)
        self.assertIn('DTEND;VALUE=DATE:20260411', content)
        self.assertIn('DTSTART:20260415T183000', content)
        self.assertNotIn('20260501', content)

    def test_month_context_includes_usa_jamaat_feed_when_enabled(self) -> None:
        with self.app.app_context():
            enabled = month_context(2026, 1, include_holidays=False, include_usa_jamaat=True)
            disabled = month_context(2026, 1, include_holidays=False, include_usa_jamaat=False)

        january_occurrences = enabled['occurrences'].get('2026-01-03', [])
        self.assertTrue(any(item.get('is_usa_jamaat') for item in january_occurrences))
        self.assertTrue(any('Quran Talks' in item.get('title', '') for item in january_occurrences))
        self.assertEqual(disabled['occurrences'].get('2026-01-03', []), [])

    def test_month_context_formats_multi_day_usa_jamaat_labels(self) -> None:
        with self.app.app_context():
            context = month_context(2026, 1, include_holidays=False, include_usa_jamaat=True)

        first_day = context['occurrences'].get('2026-01-03', [])
        second_day = context['occurrences'].get('2026-01-04', [])
        self.assertTrue(
            any(
                item.get('is_usa_jamaat')
                and item.get('label') == "Day 1: Local Jama'at/Auxiliary Activities Review of 2025 and Plan 2026 activities"
                for item in first_day
            )
        )
        self.assertTrue(
            any(
                item.get('is_usa_jamaat')
                and item.get('label') == "Day 2: Local Jama'at/Auxiliary Activities Review of 2025 and Plan 2026 activities"
                for item in second_day
            )
        )

    def test_export_ics_can_include_usa_jamaat_feed(self) -> None:
        response = self.client.get('/data/export.ics?month_year=2026-01&holidays=0&usa_jamaat=1')
        self.assertEqual(response.status_code, 200)

        content = response.data.decode('utf-8')
        self.assertIn("SUMMARY:New Year's Day", content)
        self.assertIn('SUMMARY:Quran Talks - 7:00 PM', content)

    def test_delete_single_day_from_multi_day_event_preserves_segments_and_labels(self) -> None:
        with self.app.app_context():
            event = Event(
                title='Retreat',
                start_date=date(2026, 4, 10),
                end_date=date(2026, 4, 12),
                audience='All',
                recurrence_type='none',
                all_day=True,
            )
            event.day_labels = [
                EventDayLabel(day_offset=0, label='Arrival'),
                EventDayLabel(day_offset=1, label='Workshop'),
                EventDayLabel(day_offset=2, label='Closing'),
            ]
            db.session.add(event)
            db.session.commit()
            event_id = event.id

        response = self.client.post(
            f'/events/delete/{event_id}',
            data={
                'delete_mode': 'single',
                'occurrence_date': '2026-04-11',
                'return_year': '2026',
                'return_month': '04',
            },
        )
        self.assertEqual(response.status_code, 302)

        with self.app.app_context():
            events = Event.query.order_by(Event.start_date.asc(), Event.id.asc()).all()
            self.assertEqual(len(events), 2)
            self.assertEqual((events[0].start_date, events[0].end_date), (date(2026, 4, 10), date(2026, 4, 10)))
            self.assertEqual((events[1].start_date, events[1].end_date), (date(2026, 4, 12), date(2026, 4, 12)))
            self.assertEqual({label.day_offset: label.label for label in events[0].day_labels}, {0: 'Arrival'})
            self.assertEqual({label.day_offset: label.label for label in events[1].day_labels}, {0: 'Closing'})


if __name__ == '__main__':
    unittest.main()
