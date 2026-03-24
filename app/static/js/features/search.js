export function searchDocument(doc, query, filters = {}) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results = [];
  if (filters.events !== false) {
    doc.events.forEach((event) => {
      if (`${event.title} ${event.notes} ${event.location}`.toLowerCase().includes(q)) {
        results.push({ type: 'event', id: event.id, label: `${event.startDate} — ${event.title}` });
      }
    });
  }
  if (filters.notes !== false) {
    Object.values(doc.cells).forEach((cell) => {
      if ((cell.plainText || '').toLowerCase().includes(q)) results.push({ type: 'note', id: cell.date, label: `${cell.date} note` });
    });
  }
  if (filters.images) {
    Object.values(doc.attachments).forEach((att) => {
      if (`${att.name} ${att.caption} ${att.altText}`.toLowerCase().includes(q)) results.push({ type: 'image', id: att.id, label: `Image: ${att.name}` });
    });
  }
  return results;
}
