import { SCHEMA_VERSION } from './constants.js';
import { nowIso } from '../utils/dates.js';

export function makeEmptyDocument({ docId, month, title }) {
  const now = nowIso();
  return {
    schemaVersion: SCHEMA_VERSION,
    docId,
    month,
    title,
    subtitle: '',
    locale: 'en-US',
    settings: {
      showIslamicDates: true,
      showUSHolidays: true,
      hiddenMeta: { holidays: [], islamic: [] },
      shareDefaults: { includePrivateItems: false, includeImages: true, includeNotes: true },
    },
    events: [],
    cells: {},
    unscheduled: [],
    attachments: {},
    ui: { selectedDate: null, lastOpenedPanel: 'none' },
    updatedAt: now,
  };
}

export function validateDocument(doc) {
  if (!doc || doc.schemaVersion !== SCHEMA_VERSION) return { ok: false, error: 'Unsupported schema version.' };
  if (!doc.month || !/^\d{4}-\d{2}$/.test(doc.month)) return { ok: false, error: 'Invalid month format.' };
  if (!Array.isArray(doc.events) || typeof doc.cells !== 'object' || !Array.isArray(doc.unscheduled)) return { ok: false, error: 'Document shape is invalid.' };
  return { ok: true };
}
