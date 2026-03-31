import { APP_VERSION, SCHEMA_VERSION } from '../core/constants.js';
import { validateDocument } from '../core/schema.js';
import { downloadText } from '../utils/dom.js';
import { isoDate, parseIsoDate } from '../utils/dates.js';

export function exportDocumentJson(doc) {
  const payload = {
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    document: doc,
  };
  const filename = `mycal-${doc.month}.json`;
  downloadText(filename, JSON.stringify(payload, null, 2));
}

function icsEscape(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function foldIcsLine(line) {
  if (line.length <= 75) return [line];
  const segments = [line.slice(0, 75)];
  for (let index = 75; index < line.length; index += 74) {
    segments.push(` ${line.slice(index, index + 74)}`);
  }
  return segments;
}

function icsDateValue(value) {
  return value.replaceAll('-', '');
}

function icsDateTimeValue(dateValue, timeValue) {
  const [hours = '00', minutes = '00'] = String(timeValue || '').split(':');
  return `${icsDateValue(dateValue)}T${hours.padStart(2, '0')}${minutes.padStart(2, '0')}00`;
}

function utcStampValue(value = new Date()) {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  const hours = String(value.getUTCHours()).padStart(2, '0');
  const minutes = String(value.getUTCMinutes()).padStart(2, '0');
  const seconds = String(value.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function nextIsoDate(value) {
  const current = parseIsoDate(value);
  current.setUTCDate(current.getUTCDate() + 1);
  return isoDate(current);
}

function buildVisibleOccurrenceRows(doc) {
  const [yearText, monthText] = doc.month.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const visibleStart = `${doc.month}-01`;
  const visibleEnd = `${doc.month}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, '0')}`;
  const rows = [];
  const visibleStartDate = parseIsoDate(visibleStart);
  const visibleEndDate = parseIsoDate(visibleEnd);

  doc.events.forEach((event) => {
    const labels = event.labels || {};
    if (event.recurrenceType === 'none') {
      const spanDays = ((parseIsoDate(event.endDate) - parseIsoDate(event.startDate)) / 86400000) + 1;
      for (let offset = 0; offset < spanDays; offset += 1) {
        const current = parseIsoDate(event.startDate);
        current.setUTCDate(current.getUTCDate() + offset);
        if (current < visibleStartDate || current > visibleEndDate) continue;
        const occurrenceDate = isoDate(current);
        rows.push({
          eventId: event.id,
          date: occurrenceDate,
          summary: labels[offset] || labels[String(offset)] || (spanDays > 1 ? `Day ${offset + 1}: ${event.title}` : event.title),
          title: event.title,
          startTime: event.startTime,
          allDay: event.allDay || !event.startTime,
          location: event.location,
          notes: event.notes,
          audience: event.audience,
          visibility: event.visibility,
        });
      }
      return;
    }

    const weekdays = new Set((event.recurrenceWeekdays || []).map(String));
    const start = parseIsoDate(event.startDate) > visibleStartDate ? parseIsoDate(event.startDate) : new Date(visibleStartDate);
    const end = parseIsoDate(event.endDate) < visibleEndDate ? parseIsoDate(event.endDate) : new Date(visibleEndDate);
    for (let current = new Date(start); current <= end; current.setUTCDate(current.getUTCDate() + 1)) {
      if (event.recurrenceType === 'weekly' && !weekdays.has(String(current.getUTCDay()))) continue;
      rows.push({
        eventId: event.id,
        date: isoDate(current),
        summary: event.title,
        title: event.title,
        startTime: event.startTime,
        allDay: event.allDay || !event.startTime,
        location: event.location,
        notes: event.notes,
        audience: event.audience,
        visibility: event.visibility,
      });
    }
  });

  rows.sort((left, right) => {
    const leftTime = left.allDay ? '' : (left.startTime || '99:99');
    const rightTime = right.allDay ? '' : (right.startTime || '99:99');
    return left.date.localeCompare(right.date)
      || Number(left.allDay === false) - Number(right.allDay === false)
      || leftTime.localeCompare(rightTime)
      || left.summary.localeCompare(right.summary);
  });
  return rows;
}

function buildIcsText(doc) {
  const exportedAt = utcStampValue();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//myCal//Monthly Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEscape(doc.title || doc.month)}`,
  ];

  buildVisibleOccurrenceRows(doc).forEach((row) => {
    const descriptionParts = [];
    if (row.summary !== row.title) descriptionParts.push(`Series: ${row.title}`);
    if (row.audience) descriptionParts.push(`Audience: ${row.audience}`);
    if (row.notes) descriptionParts.push(row.notes);
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${icsEscape(`${row.eventId}-${row.date}-${doc.month}`)}@mycal.local`);
    lines.push(`DTSTAMP:${exportedAt}`);
    lines.push(`SUMMARY:${icsEscape(row.summary || row.title || 'Untitled event')}`);
    if (row.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${icsDateValue(row.date)}`);
      lines.push(`DTEND;VALUE=DATE:${icsDateValue(nextIsoDate(row.date))}`);
    } else {
      lines.push(`DTSTART:${icsDateTimeValue(row.date, row.startTime)}`);
    }
    if (row.location) lines.push(`LOCATION:${icsEscape(row.location)}`);
    if (row.audience) lines.push(`CATEGORIES:${icsEscape(row.audience)}`);
    if (row.visibility === 'private') lines.push('CLASS:PRIVATE');
    if (descriptionParts.length) lines.push(`DESCRIPTION:${icsEscape(descriptionParts.join('\n\n'))}`);
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.flatMap(foldIcsLine).join('\r\n').concat('\r\n');
}

export function exportDocumentIcs(doc) {
  const filename = `mycal-${doc.month}.ics`;
  downloadText(filename, buildIcsText(doc), 'text/calendar;charset=utf-8');
}

export function parseImportJson(raw) {
  const parsed = JSON.parse(raw);
  const doc = parsed.document || parsed;
  const result = validateDocument(doc);
  if (!result.ok) throw new Error(result.error);
  return doc;
}
