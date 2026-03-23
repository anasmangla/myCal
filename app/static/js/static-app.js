const STORAGE_KEY = 'mycal.static.state.v1';
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
  return { events: [], styles: {}, includeHolidays: true, nextId: 1 };
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
const defaults = firstVisibleMonth();
const view = {
  year: defaults.year,
  month: defaults.month,
  selectedWeekIndex: 0,
};
let activeDate = null;
let activeEventId = null;
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

  document.getElementById('holidaysToggle').checked = state.includeHolidays !== false;
}

function renderCalendar() {
  document.getElementById('monthSelect').value = String(view.month);
  document.getElementById('yearSelect').value = String(view.year);
  document.getElementById('calendarTitle').textContent = `${MONTH_NAMES[view.month - 1]} ${view.year}`;

  const grid = buildMonthGrid(view.year, view.month);
  const visibleStart = isoDate(grid[0][0]);
  const visibleEnd = isoDate(grid[grid.length - 1][6]);
  const holidayMap = state.includeHolidays !== false ? getUSHolidays(view.year, view.month) : new Map();
  const longWeekends = state.includeHolidays !== false ? detectLongWeekends(holidayMap) : new Set();
  const occurrences = getVisibleEvents(visibleStart, visibleEnd);
  holidayMap.forEach((name, key) => {
    occurrences[key] ||= [];
    occurrences[key].unshift({ source_event_id: null, display_text: name, title: name, location: null, notes: 'U.S. federal holiday', is_holiday: true, all_day: true, color: '#7c3aed' });
  });

  const body = document.getElementById('calendarBody');
  body.innerHTML = '';
  const weekSelect = document.getElementById('weekPrintSelect');
  weekSelect.innerHTML = '';

  grid.forEach((week, weekIndex) => {
    const inMonthDays = week.filter((day) => day.getUTCMonth() === view.month - 1);
    const labelStart = inMonthDays[0] || week[0];
    const labelEnd = inMonthDays[inMonthDays.length - 1] || week[6];
    const option = document.createElement('option');
    option.value = String(weekIndex);
    option.textContent = `Week ${weekIndex + 1} · ${labelStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} – ${labelEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
    weekSelect.appendChild(option);

    const row = document.createElement('div');
    row.className = `calendar-grid week-row ${weekIndex === view.selectedWeekIndex ? 'selected-week' : ''}`;
    row.dataset.weekIndex = String(weekIndex);
    row.addEventListener('click', () => setSelectedWeek(weekIndex));

    week.forEach((day) => {
      const key = isoDate(day);
      const cell = document.createElement('div');
      cell.className = 'calendar-cell';
      if (day.getUTCDay() === 0 || day.getUTCDay() === 6) cell.classList.add('weekend');
      if (day.getUTCMonth() !== view.month - 1) cell.classList.add('outside-month');
      if (holidayMap.has(key)) cell.classList.add('holiday');
      if (longWeekends.has(key)) cell.classList.add('long-weekend');
      if (state.styles[key]) cell.style.background = state.styles[key];
      cell.dataset.date = key;
      cell.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        activeDate = key;
        showMenu(document.getElementById('dateContextMenu'), event.pageX, event.pageY);
      });

      const holidayText = holidayMap.get(key) || '';
      cell.innerHTML = `
        <div class="calendar-cell-header">
          <button type="button" class="btn btn-sm btn-light date-action-btn no-print" aria-label="Date actions">⋮</button>
          <div><div class="day-number">${day.getUTCDate()}</div></div>
        </div>
        <div class="holiday-pill small ${longWeekends.has(key) ? 'holiday-pill-long' : ''}">${holidayText}</div>
        <div class="event-list"></div>
        <button type="button" class="btn btn-outline-secondary btn-sm w-100 mt-2 no-print quick-add-btn">+ Add</button>
      `;

      cell.querySelector('.quick-add-btn').addEventListener('click', () => openEventModal({ start_date: key, end_date: key }));
      cell.querySelector('.date-action-btn').addEventListener('click', () => openEventModal({ start_date: key, end_date: key }));
      cell.querySelector('.date-action-btn').addEventListener('contextmenu', (event) => {
        event.preventDefault();
        activeDate = key;
        showMenu(document.getElementById('dateContextMenu'), event.pageX, event.pageY);
      });

      const list = cell.querySelector('.event-list');
      (occurrences[key] || []).forEach((item) => {
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
          showMenu(document.getElementById('eventContextMenu'), event.pageX, event.pageY);
        });
        list.appendChild(chip);
      });

      row.appendChild(cell);
    });

    body.appendChild(row);
  });

  weekSelect.value = String(view.selectedWeekIndex);
}

function setSelectedWeek(index) {
  view.selectedWeekIndex = Number(index);
  document.querySelectorAll('.week-row').forEach((row) => row.classList.toggle('selected-week', row.dataset.weekIndex === String(view.selectedWeekIndex)));
  document.getElementById('weekPrintSelect').value = String(view.selectedWeekIndex);
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
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.classList.remove('d-none');
}

function hideMenus() {
  document.getElementById('dateContextMenu').classList.add('d-none');
  document.getElementById('eventContextMenu').classList.add('d-none');
}

function bindUI() {
  document.getElementById('calendarControls').addEventListener('submit', (event) => {
    event.preventDefault();
    view.month = Number(document.getElementById('monthSelect').value);
    view.year = Number(document.getElementById('yearSelect').value);
    renderCalendar();
  });
  document.getElementById('holidaysToggle').addEventListener('change', (event) => {
    state.includeHolidays = event.target.checked;
    saveState();
    renderCalendar();
  });
  document.getElementById('weekPrintSelect').addEventListener('change', (event) => setSelectedWeek(event.target.value));
  document.querySelectorAll('[data-print-mode]').forEach((button) => button.addEventListener('click', () => {
    document.body.classList.toggle('print-week', button.dataset.printMode === 'week');
    window.print();
  }));
  window.addEventListener('afterprint', () => document.body.classList.remove('print-week'));
  document.getElementById('exportImageBtn').addEventListener('click', async () => {
    try {
      document.body.classList.add('exporting-calendar');
      const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm');
      const canvas = await html2canvas(document.getElementById('calendarCapture'), { backgroundColor: '#ffffff', scale: Math.max(window.devicePixelRatio || 1, 2), useCORS: true, logging: false });
      const link = document.createElement('a');
      link.download = `calendar-${view.year}-${String(view.month).padStart(2, '0')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      flash('Export failed. Please try again after the calendar fully loads.', 'danger');
    } finally {
      document.body.classList.remove('exporting-calendar');
    }
  });
  document.getElementById('clearStorageBtn').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    state.events = [];
    state.styles = {};
    state.includeHolidays = true;
    state.nextId = 1;
    document.getElementById('holidaysToggle').checked = true;
    renderCalendar();
    flash('Saved calendar data was reset for this browser.', 'warning');
  });

  document.getElementById('allDay').addEventListener('change', syncAllDayState);
  document.getElementById('recurrenceType').addEventListener('change', () => {
    toggleWeeklyOptions();
    buildDayLabels();
  });
  ['title', 'startDate', 'endDate'].forEach((id) => document.getElementById(id).addEventListener('input', () => buildDayLabels(collectLabels())));
  document.getElementById('eventForm').addEventListener('submit', saveEvent);
  document.getElementById('deleteEventBtn').addEventListener('click', () => {
    const id = Number(document.getElementById('eventId').value);
    if (id) {
      deleteEvent(id);
      eventModal.hide();
    }
  });

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
  document.getElementById('dateColorPicker').addEventListener('input', (event) => {
    if (activeDate) {
      state.styles[activeDate] = event.target.value;
      saveState();
      renderCalendar();
      flash('Date color saved.');
    }
  });
  document.getElementById('contextEditEvent').addEventListener('click', () => {
    hideMenus();
    const source = state.events.find((entry) => entry.id === activeEventId);
    if (source) openEventModal(source);
  });
  document.getElementById('contextDeleteEvent').addEventListener('click', () => {
    hideMenus();
    if (activeEventId) deleteEvent(activeEventId);
  });

  ['click', 'scroll', 'resize'].forEach((eventName) => window.addEventListener(eventName, hideMenus, { passive: true }));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hideMenus();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initOptions();
  eventModal = new bootstrap.Modal(document.getElementById('eventModal'));
  bindUI();
  renderCalendar();
});
