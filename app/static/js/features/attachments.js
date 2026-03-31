import { isImageFile, imageDimensions, fileToDataUrl } from '../utils/files.js';
import { createAttachmentMeta } from '../models/attachment-model.js';
import { ensureCell } from '../models/cell-model.js';
import { putAttachment, deleteAttachment } from '../storage/indexeddb.js';

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : `att_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function addImageToCell({ state, date, file }) {
  if (!isImageFile(file)) throw new Error('Only image files are supported.');
  const id = uuid();
  const { dataUrl, size } = await cropImageToSquare(file);
  await putAttachment(`attachment_${id}`, dataUrl);
  const meta = createAttachmentMeta({
    id,
    parentType: 'cell',
    parentId: date,
    file,
    thumbnailDataUrl: dataUrl,
    width: size,
    height: size,
  });
  state.doc.attachments[id] = meta;
  const cell = ensureCell(state.doc, date);
  cell.attachments.push(id);
}

export async function removeImageFromCell({ state, date, attachmentId }) {
  if (!date || !attachmentId) return;
  const cell = state.doc.cells[date];
  if (!cell?.attachments?.length) return;
  cell.attachments = cell.attachments.filter((id) => id !== attachmentId);
  delete state.doc.attachments[attachmentId];
  await deleteAttachment(`attachment_${attachmentId}`);
}

export async function clearImagesFromCell({ state, date }) {
  if (!date) return;
  const cell = state.doc.cells[date];
  if (!cell?.attachments?.length) return;
  const attachmentIds = [...cell.attachments];
  cell.attachments = [];
  attachmentIds.forEach((attachmentId) => {
    delete state.doc.attachments[attachmentId];
  });
  await Promise.all(attachmentIds.map((attachmentId) => deleteAttachment(`attachment_${attachmentId}`)));
}

export async function moveImageBetweenCells({ state, fromDate, toDate, attachmentId }) {
  if (!fromDate || !toDate || !attachmentId || fromDate === toDate) return;
  const sourceCell = state.doc.cells[fromDate];
  if (!sourceCell?.attachments?.includes(attachmentId)) return;
  const targetCell = ensureCell(state.doc, toDate);
  sourceCell.attachments = sourceCell.attachments.filter((id) => id !== attachmentId);
  if (!targetCell.attachments.includes(attachmentId)) targetCell.attachments.push(attachmentId);
  if (state.doc.attachments[attachmentId]) state.doc.attachments[attachmentId].parentId = toDate;
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

async function cropImageToSquare(file) {
  const { width, height, dataUrl } = await imageDimensions(file);
  const size = Math.max(1, Math.min(width, height));
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const offsetX = Math.floor((width - size) / 2);
  const offsetY = Math.floor((height - size) / 2);
  context.drawImage(image, offsetX, offsetY, size, size, 0, 0, size, size);
  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    size,
  };
}
