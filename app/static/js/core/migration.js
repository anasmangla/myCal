import { LEGACY_STORAGE_KEY } from './constants.js';
import { makeEmptyDocument } from './schema.js';
import { normalizeEvent } from '../models/event-model.js';
import { ensureCell } from '../models/cell-model.js';

export function migrateLegacyState({ legacyRaw, month, docId, title }) {
  console.info('[myCal migration] Starting legacy migration');
  const legacy = JSON.parse(legacyRaw || '{}');
  const doc = makeEmptyDocument({ month, docId, title });

  doc.settings.showUSHolidays = legacy.includeHolidays !== false;
  doc.settings.showIslamicDates = legacy.includeIslamic !== false;
  doc.settings.hiddenMeta.holidays = legacy.hiddenMeta?.holidays || [];
  doc.settings.hiddenMeta.islamic = legacy.hiddenMeta?.islamic || [];

  (legacy.events || []).forEach((event) => doc.events.push(normalizeEvent(event)));
  Object.entries(legacy.styles || {}).forEach(([date, color]) => {
    const cell = ensureCell(doc, date);
    cell.backgroundColor = color;
  });

  const backupKey = `${LEGACY_STORAGE_KEY}.backup.${Date.now()}`;
  localStorage.setItem(backupKey, legacyRaw);
  console.info('[myCal migration] Completed migration; backup key:', backupKey);
  return doc;
}
