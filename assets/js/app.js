const STORAGE_KEY = 'mycal-static-v1';
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const GROUP_COLORS = {
  Lajna: '#c2185b',
  Nasirat: '#f8a8d4',
  Ansar: '#1f4f99',
  Khuddam: '#112d5c',
  Atfal: '#7fc8ff',
  'Tahir Academy': '#2f855a',
  All: '#111111',
  Unspecified: '#4b5563',
};

const DEFAULT_STATE = {
  selectedYear: null,
  selectedMonth: null,
  includeHolidays: true,
  events: [],
  dateStyles: {},
  startupShown: false,
};

const state = loadState();
const refs = {};
let activeDate = '';
let activeEventId = '';

initialize();

function initialize() {
  cacheRefs();
  buildStaticUi();
  bindEvents();
  ensureSelectedMonth();
  maybeShowStartupModal();
  render();
}

function cacheRefs() {
  const ids = [
    'monthHeading', 'monthMeta', 'printMonthHeading', 'printMeta', 'weekdaysRow', 'calendarGrid', 'holidayToggle', 'weekSelect',
    'startupModalBackdrop', 'startupMonth', 'startupYear', 'startupOpenBtn', 'startupCancelBtn', 'changeMonthBtn', 'todayBtn',
    'prevMonthBtn', 'nextMonthBtn', 'statusBanner', 'groupLegend', 'eventModalBackdrop', 'eventForm', 'eventId', 'eventTitle',
    'eventAudience', 'eventStartDate', 'eventEndDate', 'eventAllDay', 'eventTimeLabel', 'eventLocation', 'eventRecurrence',
    'eventNotes', 'eventFormError', 'weekdayCheckboxes', 'weekdayPicker', 'dayLabelFields', 'dateActionModalBackdrop',
    'dateActionText', 'modalAddEventBtn', 'modalColorDateBtn', 'modalClearDateColorBtn', 'dateContextMenu', 'eventContextMenu',
    'dateColorPicker', 'addEventBtn', 'dateColorBtn', 'clearDateColorBtn', 'printMonthBtn', 'printWeekBtn', 'exportImageBtn',
    'exportJsonBtn', 'importJsonInput',
  ];
  ids.forEach((id) => { refs[id] = document.getElementById(id); });
}

function buildStaticUi() {
  WEEKDAY_SHORT.forEach((name) => {
    const cell = document.createElement('div');
    cell.className = 'weekday-cell';
    cell.textContent = name;
    refs.weekdaysRow.appendChild(cell);
  });

  Object.entries(GROUP_COLORS).forEach(([group, color]) => {
    const chip = document.createElement('div');
    chip.className = 'legend-chip';
    chip.innerHTML = `<span class="legend-swatch" style="background:${color}"></span><span>${group}</span>`;
    refs.groupLegend.appendChild(chip);

    const option = document.createElement('option');
    option.value = group;
    option.textContent = group;
    refs.eventAudience.appendChild(option);
  });

  WEEKDAY_NAMES.forEach((name, index) => {
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" value="${index}"><span>${name}</span>`;
    refs.weekdayCheckboxes.appendChild(label);
  });

  MONTH_NAMES.forEach((month, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = month;
    refs.startupMonth.appendChild(option);
  });

  const currentYear = new Date().getFullYear();
  for (let year = currentYear - 2; year <= currentYear + 5; year += 1) {
    const option = document.createElement('option');
    option.value = String(year);
    option.textContent = String(year);
    refs.startupYear.appendChild(option);
  }
}

