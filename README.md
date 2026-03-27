# myCal

myCal is a local-first monthly planner. The Flask app remains in this repository, and the static GitHub Pages app (`index.html`) is now upgraded with a modular ES-module architecture for richer month documents, notes, colors, image attachments, and sharing flows.

## Static app architecture (shipping target)

```text
app/static/js/
  static-app.js
  core/
    app-init.js
    state.js
    schema.js
    migration.js
    constants.js
  storage/
    local-meta.js
    indexeddb.js
    persistence.js
  models/
    document-model.js
    event-model.js
    cell-model.js
    attachment-model.js
  features/
    events.js
    cell-editor.js
    cell-colors.js
    attachments.js
    import-export.js
    share.js
    print-export.js
    search.js
  ui/
    calendar-renderer.js
    toolbar.js
    sidepanel.js
    menus.js
    modals.js
    toasts.js
  utils/
    colors.js
    dates.js
    dom.js
    files.js
    text.js
    accessibility.js
```

## Storage model

- **IndexedDB**
  - `documents`: full month snapshots
  - `attachments`: image payloads
  - `autosaves`: bounded history for recovery
- **localStorage**
  - active month/meta flags
  - migration completion and legacy backups
  - lightweight title overrides

## Schema + migration

- Current schema: `mycal.document.v1`
- See `docs/mycal-schema.md`.
- Backward migration from legacy `mycal.static.state.v1`:
  - events preserved
  - date background styles mapped to per-cell color
  - holiday/islamic toggles and hidden metadata preserved
  - one-time backup key created before migration

## Import/export

- Export JSON: `mycal-YYYY-MM.json`
- Import JSON with schema validation and safe failure behavior
- Existing image export and print/PDF remain
- Share helpers: copy summary, WhatsApp link, email body

## Known limits (current phase)

- Rich text editor is intentionally deferred; phase-1 cell notes are plain text.
- ICS export is not yet enabled in UI (planned phase-2).
- Holiday list in static renderer currently includes major federal fixed-date holidays only.
- Image resizing/compression is basic; large images can increase export size.

## Run Flask app (unchanged)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python run.py
```

Then open http://127.0.0.1:5000/.

## Docs

- `docs/mycal-schema.md`
- `docs/migration-notes.md`
- `docs/qa-checklist.md`
- `docs/interaction-improvements.md`
