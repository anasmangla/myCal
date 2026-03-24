import { nowIso } from '../utils/dates.js';

export function createAttachmentMeta({ id, parentType, parentId, file, thumbnailDataUrl, width, height }) {
  return {
    id,
    parentType,
    parentId,
    name: file.name,
    mimeType: file.type,
    caption: '',
    altText: '',
    width,
    height,
    thumbnailDataUrl,
    storage: { kind: 'indexeddb', key: `attachment_${id}` },
    updatedAt: nowIso(),
  };
}
