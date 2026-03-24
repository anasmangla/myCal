# Manual QA Checklist

## Existing behavior
- [ ] Add/edit/delete event still works.
- [ ] Recurring events still render.
- [ ] Islamic date + U.S. holiday toggles still work.
- [ ] Print/PDF still works.
- [ ] Export image still downloads.

## New model + storage
- [ ] Legacy localStorage data migrates into v1 schema.
- [ ] Cell notes survive reload.
- [ ] Cell background colors survive reload.
- [ ] Cell image attachment survives reload.
- [ ] Unscheduled item survives reload.

## Import/export + sharing
- [ ] JSON export creates `mycal-YYYY-MM.json`.
- [ ] Exported JSON imports cleanly and restores events/cells/attachments/settings.
- [ ] Invalid JSON shows error without data loss.
- [ ] Copy summary excludes private items by default.
- [ ] WhatsApp and Email summary links populate correctly.

## Accessibility/mobile
- [ ] Selected day has visible focus/selection.
- [ ] Arrow-key navigation between day cells works.
- [ ] Touch users can open side panel and add note/image/color.
