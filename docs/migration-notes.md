# Migration Notes

On first launch after upgrade, the static app:

1. Reads legacy key `mycal.static.state.v1`.
2. Creates a one-time localStorage backup key: `mycal.static.state.v1.backup.<timestamp>`.
3. Migrates:
   - legacy `events` -> `document.events`
   - legacy `styles[YYYY-MM-DD]` -> `document.cells[date].backgroundColor`
   - holiday/islamic toggles + hidden metadata -> `document.settings`
4. Saves migrated document to IndexedDB.
5. Marks migration complete via meta flag after successful persistence.

If migration/import validation fails, existing runtime data is not overwritten.