function bindEvents() {
  refs.startupOpenBtn.addEventListener('click', () => {
    state.selectedMonth = Number(refs.startupMonth.value);
    state.selectedYear = Number(refs.startupYear.value);
    state.startupShown = true;
    saveState();
    closeModal(refs.startupModalBackdrop);
    render();
  });

  refs.startupCancelBtn.addEventListener('click', () => {
    state.startupShown = true;
    saveState();
    closeModal(refs.startupModalBackdrop);
    render();
  });

  refs.changeMonthBtn.addEventListener('click', openStartupModal);
  refs.todayBtn.addEventListener('click', () => {
    const next = getDefaultMonthYear();
    state.selectedMonth = next.month;
    state.selectedYear = next.year;
    saveState();
    render();
    setStatus('Jumped to next month from today.');
  });
  refs.prevMonthBtn.addEventListener('click', () => shiftMonth(-1));
  refs.nextMonthBtn.addEventListener('click', () => shiftMonth(1));

  refs.holidayToggle.addEventListener('change', () => {
    state.includeHolidays = refs.holidayToggle.checked;
    saveState();
    render();
  });

  refs.weekSelect.addEventListener('change', () => setSelectedWeek(Number(refs.weekSelect.value || 0)));

  refs.addEventBtn.addEventListener('click', () => {
    const firstVisibleDate = getMonthGrid(state.selectedYear, state.selectedMonth).flat().find((day) => day.month === state.selectedMonth);
    openEventModal({ startDate: formatDate(firstVisibleDate.date), endDate: formatDate(firstVisibleDate.date) });
  });
  refs.dateColorBtn.addEventListener('click', () => {
    activeDate = activeDate || formatDate(new Date(state.selectedYear, state.selectedMonth, 1));
    refs.dateColorPicker.click();
  });
  refs.clearDateColorBtn.addEventListener('click', () => {
    if (!activeDate) return setStatus('Select a date first from the calendar.');
    delete state.dateStyles[activeDate];
    saveState();
    render();
    setStatus(`Cleared custom background for ${activeDate}.`);
  });

  refs.modalAddEventBtn.addEventListener('click', () => {
    closeModal(refs.dateActionModalBackdrop);
    openEventModal({ startDate: activeDate, endDate: activeDate });
  });
  refs.modalColorDateBtn.addEventListener('click', () => {
    closeModal(refs.dateActionModalBackdrop);
    refs.dateColorPicker.click();
  });
  refs.modalClearDateColorBtn.addEventListener('click', () => {
    closeModal(refs.dateActionModalBackdrop);
    if (activeDate) {
      delete state.dateStyles[activeDate];
      saveState();
      render();
      setStatus(`Cleared custom background for ${activeDate}.`);
    }
  });

  refs.dateColorPicker.addEventListener('input', () => {
    if (!activeDate) return;
    state.dateStyles[activeDate] = refs.dateColorPicker.value;
    saveState();
    render();
    setStatus(`Updated background color for ${activeDate}.`);
  });

  document.querySelectorAll('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.closeModal;
      if (target === 'event') closeModal(refs.eventModalBackdrop);
      if (target === 'dateAction') closeModal(refs.dateActionModalBackdrop);
    });
  });

  refs.eventForm.addEventListener('submit', handleEventSubmit);
  refs.eventAllDay.addEventListener('change', syncTimeLabelPlaceholder);
  refs.eventRecurrence.addEventListener('change', () => {
    toggleWeekdayPicker();
    renderDayLabelFields(readCurrentDayLabels());
  });
  refs.eventTitle.addEventListener('input', () => renderDayLabelFields(readCurrentDayLabels()));
  refs.eventStartDate.addEventListener('change', () => renderDayLabelFields(readCurrentDayLabels()));
  refs.eventEndDate.addEventListener('change', () => renderDayLabelFields(readCurrentDayLabels()));

  refs.printMonthBtn.addEventListener('click', () => printCalendar('month'));
  refs.printWeekBtn.addEventListener('click', () => printCalendar('week'));
  refs.exportImageBtn.addEventListener('click', exportCalendarAsImage);
  refs.exportJsonBtn.addEventListener('click', exportBackupJson);
  refs.importJsonInput.addEventListener('change', importBackupJson);

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.menu')) hideMenus();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      hideMenus();
      closeModal(refs.eventModalBackdrop);
      closeModal(refs.dateActionModalBackdrop);
    }
  });
  window.addEventListener('resize', hideMenus);
  window.addEventListener('scroll', hideMenus, { passive: true });
}

