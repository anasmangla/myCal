document.addEventListener('DOMContentLoaded', () => {
  const data = window.CALENDAR_DATA;
  const audienceColors = {
    Lajna: '#b03060',
    Nasirat: '#f4a6c1',
    Ansar: '#1d4e89',
    Khuddam: '#1f3a5f',
    Atfal: '#75b8ff',
    'Tahir Academy': '#2f855a',
    All: '#1f2937',
    Unspecified: '#4b5563',
  };
  const eventModalEl = document.getElementById('eventModal');
  const eventModal = new bootstrap.Modal(eventModalEl);
  const eventForm = document.getElementById('eventForm');
  const validationEl = document.getElementById('eventValidation');
  const dayLabelsContainer = document.getElementById('dayLabelsContainer');
  const dateMenu = document.getElementById('dateContextMenu');
  const eventMenu = document.getElementById('eventContextMenu');
  const colorPicker = document.getElementById('dateColorPicker');
  const deleteForm = document.getElementById('deleteEventForm');
  const deleteModeInput = document.getElementById('deleteMode');
  const deleteOccurrenceDateInput = document.getElementById('deleteOccurrenceDate');
  const eventActionForm = document.getElementById('eventActionForm');
  const eventActionTargetDate = document.getElementById('eventActionTargetDate');
  const eventActionAnchorDate = document.getElementById('eventActionAnchorDate');
  const titleDisplay = document.getElementById('calendarTitleDisplay');
  const titleInput = document.getElementById('calendarTitleInput');
  const nonDateColorInput = document.getElementById('nonDateColorInput');
  const weekendHolidayColorInput = document.getElementById('weekendHolidayColorInput');
  const weekdayColorInput = document.getElementById('weekdayColorInput');
  const lineColorInput = document.getElementById('lineColorInput');
  const lineThicknessInput = document.getElementById('lineThicknessInput');
  const lineThicknessValue = document.getElementById('lineThicknessValue');
  const resetColorSettingsBtn = document.getElementById('resetColorSettingsBtn');
  let activeDate = null;
  let activeEventId = null;
  let activeEventOccurrenceDate = null;
  const hiddenMeta = loadHiddenMeta();
  const defaultThemeSettings = {
    outsideMonthColor: '#f5f5f5',
    weekendHolidayColor: '#d9d9d9',
    weekdayHeaderColor: '#0f172a',
    lineColor: '#d6deea',
    lineThickness: 1,
  };
  let themeSettings = loadThemeSettings();

  applyThemeSettings();
  setupColorSettings();
  applyDateStyles();
  renderEvents();
  setupCalendarTitle();
  setupPrintButtons();
  setupCalendarScaling();
  setupExportImage();
  setupDataImport();
  setupContextMenus();
  setupFormBehavior();
  setupEventDragAndDrop();

  function clearSelectedEvent() {
    activeEventId = null;
    activeEventOccurrenceDate = null;
  }

  function selectEvent(eventId, occurrenceDate) {
    activeEventId = eventId;
    activeEventOccurrenceDate = occurrenceDate;
  }

  document.querySelectorAll('.date-action-btn').forEach((button) => {
    button.addEventListener('click', () => {
      clearSelectedEvent();
      openEventModal({ start_date: button.dataset.dateAction, end_date: button.dataset.dateAction });
    });
    button.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      activeDate = button.dataset.dateAction;
      showMenu(dateMenu, event.pageX, event.pageY);
    });
  });

  document.querySelectorAll('.calendar-cell[data-in-month="true"]').forEach((cell) => {
    cell.title = 'Left click: options • Right click: options • Double click: add event';
    cell.addEventListener('click', () => {
      activeDate = cell.dataset.date;
      if (!cell.querySelector('.event-chip:hover')) clearSelectedEvent();
      showMenuNearCell(dateMenu, cell);
    });
    cell.addEventListener('dblclick', async (event) => {
      activeDate = cell.dataset.date;
      const eventChip = event.target.closest('.event-chip[data-source-event-id]');
      if (eventChip) {
        event.preventDefault();
        event.stopPropagation();
        const sourceEventId = Number(eventChip.dataset.sourceEventId);
        selectEvent(sourceEventId, activeDate);
        await openEventById(sourceEventId);
        return;
      }
      if (activeEventId && activeEventOccurrenceDate === activeDate) {
        event.preventDefault();
        await openEventById(activeEventId);
        return;
      }
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
    if (!isSelectableDate(activeDate)) return;
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

  document.getElementById('contextDeleteEvent').addEventListener('click', async () => {
    hideMenus();
    await submitDeleteEvent(activeEventId, activeEventOccurrenceDate);
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
        if (item.source_event_id) {
          chip.dataset.sourceEventId = String(item.source_event_id);
        }
        chip.title = [item.title, item.location, item.notes].filter(Boolean).join(' • ');
        chip.draggable = Boolean(!item.is_holiday && item.source_event_id);
        chip.addEventListener('click', async (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (item.is_holiday || !item.source_event_id) return;
          selectEvent(item.source_event_id, date);
          await openEventById(item.source_event_id);
        });
        chip.addEventListener('dblclick', async (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (item.is_holiday || !item.source_event_id) return;
          selectEvent(item.source_event_id, date);
          await openEventById(item.source_event_id);
        });
        chip.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          if (item.is_holiday || !item.source_event_id) return;
          selectEvent(item.source_event_id, date);
          showMenu(eventMenu, event.pageX, event.pageY);
        });
        chip.addEventListener('dragstart', (event) => {
          if (item.is_holiday || !item.source_event_id) return;
          selectEvent(item.source_event_id, date);
          event.dataTransfer.setData('text/plain', JSON.stringify({ eventId: item.source_event_id, anchorDate: date }));
          event.dataTransfer.effectAllowed = 'move';
          chip.classList.add('is-dragging');
        });
        chip.addEventListener('dragend', () => {
          chip.classList.remove('is-dragging');
          clearDropHighlights();
        });
        container.appendChild(chip);
      });
    });
  }

  function setupEventDragAndDrop() {
    document.querySelectorAll('.calendar-cell[data-in-month="true"]').forEach((cell) => {
      cell.addEventListener('dragenter', (event) => {
        if (!hasValidEventDrag(event)) return;
        event.preventDefault();
        cell.classList.add('drop-target');
      });
      cell.addEventListener('dragover', (event) => {
        if (!hasValidEventDrag(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        cell.classList.add('drop-target');
      });
      cell.addEventListener('dragleave', () => {
        cell.classList.remove('drop-target');
      });
      cell.addEventListener('drop', (event) => {
        event.preventDefault();
        cell.classList.remove('drop-target');
        const payload = parseDragPayload(event);
        if (!payload || !payload.eventId) return;
        submitMoveEvent(payload.eventId, cell.dataset.date, payload.anchorDate || '');
      });
    });
  }

  function hasValidEventDrag(event) {
    return Array.from(event.dataTransfer?.types || []).includes('text/plain');
  }

  function parseDragPayload(event) {
    try {
      return JSON.parse(event.dataTransfer.getData('text/plain') || '{}');
    } catch (error) {
      return null;
    }
  }

  function clearDropHighlights() {
    document.querySelectorAll('.calendar-cell.drop-target').forEach((cell) => cell.classList.remove('drop-target'));
  }

  function submitMoveEvent(eventId, targetDate, anchorDate) {
    if (!eventId || !targetDate) return;
    eventActionForm.action = `/events/move/${eventId}`;
    eventActionTargetDate.value = targetDate;
    eventActionAnchorDate.value = anchorDate || '';
    eventActionForm.submit();
  }

  document.getElementById('contextModifyEvent').addEventListener('click', async () => {
    hideMenus();
    if (!activeEventId) return;
    await openEventById(activeEventId);
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
    submitMoveEvent(activeEventId, nextStart, activeEventOccurrenceDate || '');
  });

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
      if (holidayPill) {
        holidayPill.innerHTML = '';
        holidayPill.classList.remove('holiday-pill-long', 'has-content');
      }
    });
  }

  function themeSettingsStorageKey() {
    return 'mycal.theme.settings.v1';
  }

  function loadThemeSettings() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(themeSettingsStorageKey()) || '{}');
      return { ...defaultThemeSettings, ...parsed };
    } catch (error) {
      return { ...defaultThemeSettings };
    }
  }

  function saveThemeSettings() {
    window.localStorage.setItem(themeSettingsStorageKey(), JSON.stringify(themeSettings));
  }

  function applyThemeSettings() {
    const root = document.documentElement;
    root.style.setProperty('--outside-month-color', themeSettings.outsideMonthColor);
    root.style.setProperty('--weekend-color', themeSettings.weekendHolidayColor);
    root.style.setProperty('--weekday-header-color', themeSettings.weekdayHeaderColor);
    root.style.setProperty('--grid-line-color', themeSettings.lineColor);
    root.style.setProperty('--grid-line-width', `${themeSettings.lineThickness}px`);
  }

  function setupColorSettings() {
    if (!nonDateColorInput) return;

    nonDateColorInput.value = themeSettings.outsideMonthColor;
    weekendHolidayColorInput.value = themeSettings.weekendHolidayColor;
    weekdayColorInput.value = themeSettings.weekdayHeaderColor;
    lineColorInput.value = themeSettings.lineColor;
    lineThicknessInput.value = String(themeSettings.lineThickness);
    lineThicknessValue.textContent = `${themeSettings.lineThickness}px`;

    nonDateColorInput.addEventListener('input', () => {
      themeSettings.outsideMonthColor = nonDateColorInput.value;
      applyThemeSettings();
      saveThemeSettings();
    });
    weekendHolidayColorInput.addEventListener('input', () => {
      themeSettings.weekendHolidayColor = weekendHolidayColorInput.value;
      applyThemeSettings();
      saveThemeSettings();
    });
    weekdayColorInput.addEventListener('input', () => {
      themeSettings.weekdayHeaderColor = weekdayColorInput.value;
      applyThemeSettings();
      saveThemeSettings();
    });
    lineColorInput.addEventListener('input', () => {
      themeSettings.lineColor = lineColorInput.value;
      applyThemeSettings();
      saveThemeSettings();
    });
    lineThicknessInput.addEventListener('input', () => {
      themeSettings.lineThickness = Number(lineThicknessInput.value);
      lineThicknessValue.textContent = `${themeSettings.lineThickness}px`;
      applyThemeSettings();
      saveThemeSettings();
    });

    resetColorSettingsBtn.addEventListener('click', () => {
      themeSettings = { ...defaultThemeSettings };
      applyThemeSettings();
      nonDateColorInput.value = themeSettings.outsideMonthColor;
      weekendHolidayColorInput.value = themeSettings.weekendHolidayColor;
      weekdayColorInput.value = themeSettings.weekdayHeaderColor;
      lineColorInput.value = themeSettings.lineColor;
      lineThicknessInput.value = String(themeSettings.lineThickness);
      lineThicknessValue.textContent = `${themeSettings.lineThickness}px`;
      saveThemeSettings();
    });
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

  function setupDataImport() {
    const importButton = document.getElementById('importJsonBtn');
    const importForm = document.getElementById('importDataForm');
    const fileInput = document.getElementById('importDataFileInput');
    if (!importButton || !importForm || !fileInput) return;

    importButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      if (!fileInput.files || fileInput.files.length === 0) return;
      const selectedFile = fileInput.files[0];
      const shouldImport = window.confirm(
        `Import "${selectedFile.name}"? This replaces current events and date colors.`,
      );
      if (!shouldImport) {
        fileInput.value = '';
        return;
      }
      importForm.submit();
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


  function isSelectableDate(isoDate) {
    if (!isoDate) return false;
    const cell = document.querySelector(`.calendar-cell[data-date="${isoDate}"]`);
    return Boolean(cell && cell.dataset.inMonth === 'true');
  }

  function setupFormBehavior() {
    const audienceField = document.getElementById('audience');
    const eventColorField = document.getElementById('eventColor');

    audienceField.addEventListener('change', () => {
      if (eventColorField.dataset.touched === 'true') return;
      eventColorField.value = colorForAudience(audienceField.value);
    });
    eventColorField.addEventListener('input', () => {
      eventColorField.dataset.touched = 'true';
    });

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
    toggleWeeklyOptions();
    eventForm.addEventListener('submit', (event) => {
      const error = validateEventForm();
      if (error) {
        event.preventDefault();
        showValidation(error);
      }
    });
  }

  function openEventModal(payload) {
    const candidateStartDate = payload.start_date || payload.startDate || '';
    if (candidateStartDate && !isSelectableDate(candidateStartDate)) {
      showValidation('You can only add events on dates in the current month.');
      return;
    }

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
    const eventColorField = document.getElementById('eventColor');
    eventColorField.dataset.touched = payload.color ? 'true' : 'false';
    eventColorField.value = payload.color || colorForAudience(document.getElementById('audience').value);
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

  function colorForAudience(audience) {
    return audienceColors[audience] || audienceColors.Unspecified;
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
    const weeklyOptions = document.getElementById('weeklyOptions');
    weeklyOptions.classList.toggle('d-none', !isWeekly);
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

  function showMenuNearCell(menu, cell) {
    const rect = cell.getBoundingClientRect();
    const menuX = rect.left + window.scrollX + Math.min(rect.width - 36, 120);
    const menuY = rect.top + window.scrollY + Math.min(rect.height - 36, 84);
    showMenu(menu, menuX, menuY);
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

  async function submitDeleteEvent(eventId, occurrenceDate = '') {
    if (!eventId) return;
    const details = await fetchEventDetails(eventId);
    if (!details) {
      showValidation('Unable to load this event right now.');
      return;
    }

    const isRecurring = details.recurrence_type && details.recurrence_type !== 'none';
    const deleteMode = isRecurring ? askDeleteMode() : 'all';
    if (!deleteMode) return;

    deleteModeInput.value = deleteMode;
    deleteOccurrenceDateInput.value = deleteMode === 'single'
      ? (occurrenceDate || details.start_date || '')
      : '';
    deleteForm.action = `/events/delete/${eventId}`;
    deleteForm.submit();
  }

  async function fetchEventDetails(eventId) {
    try {
      const response = await fetch(`/api/event/${eventId}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  async function openEventById(eventId) {
    const payload = await fetchEventDetails(eventId);
    if (!payload) {
      showValidation('Unable to load this event right now. Please try again.');
      return;
    }
    openEventModal(payload);
  }

  function askDeleteMode() {
    const deleteOne = window.confirm(
      'This is a recurring event.\n\nPress OK to delete only this occurrence.\nPress Cancel to choose another option.'
    );
    if (deleteOne) return 'single';
    const deleteAll = window.confirm('Delete all occurrences in this recurring event series?');
    return deleteAll ? 'all' : '';
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
    const addEventButton = document.getElementById('contextAddEvent');
    const holidayButton = document.getElementById('contextToggleHoliday');
    const islamicButton = document.getElementById('contextToggleIslamic');
    const selectableDate = isSelectableDate(activeDate);
    const hasHoliday = Boolean(activeDate && data.holidays[activeDate]);
    const hasIslamic = Boolean(selectableDate && data.includeIslamic);
    const holidayHidden = Boolean(activeDate && isHiddenMeta('holidays', activeDate));
    const islamicHidden = Boolean(activeDate && isHiddenMeta('islamic', activeDate));

    addEventButton.classList.toggle('d-none', !selectableDate);
    holidayButton.classList.toggle('d-none', !selectableDate);
    islamicButton.classList.toggle('d-none', !selectableDate);
    holidayButton.disabled = !selectableDate || !hasHoliday;
    islamicButton.disabled = !selectableDate || !hasIslamic;
    holidayButton.textContent = holidayHidden ? 'Show U.S. holiday on this day' : 'Hide U.S. holiday on this day';
    islamicButton.textContent = islamicHidden ? 'Show Islamic date on this day' : 'Hide Islamic date on this day';
  }

  function renderCalendarDecorations() {
    applyDateStyles();
    renderEvents();
  }

  const deleteEventBtn = document.getElementById('deleteEventBtn');
  if (deleteEventBtn) {
    deleteEventBtn.addEventListener('click', async () => {
      const eventId = Number(document.getElementById('eventId').value);
      const occurrenceDate = document.getElementById('startDate').value;
      await submitDeleteEvent(eventId, occurrenceDate);
      eventModal.hide();
    });
  }
});
