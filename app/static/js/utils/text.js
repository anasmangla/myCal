export function escapeHtml(text = '') {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function previewText(text = '', max = 100) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}
