import { AUDIENCE_COLORS } from '../core/constants.js';
import { parseIsoDate, isoDate } from '../utils/dates.js';

export function getSpanDays(startDate, endDate) {
  return ((parseIsoDate(endDate) - parseIsoDate(startDate)) / 86400000) + 1;
}

function formatTime(value) {
  if (!value) return null;
  const [hText, m] = value.split(':');
  let h = Number(hText);
  const suffix = h >= 12 ? 'pm' : 'am';
  h %= 12;
  if (h === 0) h = 12;
  return `${h}:${m}${suffix}`;
}

function formatOccurrenceDisplay(label, startTime, location, allDay) {
  const prefix = allDay || !startTime ? '' : `${formatTime(startTime)} `;
  return `${prefix}${label}${location ? ` @ ${location}` : ''}`;
}

function occurrenceSortKey(item) {
  return [
    item.isHoliday ? 0 : (item.isUsaJamaat ? 1 : 2),
    item.allDay ? 0 : 1,
    item.startTime || '99:99',
    item.displayText || item.title || '',
    item.occurrenceKey || '',
  ];
}

export function sortOccurrenceItems(items) {
  items.sort((left, right) => {
    const leftKey = occurrenceSortKey(left);
    const rightKey = occurrenceSortKey(right);
    for (let index = 0; index < leftKey.length; index += 1) {
      if (leftKey[index] < rightKey[index]) return -1;
      if (leftKey[index] > rightKey[index]) return 1;
    }
    return 0;
  });
  return items;
}

export function mergeOccurrenceMaps(...maps) {
  const grouped = {};
  maps.forEach((map) => {
    Object.entries(map || {}).forEach(([key, items]) => {
      grouped[key] ||= [];
      grouped[key].push(...items);
    });
  });
  Object.values(grouped).forEach((items) => sortOccurrenceItems(items));
  return grouped;
}

export function visibleEventMap(events, visibleStartIso, visibleEndIso, audienceColors = AUDIENCE_COLORS) {
  const grouped = {};
  const visibleStart = parseIsoDate(visibleStartIso);
  const visibleEnd = parseIsoDate(visibleEndIso);
  events.forEach((event) => {
    const customLabels = event.labels || {};
    if (event.recurrenceType === 'none') {
      const span = getSpanDays(event.startDate, event.endDate);
      for (let offset = 0; offset < span; offset += 1) {
        const current = parseIsoDate(event.startDate);
        current.setUTCDate(current.getUTCDate() + offset);
        if (current < visibleStart || current > visibleEnd) continue;
        const key = isoDate(current);
        const label = customLabels[offset] || customLabels[String(offset)] || (span > 1 ? `Day ${offset + 1}: ${event.title}` : event.title);
        grouped[key] ||= [];
        grouped[key].push({
          sourceEventId: event.id,
          sourceType: 'user',
          occurrenceDate: key,
          occurrenceKey: `event-${event.id}@${key}`,
          seriesKey: `event-${event.id}`,
          seriesSpanDays: span,
          isHoliday: false,
          isUsaJamaat: false,
          title: event.title,
          displayText: formatOccurrenceDisplay(label, event.startTime, event.location, event.allDay),
          notes: event.notes,
          location: event.location,
          allDay: event.allDay || !event.startTime,
          startTime: event.startTime || '',
          color: event.color || audienceColors[event.audience] || audienceColors.Unspecified,
        });
      }
      return;
    }

    const weekdays = new Set((event.recurrenceWeekdays || []).map(String));
    const start = parseIsoDate(event.startDate) > visibleStart ? parseIsoDate(event.startDate) : visibleStart;
    const end = parseIsoDate(event.endDate) < visibleEnd ? parseIsoDate(event.endDate) : visibleEnd;
    for (let current = new Date(start); current <= end; current.setUTCDate(current.getUTCDate() + 1)) {
      const w = String(current.getUTCDay());
      if (event.recurrenceType === 'weekly' && !weekdays.has(w)) continue;
      const key = isoDate(current);
      grouped[key] ||= [];
      grouped[key].push({
        sourceEventId: event.id,
        sourceType: 'user',
        occurrenceDate: key,
        occurrenceKey: `event-${event.id}@${key}`,
        seriesKey: `event-${event.id}`,
        seriesSpanDays: getSpanDays(event.startDate, event.endDate),
        isHoliday: false,
        isUsaJamaat: false,
        title: event.title,
        displayText: formatOccurrenceDisplay(event.title, event.startTime, event.location, event.allDay),
        notes: event.notes,
        location: event.location,
        allDay: event.allDay || !event.startTime,
        startTime: event.startTime || '',
        color: event.color || audienceColors[event.audience] || audienceColors.Unspecified,
      });
    }
  });
  Object.values(grouped).forEach((items) => sortOccurrenceItems(items));
  return grouped;
}