function ensureSelectedMonth() {
  if (Number.isInteger(state.selectedMonth) && Number.isInteger(state.selectedYear)) return;
  const next = getDefaultMonthYear();
  state.selectedMonth = next.month;
  state.selectedYear = next.year;
  saveState();
}

function maybeShowStartupModal() {
  const next = getDefaultMonthYear();
  refs.startupMonth.value = String(state.selectedMonth ?? next.month);
  refs.startupYear.value = String(state.selectedYear ?? next.year);
  if (!state.startupShown) openModal(refs.startupModalBackdrop);
  else closeModal(refs.startupModalBackdrop);
}

function openStartupModal() {
  refs.startupMonth.value = String(state.selectedMonth);
  refs.startupYear.value = String(state.selectedYear);
  openModal(refs.startupModalBackdrop);
}

function render() {
  refs.holidayToggle.checked = !!state.includeHolidays;
  const visibleDate = new Date(state.selectedYear, state.selectedMonth, 1);
  const monthName = `${MONTH_NAMES[state.selectedMonth]} ${state.selectedYear}`;
  refs.monthHeading.textContent = monthName;
  refs.printMonthHeading.textContent = monthName;
  refs.monthMeta.textContent = state.includeHolidays ? 'Federal holidays and long weekends are visible.' : 'Federal holidays are hidden.';
  refs.printMeta.textContent = `${state.includeHolidays ? 'Includes' : 'Excludes'} U.S. federal holidays. Sunday is the first day of the week.`;
  const weeks = getMonthGrid(state.selectedYear, state.selectedMonth);
  const holidays = state.includeHolidays ? getFederalHolidays(state.selectedYear, state.selectedMonth) : {};
  const longWeekendDates = state.includeHolidays ? getLongWeekendDates(holidays) : new Set();
  const renderedEvents = getRenderedEventsForMonth(state.selectedYear, state.selectedMonth, holidays);
  renderWeekSelector(weeks);
  renderCalendarGrid(weeks, renderedEvents, holidays, longWeekendDates, visibleDate);
  saveState();
}

function renderWeekSelector(weeks) {
  const previous = Number(refs.weekSelect.value || 0);
  refs.weekSelect.innerHTML = '';
  weeks.forEach((week, index) => {
    const start = week[0].date;
    const end = week[6].date;
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `Week ${index + 1}: ${MONTH_NAMES[start.getMonth()].slice(0, 3)} ${start.getDate()} - ${MONTH_NAMES[end.getMonth()].slice(0, 3)} ${end.getDate()}`;
    refs.weekSelect.appendChild(option);
  });
  refs.weekSelect.value = String(Math.min(previous, weeks.length - 1));
}

