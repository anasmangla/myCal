const STORAGE_KEY = 'mycal.static.state.v1';
const TITLE_STORAGE_PREFIX = 'mycal.static.title';
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const AUDIENCE_CHOICES = ['All', 'Ansar', 'Khuddam', 'Atfal', 'Nasirat', 'Lajna', 'Tahir Academy', 'Unspecified'];
const AUDIENCE_COLORS = {
  Lajna: '#b03060',
  Nasirat: '#f4a6c1',
  Ansar: '#1d4e89',
  Khuddam: '#1f3a5f',
  Atfal: '#75b8ff',
  'Tahir Academy': '#2f855a',
  All: '#1f2937',
  Unspecified: '#4b5563',
};
const RECURRENCE_CHOICES = ['none', 'daily', 'weekly'];
const WEEKDAY_CHOICES = WEEKDAY_NAMES.map((label, index) => ({ value: String(index), label }));
const ISLAMIC_TEXT_FORMATTER = new Intl.DateTimeFormat('en-u-ca-islamic', { month: 'long', day: 'numeric', timeZone: 'UTC' });
const ISLAMIC_NUMERIC_FORMATTER = new Intl.DateTimeFormat('en-u-ca-islamic', { month: 'numeric', day: 'numeric', timeZone: 'UTC' });
const ISLAMIC_HOLIDAYS = {
  '1-1': 'Islamic New Year',
  '1-10': 'Ashura',
  '3-12': 'Mawlid',
  '7-27': 'Isra & Miraj',
  '9-1': 'Ramadan begins',
  '9-27': 'Laylat al-Qadr (approx.)',
  '10-1': 'Eid al-Fitr',
  '12-8': 'Day of Arafah',
  '12-10': 'Eid al-Adha',
  '12-11': 'Days of Tashriq',
  '12-12': 'Days of Tashriq',
  '12-13': 'Days of Tashriq',
};

function getIslamicParts(date) {
  const textParts = ISLAMIC_TEXT_FORMATTER.formatToParts(date);
  const numericParts = ISLAMIC_NUMERIC_FORMATTER.formatToParts(date);
  return {
    monthName: textParts.find((part) => part.type === 'month')?.value || '',
    monthNumber: Number(numericParts.find((part) => part.type === 'month')?.value || 0),
    day: Number(textParts.find((part) => part.type === 'day')?.value || 0),
  };
}

function buildIslamicLabels(date) {
  const islamic = getIslamicParts(date);
  const labels = [];

  if (date.getUTCDate() === 1) labels.push({ text: `${islamic.monthName} ${islamic.day}`, italic: true });
  if (islamic.day === 1) labels.push({ text: `${islamic.monthName} 1` });

  const importantDay = ISLAMIC_HOLIDAYS[`${islamic.monthNumber}-${islamic.day}`];
  if (importantDay) labels.push({ text: importantDay, important: true });

  return labels;
}

function firstVisibleMonth(today = new Date()) {
  const month = today.getUTCMonth();
  const year = today.getUTCFullYear();
  return month === 11 ? { year: year + 1, month: 1 } : { year, month: month + 2 };
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function parseIsoDate(value) {
  return new Date(`${value}T00:00:00Z`);
}

function buildMonthGrid(year, month) {
  const monthIndex = month - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const first = new Date(start);
  first.setUTCDate(first.getUTCDate() - first.getUTCDay());
  const grid = [];
  for (let week = 0; week < 6; week += 1) {
    const days = [];
    for (let day = 0; day < 7; day += 1) {
      const current = new Date(first);
      current.setUTCDate(first.getUTCDate() + (week * 7) + day);
      days.push(current);
    }
    grid.push(days);
  }
  while (grid.length > 0 && grid[grid.length - 1].every((day) => day.getUTCMonth() !== monthIndex)) {
    grid.pop();
  }
  return grid;
}

function nthWeekdayOfMonth(year, monthIndex, weekday, nth) {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, monthIndex, 1 + offset + ((nth - 1) * 7)));
}

function lastWeekdayOfMonth(year, monthIndex, weekday) {
  const last = new Date(Date.UTC(year, monthIndex + 1, 0));
  const offset = (last.getUTCDay() - weekday + 7) % 7;
  last.setUTCDate(last.getUTCDate() - offset);
  return last;
}

function observedHoliday(date) {
  const weekday = date.getUTCDay();
  const observed = new Date(date);
  if (weekday === 6) observed.setUTCDate(observed.getUTCDate() - 1);
  if (weekday === 0) observed.setUTCDate(observed.getUTCDate() + 1);
  return observed;
}

