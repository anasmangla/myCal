document.addEventListener('DOMContentLoaded', () => {
  const data = window.CALENDAR_DATA;
  const eventModalEl = document.getElementById('eventModal');
  const eventModal = new bootstrap.Modal(eventModalEl);
  const eventForm = document.getElementById('eventForm');
  const validationEl = document.getElementById('eventValidation');
  const dayLabelsContainer = document.getElementById('dayLabelsContainer');
  const dateMenu = document.getElementById('dateContextMenu');
  const eventMenu = document.getElementById('eventContextMenu');
  const colorPicker = document.getElementById('dateColorPicker');
  const deleteForm = document.getElementById('deleteEventForm');
  const eventActionForm = document.getElementById('eventActionForm');
  const eventActionTargetDate = document.getElementById('eventActionTargetDate');
  const eventActionAnchorDate = document.getElementById('eventActionAnchorDate');
  const titleDisplay = document.getElementById('calendarTitleDisplay');
  const titleInput = document.getElementById('calendarTitleInput');
  let activeDate = null;
  let activeEventId = null;
  let activeEventOccurrenceDate = null;
  const hiddenMeta = loadHiddenMeta();

  applyDateStyles();
  renderEvents();
  setupDaySelection();
  setupCalendarTitle();
  setupPrintButtons();
  setupCalendarScaling();
  setupExportImage();
  setupContextMenus();
  setupFormBehavior();

  document.querySelectorAll('.date-action-btn').forEach((button) => {
    button.addEventListener('click', () => {
      openEventModal({ start_date: button.dataset.dateAction, end_date: button.dataset.dateAction });
    });
    button.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      activeDate = button.dataset.dateAction;
      showMenu(dateMenu, event.pageX, event.pageY);
    });
  });

  document.querySelectorAll('.calendar-cell[data-in-month="true"]').forEach((cell) => {
    cell.addEventListener('dblclick', () => {
      activeDate = cell.dataset.date;
      openEventModal({ start_date: activeDate, end_date: activeDate });
    });
    cell.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      activeDate = cell.dataset.date;
      showMenu(dateMenu, event.pageX, event.pageY);
    });
  });

  document.getElementById('contextAddEvent').addEventListener('click', () => {
    hideMenus();
    openEventModal({ start_date: activeDate, end_date: activeDate });
  });

  document.getElementById('contextChangeColor').addEventListener('click', () => {
    hideMenus();
    colorPicker.click();
  });

  document.getElementById('contextClearColor').addEventListener('click', async () => {
    hideMenus();
    const result = await saveDateStyle('/date-style/clear', { day: activeDate });
    if (result.ok) window.location.reload();
  });

  document.getElementById('contextToggleHoliday').addEventListener('click', () => {
    if (!activeDate) return;
    hideMenus();
    toggleHiddenMeta('holidays', activeDate);
    renderCalendarDecorations();
  });

  document.getElementById('contextToggleIslamic').addEventListener('click', () => {
    if (!activeDate) return;
    hideMenus();
    toggleHiddenMeta('islamic', activeDate);
    renderCalendarDecorations();
  });

  colorPicker.addEventListener('input', async () => {
    const result = await saveDateStyle('/date-style', { day: activeDate, background_color: colorPicker.value });
    if (result.ok) window.location.reload();
  });

  document.getElementById('contextDeleteEvent').addEventListener('click', () => {
    hideMenus();
    deleteForm.action = `/events/delete/${activeEventId}`;
    deleteForm.submit();
  });

  function monthCalendarLabel() {
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(Date.UTC(data.selectedYear, data.selectedMonth - 1, 1)));
    return `${monthName} Calendar`;
  }

  function defaultCalendarTitle() {
    return monthCalendarLabel();
  }

  function calendarTitleStorageKey() {
    return `mycal.title.${data.selectedYear}-${String(data.selectedMonth).padStart(2, '0')}`;
  }

  function syncCalendarTitle(value) {
    const nextValue = value.trim() || defaultCalendarTitle();
    titleDisplay.textContent = nextValue;
    titleInput.value = nextValue;
    document.title = nextValue;
    return nextValue;
  }

  function setupCalendarTitle() {
    const storedTitle = window.localStorage.getItem(calendarTitleStorageKey());
    syncCalendarTitle(storedTitle || defaultCalendarTitle());

    const beginEditing = () => {
      titleDisplay.classList.add('d-none');
      titleInput.classList.remove('d-none');
      titleInput.focus();
      titleInput.select();
    };

    const finishEditing = () => {
      const nextValue = syncCalendarTitle(titleInput.value);
      window.localStorage.setItem(calendarTitleStorageKey(), nextValue);
      titleInput.classList.add('d-none');
      titleDisplay.classList.remove('d-none');
    };

    titleDisplay.addEventListener('click', beginEditing);
    titleDisplay.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        beginEditing();
      }
    });
    titleInput.addEventListener('blur', finishEditing);
    titleInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        finishEditing();
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        titleInput.value = titleDisplay.textContent;
        titleInput.classList.add('d-none');
        titleDisplay.classList.remove('d-none');
        titleDisplay.focus();
      }
    });
  }

  function currentMonthBounds() {
    const monthText = String(data.selectedMonth).padStart(2, '0');
    const lastDay = new Date(Date.UTC(data.selectedYear, data.selectedMonth, 0)).getUTCDate();
    return {
      start: `${data.selectedYear}-${monthText}-01`,
      end: `${data.selectedYear}-${monthText}-${String(lastDay).padStart(2, '0')}`,
    };
  }

  function renderEvents() {
    document.querySelectorAll('[data-events-for]').forEach((container) => {
      const date = container.dataset.eventsFor;
      const items = data.events[date] || [];
      container.innerHTML = '';
      items.forEach((item) => {
        if (item.is_holiday && isHiddenMeta('holidays', date)) return;
        const chip = document.createElement('a');
        chip.className = `event-chip ${item.is_holiday ? 'holiday-chip' : ''}`;
        chip.textContent = item.display_text;
        chip.style.backgroundColor = item.color;
        chip.href = '#';
        chip.title = [item.title, item.location, item.notes].filter(Boolean).join(' • ');
        chip.addEventListener('click', async (event) => {
          event.preventDefault();
          if (item.is_holiday || !item.source_event_id) return;
          const response = await fetch(`/api/event/${item.source_event_id}`);
          const payload = await response.json();
          openEventModal(payload);
        });
        chip.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          if (item.is_holiday || !item.source_event_id) return;
          activeEventId = item.source_event_id;
          activeEventOccurrenceDate = date;
          showMenu(eventMenu, event.pageX, event.pageY);
        });
        container.appendChild(chip);
      });
    });
  }

  document.getElementById('contextModifyEvent').addEventListener('click', async () => {
    hideMenus();
    if (!activeEventId) return;
    const response = await fetch(`/api/event/${activeEventId}`);
    if (!response.ok) {
      showValidation('Unable to load this event right now. Please try again.');
      return;
    }
    const payload = await response.json();
    openEventModal(payload);
  });

  document.getElementById('contextMoveEvent').addEventListener('click', () => {
    hideMenus();
    if (!activeEventId) return;

    const defaultDate = activeEventOccurrenceDate || '';
    const nextStart = window.prompt('Move event to start on (YYYY-MM-DD):', defaultDate);
    if (!nextStart) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextStart)) {
      showValidation('Please enter the new date in YYYY-MM-DD format.');
      return;
    }
    eventActionForm.action = `/events/move/${activeEventId}`;
    eventActionTargetDate.value = nextStart;
    eventActionAnchorDate.value = activeEventOccurrenceDate || '';
    eventActionForm.submit();
  });

  const islamicFormatter = new Intl.DateTimeFormat('en-u-ca-islamic', { month: 'long', day: 'numeric', timeZone: 'UTC' });
  const islamicNumericFormatter = new Intl.DateTimeFormat('en-u-ca-islamic', { month: 'numeric', day: 'numeric', timeZone: 'UTC' });
  const islamicHolidayMap = {
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

  function getIslamicParts(iso) {
    const date = new Date(`${iso}T00:00:00Z`);
    const parts = islamicFormatter.formatToParts(date);
    const numericParts = islamicNumericFormatter.formatToParts(date);
    return {
      month: parts.find((part) => part.type === 'month')?.value || '',
      monthNumber: Number(numericParts.find((part) => part.type === 'month')?.value || 0),
      day: Number(parts.find((part) => part.type === 'day')?.value || 0),
    };
  }

  function buildIslamicLabels(iso) {
    const islamic = getIslamicParts(iso);
    const labels = [];
    const dayOfMonth = Number(iso.slice(8, 10));

    if (dayOfMonth === 1) labels.push({ text: `${islamic.month} ${islamic.day}`, italic: true });
    if (islamic.day === 1) labels.push({ text: `${islamic.month} 1`, italic: false });

    const importantDay = islamicHolidayMap[`${islamic.monthNumber}-${islamic.day}`];
    if (importantDay) labels.push({ text: importantDay, italic: false, important: true });

    return labels;
  }

  function applyDateStyles() {
    document.querySelectorAll('.calendar-cell[data-in-month="true"]').forEach((cell) => {
      const iso = cell.dataset.date;
      const day = new Date(`${iso}T00:00:00`);
      const jsDay = day.getUTCDay();
      const showHoliday = Boolean(data.holidays[iso]) && !isHiddenMeta('holidays', iso);
      const showIslamic = Boolean(data.includeIslamic) && !isHiddenMeta('islamic', iso);
      if (jsDay === 0 || jsDay === 6) cell.classList.add('weekend');
      cell.classList.toggle('holiday', showHoliday);
      if (data.longWeekends.includes(iso)) cell.classList.add('long-weekend');
      if (data.styles[iso]) cell.style.background = data.styles[iso];
      const holidayPill = cell.querySelector('.holiday-pill');
      const lines = [];
      if (showHoliday) {
        lines.push(`<span class="calendar-meta-line">${data.holidays[iso]}</span>`);
      }
      if (showIslamic) {
        buildIslamicLabels(iso).forEach((label) => {
          lines.push(`<span class="calendar-meta-line ${label.italic ? 'islamic-note' : ''} ${label.important ? 'islamic-important' : ''}">${label.text}</span>`);
        });
      }
      holidayPill.innerHTML = lines.join('');
      holidayPill.classList.toggle('holiday-pill-long', Boolean(data.longWeekends.includes(iso)));
      holidayPill.classList.toggle('has-content', lines.length > 0);
    });
  }

  function setupDaySelection() {
    const inMonthCells = Array.from(document.querySelectorAll('.calendar-cell[data-in-month="true"]'));
    if (!inMonthCells.length) return;

    const firstOfMonth = inMonthCells.find((cell) => cell.dataset.date?.endsWith('-01')) || inMonthCells[0];
    selectDayCell(firstOfMonth);

    inMonthCells.forEach((cell) => {
      cell.addEventListener('click', () => selectDayCell(cell));
    });
  }

  function selectDayCell(targetCell) {
    document.querySelectorAll('.calendar-cell.selected-day').forEach((cell) => {
      cell.classList.remove('selected-day');
      cell.setAttribute('aria-selected', 'false');
    });
    targetCell.classList.add('selected-day');
    targetCell.setAttribute('aria-selected', 'true');
  }

  function setupPrintButtons() {
    document.querySelectorAll('[data-print-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        window.print();
      });
    });
  }

  function scaleCalendar() {
    const page = document.querySelector('.calendar-page');
    const wrapper = document.querySelector('.calendar-scale-wrapper');
    if (!page || !wrapper) return;

    page.style.transform = 'none';

    const scaleX = wrapper.clientWidth / page.offsetWidth;
    const scale = Math.min(scaleX, 1);

    page.style.transform = `scale(${scale})`;
    page.style.transformOrigin = 'top center';
  }

  function setupCalendarScaling() {
    scaleCalendar();
    window.addEventListener('resize', scaleCalendar, { passive: true });
    window.addEventListener('load', scaleCalendar);
  }

  function setupExportImage() {
    document.getElementById('exportImageBtn').addEventListener('click', async () => {
      const calendarNode = document.querySelector('.calendar-page');
      if (!calendarNode) return;

      const originalTransform = calendarNode.style.transform;
      const originalTransformOrigin = calendarNode.style.transformOrigin;

      try {
        validationEl.classList.add('d-none');
        document.body.classList.add('exporting-calendar');
        const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm');

        calendarNode.style.transform = 'none';
        calendarNode.style.transformOrigin = 'top center';

        const canvas = await html2canvas(calendarNode, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          logging: false,
        });
        const link = document.createElement('a');
        const baseName = (titleDisplay.textContent || monthCalendarLabel())
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || 'calendar';
        link.download = `${baseName}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (error) {
        showValidation('Export failed. Please try again after the calendar fully loads.');
      } finally {
        document.body.classList.remove('exporting-calendar');
        calendarNode.style.transform = originalTransform;
        calendarNode.style.transformOrigin = originalTransformOrigin;
        scaleCalendar();
      }
    });
  }

  function setupContextMenus() {
    [dateMenu, eventMenu].forEach((menu) => {
      menu.addEventListener('click', (event) => event.stopPropagation());
      menu.addEventListener('contextmenu', (event) => event.preventDefault());
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.context-menu')) hideMenus();
    });
    document.addEventListener('contextmenu', (event) => {
      if (!event.target.closest('.calendar-cell[data-in-month="true"]') && !event.target.closest('.event-chip')) hideMenus();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') hideMenus();
    });
    window.addEventListener('scroll', hideMenus, { passive: true });
    window.addEventListener('resize', hideMenus);
  }

  function setupFormBehavior() {
    document.getElementById('recurrenceType').addEventListener('change', () => {
      syncRecurringEndDate();
      toggleWeeklyOptions();
      buildDayLabels();
    });
    document.getElementById('allDay').addEventListener('change', syncAllDayState);
    document.getElementById('title').addEventListener('input', () => buildDayLabels(getCurrentLabelValues()));
    document.getElementById('startDate').addEventListener('change', () => {
      syncRecurringEndDate();
      buildDayLabels(getCurrentLabelValues());
    });
    document.getElementById('endDate').addEventListener('change', () => buildDayLabels(getCurrentLabelValues()));

    syncRecurringEndDate();
    eventForm.addEventListener('submit', (event) => {
      const error = validateEventForm();
      if (error) {
        event.preventDefault();
        showValidation(error);
      }
    });
  }

  function openEventModal(payload) {
    eventForm.reset();
    validationEl.classList.add('d-none');
    document.getElementById('eventId').value = payload.id || '';
    document.getElementById('title').value = payload.title || '';
    document.getElementById('startDate').value = payload.start_date || payload.startDate || '';
    document.getElementById('endDate').value = payload.end_date || payload.endDate || payload.start_date || '';
    document.getElementById('startTime').value = payload.start_time || '';
    document.getElementById('endTime').value = payload.end_time || '';
    document.getElementById('allDay').checked = Boolean(payload.all_day);
    document.getElementById('location').value = payload.location || '';
    document.getElementById('audience').value = payload.audience || 'Unspecified';
    document.getElementById('notes').value = payload.notes || '';
    document.getElementById('recurrenceType').value = payload.recurrence_type || 'none';
    document.querySelectorAll('input[name="recurrence_weekdays"]').forEach((checkbox) => {
      checkbox.checked = (payload.recurrence_weekdays || '').split(',').includes(checkbox.value);
    });
    syncRecurringEndDate(Boolean(payload.id));
    syncAllDayState();
    toggleWeeklyOptions();
    buildDayLabels(payload.labels || {});
    eventModal.show();
  }

  function syncRecurringEndDate(preserveExistingRange = false) {
    const recurrenceType = document.getElementById('recurrenceType').value;
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const { start, end } = currentMonthBounds();

    [startDateInput, endDateInput].forEach((input) => {
      input.min = start;
      input.max = end;
    });

    if (startDateInput.value && (startDateInput.value < start || startDateInput.value > end)) startDateInput.value = '';
    if (endDateInput.value && (endDateInput.value < start || endDateInput.value > end)) endDateInput.value = '';

    if (recurrenceType !== 'none' && startDateInput.value) {
      if (!preserveExistingRange || !endDateInput.value || endDateInput.value < startDateInput.value) {
        endDateInput.value = end;
      }
      return;
    }

    if (startDateInput.value && (!endDateInput.value || endDateInput.value < startDateInput.value)) {
      endDateInput.value = startDateInput.value;
    }
  }

  function buildDayLabels(existingLabels = {}) {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    const recurrenceType = document.getElementById('recurrenceType').value;
    dayLabelsContainer.innerHTML = '';
    if (!start || !end || recurrenceType !== 'none') return;

    const span = getSpanDays(start, end);
    if (!Number.isFinite(span) || span <= 1 || span > 10) return;

    for (let offset = 0; offset < span; offset += 1) {
      const wrapper = document.createElement('div');
      wrapper.className = 'col-md-6';
      const input = document.createElement('input');
      input.className = 'form-control';
      input.name = `label_${offset}`;
      input.maxLength = 200;
      input.value = existingLabels[offset] || existingLabels[String(offset)] || '';
      input.placeholder = `Day ${offset + 1}: ${document.getElementById('title').value || 'Event title'}`;

      const label = document.createElement('label');
      label.className = 'form-label';
      label.textContent = `Day ${offset + 1} label`;

      wrapper.append(label, input);
      dayLabelsContainer.appendChild(wrapper);
    }
  }

  function getCurrentLabelValues() {
    const values = {};
    dayLabelsContainer.querySelectorAll('input[name^="label_"]').forEach((input) => {
      values[input.name.replace('label_', '')] = input.value;
    });
    return values;
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
    document.querySelectorAll('input[name="recurrence_weekdays"]').forEach((checkbox) => {
      checkbox.disabled = !isWeekly;
      if (!isWeekly) checkbox.checked = false;
    });
  }

  function validateEventForm() {
    const title = document.getElementById('title').value.trim();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const recurrenceType = document.getElementById('recurrenceType').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const allDay = document.getElementById('allDay').checked;
    const selectedWeekdays = document.querySelectorAll('input[name="recurrence_weekdays"]:checked').length;
    const { start: monthStart, end: monthEnd } = currentMonthBounds();

    if (!title) return 'Please enter an event title.';
    if (!startDate || !endDate) return 'Please choose both a start date and an end date.';
    if (startDate < monthStart || startDate > monthEnd || endDate < monthStart || endDate > monthEnd) {
      return 'Events must stay within the selected month.';
    }

    const spanDays = getSpanDays(startDate, endDate);
    if (!Number.isFinite(spanDays)) return 'Please choose valid event dates.';
    if (spanDays < 1) return 'End date cannot be before start date.';
    if (recurrenceType === 'none' && spanDays > 10) return 'Multi-day events cannot exceed 10 days.';
    if (!allDay && startTime && endTime && startDate === endDate && endTime < startTime) {
      return 'End time cannot be earlier than start time for the same day.';
    }
    if (recurrenceType === 'weekly' && selectedWeekdays === 0) {
      return 'Choose at least one weekday for a weekly recurring event.';
    }
    return '';
  }

  function showMenu(menu, x, y) {
    hideMenus();
    if (menu === dateMenu) {
      syncDateMenuLabels();
    }
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.remove('d-none');
  }

  function hideMenus() {
    dateMenu.classList.add('d-none');
    eventMenu.classList.add('d-none');
  }

  function getSpanDays(startDate, endDate) {
    return ((new Date(`${endDate}T00:00:00`) - new Date(`${startDate}T00:00:00`)) / 86400000) + 1;
  }

  async function saveDateStyle(url, payload) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        showValidation(result.message || 'Unable to save that date style right now.');
        return { ok: false };
      }
      return { ok: true, result };
    } catch (error) {
      showValidation('Unable to save that date style right now.');
      return { ok: false };
    }
  }

  function showValidation(message) {
    validationEl.textContent = message;
    validationEl.classList.remove('d-none');
  }

  function hiddenMetaStorageKey() {
    return `mycal.hiddenMeta.${data.selectedYear}-${String(data.selectedMonth).padStart(2, '0')}`;
  }

  function loadHiddenMeta() {
    try {
      const raw = window.localStorage.getItem(hiddenMetaStorageKey());
      const parsed = raw ? JSON.parse(raw) : {};
      const holidays = Array.isArray(parsed.holidays) ? parsed.holidays.filter((value) => typeof value === 'string') : [];
      const islamic = Array.isArray(parsed.islamic) ? parsed.islamic.filter((value) => typeof value === 'string') : [];
      return { holidays: new Set(holidays), islamic: new Set(islamic) };
    } catch (error) {
      return { holidays: new Set(), islamic: new Set() };
    }
  }

  function persistHiddenMeta() {
    const payload = {
      holidays: Array.from(hiddenMeta.holidays),
      islamic: Array.from(hiddenMeta.islamic),
    };
    window.localStorage.setItem(hiddenMetaStorageKey(), JSON.stringify(payload));
  }

  function isHiddenMeta(type, iso) {
    return hiddenMeta[type].has(iso);
  }

  function toggleHiddenMeta(type, iso) {
    if (hiddenMeta[type].has(iso)) hiddenMeta[type].delete(iso);
    else hiddenMeta[type].add(iso);
    persistHiddenMeta();
  }

  function syncDateMenuLabels() {
    const holidayButton = document.getElementById('contextToggleHoliday');
    const islamicButton = document.getElementById('contextToggleIslamic');
    const hasHoliday = Boolean(activeDate && data.holidays[activeDate]);
    const hasIslamic = Boolean(activeDate && data.includeIslamic);
    const holidayHidden = Boolean(activeDate && isHiddenMeta('holidays', activeDate));
    const islamicHidden = Boolean(activeDate && isHiddenMeta('islamic', activeDate));

    holidayButton.disabled = !hasHoliday;
    islamicButton.disabled = !hasIslamic;
    holidayButton.textContent = holidayHidden ? 'Show U.S. holiday on this day' : 'Hide U.S. holiday on this day';
    islamicButton.textContent = islamicHidden ? 'Show Islamic date on this day' : 'Hide Islamic date on this day';
  }

  function renderCalendarDecorations() {
    applyDateStyles();
    renderEvents();
  }
});
