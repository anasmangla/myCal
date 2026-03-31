import { nowIso } from '../utils/dates.js';

export function ensureCell(doc, date) {
  if (!doc.cells[date]) {
    doc.cells[date] = {
      date,
      plainText: '',
      richTextHtml: '',
      contentType: 'plain',
      backgroundColor: null,
      textColor: null,
      textStyle: {
        fontPreset: 'system',
        fontSize: 0.72,
        fontWeight: '400',
        italic: false,
      },
      attachments: [],
      visibility: 'public',
      updatedAt: nowIso(),
    };
  }
  return doc.cells[date];
}
