import { USA_JAMAAT_EVENTS_2026 } from '../data/usa-jamaat-calendar-2026.js';
import { isoDate, parseIsoDate } from '../utils/dates.js';
import { sortOccurrenceItems } from './events.js';

export const USA_JAMAAT_COLOR = '#0f766e';

export function usaJamaatOccurrenceKey(eventId, occurrenceDate) {
  return `${eventId}@${occurrenceDate}`;
}

export function visibleUsaJamaatEventMap(visibleStartIso, visibleEndIso, hiddenOccurrenceKeys = []) {
  const grouped = {};
  const hiddenKeys = hiddenOccurrenceKeys instanceof Set ? hiddenOccurrenceKeys : new Set(hiddenOccurrenceKeys || []);
  const visibleStart = parseIsoDate(visibleStartIso);
  const visibleEnd = parseIsoDate(visibleEndIso);

  USA_JAMAAT_EVENTS_2026.forEach((event) => {
    const start = parseIsoDate(event.startDate);
    const end = parseIsoDate(event.endDate);
    if (end < visibleStart || start > visibleEnd) return;

    const currentStart = start > visibleStart ? new Date(start) : new Date(visibleStart);
    const currentEnd = end < visibleEnd ? new Date(end) : new Date(visibleEnd);
    for (let current = new Date(currentStart); current <= currentEnd; current.setUTCDate(current.getUTCDate() + 1)) {
      const occurrenceDate = isoDate(current);
      const occurrenceKey = usaJamaatOccurrenceKey(event.id, occurrenceDate);
      if (hiddenKeys.has(occurrenceKey)) continue;
      grouped[occurrenceDate] ||= [];
      grouped[occurrenceDate].push({
        sourceEventId: null,
        sourceType: 'usa-jamaat',
        occurrenceDate,
        occurrenceKey,
        isHoliday: false,
        isUsaJamaat: true,
        title: event.title,
        displayText: event.title,
        notes: event.notes || '',
        location: event.location || '',
        allDay: true,
        startTime: '',
        color: USA_JAMAAT_COLOR,
      });
    }
  });

  Object.values(grouped).forEach((items) => sortOccurrenceItems(items));
  return grouped;
}
