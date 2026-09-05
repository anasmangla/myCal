import { normalizeEvent } from '../models/event-model.js';

// Dates transcribed from the owner's Buffalo Tahir Academy 2026–2027 flyer.
// Missing times remain all-day; no weekly recurrence is inferred.
export const TAHIR_ACADEMY_EVENTS = [
  {
    "id": "buffalo-tahir-2026-2027-orientation",
    "title": "Buffalo Tahir Academy — Orientation",
    "startDate": "2026-09-03",
    "endDate": "2026-09-03",
    "startTime": "19:00",
    "allDay": false,
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. 7:00 PM local Buffalo time (America/New_York). Location and end time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-labor-day",
    "title": "Tahir Academy: Labor Day Weekend — No Classes",
    "startDate": "2026-09-06",
    "endDate": "2026-09-06",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Listed under Important Dates / No Classes.",
    "color": "#fef3c7"
  },
  {
    "id": "buffalo-tahir-2026-2027-2026-09-11",
    "title": "Tahir Academy — Friday Class",
    "startDate": "2026-09-11",
    "endDate": "2026-09-11",
    "location": "Masjid Baitul Majeed",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2026-09-13",
    "title": "Tahir Academy — Sunday Class",
    "startDate": "2026-09-13",
    "endDate": "2026-09-13",
    "location": "Masjid Mahdi",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2026-09-18",
    "title": "Tahir Academy — Friday Class",
    "startDate": "2026-09-18",
    "endDate": "2026-09-18",
    "location": "Masjid Baitul Majeed",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2026-09-20",
    "title": "Tahir Academy — Sunday Class",
    "startDate": "2026-09-20",
    "endDate": "2026-09-20",
    "location": "Masjid Mahdi",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2026-09-25",
    "title": "Tahir Academy — Friday Class",
    "startDate": "2026-09-25",
    "endDate": "2026-09-25",
    "location": "Masjid Baitul Majeed",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2026-09-27",
    "title": "Tahir Academy — Sunday Class",
    "startDate": "2026-09-27",
    "endDate": "2026-09-27",
    "location": "Masjid Mahdi",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-ijtema",
    "title": "Tahir Academy: National Khuddam & Atfal Ijtema and National Lajna & Nasirat Ijtema",
    "startDate": "2026-10-09",
    "endDate": "2026-10-11",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Listed under Important Dates / No Classes.",
    "color": "#fef3c7"
  },
  {
    "id": "buffalo-tahir-2026-2027-2026-10-16",
    "title": "Tahir Academy — Friday Class",
    "startDate": "2026-10-16",
    "endDate": "2026-10-16",
    "location": "Masjid Baitul Majeed",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2026-10-18",
    "title": "Tahir Academy — Sunday Class",
    "startDate": "2026-10-18",
    "endDate": "2026-10-18",
    "location": "Masjid Mahdi",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2026-10-23",
    "title": "Tahir Academy — Friday Class",
    "startDate": "2026-10-23",
    "endDate": "2026-10-23",
    "location": "Masjid Baitul Majeed",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2026-10-25",
    "title": "Tahir Academy — Sunday Class",
    "startDate": "2026-10-25",
    "endDate": "2026-10-25",
    "location": "Masjid Mahdi",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2026-11-06",
    "title": "Tahir Academy — Friday Class",
    "startDate": "2026-11-06",
    "endDate": "2026-11-06",
    "location": "Masjid Baitul Majeed",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2026-11-08",
    "title": "Tahir Academy — Sunday Class",
    "startDate": "2026-11-08",
    "endDate": "2026-11-08",
    "location": "Masjid Mahdi",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2026-11-13",
    "title": "Tahir Academy — Friday Class",
    "startDate": "2026-11-13",
    "endDate": "2026-11-13",
    "location": "Masjid Baitul Majeed",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2026-11-15",
    "title": "Tahir Academy — Sunday Class",
    "startDate": "2026-11-15",
    "endDate": "2026-11-15",
    "location": "Masjid Mahdi",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2026-11-20",
    "title": "Tahir Academy — Friday Class",
    "startDate": "2026-11-20",
    "endDate": "2026-11-20",
    "location": "Masjid Baitul Majeed",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2026-11-22",
    "title": "Tahir Academy — Sunday Class",
    "startDate": "2026-11-22",
    "endDate": "2026-11-22",
    "location": "Masjid Mahdi",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-thanksgiving",
    "title": "Tahir Academy: Thanksgiving Weekend — No Classes",
    "startDate": "2026-11-29",
    "endDate": "2026-11-29",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Listed under Important Dates / No Classes.",
    "color": "#fef3c7"
  },
  {
    "id": "buffalo-tahir-2026-2027-2026-12-11",
    "title": "Tahir Academy — Friday Class",
    "startDate": "2026-12-11",
    "endDate": "2026-12-11",
    "location": "Masjid Baitul Majeed",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2026-12-13",
    "title": "Tahir Academy — Sunday Class",
    "startDate": "2026-12-13",
    "endDate": "2026-12-13",
    "location": "Masjid Mahdi",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2026-12-18",
    "title": "Tahir Academy — Friday Class",
    "startDate": "2026-12-18",
    "endDate": "2026-12-18",
    "location": "Masjid Baitul Majeed",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2026-12-20",
    "title": "Tahir Academy — Sunday Class",
    "startDate": "2026-12-20",
    "endDate": "2026-12-20",
    "location": "Masjid Mahdi",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-winter",
    "title": "Tahir Academy: Winter Break — No Classes",
    "startDate": "2026-12-27",
    "endDate": "2026-12-27",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Listed under Important Dates / No Classes.",
    "color": "#fef3c7"
  },
  {
    "id": "buffalo-tahir-2026-2027-2027-01-08",
    "title": "Tahir Academy — Friday Class",
    "startDate": "2027-01-08",
    "endDate": "2027-01-08",
    "location": "Masjid Baitul Majeed",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2027-01-10",
    "title": "Tahir Academy — Sunday Class",
    "startDate": "2027-01-10",
    "endDate": "2027-01-10",
    "location": "Masjid Mahdi",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2027-01-15",
    "title": "Tahir Academy — Friday Class",
    "startDate": "2027-01-15",
    "endDate": "2027-01-15",
    "location": "Masjid Baitul Majeed",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2027-01-17",
    "title": "Tahir Academy — Sunday Class",
    "startDate": "2027-01-17",
    "endDate": "2027-01-17",
    "location": "Masjid Mahdi",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2027-01-22",
    "title": "Tahir Academy — Friday Class",
    "startDate": "2027-01-22",
    "endDate": "2027-01-22",
    "location": "Masjid Baitul Majeed",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2027-01-24",
    "title": "Tahir Academy — Sunday Class",
    "startDate": "2027-01-24",
    "endDate": "2027-01-24",
    "location": "Masjid Mahdi",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2027-01-29",
    "title": "Tahir Academy — Friday Class",
    "startDate": "2027-01-29",
    "endDate": "2027-01-29",
    "location": "Masjid Baitul Majeed",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2027-01-31",
    "title": "Tahir Academy — Sunday Class",
    "startDate": "2027-01-31",
    "endDate": "2027-01-31",
    "location": "Masjid Mahdi",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-ramadhan",
    "title": "Tahir Academy: Ramadhan and Eid-ul-Fitr Break — No Classes",
    "startDate": "2027-02-08",
    "endDate": "2027-03-09",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Listed under Important Dates / No Classes.",
    "color": "#fef3c7"
  },
  {
    "id": "buffalo-tahir-2026-2027-2027-03-12",
    "title": "Tahir Academy — Friday Class",
    "startDate": "2027-03-12",
    "endDate": "2027-03-12",
    "location": "Masjid Baitul Majeed",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2027-03-14",
    "title": "Tahir Academy — Sunday Class",
    "startDate": "2027-03-14",
    "endDate": "2027-03-14",
    "location": "Masjid Mahdi",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2027-03-19",
    "title": "Tahir Academy — Friday Class",
    "startDate": "2027-03-19",
    "endDate": "2027-03-19",
    "location": "Masjid Baitul Majeed",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2027-03-21",
    "title": "Tahir Academy — Sunday Class",
    "startDate": "2027-03-21",
    "endDate": "2027-03-21",
    "location": "Masjid Mahdi",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2027-03-26",
    "title": "Tahir Academy — Friday Class",
    "startDate": "2027-03-26",
    "endDate": "2027-03-26",
    "location": "Masjid Baitul Majeed",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2027-03-28",
    "title": "Tahir Academy — Sunday Class",
    "startDate": "2027-03-28",
    "endDate": "2027-03-28",
    "location": "Masjid Mahdi",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2027-04-09",
    "title": "Tahir Academy — Friday Class",
    "startDate": "2027-04-09",
    "endDate": "2027-04-09",
    "location": "Masjid Baitul Majeed",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2027-04-11",
    "title": "Tahir Academy — Sunday Class",
    "startDate": "2027-04-11",
    "endDate": "2027-04-11",
    "location": "Masjid Mahdi",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2027-04-16",
    "title": "Tahir Academy — Friday Class",
    "startDate": "2027-04-16",
    "endDate": "2027-04-16",
    "location": "Masjid Baitul Majeed",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2027-04-18",
    "title": "Tahir Academy — Sunday Class",
    "startDate": "2027-04-18",
    "endDate": "2027-04-18",
    "location": "Masjid Mahdi",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2027-04-23",
    "title": "Tahir Academy — Friday Class",
    "startDate": "2027-04-23",
    "endDate": "2027-04-23",
    "location": "Masjid Baitul Majeed",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2027-04-25",
    "title": "Tahir Academy — Sunday Class",
    "startDate": "2027-04-25",
    "endDate": "2027-04-25",
    "location": "Masjid Mahdi",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2027-05-07",
    "title": "Tahir Academy — Friday Class",
    "startDate": "2027-05-07",
    "endDate": "2027-05-07",
    "location": "Masjid Baitul Majeed",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2027-05-09",
    "title": "Tahir Academy — Sunday Class",
    "startDate": "2027-05-09",
    "endDate": "2027-05-09",
    "location": "Masjid Mahdi",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-eid-adha",
    "title": "Tahir Academy: Eid-ul-Adha — No Classes",
    "startDate": "2027-05-16",
    "endDate": "2027-05-16",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Listed under Important Dates / No Classes.",
    "color": "#fef3c7"
  },
  {
    "id": "buffalo-tahir-2026-2027-2027-05-21",
    "title": "Tahir Academy — Friday Class",
    "startDate": "2027-05-21",
    "endDate": "2027-05-21",
    "location": "Masjid Baitul Majeed",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2027-05-23",
    "title": "Tahir Academy — Sunday Class",
    "startDate": "2027-05-23",
    "endDate": "2027-05-23",
    "location": "Masjid Mahdi",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2027-05-28",
    "title": "Tahir Academy — Friday Class",
    "startDate": "2027-05-28",
    "endDate": "2027-05-28",
    "location": "Masjid Baitul Majeed",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2027-05-30",
    "title": "Tahir Academy — Sunday Class",
    "startDate": "2027-05-30",
    "endDate": "2027-05-30",
    "location": "Masjid Mahdi",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2027-06-11",
    "title": "Tahir Academy — Friday Class",
    "startDate": "2027-06-11",
    "endDate": "2027-06-11",
    "location": "Masjid Baitul Majeed",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  },
  {
    "id": "buffalo-tahir-2026-2027-2027-06-13",
    "title": "Tahir Academy — Sunday Class",
    "startDate": "2027-06-13",
    "endDate": "2027-06-13",
    "location": "Masjid Mahdi",
    "notes": "Source: Buffalo Tahir Academy 2026–2027 Class Schedule supplied by the calendar owner. Class time not specified.",
    "color": "#d1fae5"
  }
];

export function addTahirAcademySchedule(doc) {
  const marker = 'buffaloTahirAcademy2026_2027';
  doc.settings ||= {};
  if (doc.settings[marker]) return false;
  const monthStart = doc.month + '-01';
  const [year, month] = doc.month.split('-').map(Number);
  const monthEnd = doc.month + '-' + String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, '0');
  const relevant = TAHIR_ACADEMY_EVENTS.filter(event => event.startDate <= monthEnd && event.endDate >= monthStart);
  if (!relevant.length) return false;
  const ids = new Set(doc.events.map(event => event.id));
  for (const event of relevant) {
    if (ids.has(event.id)) continue;
    // The editor requires each event to remain within its month.
    const startDate = event.startDate < monthStart ? monthStart : event.startDate;
    const endDate = event.endDate > monthEnd ? monthEnd : event.endDate;
    const notes = event.startDate !== startDate || event.endDate !== endDate
      ? event.notes + ' Full break: February 8–March 9, 2027 (inclusive).'
      : event.notes;
    doc.events.push(normalizeEvent({ ...event, startDate, endDate, notes }));
  }
  // Preserve subsequent user edits/deletions on reload.
  doc.settings[marker] = true;
  return true;
}
