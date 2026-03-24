import { monthIso } from '../utils/dates.js';
import { makeEmptyDocument } from '../core/schema.js';

export function createDocumentForView({ year, month, docId }) {
  return makeEmptyDocument({
    docId,
    month: monthIso(year, month),
    title: `${new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}`,
  });
}
