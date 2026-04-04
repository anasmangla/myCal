import { USA_JAMAAT_EVENTS_2026 } from '../data/usa-jamaat-calendar-2026.js';
import { isoDate, parseIsoDate } from '../utils/dates.js';
import { sortOccurrenceItems } from './events.js';

export const USA_JAMAAT_COLOR = '#fff7ed';

export function usaJamaatOccurrenceKey(eventId, occurrenceDate) {
  return `${eventId}@${occurrenceDate}`;
}

export function visibleUsaJamaatEventMap(visibleStartIso, visibleEndIso, hiddenOccurrenceKeys = [], hiddenSeriesKeys = []) {
  const grouped = {};
  const hiddenKeys = hiddenOccurrenceKeys instanceof Set ? hiddenOccurrenceKeys : new Set(hiddenOccurrenceKeys || []);
  const hiddenSeries = hiddenSeriesKeys instanceof Set ? hiddenSeriesKeys : new Set(hiddenSeriesKeys || []);
  const visibleStart = parseIsoDate(visibleStartIso);
  const visibleEnd = parseIsoDate(visibleEndIso);

  USA_JAMAAT_EVENTS_2026.forEach((event) => {
    if (hiddenSeries.has(event.id)) return;
    const start = parseIsoDate(event.startDate);
    const end = parseIsoDate(event.endDate);
    if (end < visibleStart || start > visibleEnd) return;
    const spanDays = ((end - start) / 86400000) + 1;

    const currentStart = start > visibleStart ? new Date(start) : new Date(visibleStart);
    const currentEnd = end < visibleEnd ? new Date(end) : new Date(visibleEnd);
    for (let current = new Date(currentStart); current <= currentEnd; current.setUTCDate(current.getUTCDate() + 1)) {
      const occurrenceDate = isoDate(current);
      const occurrenceKey = usaJamaatOccurrenceKey(event.id, occurrenceDate);
      const dayOffset = ((current - start) / 86400000);
      const displayLabel = spanDays > 1 ? `Day ${dayOffset + 1}: ${event.title}` : event.title;
      if (hiddenKeys.has(occurrenceKey)) continue;
      grouped[occurrenceDate] ||= [];
      grouped[occurrenceDate].push({
        sourceEventId: null,
        sourceType: 'usa-jamaat',
        occurrenceDate,
        occurrenceKey,
        seriesKey: event.id,
        seriesSpanDays: spanDays,
        isHoliday: false,
        isUsaJamaat: true,
        title: event.title,
        displayText: displayLabel,
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