function renderCalendarGrid(weeks, renderedEvents, holidays, longWeekendDates) {
  refs.calendarGrid.innerHTML = '';
  weeks.forEach((week, weekIndex) => {
    const row = document.createElement('div');
    row.className = 'week-row';
    row.dataset.weekIndex = String(weekIndex);
    if (weekIndex === Number(refs.weekSelect.value || 0)) row.classList.add('selected-week');
    row.addEventListener('click', () => setSelectedWeek(weekIndex));

    week.forEach((item) => {
      const iso = formatDate(item.date);
      const cell = document.createElement('article');
      cell.className = 'calendar-day';
      cell.dataset.date = iso;
      if (item.month !== state.selectedMonth) cell.classList.add('outside-month');
      if (item.date.getDay() === 0 || item.date.getDay() === 6) cell.classList.add('weekend');
      if (longWeekendDates.has(iso)) cell.classList.add('long-weekend');
      if (state.dateStyles[iso]) cell.style.background = state.dateStyles[iso];
      activeDate ||= iso;

      cell.addEventListener('contextmenu', (event) => openDateContextMenu(event, iso));

      const header = document.createElement('div');
      header.className = 'calendar-day-header';
      header.innerHTML = `
        <div class="day-number-wrap">
          <span class="day-number">${item.date.getDate()}</span>
          <span class="day-name-mobile">${WEEKDAY_SHORT[item.date.getDay()]}</span>
        </div>
        <button type="button" class="icon-button date-action-inline" aria-label="Date actions">⋮</button>
      `;
      header.querySelector('button').addEventListener('click', (event) => {
        event.stopPropagation();
        activeDate = iso;
        refs.dateActionText.textContent = `Manage ${MONTH_NAMES[item.date.getMonth()]} ${item.date.getDate()}, ${item.date.getFullYear()}.`;
        openModal(refs.dateActionModalBackdrop);
      });
      cell.appendChild(header);

      const holidayLabel = document.createElement('div');
      holidayLabel.className = 'holiday-label';
      holidayLabel.textContent = holidays[iso] || '';
      cell.appendChild(holidayLabel);

      const eventList = document.createElement('div');
      eventList.className = 'event-list';
      (renderedEvents[iso] || []).forEach((eventItem) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `event-chip${eventItem.isHoliday ? ' holiday-chip' : ''}`;
        button.style.background = eventItem.color;
        button.innerHTML = `<span>${escapeHtml(eventItem.displayText)}</span>${eventItem.subline ? `<small>${escapeHtml(eventItem.subline)}</small>` : ''}`;
        button.title = [eventItem.title, eventItem.location, eventItem.notes].filter(Boolean).join(' • ');
        if (!eventItem.isHoliday) {
          button.addEventListener('click', (evt) => {
            evt.stopPropagation();
            openEventEditor(eventItem.sourceEventId);
          });
          button.addEventListener('contextmenu', (evt) => {
            evt.preventDefault();
            evt.stopPropagation();
            activeEventId = eventItem.sourceEventId;
            openEventMenu(evt.pageX, evt.pageY);
          });
        }
        eventList.appendChild(button);
      });
      cell.appendChild(eventList);

      const quickActions = document.createElement('div');
      quickActions.className = 'quick-actions no-print';
      quickActions.innerHTML = `
        <button type="button" class="quick-pill">+ Event</button>
        <button type="button" class="quick-pill">Color</button>
      `;
      quickActions.children[0].addEventListener('click', (event) => {
        event.stopPropagation();
        activeDate = iso;
        openEventModal({ startDate: iso, endDate: iso });
      });
      quickActions.children[1].addEventListener('click', (event) => {
        event.stopPropagation();
        activeDate = iso;
        refs.dateColorPicker.click();
      });
      cell.appendChild(quickActions);

      row.appendChild(cell);
    });

    refs.calendarGrid.appendChild(row);
  });
}

function setSelectedWeek(index) {
  refs.weekSelect.value = String(index);
  document.querySelectorAll('.week-row').forEach((row) => {
    row.classList.toggle('selected-week', row.dataset.weekIndex === String(index));
  });
}

function openDateContextMenu(event, iso) {
  event.preventDefault();
  activeDate = iso;
  refs.dateActionText.textContent = `Manage ${iso}.`;
  positionMenu(refs.dateContextMenu, event.pageX, event.pageY);
}

function openEventMenu(x, y) {
  positionMenu(refs.eventContextMenu, x, y);
}

refs.dateContextMenu?.addEventListener('click', (event) => {
  const action = event.target.dataset.menuAction;
  if (!action) return;
  hideMenus();
  if (action === 'add-event') openEventModal({ startDate: activeDate, endDate: activeDate });
  if (action === 'color-date') refs.dateColorPicker.click();
  if (action === 'clear-date-color') {
    delete state.dateStyles[activeDate];
    saveState();
    render();
    setStatus(`Cleared custom background for ${activeDate}.`);
  }
});

refs.eventContextMenu?.addEventListener('click', (event) => {
  if (event.target.dataset.menuAction !== 'delete-event') return;
  hideMenus();
  const found = state.events.find((item) => item.id === activeEventId);
  if (!found) return;
  state.events = state.events.filter((item) => item.id !== activeEventId);
  saveState();
  render();
  setStatus(`Deleted "${found.title}".`);
});

