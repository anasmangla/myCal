import { getDocument, saveDocument, saveAutosave } from './indexeddb.js';
import { saveMeta, getMeta } from './local-meta.js';
import { nowIso } from '../utils/dates.js';

let saveTimer;

export async function loadDocument(docId) {
  return getDocument(docId);
}

export async function persistDocument(doc, reason = 'edit') {
  doc.updatedAt = nowIso();
  await saveDocument(doc);
  await saveAutosave({ docId: doc.docId, reason, updatedAt: doc.updatedAt, snapshot: doc });
  const meta = getMeta();
  meta.lastDocId = doc.docId;
  meta.lastSavedAt = doc.updatedAt;
  saveMeta(meta);
  return doc.updatedAt;
}

export function schedulePersist(doc, reason, onSaved) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const savedAt = await persistDocument(doc, reason);
    if (onSaved) onSaved(savedAt);
  }, 350);
}
