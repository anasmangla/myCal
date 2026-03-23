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
  let activeDate = null;
  let activeEventId = null;

  applyDateStyles();
  renderEvents();
  setupWeekSelection();
  setupPrintButtons();
  setupExportImage();

  document.querySelectorAll('.quick-add-btn, .date-action-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const day = button.dataset.quickAdd || button.dataset.dateAction;
      openEventModal({ start_date: day, end_date: day });
    });
    button.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      activeDate = button.dataset.quickAdd || button.dataset.dateAction;
      showMenu(dateMenu, event.pageX, event.pageY);
    });
  });

  document.querySelectorAll('.calendar-cell').forEach((cell) => {
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
    await fetch('/date-style/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ day: activeDate }),
    });
    window.location.reload();
  });

  colorPicker.addEventListener('input', async () => {
    await fetch('/date-style', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ day: activeDate, background_color: colorPicker.value }),
    });
    window.location.reload();
  });

  document.getElementById('contextDeleteEvent').addEventListener('click', () => {
    hideMenus();
    deleteForm.action = `/events/delete/${activeEventId}`;
    deleteForm.submit();
  });

  document.addEventListener('click', hideMenus);
  document.getElementById('recurrenceType').addEventListener('change', toggleWeeklyOptions);
  document.getElementById('allDay').addEventListener('change', syncAllDayState);
  document.getElementById('startDate').addEventListener('change', buildDayLabels);
  document.getElementById('endDate').addEventListener('change', buildDayLabels);

  eventForm.addEventListener('submit', (event) => {
    const startDate = new Date(document.getElementById('startDate').value);
    const endDate = new Date(document.getElementById('endDate').value);
    const recurrenceType = document.getElementById('recurrenceType').value;
    const spanDays = ((endDate - startDate) / 86400000) + 1;
    validationEl.classList.add('d-none');
    if (endDate < startDate) {
      event.preventDefault();
      validationEl.textContent = 'End date cannot be before start date.';
      validationEl.classList.remove('d-none');
      return;
    }
    if (recurrenceType === 'none' && spanDays > 10) {
      event.preventDefault();
      validationEl.textContent = 'Multi-day events cannot exceed 10 days.';
      validationEl.classList.remove('d-none');
    }
  });

  function renderEvents() {
    document.querySelectorAll('[data-events-for]').forEach((container) => {
      const date = container.dataset.eventsFor;
      const items = data.events[date] || [];
      container.innerHTML = '';
      items.forEach((item) => {
        const chip = document.createElement('a');
        chip.className = `event-chip ${item.is_holiday ? 'holiday-chip' : ''}`;
        chip.textContent = item.display_text;
        chip.style.backgroundColor = item.color;
        chip.href = '#';
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
          showMenu(eventMenu, event.pageX, event.pageY);
        });
        container.appendChild(chip);
      });
    });
  }

  function applyDateStyles() {
    document.querySelectorAll('.calendar-cell').forEach((cell) => {
      const iso = cell.dataset.date;
      const day = new Date(`${iso}T00:00:00`);
      const jsDay = day.getUTCDay();
      if (jsDay === 0 || jsDay === 6) cell.classList.add('weekend');
      if (data.holidays[iso]) cell.classList.add('holiday');
      if (data.longWeekends.includes(iso)) cell.classList.add('long-weekend');
      if (data.styles[iso]) {
        cell.style.background = data.styles[iso];
      }
      const holidayPill = cell.querySelector('.holiday-pill');
      holidayPill.textContent = data.holidays[iso] || '';
    });
  }

  function setupWeekSelection() {
    document.querySelectorAll('.week-row').forEach((row) => {
      row.addEventListener('click', () => {
        document.querySelectorAll('.week-row').forEach((week) => week.classList.remove('selected-week'));
        row.classList.add('selected-week');
      });
    });
  }

  function setupPrintButtons() {
    document.querySelectorAll('[data-print-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        document.body.classList.toggle('print-week', button.dataset.printMode === 'week');
        window.print();
      });
    });
  }

  function setupExportImage() {
    document.getElementById('exportImageBtn').addEventListener('click', async () => {
      const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm');
      const canvas = await html2canvas(document.getElementById('calendarCapture'), { backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `calendar-${data.selectedYear}-${String(data.selectedMonth).padStart(2, '0')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
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
    syncAllDayState();
    toggleWeeklyOptions();
    buildDayLabels(payload.labels || {});
    eventModal.show();
  }

  function buildDayLabels(existingLabels = {}) {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    dayLabelsContainer.innerHTML = '';
    if (!start || !end) return;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const span = ((endDate - startDate) / 86400000) + 1;
    if (span <= 1 || span > 10) return;
    for (let offset = 0; offset < span; offset += 1) {
      const wrapper = document.createElement('div');
      wrapper.className = 'col-md-6';
      wrapper.innerHTML = `
        <label class="form-label">Day ${offset + 1} label</label>
        <input class="form-control" name="label_${offset}" value="${existingLabels[offset] || ''}" placeholder="Day ${offset + 1}: ${document.getElementById('title').value || 'Event title'}">
      `;
      dayLabelsContainer.appendChild(wrapper);
    }
  }

  function syncAllDayState() {
    const allDay = document.getElementById('allDay').checked;
    document.getElementById('startTime').disabled = allDay;
    document.getElementById('endTime').disabled = allDay;
  }

  function toggleWeeklyOptions() {
    document.getElementById('weeklyOptions').style.display = document.getElementById('recurrenceType').value === 'weekly' ? 'block' : 'none';
  }

  function showMenu(menu, x, y) {
    hideMenus();
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.remove('d-none');
  }

  function hideMenus() {
    dateMenu.classList.add('d-none');
    eventMenu.classList.add('d-none');
  }
});