function positionMenu(menu, x, y) {
  hideMenus();
  menu.style.left = `${Math.min(x, window.innerWidth - 260)}px`;
  menu.style.top = `${Math.min(y, window.innerHeight - 180)}px`;
  menu.classList.remove('hidden');
}

function hideMenus() {
  refs.dateContextMenu.classList.add('hidden');
  refs.eventContextMenu.classList.add('hidden');
}

function openEventEditor(eventId) {
  const found = state.events.find((item) => item.id === eventId);
  if (!found) return;
  openEventModal(found);
}

function openEventModal(payload = {}) {
  refs.eventForm.reset();
  refs.eventFormError.textContent = '';
  refs.eventId.value = payload.id || '';
  refs.eventTitle.value = payload.title || '';
  refs.eventAudience.value = payload.audience || 'Unspecified';
  refs.eventStartDate.value = payload.startDate || activeDate || formatDate(new Date(state.selectedYear, state.selectedMonth, 1));
  refs.eventEndDate.value = payload.endDate || refs.eventStartDate.value;
  refs.eventAllDay.checked = !!payload.allDay;
  refs.eventTimeLabel.value = payload.timeLabel || '';
  refs.eventLocation.value = payload.location || '';
  refs.eventRecurrence.value = payload.recurrence?.type || 'none';
  refs.eventNotes.value = payload.notes || '';
  refs.weekdayCheckboxes.querySelectorAll('input').forEach((input) => {
    input.checked = (payload.recurrence?.weekdays || []).includes(Number(input.value));
  });
  toggleWeekdayPicker();
  syncTimeLabelPlaceholder();
  renderDayLabelFields(payload.dayLabels || {});
  openModal(refs.eventModalBackdrop);
}

function renderDayLabelFields(existingLabels = {}) {
  refs.dayLabelFields.innerHTML = '';
  if (refs.eventRecurrence.value !== 'none') return;
  const span = getSpanDays(refs.eventStartDate.value, refs.eventEndDate.value);
  if (!Number.isFinite(span) || span <= 1 || span > 10) return;
  for (let offset = 0; offset < span; offset += 1) {
    const label = document.createElement('label');
    const value = existingLabels[offset] || existingLabels[String(offset)] || '';
    label.innerHTML = `<span>Day ${offset + 1} label</span><input type="text" maxlength="200" data-label-offset="${offset}" value="${escapeHtmlAttr(value)}" placeholder="Day ${offset + 1}: ${escapeHtmlAttr(refs.eventTitle.value || 'Event title')}">`;
    refs.dayLabelFields.appendChild(label);
  }
}

function readCurrentDayLabels() {
  const labels = {};
  refs.dayLabelFields.querySelectorAll('input[data-label-offset]').forEach((input) => {
    labels[input.dataset.labelOffset] = input.value;
  });
  return labels;
}

function toggleWeekdayPicker() {
  const visible = refs.eventRecurrence.value === 'weekly';
  refs.weekdayPicker.style.display = visible ? 'block' : 'none';
}

function syncTimeLabelPlaceholder() {
  refs.eventTimeLabel.placeholder = refs.eventAllDay.checked ? 'All day' : '6:30pm';
}

function handleEventSubmit(event) {
  event.preventDefault();
  const error = validateEventForm();
  if (error) {
    refs.eventFormError.textContent = error;
    return;
  }

  const payload = {
    id: refs.eventId.value || crypto.randomUUID(),
    title: refs.eventTitle.value.trim(),
    audience: refs.eventAudience.value,
    startDate: refs.eventStartDate.value,
    endDate: refs.eventEndDate.value,
    allDay: refs.eventAllDay.checked,
    timeLabel: refs.eventTimeLabel.value.trim(),
    location: refs.eventLocation.value.trim(),
    notes: refs.eventNotes.value.trim(),
    recurrence: {
      type: refs.eventRecurrence.value,
      weekdays: refs.eventRecurrence.value === 'weekly'
        ? Array.from(refs.weekdayCheckboxes.querySelectorAll('input:checked')).map((input) => Number(input.value))
        : [],
    },
    dayLabels: readCurrentDayLabels(),
    createdAt: new Date().toISOString(),
  };

  state.events = state.events.filter((item) => item.id !== payload.id).concat(payload);
  saveState();
  closeModal(refs.eventModalBackdrop);
  render();
  setStatus(`Saved "${payload.title}".`);
}

