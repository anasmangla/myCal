from __future__ import annotations

import json
import unittest
from datetime import date
from io import BytesIO

from app import create_app, db
from app.calendar_utils import build_month_grid, build_week_metadata
from app.event_utils import ValidationError
from app.models import Event
from app.routes import _build_event_from_import


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


if __name__ == '__main__':
    unittest.main()
