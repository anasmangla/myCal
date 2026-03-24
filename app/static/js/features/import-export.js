import { APP_VERSION, SCHEMA_VERSION } from '../core/constants.js';
import { validateDocument } from '../core/schema.js';
import { downloadText } from '../utils/dom.js';

export function exportDocumentJson(doc) {
  const payload = {
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    document: doc,
  };
  const filename = `mycal-${doc.month}.json`;
  downloadText(filename, JSON.stringify(payload, null, 2));
}

export function parseImportJson(raw) {
  const parsed = JSON.parse(raw);
  const doc = parsed.document || parsed;
  const result = validateDocument(doc);
  if (!result.ok) throw new Error(result.error);
  return doc;
}
