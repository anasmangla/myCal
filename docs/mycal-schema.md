# myCal Document Schema (`mycal.document.v1`)

The static GitHub Pages planner now persists one month per document with a versioned schema:

- `schemaVersion`: `mycal.document.v1`
- `docId`: UUID
- `month`: `YYYY-MM`
- `events[]`: recurring + normal events
- `cells{}`: per-day note/color/attachment metadata
- `unscheduled[]`: undated private-by-default items
- `attachments{}`: metadata for image blobs stored in IndexedDB
- `settings`: Islamic/US holiday toggles + hidden holiday metadata + share defaults
- `ui`: last selection hints

Runtime storage uses IndexedDB (`documents`, `attachments`, `autosaves`) and tiny bootstrap meta remains in localStorage.