function validateEventForm() {
  if (!refs.eventTitle.value.trim()) return 'Please enter event text.';
  if (!refs.eventStartDate.value || !refs.eventEndDate.value) return 'Please choose both start and end dates.';
  const span = getSpanDays(refs.eventStartDate.value, refs.eventEndDate.value);
  if (!Number.isFinite(span) || span < 1) return 'End date cannot be before start date.';
  if (refs.eventRecurrence.value === 'none' && span > 10) return 'Multi-day events cannot exceed 10 days.';
  if (refs.eventRecurrence.value === 'weekly' && refs.weekdayCheckboxes.querySelectorAll('input:checked').length === 0) {
    return 'Choose at least one weekday for weekly recurrence.';
  }
  return '';
}

function printCalendar(mode) {
  document.body.classList.toggle('print-week', mode === 'week');
  window.print();
  window.setTimeout(() => document.body.classList.remove('print-week'), 100);
}

async function exportCalendarAsImage() {
  try {
    setStatus('Preparing image export...');
    const module = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm');
    const canvas = await module.default(document.getElementById('calendarCapture'), {
      backgroundColor: '#ffffff',
      scale: Math.max(window.devicePixelRatio || 1, 2),
      useCORS: true,
      logging: false,
    });
    const link = document.createElement('a');
    link.download = `mycal-${state.selectedYear}-${String(state.selectedMonth + 1).padStart(2, '0')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setStatus('Downloaded visible calendar image.');
  } catch (error) {
    console.error(error);
    setStatus('Image export failed. Try again after the page fully loads.');
  }
}

function exportBackupJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.download = `mycal-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
  setStatus('Exported local backup JSON.');
}

async function importBackupJson(event) {
  const [file] = event.target.files || [];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    state.selectedYear = Number(parsed.selectedYear) || getDefaultMonthYear().year;
    state.selectedMonth = Number(parsed.selectedMonth) || getDefaultMonthYear().month;
    state.includeHolidays = parsed.includeHolidays !== false;
    state.events = Array.isArray(parsed.events) ? parsed.events : [];
    state.dateStyles = parsed.dateStyles && typeof parsed.dateStyles === 'object' ? parsed.dateStyles : {};
    state.startupShown = true;
    saveState();
    render();
    setStatus('Imported backup JSON successfully.');
  } catch (error) {
    console.error(error);
    setStatus('Import failed. Please choose a valid myCal backup JSON file.');
  } finally {
    refs.importJsonInput.value = '';
  }
}

function getRenderedEventsForMonth(year, month, holidays) {
  const map = {};
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  state.events.forEach((eventItem) => {
    const occurrences = buildEventOccurrences(eventItem, monthStart, monthEnd);
    occurrences.forEach((occurrence) => {
      const iso = occurrence.date;
      map[iso] ||= [];
      map[iso].push({
        sourceEventId: eventItem.id,
        title: eventItem.title,
        location: eventItem.location,
        notes: eventItem.notes,
        color: GROUP_COLORS[eventItem.audience] || GROUP_COLORS.Unspecified,
        displayText: occurrence.displayText,
        subline: occurrence.subline,
        isHoliday: false,
      });
    });
  });

  if (state.includeHolidays) {
    Object.entries(holidays).forEach(([iso, holidayName]) => {
      map[iso] ||= [];
      map[iso].unshift({
        sourceEventId: '',
        title: holidayName,
        location: '',
        notes: '',
        color: 'var(--holiday-pill)',
        displayText: holidayName,
        subline: 'All day',
        isHoliday: true,
      });
    });
  }

  Object.values(map).forEach((items) => {
    items.sort((left, right) => sortEventDisplay(left.displayText, right.displayText));
  });

  return map;
}

