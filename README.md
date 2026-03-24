# myCal

A local-first monthly calendar web app built with Flask, SQLite, SQLAlchemy, Bootstrap 5, and vanilla JavaScript.

## Features

- Sunday-first monthly calendar grid with month/year selectors.
- Defaults to next month from the current date on first load.
- SQLite-backed persistent event storage with SQLAlchemy ORM.
- U.S. federal holiday overlay using the `holidays` package.
- Long-weekend highlighting for Friday and Monday federal holidays.
- Event create/edit modal with multi-day labels, recurring events, and audience-based colors.
- Custom date background colors stored per day.
- Print month / selected week plus image export.
- JSON export/import for full calendar data backup and restore.

## Project structure

```text
myCal/
├── app/
│   ├── __init__.py
│   ├── calendar_utils.py
│   ├── event_utils.py
│   ├── models.py
│   ├── routes.py
│   ├── static/
│   │   ├── css/styles.css
│   │   └── js/app.js
│   └── templates/
│       ├── base.html
│       └── index.html
├── instance/
├── .gitignore
├── README.md
├── requirements.txt
└── run.py
```


## GitHub Pages / hosted demo

The Flask app still runs locally for full server-backed development, but the repository root now also includes a standalone `index.html` + browser-side JavaScript entrypoint so `https://anasmangla.github.io/myCal/` opens an interactive calendar directly on GitHub Pages. Data on the hosted page is saved in the browser with `localStorage`, which makes it viewable without running Flask or SQLite locally.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python run.py
```

Then open http://127.0.0.1:5000/.

## Notes

- The database file is created automatically in `instance/calendar.db`.
- Recurring events render only within the visible month range.
- Browser print dialog can save to PDF for month or selected week export.
- The export image button uses `html2canvas` from a CDN in the browser.

## Testing checklist

- Launch the app and confirm it opens to next month.
- Toggle U.S. holidays and verify holiday chips render.
- Add, edit, and delete timed, all-day, recurring, and multi-day events.
- Apply and clear a custom date background color.
- Use Print month / Print selected week and save as PDF.
- Use Export image and verify a PNG downloads.
