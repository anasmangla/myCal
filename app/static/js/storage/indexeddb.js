import { DB_NAME, DB_VERSION, STORES, MAX_AUTOSAVES } from '../core/constants.js';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.DOCUMENTS)) db.createObjectStore(STORES.DOCUMENTS, { keyPath: 'docId' });
      if (!db.objectStoreNames.contains(STORES.ATTACHMENTS)) db.createObjectStore(STORES.ATTACHMENTS, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(STORES.AUTOSAVES)) db.createObjectStore(STORES.AUTOSAVES, { keyPath: 'id', autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function put(storeName, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error);
  });
}

async function get(storeName, key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function getAll(storeName) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export const saveDocument = (doc) => put(STORES.DOCUMENTS, doc);
export const getDocument = (docId) => get(STORES.DOCUMENTS, docId);
export const putAttachment = (key, dataUrl) => put(STORES.ATTACHMENTS, { key, dataUrl });
export const getAttachment = async (key) => (await get(STORES.ATTACHMENTS, key))?.dataUrl || null;

export async function saveAutosave(entry) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.AUTOSAVES, 'readwrite');
    tx.objectStore(STORES.AUTOSAVES).add(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  const rows = await getAll(STORES.AUTOSAVES);
  if (rows.length <= MAX_AUTOSAVES) return;
  const stale = rows.slice(0, rows.length - MAX_AUTOSAVES);
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.AUTOSAVES, 'readwrite');
    const store = tx.objectStore(STORES.AUTOSAVES);
    stale.forEach((row) => store.delete(row.id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