function buildEventOccurrences(eventItem, monthStart, monthEnd) {
  const result = [];
  const start = parseDateOnly(eventItem.startDate);
  const end = parseDateOnly(eventItem.endDate);
  if (!start || !end) return result;
  const recurrenceType = eventItem.recurrence?.type || 'none';

  if (recurrenceType === 'none') {
    const span = Math.min(getSpanDays(eventItem.startDate, eventItem.endDate), 10);
    for (let offset = 0; offset < span; offset += 1) {
      const current = addDays(start, offset);
      if (current < monthStart || current > monthEnd) continue;
      result.push(buildOccurrence(eventItem, current, offset));
    }
    return result;
  }

  if (recurrenceType === 'daily') {
    const anchorDay = start.getDate();
    const span = Math.min(getSpanDays(eventItem.startDate, eventItem.endDate), 10);
    for (let day = new Date(monthStart); day <= monthEnd; day = addDays(day, 1)) {
      const offset = day.getDate() - anchorDay;
      if (offset < 0) continue;
      if (offset >= span) {
        result.push(buildOccurrence(eventItem, day, 0, 'Recurring daily'));
      } else {
        result.push(buildOccurrence(eventItem, day, offset, 'Recurring daily'));
      }
    }
    return result;
  }

  if (recurrenceType === 'weekly') {
    const weekdays = eventItem.recurrence?.weekdays || [start.getDay()];
    for (let day = new Date(monthStart); day <= monthEnd; day = addDays(day, 1)) {
      if (!weekdays.includes(day.getDay())) continue;
      result.push(buildOccurrence(eventItem, day, 0, 'Recurring weekly'));
    }
  }

  return result;
}

function buildOccurrence(eventItem, date, offset = 0, recurrenceLabel = '') {
  const labelOverride = eventItem.dayLabels?.[offset] || eventItem.dayLabels?.[String(offset)] || '';
  const timePrefix = eventItem.allDay ? 'All day' : (eventItem.timeLabel || parseTimePrefix(eventItem.title));
  const formattedTitle = labelOverride || eventItem.title;
  const displayText = eventItem.allDay ? formattedTitle : [timePrefix, stripLeadingTime(formattedTitle)].filter(Boolean).join(' ');
  const details = [
    eventItem.location ? `@ ${eventItem.location}` : '',
    recurrenceLabel,
  ].filter(Boolean).join(' • ');

  return {
    date: formatDate(date),
    displayText,
    subline: details || (eventItem.allDay ? 'All day' : ''),
  };
}

function sortEventDisplay(left, right) {
  const getRank = (value) => {
    if (value.toLowerCase().startsWith('all day')) return 0;
    const match = value.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (!match) return 9999;
    let hour = Number(match[1]) % 12;
    if (match[3].toLowerCase() === 'pm') hour += 12;
    return (hour * 60) + Number(match[2] || 0);
  };
  return getRank(left) - getRank(right) || left.localeCompare(right);
}