function getUSHolidays(year, month) {
  const monthIndex = month - 1;
  const holidays = new Map();
  const add = (date, name) => {
    if (date.getUTCFullYear() === year && date.getUTCMonth() === monthIndex) holidays.set(isoDate(date), name);
  };

  add(observedHoliday(new Date(Date.UTC(year, 0, 1))), "New Year's Day");
  if (year >= 1986) add(nthWeekdayOfMonth(year, 0, 1, 3), 'Martin Luther King Jr. Day');
  add(nthWeekdayOfMonth(year, 1, 1, 3), "Washington's Birthday");
  add(lastWeekdayOfMonth(year, 4, 1), 'Memorial Day');
  add(observedHoliday(new Date(Date.UTC(year, 5, 19))), 'Juneteenth National Independence Day');
  add(observedHoliday(new Date(Date.UTC(year, 6, 4))), 'Independence Day');
  add(nthWeekdayOfMonth(year, 8, 1, 1), 'Labor Day');
  add(nthWeekdayOfMonth(year, 9, 1, 2), 'Columbus Day');
  add(observedHoliday(new Date(Date.UTC(year, 10, 11))), 'Veterans Day');
  add(nthWeekdayOfMonth(year, 10, 4, 4), 'Thanksgiving Day');
  add(observedHoliday(new Date(Date.UTC(year, 11, 25))), 'Christmas Day');
  return holidays;
}

