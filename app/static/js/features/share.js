export function buildSummary(doc, { detailed = false, includePrivate = false } = {}) {
  const lines = [`${doc.title || doc.month} Community Calendar`, ''];
  const visibleEvents = doc.events.filter((e) => includePrivate || e.visibility !== 'private');
  visibleEvents
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .forEach((event) => {
      const base = `${event.startDate}${event.endDate !== event.startDate ? ` to ${event.endDate}` : ''} — ${event.title}`;
      lines.push(detailed ? `${base}${event.location ? `, ${event.location}` : ''}${event.startTime ? `, ${event.startTime}` : ''}` : base);
    });
  return lines.join('\n');
}

export async function nativeShareOrCopy(text) {
  if (navigator.share) {
    await navigator.share({ text });
    return 'shared';
  }
  await navigator.clipboard.writeText(text);
  return 'copied';
}

export function whatsappLink(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function emailLink(doc, text) {
  return `mailto:?subject=${encodeURIComponent(doc.title || 'myCal Calendar')}&body=${encodeURIComponent(text)}`;
}