function parseTimePrefix(text) {
  const match = text.match(/^(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
  return match ? match[1].replace(/\s+/g, '') : '';
}

function stripLeadingTime(text) {
  return text.replace(/^(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*/i, '').trim() || text;
}

function getMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const gridStart = addDays(first, -first.getDay());
  const weeks = [];
  let cursor = new Date(gridStart);
  for (let week = 0; week < 6; week += 1) {
    const row = [];
    for (let day = 0; day < 7; day += 1) {
      row.push({ date: new Date(cursor), month: cursor.getMonth() });
      cursor = addDays(cursor, 1);
    }
    weeks.push(row);
  }
  return weeks;
}

function getFederalHolidays(year, month) {
  const holidays = {
    [formatDate(nthWeekdayOfMonth(year, 0, 1, 3))]: 'Birthday of Martin Luther King, Jr.',
    [formatDate(nthWeekdayOfMonth(year, 1, 1, 3))]: "Washington's Birthday",
    [formatDate(lastWeekdayOfMonth(year, 4, 1))]: 'Memorial Day',
    [formatDate(observedDate(new Date(year, 5, 19)))]: 'Juneteenth National Independence Day',
    [formatDate(observedDate(new Date(year, 6, 4)))]: 'Independence Day',
    [formatDate(nthWeekdayOfMonth(year, 8, 1, 1))]: 'Labor Day',
    [formatDate(nthWeekdayOfMonth(year, 9, 1, 2))]: 'Columbus Day',
    [formatDate(observedDate(new Date(year, 10, 11)))]: 'Veterans Day',
    [formatDate(nthWeekdayOfMonth(year, 10, 4, 4))]: 'Thanksgiving Day',
    [formatDate(observedDate(new Date(year, 11, 25)))]: 'Christmas Day',
    [formatDate(observedDate(new Date(year, 0, 1)))]: "New Year's Day",
  };

  const visible = {};
  Object.entries(holidays).forEach(([iso, name]) => {
    const date = parseDateOnly(iso);
    if (date.getMonth() === month) visible[iso] = name;
  });
  return visible;
}

function getLongWeekendDates(holidays) {
  const result = new Set();
  Object.keys(holidays).forEach((iso) => {
    const date = parseDateOnly(iso);
    const day = date.getDay();
    result.add(iso);
    if (day === 5) {
      result.add(formatDate(addDays(date, -1)));
      result.add(formatDate(addDays(date, 1)));
      result.add(formatDate(addDays(date, 2)));
    }
    if (day === 1) {
      result.add(formatDate(addDays(date, -2)));
      result.add(formatDate(addDays(date, -1)));
      result.add(formatDate(addDays(date, 1)));
    }
  });
  return result;
}

function nthWeekdayOfMonth(year, month, weekday, nth) {
  const first = new Date(year, month, 1);
  const offset = (7 + weekday - first.getDay()) % 7;
  return new Date(year, month, 1 + offset + ((nth - 1) * 7));
}

function lastWeekdayOfMonth(year, month, weekday) {
  const last = new Date(year, month + 1, 0);
  const offset = (7 + last.getDay() - weekday) % 7;
  return new Date(year, month, last.getDate() - offset);
}

function observedDate(date) {
  if (date.getDay() === 0) return addDays(date, 1);
  if (date.getDay() === 6) return addDays(date, -1);
  return date;
}

function shiftMonth(delta) {
  const next = new Date(state.selectedYear, state.selectedMonth + delta, 1);
  state.selectedYear = next.getFullYear();
  state.selectedMonth = next.getMonth();
  saveState();
  render();
}

function getDefaultMonthYear() {
  const base = new Date();
  const next = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  return { year: next.getFullYear(), month: next.getMonth() };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULT_STATE),
      ...parsed,
      events: Array.isArray(parsed.events) ? parsed.events : [],
      dateStyles: parsed.dateStyles && typeof parsed.dateStyles === 'object' ? parsed.dateStyles : {},
    };
  } catch (error) {
    console.error(error);
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setStatus(message) {
  refs.statusBanner.textContent = message;
}

function getSpanDays(start, end) {
  const startDate = parseDateOnly(start);
  const endDate = parseDateOnly(end);
  if (!startDate || !endDate) return NaN;
  return Math.round((endDate - startDate) / 86400000) + 1;
}

function parseDateOnly(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(date, count) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
}

function openModal(node) {
  node.classList.remove('hidden');
  node.classList.add('visible');
}

function closeModal(node) {
  node.classList.add('hidden');
  node.classList.remove('visible');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeHtmlAttr(value) {
  return escapeHtml(value).replaceAll('`', '&#96;');
}
