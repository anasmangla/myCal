# myCal Static GitHub Pages App

A pure static monthly calendar app that runs directly from `index.html` and stores all data in browser `localStorage`.

## Static file tree

```text
myCal/
├── index.html
├── assets/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── app.js
├── .gitignore
└── README.md
```

## Features

- Opens directly to the calendar UI instead of a README landing page.
- Startup month picker defaults to next month from today.
- Sunday-first monthly grid.
- Local `localStorage` persistence for events and custom date colors.
- U.S. federal holiday toggle with all-day holiday entries and long-weekend highlighting.
- Multi-event support, all-day events, multi-day events up to 10 days, daily and weekly month recurrence.
- Right-click or touch-friendly buttons for date actions.
- Left-click event edit and right-click event delete.
- Print month, print selected week, export image, and JSON backup import/export.

## GitHub Pages publish

1. Push this repository to GitHub.
2. In the repository settings, open **Pages**.
3. Set the source to **Deploy from a branch**.
4. Choose your main branch and the **root** folder.
5. Save the settings.
6. Open the published GitHub Pages URL. The calendar app loads immediately from `index.html`.

## Local preview

Because this is a static site, you can open `index.html` directly in a browser or serve it locally:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000/`.
