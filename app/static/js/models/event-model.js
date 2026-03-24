import { nowIso } from '../utils/dates.js';

export function normalizeEvent(event) {
  return {
    id: event.id,
    title: event.title || '',
    startDate: event.startDate || event.start_date,
    endDate: event.endDate || event.end_date,
    allDay: Boolean(event.allDay ?? event.all_day),
    startTime: event.startTime || event.start_time || '',
    endTime: event.endTime || event.end_time || '',
    audience: event.audience || 'Unspecified',
    location: event.location || '',
    notes: event.notes || '',
    color: event.color || null,
    visibility: event.visibility || 'public',
    recurrenceType: event.recurrenceType || event.recurrence_type || 'none',
    recurrenceWeekdays: Array.isArray(event.recurrenceWeekdays)
      ? event.recurrenceWeekdays
      : (event.recurrence_weekdays || '').split(',').filter(Boolean),
    labels: event.labels || {},
    updatedAt: event.updatedAt || nowIso(),
  };
}
