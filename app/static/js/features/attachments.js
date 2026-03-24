import { isImageFile, imageDimensions, fileToDataUrl } from '../utils/files.js';
import { createAttachmentMeta } from '../models/attachment-model.js';
import { ensureCell } from '../models/cell-model.js';
import { putAttachment } from '../storage/indexeddb.js';

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : `att_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function addImageToCell({ state, date, file }) {
  if (!isImageFile(file)) throw new Error('Only image files are supported.');
  const id = uuid();
  const { width, height, dataUrl } = await imageDimensions(file);
  await putAttachment(`attachment_${id}`, dataUrl);
  const meta = createAttachmentMeta({ id, parentType: 'cell', parentId: date, file, thumbnailDataUrl: dataUrl, width, height });
  state.doc.attachments[id] = meta;
  const cell = ensureCell(state.doc, date);
  cell.attachments.push(id);
}

export async function exportAttachmentsInline(doc) {
  const pairs = await Promise.all(Object.values(doc.attachments).map(async (meta) => [meta.id, await fileToDataUrl(dataUrlToFile(meta.thumbnailDataUrl, meta.name, meta.mimeType))]));
  return Object.fromEntries(pairs);
}

function dataUrlToFile(dataUrl, name, type) {
  const arr = dataUrl.split(',');
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], name, { type });
}