function detectLongWeekends(holidayMap) {
  const highlighted = new Set();
  holidayMap.forEach((_, key) => {
    const day = parseIsoDate(key);
    const weekday = day.getUTCDay();
    if (weekday === 1) {
      [-2, -1, 0].forEach((offset) => {
        const current = new Date(day);
        current.setUTCDate(day.getUTCDate() + offset);
        highlighted.add(isoDate(current));
      });
    }
    if (weekday === 5) {
      [0, 1, 2].forEach((offset) => {
        const current = new Date(day);
        current.setUTCDate(day.getUTCDate() + offset);
        highlighted.add(isoDate(current));
      });
    }
  });
  return highlighted;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (error) {
    console.warn('Unable to load myCal state', error);
  }
  return { events: [], styles: {}, includeHolidays: true, includeIslamic: false, hiddenMeta: { holidays: [], islamic: [] }, nextId: 1 };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function flash(message, level = 'success') {
  const el = document.getElementById('flashMessage');
  el.className = `mb-3 no-print alert alert-${level}`;
  el.textContent = message;
  el.classList.remove('d-none');
  clearTimeout(flash.timer);
  flash.timer = setTimeout(() => el.classList.add('d-none'), 3500);
}

function formatTime(value) {
  if (!value) return null;
  const [hoursText, minutes] = value.split(':');
  let hours = Number(hoursText);
  const suffix = hours >= 12 ? 'pm' : 'am';
  hours %= 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes}${suffix}`;
}

function formatOccurrenceDisplay(label, startTime, location, allDay) {
  const prefix = allDay || !startTime ? '' : `${formatTime(startTime)} `;
  return `${prefix}${label}${location ? ` @ ${location}` : ''}`;
}

function getSpanDays(startDate, endDate) {
  return ((parseIsoDate(endDate) - parseIsoDate(startDate)) / 86400000) + 1;
}

function getVisibleEvents(visibleStartIso, visibleEndIso) {
  const grouped = {};
  const visibleStart = parseIsoDate(visibleStartIso);
  const visibleEnd = parseIsoDate(visibleEndIso);
  state.events.forEach((event) => {
    const customLabels = event.labels || {};
    if (event.recurrence_type === 'none') {
      const span = getSpanDays(event.start_date, event.end_date);
      for (let offset = 0; offset < span; offset += 1) {
        const current = parseIsoDate(event.start_date);
        current.setUTCDate(current.getUTCDate() + offset);
        if (current < visibleStart || current > visibleEnd) continue;
        const key = isoDate(current);
        const label = customLabels[offset] || customLabels[String(offset)] || (span > 1 ? `Day ${offset + 1}: ${event.title}` : event.title);
        grouped[key] ||= [];
        grouped[key].push({
          event_id: `event-${event.id}-${key}`,
          source_event_id: event.id,
          title: event.title,
          display_text: formatOccurrenceDisplay(label, event.start_time, event.location, event.all_day),
          location: event.location,
          notes: event.notes,
          is_holiday: false,
          all_day: event.all_day,
          start_time: event.start_time,
          color: AUDIENCE_COLORS[event.audience] || AUDIENCE_COLORS.Unspecified,
        });
      }
      return;
    }

    const start = parseIsoDate(event.start_date) > visibleStart ? parseIsoDate(event.start_date) : visibleStart;
    const end = parseIsoDate(event.end_date) < visibleEnd ? parseIsoDate(event.end_date) : visibleEnd;
    const weekdays = new Set((event.recurrence_weekdays || '').split(',').filter(Boolean));
    for (let current = new Date(start); current <= end; current.setUTCDate(current.getUTCDate() + 1)) {
      const jsWeekday = String(current.getUTCDay());
      if (event.recurrence_type === 'weekly' && !weekdays.has(jsWeekday)) continue;
      const key = isoDate(current);
      grouped[key] ||= [];
      grouped[key].push({
        event_id: `event-${event.id}-${key}`,
        source_event_id: event.id,
        title: event.title,
        display_text: formatOccurrenceDisplay(event.title, event.start_time, event.location, event.all_day),
        location: event.location,
        notes: event.notes,
        is_holiday: false,
        all_day: event.all_day,
        start_time: event.start_time,
        color: AUDIENCE_COLORS[event.audience] || AUDIENCE_COLORS.Unspecified,
      });
    }
  });

  Object.values(grouped).forEach((items) => items.sort((a, b) => Number(a.all_day) - Number(b.all_day) || (a.start_time || '99:99').localeCompare(b.start_time || '99:99') || a.title.localeCompare(b.title)));
  return grouped;
}

const state = loadState();
state.hiddenMeta ||= {};
state.hiddenMeta.holidays = Array.isArray(state.hiddenMeta.holidays) ? state.hiddenMeta.holidays : [];
state.hiddenMeta.islamic = Array.isArray(state.hiddenMeta.islamic) ? state.hiddenMeta.islamic : [];
const hiddenHolidays = new Set(state.hiddenMeta.holidays);
const hiddenIslamic = new Set(state.hiddenMeta.islamic);
const defaults = firstVisibleMonth();
const view = {
  year: defaults.year,
  month: defaults.month,
};
let activeDate = null;
let activeEventId = null;
let activeEventOccurrenceDate = null;
let eventModal;

function initOptions() {
  const monthSelect = document.getElementById('monthSelect');
  MONTH_NAMES.forEach((name, index) => {
    const option = document.createElement('option');
    option.value = String(index + 1);
    option.textContent = name;
    monthSelect.appendChild(option);
  });

  const yearSelect = document.getElementById('yearSelect');
  for (let year = defaults.year - 3; year <= defaults.year + 7; year += 1) {
    const option = document.createElement('option');
    option.value = String(year);
    option.textContent = String(year);
    yearSelect.appendChild(option);
  }

  const audienceSelect = document.getElementById('audience');
  AUDIENCE_CHOICES.forEach((item) => {
    const option = document.createElement('option');
    option.value = item;
    option.textContent = item;
    audienceSelect.appendChild(option);
  });

  const recurrenceSelect = document.getElementById('recurrenceType');
  RECURRENCE_CHOICES.forEach((item) => {
    const option = document.createElement('option');
    option.value = item;
    option.textContent = item[0].toUpperCase() + item.slice(1);
    recurrenceSelect.appendChild(option);
  });

  const weekdayHeader = document.getElementById('weekdayHeader');
  WEEKDAY_NAMES.forEach((name) => {
    const cell = document.createElement('div');
    cell.className = 'weekday-cell';
    cell.textContent = name;
    weekdayHeader.appendChild(cell);
  });

  const weekdayCheckboxes = document.getElementById('weekdayCheckboxes');
  WEEKDAY_CHOICES.forEach(({ value, label }) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-check';
    wrapper.innerHTML = `<input class="form-check-input" type="checkbox" value="${value}" id="weekday${value}"><label class="form-check-label" for="weekday${value}">${label}</label>`;
    weekdayCheckboxes.appendChild(wrapper);
  });

  document.getElementById('islamicToggle').checked = state.includeIslamic === true;
  document.getElementById('holidaysToggle').checked = state.includeHolidays !== false;
}

function defaultCalendarTitle() {
  return `${MONTH_NAMES[view.month - 1]} ${view.year} - Ahmadiyya Muslim Jamaat Buffalo`;
}

function calendarTitleStorageKey() {
  return `${TITLE_STORAGE_PREFIX}.${view.year}-${String(view.month).padStart(2, '0')}`;
}

function syncCalendarTitle(value) {
  const nextValue = value.trim() || defaultCalendarTitle();
  const display = document.getElementById('calendarTitle');
  const input = document.getElementById('calendarTitleInput');
  display.textContent = nextValue;
  input.value = nextValue;
  return nextValue;
}

function setupCalendarTitleEditor() {
  const display = document.getElementById('calendarTitle');
  const input = document.getElementById('calendarTitleInput');
  const startEditing = () => {
    display.classList.add('d-none');
    input.classList.remove('d-none');
    input.focus();
    input.select();
  };
  const stopEditing = (save = true) => {
    if (save) {
      const nextValue = syncCalendarTitle(input.value);
      localStorage.setItem(calendarTitleStorageKey(), nextValue);
    } else {
      input.value = display.textContent;
    }
    input.classList.add('d-none');
    display.classList.remove('d-none');
  };

  display.addEventListener('click', startEditing);
  display.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      startEditing();
    }
  });
  input.addEventListener('blur', () => stopEditing(true));
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      stopEditing(true);
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      stopEditing(false);
      display.focus();
    }
  });
}

function setMonthGridSizing(visibleWeekCount) {
  const calendarSheet = document.getElementById('calendarSheet');
  const monthGrid = document.getElementById('calendarBody');
  if (!calendarSheet || !monthGrid || !visibleWeekCount) return;

  const sheetStyles = window.getComputedStyle(calendarSheet);
  const safeTop = parseFloat(sheetStyles.paddingTop) || 0;
  const safeBottom = parseFloat(sheetStyles.paddingBottom) || 0;
  const sheetHeight = calendarSheet.offsetHeight;
  const usableHeight = sheetHeight - safeTop - safeBottom;

  const rootStyles = window.getComputedStyle(document.documentElement);
  const headerHeight = parseFloat(rootStyles.getPropertyValue('--sheet-header-height')) * pxPerInch();
  const weekdayHeight = parseFloat(rootStyles.getPropertyValue('--sheet-weekday-height')) * pxPerInch();
  const gridHeight = Math.max(0, usableHeight - headerHeight - weekdayHeight);

  monthGrid.style.height = `${gridHeight}px`;
  monthGrid.style.gridTemplateRows = `repeat(${visibleWeekCount}, minmax(0, 1fr))`;
}

function updatePreviewScale() {
  const wrapper = document.getElementById('sheetPreviewWrapper');
  const sheet = document.getElementById('calendarSheet');
  if (!wrapper || !sheet) return;

  const naturalSheetWidth = sheet.offsetWidth;
  if (!naturalSheetWidth) return;

  const availableWidth = wrapper.clientWidth;
  const scale = Math.min(1, availableWidth / naturalSheetWidth);
  sheet.style.setProperty('--preview-scale', String(scale));
  wrapper.style.height = `${sheet.offsetHeight * scale}px`;
}

function renderCalendar() {
  document.getElementById('monthSelect').value = String(view.month);
  document.getElementById('yearSelect').value = String(view.year);
  syncCalendarTitle(localStorage.getItem(calendarTitleStorageKey()) || defaultCalendarTitle());

  const grid = buildMonthGrid(view.year, view.month);
  const visibleStart = isoDate(new Date(Date.UTC(view.year, view.month - 1, 1)));
  const visibleEnd = isoDate(new Date(Date.UTC(view.year, view.month, 0)));
  const holidayMap = state.includeHolidays !== false ? getUSHolidays(view.year, view.month) : new Map();
  const longWeekends = state.includeHolidays !== false ? detectLongWeekends(holidayMap) : new Set();
  const occurrences = getVisibleEvents(visibleStart, visibleEnd);
  holidayMap.forEach((name, key) => {
    occurrences[key] ||= [];
    occurrences[key].unshift({ source_event_id: null, display_text: name, title: name, location: null, notes: 'U.S. federal holiday', is_holiday: true, all_day: true, color: '#7c3aed' });
  });

  const monthGrid = document.getElementById('calendarBody');
  monthGrid.innerHTML = '';
  monthGrid.style.gridTemplateColumns = 'repeat(7, minmax(0, 1fr))';
  monthGrid.style.gridTemplateRows = `repeat(${grid.length}, minmax(0, 1fr))`;

  grid.forEach((week) => {
    week.forEach((day) => {
      const key = isoDate(day);
      const cell = document.createElement('div');
      cell.className = 'calendar-cell day-cell';
      const inMonth = day.getUTCMonth() === view.month - 1;
      if (day.getUTCDay() === 0 || day.getUTCDay() === 6) cell.classList.add('weekend');
      if (!inMonth) cell.classList.add('outside-month');
      const showHoliday = holidayMap.has(key) && !hiddenHolidays.has(key);
      const showIslamic = state.includeIslamic === true && !hiddenIslamic.has(key);
      if (showHoliday) cell.classList.add('holiday');
      if (longWeekends.has(key)) cell.classList.add('long-weekend');
      if (state.styles[key]) cell.style.background = state.styles[key];
      cell.dataset.date = key;
      cell.dataset.inMonth = inMonth ? 'true' : 'false';

      if (inMonth) {
        cell.addEventListener('dblclick', () => openEventModal({ start_date: key, end_date: key }));
        cell.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          activeDate = key;
          showMenu(document.getElementById('dateContextMenu'), event.pageX, event.pageY);
        });
      }

      const metaLines = [];
      if (showHoliday) metaLines.push(`<span class="calendar-meta-line">${holidayMap.get(key)}</span>`);
      if (showIslamic) {
        buildIslamicLabels(day).forEach((label) => {
          metaLines.push(`<span class="calendar-meta-line ${label.italic ? 'islamic-note' : ''} ${label.important ? 'islamic-important' : ''}">${label.text}</span>`);
        });
      }

      if (inMonth) {
        cell.innerHTML = `
          <div class="calendar-cell-header">
            <button type="button" class="btn btn-sm btn-light date-action-btn no-print" aria-label="Date actions">⋮</button>
            <div><div class="day-number">${day.getUTCDate()}</div></div>
          </div>
          <div class="holiday-pill small ${longWeekends.has(key) ? 'holiday-pill-long' : ''} ${metaLines.length ? 'has-content' : ''}">${metaLines.join('')}</div>
          <div class="event-list"></div>
        `;
      } else {
        cell.innerHTML = '<div class="outside-month-fill" aria-hidden="true"></div>';
      }

      if (inMonth) {
        cell.querySelector('.date-action-btn').addEventListener('click', () => openEventModal({ start_date: key, end_date: key }));
        cell.querySelector('.date-action-btn').addEventListener('contextmenu', (event) => {
          event.preventDefault();
          activeDate = key;
          showMenu(document.getElementById('dateContextMenu'), event.pageX, event.pageY);
        });
      }

      const list = cell.querySelector('.event-list');
      (occurrences[key] || []).forEach((item) => {
        if (item.is_holiday && hiddenHolidays.has(key)) return;
        const chip = document.createElement('a');
        chip.href = '#';
        chip.className = `event-chip ${item.is_holiday ? 'holiday-chip' : ''}`;
        chip.style.backgroundColor = item.color;
        chip.textContent = item.display_text;
        chip.title = [item.title, item.location, item.notes].filter(Boolean).join(' • ');
        chip.addEventListener('click', (event) => {
          event.preventDefault();
          if (item.is_holiday || !item.source_event_id) return;
          const source = state.events.find((entry) => entry.id === item.source_event_id);
          if (source) openEventModal(source);
        });
        chip.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          if (item.is_holiday || !item.source_event_id) return;
          activeEventId = item.source_event_id;
          activeEventOccurrenceDate = key;
          showMenu(document.getElementById('eventContextMenu'), event.pageX, event.pageY);
        });
        list.appendChild(chip);
      });

      monthGrid.appendChild(cell);
    });
  });

  setMonthGridSizing(grid.length);
  updatePreviewScale();
}

function openEventModal(payload) {
  document.getElementById('eventForm').reset();
  document.getElementById('eventValidation').classList.add('d-none');
  document.getElementById('eventId').value = payload.id || '';
  document.getElementById('title').value = payload.title || '';
  document.getElementById('startDate').value = payload.start_date || '';
  document.getElementById('endDate').value = payload.end_date || payload.start_date || '';
  document.getElementById('startTime').value = payload.start_time || '';
  document.getElementById('endTime').value = payload.end_time || '';
  document.getElementById('allDay').checked = Boolean(payload.all_day);
  document.getElementById('location').value = payload.location || '';
  document.getElementById('audience').value = payload.audience || 'Unspecified';
  document.getElementById('notes').value = payload.notes || '';
  document.getElementById('recurrenceType').value = payload.recurrence_type || 'none';
  document.querySelectorAll('#weekdayCheckboxes input').forEach((checkbox) => {
    checkbox.checked = (payload.recurrence_weekdays || '').split(',').includes(checkbox.value);
  });
  document.getElementById('deleteEventBtn').classList.toggle('d-none', !payload.id);
  syncRecurringEndDate(Boolean(payload.id));
  syncAllDayState();
  toggleWeeklyOptions();
  buildDayLabels(payload.labels || {});
  eventModal.show();
}

function buildDayLabels(existingLabels = {}) {
  const start = document.getElementById('startDate').value;
  const end = document.getElementById('endDate').value;
  const recurrenceType = document.getElementById('recurrenceType').value;
  const container = document.getElementById('dayLabelsContainer');
  container.innerHTML = '';
  if (!start || !end || recurrenceType !== 'none') return;
  const span = getSpanDays(start, end);
  if (!Number.isFinite(span) || span <= 1 || span > 10) return;
  for (let offset = 0; offset < span; offset += 1) {
    const wrapper = document.createElement('div');
    wrapper.className = 'col-md-6';
    wrapper.innerHTML = `
      <label class="form-label">Day ${offset + 1} label</label>
      <input class="form-control" name="label_${offset}" maxlength="200" value="${(existingLabels[offset] || existingLabels[String(offset)] || '').replace(/"/g, '&quot;')}">
    `;
    wrapper.querySelector('input').placeholder = `Day ${offset + 1}: ${document.getElementById('title').value || 'Event title'}`;
    container.appendChild(wrapper);
  }
}

function collectLabels() {
  const labels = {};
  document.querySelectorAll('#dayLabelsContainer input[name^="label_"]').forEach((input) => {
    const value = input.value.trim();
    if (value) labels[input.name.replace('label_', '')] = value;
  });
  return labels;
}

function currentMonthBounds() {
  const monthText = String(view.month).padStart(2, '0');
  const lastDay = new Date(Date.UTC(view.year, view.month, 0)).getUTCDate();
  return { start: `${view.year}-${monthText}-01`, end: `${view.year}-${monthText}-${String(lastDay).padStart(2, '0')}` };
}

function syncRecurringEndDate(preserveExistingRange = false) {
  const recurrenceType = document.getElementById('recurrenceType').value;
  const startInput = document.getElementById('startDate');
  const endInput = document.getElementById('endDate');
  const { start, end } = currentMonthBounds();
  [startInput, endInput].forEach((input) => { input.min = start; input.max = end; });
  if (recurrenceType !== 'none' && startInput.value) {
    if (!preserveExistingRange || !endInput.value || endInput.value < startInput.value) endInput.value = end;
  } else if (startInput.value && (!endInput.value || endInput.value < startInput.value)) {
    endInput.value = startInput.value;
  }
}

function syncAllDayState() {
  const allDay = document.getElementById('allDay').checked;
  document.getElementById('startTime').disabled = allDay;
  document.getElementById('endTime').disabled = allDay;
  if (allDay) {
    document.getElementById('startTime').value = '';
    document.getElementById('endTime').value = '';
  }
}

function toggleWeeklyOptions() {
  const isWeekly = document.getElementById('recurrenceType').value === 'weekly';
  document.getElementById('weeklyOptions').style.display = isWeekly ? 'block' : 'none';
  document.querySelectorAll('#weekdayCheckboxes input').forEach((checkbox) => {
    checkbox.disabled = !isWeekly;
    if (!isWeekly) checkbox.checked = false;
  });
}

function showValidation(message) {
  const validation = document.getElementById('eventValidation');
  validation.textContent = message;
  validation.classList.remove('d-none');
}

function validateEventForm() {
  const title = document.getElementById('title').value.trim();
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const recurrenceType = document.getElementById('recurrenceType').value;
  const startTime = document.getElementById('startTime').value;
  const endTime = document.getElementById('endTime').value;
  const allDay = document.getElementById('allDay').checked;
  const selectedWeekdays = document.querySelectorAll('#weekdayCheckboxes input:checked').length;

  if (!title) return 'Please enter an event title.';
  if (!startDate || !endDate) return 'Please choose both a start date and an end date.';
  const { start: monthStart, end: monthEnd } = currentMonthBounds();
  if (startDate < monthStart || startDate > monthEnd || endDate < monthStart || endDate > monthEnd) return 'Events must stay within the selected month.';
  const span = getSpanDays(startDate, endDate);
  if (!Number.isFinite(span)) return 'Please choose valid event dates.';
  if (span < 1) return 'End date cannot be before start date.';
  if (recurrenceType === 'none' && span > 10) return 'Multi-day events cannot exceed 10 days.';
  if (!allDay && startTime && endTime && startDate === endDate && endTime < startTime) return 'End time cannot be earlier than start time for the same day.';
  if (recurrenceType === 'weekly' && selectedWeekdays === 0) return 'Choose at least one weekday for a weekly recurring event.';
  return '';
}

function saveEvent(event) {
  event.preventDefault();
  const error = validateEventForm();
  if (error) {
    showValidation(error);
    return;
  }
  const id = Number(document.getElementById('eventId').value) || state.nextId;
  const payload = {
    id,
    title: document.getElementById('title').value.trim(),
    start_date: document.getElementById('startDate').value,
    end_date: document.getElementById('endDate').value,
    start_time: document.getElementById('allDay').checked ? '' : document.getElementById('startTime').value,
    end_time: document.getElementById('allDay').checked ? '' : document.getElementById('endTime').value,
    all_day: document.getElementById('allDay').checked,
    location: document.getElementById('location').value.trim(),
    audience: document.getElementById('audience').value,
    notes: document.getElementById('notes').value.trim(),
    recurrence_type: document.getElementById('recurrenceType').value,
    recurrence_weekdays: document.querySelectorAll('#weekdayCheckboxes input:checked').length
      ? Array.from(document.querySelectorAll('#weekdayCheckboxes input:checked')).map((checkbox) => checkbox.value).join(',')
      : '',
    labels: collectLabels(),
  };

  const index = state.events.findIndex((item) => item.id === id);
  if (index >= 0) state.events[index] = payload;
  else {
    state.events.push(payload);
    state.nextId = id + 1;
  }
  saveState();
  renderCalendar();
  eventModal.hide();
  flash('Event saved successfully.');
}

function deleteEvent(id) {
  state.events = state.events.filter((item) => item.id !== id);
  saveState();
  renderCalendar();
  flash('Event deleted.', 'success');
}

function showMenu(menu, x, y) {
  hideMenus();
  if (menu.id === 'dateContextMenu') syncDateMenuLabels();
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.classList.remove('d-none');
}

function hideMenus() {
  document.getElementById('dateContextMenu').classList.add('d-none');
  document.getElementById('eventContextMenu').classList.add('d-none');
}

function pxPerInch() {
  const probe = document.createElement('div');
  probe.style.width = '1in';
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  document.body.appendChild(probe);
  const pixels = probe.getBoundingClientRect().width || 96;
  probe.remove();
  return pixels;
}

function bindUI() {
  document.getElementById('calendarControls').addEventListener('submit', (event) => {
    event.preventDefault();
    view.month = Number(document.getElementById('monthSelect').value);
    view.year = Number(document.getElementById('yearSelect').value);
    renderCalendar();
  });
  document.getElementById('islamicToggle').addEventListener('change', (event) => {
    state.includeIslamic = event.target.checked;
    saveState();
    renderCalendar();
  });
  document.getElementById('holidaysToggle').addEventListener('change', (event) => {
    state.includeHolidays = event.target.checked;
    saveState();
    renderCalendar();
  });
  document.querySelectorAll('[data-print-mode]').forEach((button) => button.addEventListener('click', () => {
    window.print();
  }));
  document.getElementById('exportImageBtn').addEventListener('click', async () => {
    let clone;
    try {
      document.body.classList.add('exporting-calendar');
      const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm');
      const calendarNode = document.getElementById('calendarSheet');
      clone = calendarNode.cloneNode(true);
      clone.style.setProperty('--preview-scale', '1');
      clone.style.transform = 'none';
      clone.style.position = 'fixed';
      clone.style.left = '-10000px';
      clone.style.top = '0';
      clone.style.margin = '0';
      clone.style.boxShadow = 'none';
      document.body.appendChild(clone);

      const targetWidth = 3300;
      const scale = targetWidth / clone.offsetWidth;
      const canvas = await html2canvas(clone, {
        backgroundColor: '#ffffff',
        scale,
        useCORS: true,
        logging: false,
        width: clone.offsetWidth,
        height: clone.offsetHeight,
        windowWidth: clone.offsetWidth,
        windowHeight: clone.offsetHeight,
      });
      const link = document.createElement('a');
      link.download = `calendar-${view.year}-${String(view.month).padStart(2, '0')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      flash('Export failed. Please try again after the calendar fully loads.', 'danger');
    } finally {
      document.body.classList.remove('exporting-calendar');
      if (clone) clone.remove();
    }
  });
  document.getElementById('clearStorageBtn').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    state.events = [];
    state.styles = {};
    state.includeHolidays = true;
    state.nextId = 1;
    state.includeIslamic = false;
    state.hiddenMeta = { holidays: [], islamic: [] };
    hiddenHolidays.clear();
    hiddenIslamic.clear();
    document.getElementById('islamicToggle').checked = false;
    document.getElementById('holidaysToggle').checked = true;
    renderCalendar();
    flash('Saved calendar data was reset for this browser.', 'warning');
  });

  document.getElementById('allDay').addEventListener('change', syncAllDayState);
  document.getElementById('recurrenceType').addEventListener('change', () => {
    syncRecurringEndDate();
    toggleWeeklyOptions();
    buildDayLabels();
  });
  document.getElementById('startDate').addEventListener('change', () => { syncRecurringEndDate(); buildDayLabels(collectLabels()); });
  ['title', 'endDate'].forEach((id) => document.getElementById(id).addEventListener('input', () => buildDayLabels(collectLabels())));
  document.getElementById('eventForm').addEventListener('submit', saveEvent);
  document.getElementById('deleteEventBtn').addEventListener('click', () => {
    const id = Number(document.getElementById('eventId').value);
    if (id) {
      deleteEvent(id);
      eventModal.hide();
    }
  });

  syncRecurringEndDate();

  document.getElementById('contextAddEvent').addEventListener('click', () => {
    hideMenus();
    openEventModal({ start_date: activeDate, end_date: activeDate });
  });
  document.getElementById('contextChangeColor').addEventListener('click', () => {
    hideMenus();
    document.getElementById('dateColorPicker').click();
  });
  document.getElementById('contextClearColor').addEventListener('click', () => {
    hideMenus();
    if (activeDate) {
      delete state.styles[activeDate];
      saveState();
      renderCalendar();
      flash('Custom date color cleared.');
    }
  });
  document.getElementById('contextToggleHoliday').addEventListener('click', () => {
    hideMenus();
    if (!activeDate) return;
    toggleHiddenMeta('holidays', activeDate);
    renderCalendar();
  });
  document.getElementById('contextToggleIslamic').addEventListener('click', () => {
    hideMenus();
    if (!activeDate) return;
    toggleHiddenMeta('islamic', activeDate);
    renderCalendar();
  });
  document.getElementById('dateColorPicker').addEventListener('input', (event) => {
    if (activeDate) {
      state.styles[activeDate] = event.target.value;
      saveState();
      renderCalendar();
      flash('Date color saved.');
    }
  });
  document.getElementById('contextModifyEvent').addEventListener('click', () => {
    hideMenus();
    const source = state.events.find((entry) => entry.id === activeEventId);
    if (source) openEventModal(source);
  });
  document.getElementById('contextMoveEvent').addEventListener('click', () => {
    hideMenus();
    const source = state.events.find((entry) => entry.id === activeEventId);
    if (!source) return;

    const defaultDate = activeEventOccurrenceDate || source.start_date || '';
    const nextStart = window.prompt('Move event to start on (YYYY-MM-DD):', defaultDate);
    if (!nextStart) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextStart)) {
      flash('Please enter the new date in YYYY-MM-DD format.', 'danger');
      return;
    }

    const durationDays = Math.max(1, getSpanDays(source.start_date, source.end_date));
    const movedStart = parseIsoDate(nextStart);
    if (Number.isNaN(movedStart.getTime())) {
      flash('Please enter a valid calendar date.', 'danger');
      return;
    }
    const movedEnd = new Date(movedStart);
    movedEnd.setUTCDate(movedEnd.getUTCDate() + durationDays - 1);

    source.start_date = isoDate(movedStart);
    source.end_date = isoDate(movedEnd);
    saveState();
    renderCalendar();
    flash('Event moved successfully.');
  });
  document.getElementById('contextDeleteEvent').addEventListener('click', () => {
    hideMenus();
    if (activeEventId) deleteEvent(activeEventId);
  });

  ['click', 'scroll', 'resize'].forEach((eventName) => window.addEventListener(eventName, hideMenus, { passive: true }));
  window.addEventListener('resize', () => {
    setMonthGridSizing(buildMonthGrid(view.year, view.month).length);
    updatePreviewScale();
  }, { passive: true });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hideMenus();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initOptions();
  eventModal = new bootstrap.Modal(document.getElementById('eventModal'));
  setupCalendarTitleEditor();
  bindUI();
  renderCalendar();
});

function persistHiddenMeta() {
  state.hiddenMeta = {
    holidays: Array.from(hiddenHolidays),
    islamic: Array.from(hiddenIslamic),
  };
  saveState();
}

function toggleHiddenMeta(type, iso) {
  const target = type === 'holidays' ? hiddenHolidays : hiddenIslamic;
  if (target.has(iso)) target.delete(iso);
  else target.add(iso);
  persistHiddenMeta();
}

function syncDateMenuLabels() {
  const holidayButton = document.getElementById('contextToggleHoliday');
  const islamicButton = document.getElementById('contextToggleIslamic');
  const hasHoliday = Boolean(activeDate && state.includeHolidays !== false && getUSHolidays(view.year, view.month).has(activeDate));
  const hasIslamic = Boolean(activeDate && state.includeIslamic === true);
  holidayButton.disabled = !hasHoliday;
  islamicButton.disabled = !hasIslamic;
  holidayButton.textContent = hiddenHolidays.has(activeDate) ? 'Show U.S. holiday on this day' : 'Hide U.S. holiday on this day';
  islamicButton.textContent = hiddenIslamic.has(activeDate) ? 'Show Islamic date on this day' : 'Hide Islamic date on this day';
}
