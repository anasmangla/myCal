document.addEventListener('DOMContentLoaded', () => {
  const data = window.CALENDAR_DATA;
  const islamicFormatter = new Intl.DateTimeFormat('en-u-ca-islamic-tbla', { month: 'long', day: 'numeric', timeZone: 'UTC' });
  const islamicMonthNameMap = {
    Muharram: 'Muharram',
    Safar: 'Safar',
    "Rabiʻ I": 'Rabi al-Awwal',
    "Rabiʻ II": 'Rabi al-Thani',
    'Jumada I': 'Jumada al-Awwal',
    'Jumada II': 'Jumada al-Thani',
    Rajab: 'Rajab',
    "Shaʻban": "Sha'ban",
    Ramadan: 'Ramadhan',
    Shawwal: 'Shawwal',
    "Dhuʻl-Qiʻdah": "Dhul Qi'dah",
    "Dhuʻl-Hijjah": 'Dhul Hajja',
  };
  const defaultAudienceColors = {
    Lajna: '#b03060',
    Nasirat: '#f4a6c1',
    Ansar: '#1d4e89',
    Khuddam: '#1f3a5f',
    Atfal: '#75b8ff',
    'Tahir Academy': '#2f855a',
    'Waqf-e-Nau': '#7c3aed',
    All: '#1f2937',
    Unspecified: '#4b5563',
  };
  const audienceColorStorageKey = 'mycal.audience-colors.v1';
  const fontPresets = {
    system: '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    trebuchet: '"Trebuchet MS", "Segoe UI", sans-serif',
    georgia: 'Georgia, "Times New Roman", serif',
    palatino: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
    verdana: 'Verdana, Geneva, sans-serif',
  };
  const legacyRemToPt = 12;
  const audienceColors = loadAudienceColors();
  const monthDateFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const eventModalEl = document.getElementById('eventModal');
  const eventModal = new bootstrap.Modal(eventModalEl);
  const eventForm = document.getElementById('eventForm');
  const validationEl = document.getElementById('eventValidation');
  const dayLabelsContainer = document.getElementById('dayLabelsContainer');
  const dateMenu = document.getElementById('dateContextMenu');
  const eventMenu = document.getElementById('eventContextMenu');
  const colorPicker = document.getElementById('dateColorPicker');
  const deleteScopeModalEl = document.getElementById('deleteScopeModal');
  const deleteScopeModal = deleteScopeModalEl ? new bootstrap.Modal(deleteScopeModalEl) : null;
  const deleteScopeModalMessage = document.getElementById('deleteScopeModalMessage');
  const deleteScopeSingleBtn = document.getElementById('deleteScopeSingleBtn');
  const deleteScopeAllBtn = document.getElementById('deleteScopeAllBtn');
  const deleteScopeCancelBtn = document.getElementById('deleteScopeCancelBtn');
  const deleteForm = document.getElementById('deleteEventForm');
  const deleteModeInput = document.getElementById('deleteMode');
  const deleteOccurrenceDateInput = document.getElementById('deleteOccurrenceDate');
  const eventActionForm = document.getElementById('eventActionForm');
  const eventActionTargetDate = document.getElementById('eventActionTargetDate');
  const eventActionAnchorDate = document.getElementById('eventActionAnchorDate');
  const eventActionMoveMode = document.getElementById('eventActionMoveMode');
  const titleDisplay = document.getElementById('calendarTitleDisplay');
  const titleInput = document.getElementById('calendarTitleInput');
  const nonDateColorInput = document.getElementById('nonDateColorInput');
  const weekendHolidayColorInput = document.getElementById('weekendHolidayColorInput');
  const weekdayColorInput = document.getElementById('weekdayColorInput');
  const lineColorInput = document.getElementById('lineColorInput');
  const lineThicknessInput = document.getElementById('lineThicknessInput');
  const lineThicknessValue = document.getElementById('lineThicknessValue');
  const bodyFontPresetSelect = document.getElementById('bodyFontPresetSelect');
  const titleFontPresetSelect = document.getElementById('titleFontPresetSelect');
  const bodyFontSizeInput = document.getElementById('bodyFontSizeInput');
  const bodyFontSizeValue = document.getElementById('bodyFontSizeValue');
  const titleFontSizeInput = document.getElementById('titleFontSizeInput');
  const titleFontSizeValue = document.getElementById('titleFontSizeValue');
  const eventFontSizeInput = document.getElementById('eventFontSizeInput');
  const eventFontSizeValue = document.getElementById('eventFontSizeValue');
  const resetSettingsBtn = document.getElementById('resetSettingsBtn');
  const editScopeModeInput = document.getElementById('editScopeMode');
  const editSourceEventIdInput = document.getElementById('editSourceEventId');
  const editOccurrenceDateInput = document.getElementById('editOccurrenceDate');
  const editBuiltinSourceTypeInput = document.getElementById('editBuiltinSourceType');
  const editBuiltinHideTypeInput = document.getElementById('editBuiltinHideType');
  const editBuiltinHideKeyInput = document.getElementById('editBuiltinHideKey');
  const editBuiltinSeriesKeyInput = document.getElementById('editBuiltinSeriesKey');
  const editBuiltinScopeInput = document.getElementById('editBuiltinScope');
  const eventScopeBanner = document.getElementById('eventScopeBanner');
  const eventScopeBannerText = document.getElementById('eventScopeBannerText');
  const calendarFitWarningEl = document.getElementById('calendarFitWarning');
  let activeDate = null;
  let activeEventId = null;
  let activeEventOccurrenceDate = null;
  let activeEventSourceType = 'user';
  let activeEventOccurrenceKey = '';
  let activeEventSeriesKey = '';
  let activeEventSeriesSpanDays = 1;
  let activeEventTitle = '';
  let calendarFitFrame = 0;
  const hiddenMeta = loadHiddenMeta();
  const defaultThemeSettings = {
    outsideMonthColor: '#f5f5f5',
    weekendHolidayColor: '#d9d9d9',
    weekdayHeaderColor: '#0f172a',
    lineColor: '#d6deea',
    lineThickness: 1,
    bodyFontPreset: 'system',
    titleFontPreset: 'system',
    bodyFontSize: 11,
    titleFontSize: 14,
    eventFontSize: 8,
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
  updateShareUI();
  renderHiddenItemsUI();

  document.getElementById('hiddenItemsModal')?.addEventListener('show.bs.modal', () => {
    renderHiddenItemsUI();
  });
  document.getElementById('shareModal')?.addEventListener('show.bs.modal', () => {
    updateShareUI();
  });
  document.getElementById('restoreHiddenItemsBtn')?.addEventListener('click', () => {
    restoreAllHiddenItems();
  });
  document.getElementById('restoreAllHiddenItemsBtn')?.addEventListener('click', () => {
    restoreAllHiddenItems();
  });
  document.getElementById('copyShareMessageBtn')?.addEventListener('click', async () => {
    const copied = await copyText(currentShareMessage());
    if (!copied) showValidation('Could not copy the share message right now.');
  });
  document.getElementById('copyWhatsappMessageBtn')?.addEventListener('click', async () => {
    const copied = await copyText(currentShareMessage());
    if (!copied) showValidation('Could not copy the WhatsApp text right now.');
  });
  document.getElementById('nativeShareBtn')?.addEventListener('click', async () => {
    if (typeof navigator.share !== 'function') return;
    try {
      await navigator.share({ title: browserTabTitle(), text: currentShareMessage() });
    } catch (error) {
      if (error?.name !== 'AbortError') showValidation('Could not open the device share sheet.');
    }
  });
  eventModalEl?.addEventListener('hidden.bs.modal', () => {
    resetScopedEditState();
  });

  function clearSelectedEvent() {
    activeEventId = null;
    activeEventOccurrenceDate = null;
    activeEventSourceType = 'user';
    activeEventOccurrenceKey = '';
    activeEventSeriesKey = '';
    activeEventSeriesSpanDays = 1;
    activeEventTitle = '';
  }

  function selectEvent({ eventId = null, occurrenceDate = '', sourceType = 'user', occurrenceKey = '', seriesKey = '', seriesSpanDays = 1, title = '' } = {}) {
    activeEventId = eventId;
    activeEventOccurrenceDate = occurrenceDate;
    activeEventSourceType = sourceType;
    activeEventOccurrenceKey = occurrenceKey;
    activeEventSeriesKey = seriesKey;
    activeEventSeriesSpanDays = seriesSpanDays || 1;
    activeEventTitle = title;
  }

  function formatMonthDate(iso) {
    if (!iso) return '';
    return monthDateFormatter.format(new Date(`${iso}T00:00:00Z`));
  }

  function currentShareMessage() {
    const monthLabel = browserTabTitle();
    const includesUsaJamaat = data.includeUsaJamaat;
    return [
      `Here is the ${monthLabel} myCal calendar.`,
      `If I attach an ICS file, download it and open it with your calendar app to add this month's events${includesUsaJamaat ? ' including visible USA Jamaat items' : ''}.`,
      'If I attach a PDF or image, that file is the visual month snapshot.',
    ].join(' ');
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      const fallback = document.createElement('textarea');
      fallback.value = text;
      fallback.setAttribute('readonly', '');
      fallback.style.position = 'fixed';
      fallback.style.opacity = '0';
      document.body.appendChild(fallback);
      fallback.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(fallback);
      return copied;
    }
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setScopedEditBanner(message = '') {
    if (!eventScopeBanner || !eventScopeBannerText) return;
    eventScopeBannerText.textContent = message;
    eventScopeBanner.classList.toggle('d-none', !message);
  }

  function resetScopedEditState() {
    if (editScopeModeInput) editScopeModeInput.value = 'all';
    if (editSourceEventIdInput) editSourceEventIdInput.value = '';
    if (editOccurrenceDateInput) editOccurrenceDateInput.value = '';
    if (editBuiltinSourceTypeInput) editBuiltinSourceTypeInput.value = '';
    if (editBuiltinHideTypeInput) editBuiltinHideTypeInput.value = '';
    if (editBuiltinHideKeyInput) editBuiltinHideKeyInput.value = '';
    if (editBuiltinSeriesKeyInput) editBuiltinSeriesKeyInput.value = '';
    if (editBuiltinScopeInput) editBuiltinScopeInput.value = '';
    setScopedEditBanner('');
  }

  function builtinEditState() {
    return {
      sourceType: editBuiltinSourceTypeInput?.value || '',
      hideType: editBuiltinHideTypeInput?.value || '',
      hideKey: editBuiltinHideKeyInput?.value || '',
      seriesKey: editBuiltinSeriesKeyInput?.value || '',
      scope: editBuiltinScopeInput?.value || '',
    };
  }

  function setBuiltinEditState({ sourceType = '', hideType = '', hideKey = '', seriesKey = '', scope = '', message = '' } = {}) {
    if (editBuiltinSourceTypeInput) editBuiltinSourceTypeInput.value = sourceType;
    if (editBuiltinHideTypeInput) editBuiltinHideTypeInput.value = hideType;
    if (editBuiltinHideKeyInput) editBuiltinHideKeyInput.value = hideKey;
    if (editBuiltinSeriesKeyInput) editBuiltinSeriesKeyInput.value = seriesKey;
    if (editBuiltinScopeInput) editBuiltinScopeInput.value = scope;
    setScopedEditBanner(message);
  }

  function setCalendarFitWarning(message = '') {
    if (!calendarFitWarningEl) return;
    calendarFitWarningEl.textContent = message;
    calendarFitWarningEl.classList.toggle('d-none', !message);
  }

  function buildTrackTemplate(needs, totalSpace, { minFactor = 0.82, maxFactor = 1.45 } = {}) {
    if (!Array.isArray(needs) || !needs.length || !Number.isFinite(totalSpace) || totalSpace <= 0) return '';
    const base = totalSpace / needs.length;
    const minTrack = Math.max(1, base * minFactor);
    const maxTrack = Math.max(minTrack, base * maxFactor);
    const normalized = needs.map((need) => {
      const numeric = Number.isFinite(need) && need > 0 ? need : base;
      return Math.min(maxTrack, Math.max(minTrack, numeric));
    });
    const total = normalized.reduce((sum, value) => sum + value, 0) || 1;
    return normalized.map((value) => `${((value / total) * 100).toFixed(4)}%`).join(' ');
  }

  function measureCellHeightRequirement(cell) {
    const measurables = cell.querySelectorAll('.holiday-pill, .event-list, .events, .cell-note-preview, .outside-month-editor, .outside-month-editor-shell, .cell-image-strip');
    let required = Math.max(cell.clientHeight || 0, cell.scrollHeight || 0);
    measurables.forEach((element) => {
      required += Math.max(0, (element.scrollHeight || 0) - (element.clientHeight || 0));
    });
    return required + 4;
  }

  function measureCellWidthRequirement(cell) {
    const measurables = cell.querySelectorAll('.holiday-pill, .event-list, .events, .cell-note-preview, .outside-month-editor, .outside-month-editor-shell, .cell-image-strip');
    const baseWidth = Math.max(cell.clientWidth || 0, cell.scrollWidth || 0);
    let required = baseWidth;
    measurables.forEach((element) => {
      const overflowWidth = Math.max(0, (element.scrollWidth || 0) - (element.clientWidth || 0));
      required = Math.max(required, (cell.clientWidth || 0) + overflowWidth);
    });
    return required + 2;
  }

  function cellStillOverflows(cell) {
    const ownOverflow = (cell.scrollHeight || 0) > ((cell.clientHeight || 0) + 2)
      || (cell.scrollWidth || 0) > ((cell.clientWidth || 0) + 2);
    if (ownOverflow) return true;
    return Array.from(
      cell.querySelectorAll('.holiday-pill, .event-list, .events, .cell-note-preview, .outside-month-editor, .outside-month-editor-shell, .cell-image-strip')
    ).some((element) => (
      (element.scrollHeight || 0) > ((element.clientHeight || 0) + 2)
      || (element.scrollWidth || 0) > ((element.clientWidth || 0) + 2)
    ));
  }

  function summarizeOverflowDates(dates) {
    const ordered = Array.from(new Set(dates)).sort();
    if (!ordered.length) return '';
    const visible = ordered.slice(0, 4).map((iso) => formatMonthDate(iso));
    return ordered.length > 4
      ? `${visible.join(', ')}, and ${ordered.length - 4} more`
      : visible.join(', ');
  }

  function applyCalendarAutoFit() {
    const monthGrid = document.getElementById('calendarBody');
    const weekdayHeader = document.querySelector('.calendar-grid.weekdays');
    if (!monthGrid || !weekdayHeader) return;
    const cells = Array.from(monthGrid.children).filter((cell) => cell.classList.contains('calendar-cell'));
    if (!cells.length) {
      setCalendarFitWarning('');
      return;
    }

    monthGrid.style.removeProperty('grid-template-columns');
    monthGrid.style.removeProperty('grid-template-rows');
    weekdayHeader.style.removeProperty('grid-template-columns');
    cells.forEach((cell) => {
      cell.removeAttribute('data-fit-warning');
      cell.removeAttribute('title');
    });

    const availableWidth = monthGrid.clientWidth || monthGrid.offsetWidth || 0;
    const availableHeight = monthGrid.clientHeight || monthGrid.offsetHeight || 0;
    if (!availableWidth || !availableHeight) {
      setCalendarFitWarning('');
      return;
    }

    const columnNeeds = Array.from({ length: 7 }, () => 0);
    cells.forEach((cell, index) => {
      const columnIndex = index % 7;
      columnNeeds[columnIndex] = Math.max(columnNeeds[columnIndex], measureCellWidthRequirement(cell));
    });
    const columnTemplate = buildTrackTemplate(columnNeeds, availableWidth, { minFactor: 0.88, maxFactor: 1.24 });
    if (columnTemplate) {
      monthGrid.style.gridTemplateColumns = columnTemplate;
      weekdayHeader.style.gridTemplateColumns = columnTemplate;
    }

    const rowNeeds = Array.from({ length: Math.ceil(cells.length / 7) }, () => 0);
    cells.forEach((cell, index) => {
      const rowIndex = Math.floor(index / 7);
      rowNeeds[rowIndex] = Math.max(rowNeeds[rowIndex], measureCellHeightRequirement(cell));
    });
    const rowTemplate = buildTrackTemplate(rowNeeds, availableHeight, { minFactor: 0.74, maxFactor: 1.7 });
    if (rowTemplate) monthGrid.style.gridTemplateRows = rowTemplate;

    const overflowDates = [];
    cells.forEach((cell) => {
      if (!cellStillOverflows(cell)) return;
      cell.dataset.fitWarning = 'true';
      const iso = cell.dataset.date || '';
      if (iso) overflowDates.push(iso);
      cell.title = 'This cell does not fit the printable page yet.';
    });

    if (overflowDates.length) {
      setCalendarFitWarning(
        `These dates still overflow the printable page: ${summarizeOverflowDates(overflowDates)}. Shorten text, hide items, or split crowded days before printing.`
      );
      return;
    }
    setCalendarFitWarning('');
  }

  function scheduleCalendarAutoFit() {
    if (calendarFitFrame) window.cancelAnimationFrame(calendarFitFrame);
    calendarFitFrame = window.requestAnimationFrame(() => {
      calendarFitFrame = 0;
      applyCalendarAutoFit();
    });
  }

  function supportsScopedAction(details, occurrenceDate) {
    if (!details || !occurrenceDate) return false;
    const isRecurring = details.recurrence_type && details.recurrence_type !== 'none';
    const isMultiDay = getSpanDays(details.start_date, details.end_date) > 1;
    if (!isRecurring && !isMultiDay) return false;
    return occurrenceDate >= details.start_date && occurrenceDate <= details.end_date;
  }

  function askActionScope(details, actionVerb) {
    const isRecurring = details.recurrence_type && details.recurrence_type !== 'none';
    const intro = isRecurring ? 'This is a recurring event.' : 'This is a multi-day event.';
    const affectSelectedDate = window.confirm(
      `${intro}\n\nChoose an option:\n• OK = ${actionVerb.charAt(0).toUpperCase()}${actionVerb.slice(1)} only this date.\n• Cancel = See options for the full series or cancel completely.`
    );
    if (affectSelectedDate) return 'single';
    const affectSeries = window.confirm(
      `${actionVerb.charAt(0).toUpperCase()}${actionVerb.slice(1)} the entire series?\n\n• OK = ${actionVerb.charAt(0).toUpperCase()}${actionVerb.slice(1)} entire series.\n• Cancel = Do nothing.`
    );
    return affectSeries ? 'all' : '';
  }

  function buildSingleOccurrenceDraft(details, occurrenceDate) {
    return {
      ...details,
      id: '',
      start_date: occurrenceDate,
      end_date: occurrenceDate,
      recurrence_type: 'none',
      recurrence_weekdays: '',
      labels: {},
    };
  }

  function flattenEventItems() {
    return Object.values(data.events || {}).flatMap((items) => items || []);
  }

  function hiddenItemEntries() {
    const entries = [];
    const allItems = flattenEventItems();
    const usaBySeries = new Map();
    allItems.filter((item) => item.is_usa_jamaat && item.series_key).forEach((item) => {
      if (!usaBySeries.has(item.series_key)) usaBySeries.set(item.series_key, item);
    });

    Array.from(hiddenMeta.holidays).forEach((iso) => {
      entries.push({
        type: 'holidays',
        key: iso,
        sortKey: `0-${iso}`,
        title: data.holidays[iso] || 'U.S. holiday',
        meta: `Hidden U.S. holiday on ${formatMonthDate(iso)}`,
      });
    });

    Array.from(hiddenMeta.islamic).forEach((iso) => {
      entries.push({
        type: 'islamic',
        key: iso,
        sortKey: `1-${iso}`,
        title: islamicLabelForDate(iso) || 'Islamic date',
        meta: `Hidden Islamic date on ${formatMonthDate(iso)}`,
      });
    });

    Array.from(hiddenMeta.usaJamaatOccurrences).forEach((occurrenceKey) => {
      const item = allItems.find((entry) => entry.is_usa_jamaat && entry.occurrence_key === occurrenceKey);
      const occurrenceDate = item?.date || String(occurrenceKey).split('@')[1] || '';
      entries.push({
        type: 'usaJamaatOccurrences',
        key: occurrenceKey,
        sortKey: `2-${occurrenceDate}-${item?.title || occurrenceKey}`,
        title: item?.title || 'USA Jamaat event',
        meta: `Hidden USA Jamaat occurrence on ${formatMonthDate(occurrenceDate)}`,
      });
    });

    Array.from(hiddenMeta.usaJamaatSeries).forEach((seriesKey) => {
      const item = usaBySeries.get(seriesKey);
      const startDate = item?.occurrence_key?.split('@')[1] || item?.date || '';
      entries.push({
        type: 'usaJamaatSeries',
        key: seriesKey,
        sortKey: `3-${startDate}-${item?.title || seriesKey}`,
        title: item?.title || 'USA Jamaat series',
        meta: `Hidden USA Jamaat series${startDate ? ` starting ${formatMonthDate(startDate)}` : ''}`,
      });
    });

    return entries.sort((left, right) => left.sortKey.localeCompare(right.sortKey));
  }

  function removeHiddenItem(type, key) {
    if (!hiddenMeta[type]) return;
    hiddenMeta[type].delete(key);
    persistHiddenMeta();
  }

  function restoreAllHiddenItems() {
    [hiddenMeta.holidays, hiddenMeta.islamic, hiddenMeta.usaJamaatOccurrences, hiddenMeta.usaJamaatSeries].forEach((values) => values.clear());
    persistHiddenMeta();
    renderCalendarDecorations();
    renderHiddenItemsUI();
  }

  function renderHiddenItemsUI() {
    const entries = hiddenItemEntries();
    const summaryText = entries.length
      ? `${entries.length} hidden item${entries.length === 1 ? '' : 's'} in ${browserTabTitle()}.`
      : 'Nothing hidden for this month.';
    const summary = document.getElementById('hiddenItemsSummary');
    const modalSummary = document.getElementById('hiddenItemsModalSummary');
    const list = document.getElementById('hiddenItemsList');
    const restoreBtn = document.getElementById('restoreHiddenItemsBtn');
    const restoreAllBtn = document.getElementById('restoreAllHiddenItemsBtn');

    if (summary) summary.textContent = summaryText;
    if (modalSummary) modalSummary.textContent = summaryText;
    if (restoreBtn) restoreBtn.disabled = entries.length === 0;
    if (restoreAllBtn) restoreAllBtn.disabled = entries.length === 0;
    if (!list) return;

    if (!entries.length) {
      list.innerHTML = '<div class="hidden-item-card empty-state">Nothing is hidden for this month.</div>';
      return;
    }

    list.innerHTML = entries.map((entry, index) => `
      <div class="hidden-item-card">
        <div class="hidden-item-body">
          <div class="hidden-item-title">${escapeHtml(entry.title)}</div>
          <div class="hidden-item-meta">${escapeHtml(entry.meta)}</div>
        </div>
        <button type="button" class="btn btn-outline-primary btn-sm" data-hidden-type="${entry.type}" data-hidden-key="${entry.key}" aria-label="Restore hidden item ${index + 1}">Restore</button>
      </div>
    `).join('');

    list.querySelectorAll('[data-hidden-type][data-hidden-key]').forEach((button) => {
      button.addEventListener('click', () => {
        removeHiddenItem(button.dataset.hiddenType, button.dataset.hiddenKey);
        renderCalendarDecorations();
        renderHiddenItemsUI();
      });
    });
  }

  function updateShareUI() {
    const preview = document.getElementById('shareMessagePreview');
    const nativeShareBtn = document.getElementById('nativeShareBtn');
    const whatsappLink = document.getElementById('openWhatsappShareLink');
    const shareMessage = currentShareMessage();

    if (preview) preview.value = shareMessage;
    if (whatsappLink) whatsappLink.href = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    if (nativeShareBtn) nativeShareBtn.classList.toggle('d-none', typeof navigator.share !== 'function');
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
        selectEvent({
          eventId: sourceEventId,
          occurrenceDate: activeDate,
          sourceType: 'user',
          occurrenceKey: `event-${sourceEventId}@${activeDate}`,
          seriesKey: `event-${sourceEventId}`,
          seriesSpanDays: 1,
        });
        await openEventById(sourceEventId, activeDate);
        return;
      }
      if (activeEventId && activeEventOccurrenceDate === activeDate) {
        event.preventDefault();
        await openEventById(activeEventId, activeDate);
        return;
      }
      const dateItems = data.events[activeDate] || [];
      const firstEvent = dateItems.find((item) => item.source_event_id && !item.is_holiday);
      if (firstEvent) {
        event.preventDefault();
        selectEvent({
          eventId: firstEvent.source_event_id,
          occurrenceDate: activeDate,
          sourceType: firstEvent.source_type || 'user',
          occurrenceKey: firstEvent.occurrence_key || `event-${firstEvent.source_event_id}@${activeDate}`,
          seriesKey: firstEvent.series_key || '',
          seriesSpanDays: firstEvent.series_span_days || 1,
          title: firstEvent.title || '',
        });
        await openEventById(firstEvent.source_event_id, activeDate);
        return;
      }
      openEventModal({ start_date: activeDate, end_date: activeDate });
    });
    cell.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      activeDate = cell.dataset.date;
      showMenu(dateMenu, event.pageX, event.pageY);
    });
    bindLongPress(cell, ({ x, y }) => {
      activeDate = cell.dataset.date;
      if (!cell.querySelector('.event-chip:hover')) clearSelectedEvent();
      showMenu(dateMenu, x, y);
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

  document.getElementById('contextModifyHoliday').addEventListener('click', () => {
    if (!activeDate) return;
    hideMenus();
    openBuiltinOverrideEditor(holidayOverrideDraft(activeDate));
  });

  document.getElementById('contextModifyIslamic').addEventListener('click', () => {
    if (!activeDate) return;
    hideMenus();
    openBuiltinOverrideEditor(islamicOverrideDraft(activeDate));
  });

  colorPicker.addEventListener('input', async () => {
    const result = await saveDateStyle('/date-style', { day: activeDate, background_color: colorPicker.value });
    if (result.ok) window.location.reload();
  });

  document.getElementById('contextDeleteEvent').addEventListener('click', async () => {
    hideMenus();
    if (activeEventSourceType === 'usa-jamaat') {
      if (!activeEventOccurrenceKey) return;
      const deleteMode = activeEventSeriesSpanDays > 1 ? await askDeleteMode(false) : 'single';
      if (!deleteMode) return;
      if (deleteMode === 'all' && activeEventSeriesKey) {
        toggleHiddenMeta('usaJamaatSeries', activeEventSeriesKey);
      } else {
        toggleHiddenMeta('usaJamaatOccurrences', activeEventOccurrenceKey);
      }
      renderCalendarDecorations();
      return;
    }
    if (activeEventSourceType === 'holiday' && activeEventOccurrenceDate) {
      toggleHiddenMeta('holidays', activeEventOccurrenceDate);
      renderCalendarDecorations();
      return;
    }
    await submitDeleteEvent(activeEventId, activeEventOccurrenceDate);
  });

  function monthCalendarLabel() {
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(Date.UTC(data.selectedYear, data.selectedMonth - 1, 1)));
    return `${monthName} Calendar`;
  }

  function browserTabTitle() {
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(Date.UTC(data.selectedYear, data.selectedMonth - 1, 1)));
    return `${monthName} ${data.selectedYear}`;
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
    document.title = browserTabTitle();
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

  function ensureHiddenMeta(type, value) {
    if (!type || !value || !hiddenMeta[type]) return;
    hiddenMeta[type].add(value);
    persistHiddenMeta();
  }

  function visibleHolidayLabelForDate(iso) {
    if (!iso || isHiddenMeta('holidays', iso)) return '';
    return data.holidays[iso] || '';
  }

  function visibleIslamicLabelForDate(iso) {
    if (!iso || isHiddenMeta('islamic', iso)) return '';
    return islamicLabelForDate(iso);
  }

  function visibleUsaJamaatSeriesItems(seriesKey) {
    return flattenEventItems()
      .filter((item) => item.is_usa_jamaat && item.series_key === seriesKey)
      .sort((left, right) => String(left.date).localeCompare(String(right.date)));
  }

  function holidayOverrideDraft(iso) {
    const title = visibleHolidayLabelForDate(iso);
    if (!title) return null;
    return {
      title,
      start_date: iso,
      end_date: iso,
      start_time: '',
      audience: 'All',
      color: '#7c3aed',
      location: '',
      notes: 'Customized from the built-in U.S. holiday feed.',
      recurrence_weekdays: '',
      recurrence_type: 'none',
      labels: {},
      builtinOverride: {
        sourceType: 'holiday',
        hideType: 'holidays',
        hideKey: iso,
        scope: 'single',
        message: `Saving will create a custom event and hide the built-in U.S. holiday on ${formatMonthDate(iso)}.`,
      },
    };
  }

  function islamicOverrideDraft(iso) {
    const title = visibleIslamicLabelForDate(iso);
    if (!title) return null;
    return {
      title,
      start_date: iso,
      end_date: iso,
      start_time: '',
      audience: 'All',
      color: '#166534',
      location: '',
      notes: 'Customized from the built-in Islamic date label.',
      recurrence_weekdays: '',
      recurrence_type: 'none',
      labels: {},
      builtinOverride: {
        sourceType: 'islamic',
        hideType: 'islamic',
        hideKey: iso,
        scope: 'single',
        message: `Saving will create a custom event and hide the built-in Islamic label on ${formatMonthDate(iso)}.`,
      },
    };
  }

  function usaJamaatOverrideDraft({ occurrenceDate, occurrenceKey, seriesKey, scope }) {
    const seriesItems = visibleUsaJamaatSeriesItems(seriesKey);
    const { start, end } = currentMonthBounds();
    const visibleStart = seriesItems[0]?.date || occurrenceDate || start;
    const visibleEnd = seriesItems[seriesItems.length - 1]?.date || occurrenceDate || end;
    const title = seriesItems[0]?.title || activeEventTitle || 'USA Jamaat event';
    const location = seriesItems.find((item) => item.location)?.location || '';
    const notes = seriesItems.find((item) => item.notes)?.notes || 'Customized from the built-in USA Jamaat feed.';
    return {
      title,
      start_date: scope === 'all' ? visibleStart : occurrenceDate,
      end_date: scope === 'all' ? visibleEnd : occurrenceDate,
      start_time: '',
      audience: seriesItems[0]?.audience || 'All',
      color: '#0f766e',
      location,
      notes,
      recurrence_weekdays: '',
      recurrence_type: 'none',
      labels: {},
      builtinOverride: {
        sourceType: 'usa-jamaat',
        hideType: scope === 'all' ? 'usaJamaatSeries' : 'usaJamaatOccurrences',
        hideKey: scope === 'all' ? seriesKey : occurrenceKey,
        seriesKey,
        scope,
        message: scope === 'all'
          ? 'Saving will create a custom event and hide the built-in USA Jamaat series for this month.'
          : `Saving will create a custom event and hide the built-in USA Jamaat event on ${formatMonthDate(occurrenceDate)}.`,
      },
    };
  }

  function openBuiltinOverrideEditor(draft) {
    if (!draft) return;
    openEventModal(draft, draft.start_date || draft.startDate || '');
  }

  function renderEvents() {
    document.querySelectorAll('[data-events-for]').forEach((container) => {
      const date = container.dataset.eventsFor;
      const items = data.events[date] || [];
      container.innerHTML = '';
      items.forEach((item) => {
        if (item.is_holiday && isHiddenMeta('holidays', date)) return;
        if (item.is_usa_jamaat && item.series_key && isHiddenMeta('usaJamaatSeries', item.series_key)) return;
        if (item.is_usa_jamaat && item.occurrence_key && isHiddenMeta('usaJamaatOccurrences', item.occurrence_key)) return;
        const chip = document.createElement('a');
        chip.className = `event-chip ${item.is_holiday ? 'holiday-chip' : ''} ${item.is_usa_jamaat ? 'usa-jamaat-chip' : ''}`.trim();
        chip.textContent = item.display_text;
        chip.style.backgroundColor = (item.uses_custom_color || item.is_holiday || item.is_usa_jamaat)
          ? item.color
          : colorForAudience(item.audience);
        chip.href = '#';
        if (item.source_event_id) {
          chip.dataset.sourceEventId = String(item.source_event_id);
        }
        chip.title = [item.title, item.location, item.notes].filter(Boolean).join(' • ');
        chip.draggable = Boolean(!item.is_holiday && item.source_event_id);
        chip.addEventListener('click', async (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (item.is_holiday || !item.source_event_id || item.source_type !== 'user') return;
          selectEvent({
            eventId: item.source_event_id,
            occurrenceDate: date,
            sourceType: item.source_type || 'user',
            occurrenceKey: item.occurrence_key || `event-${item.source_event_id}@${date}`,
            seriesKey: item.series_key || '',
            seriesSpanDays: item.series_span_days || 1,
            title: item.title || '',
          });
          await openEventById(item.source_event_id, date);
        });
        chip.addEventListener('dblclick', async (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (item.is_holiday || !item.source_event_id || item.source_type !== 'user') return;
          selectEvent({
            eventId: item.source_event_id,
            occurrenceDate: date,
            sourceType: item.source_type || 'user',
            occurrenceKey: item.occurrence_key || `event-${item.source_event_id}@${date}`,
            seriesKey: item.series_key || '',
            seriesSpanDays: item.series_span_days || 1,
            title: item.title || '',
          });
          await openEventById(item.source_event_id, date);
        });
        chip.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (item.source_type === 'user' && !item.source_event_id) return;
          selectEvent({
            eventId: item.source_event_id || null,
            occurrenceDate: date,
            sourceType: item.source_type || 'user',
            occurrenceKey: item.occurrence_key || '',
            seriesKey: item.series_key || '',
            seriesSpanDays: item.series_span_days || 1,
            title: item.title || '',
          });
          syncEventMenuLabels();
          showMenu(eventMenu, event.pageX, event.pageY);
        });
        bindLongPress(chip, ({ x, y }) => {
          if (item.source_type === 'user' && !item.source_event_id) return;
          selectEvent({
            eventId: item.source_event_id || null,
            occurrenceDate: date,
            sourceType: item.source_type || 'user',
            occurrenceKey: item.occurrence_key || '',
            seriesKey: item.series_key || '',
            seriesSpanDays: item.series_span_days || 1,
            title: item.title || '',
          });
          syncEventMenuLabels();
          showMenu(eventMenu, x, y);
        });
        chip.addEventListener('dragstart', (event) => {
          if (item.is_holiday || !item.source_event_id || item.source_type !== 'user') return;
          selectEvent({
            eventId: item.source_event_id,
            occurrenceDate: date,
            sourceType: item.source_type || 'user',
            occurrenceKey: item.occurrence_key || `event-${item.source_event_id}@${date}`,
            seriesKey: item.series_key || '',
            seriesSpanDays: item.series_span_days || 1,
            title: item.title || '',
          });
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
    scheduleCalendarAutoFit();
  }

  function getIslamicParts(iso) {
    const parts = islamicFormatter.formatToParts(new Date(`${iso}T00:00:00Z`));
    const rawMonth = parts.find((part) => part.type === 'month')?.value || '';
    return {
      month: islamicMonthNameMap[rawMonth] || rawMonth,
      day: Number(parts.find((part) => part.type === 'day')?.value || 0),
    };
  }

  function ordinal(day) {
    const mod10 = day % 10;
    const mod100 = day % 100;
    if (mod10 === 1 && mod100 !== 11) return `${day}st`;
    if (mod10 === 2 && mod100 !== 12) return `${day}nd`;
    if (mod10 === 3 && mod100 !== 13) return `${day}rd`;
    return `${day}th`;
  }

  function islamicLabelForDate(iso) {
    const mode = (data.islamicMode || 'partial').toLowerCase();
    if (mode === 'off') return '';

    const islamic = getIslamicParts(iso);
    const isFirstGregorian = iso.endsWith('-01');
    const isFirstIslamic = islamic.day === 1;
    if (mode === 'partial' && !isFirstGregorian && !isFirstIslamic) return '';
    return `${ordinal(islamic.day)} of ${islamic.month}`;
  }

  function bindLongPress(target, onTrigger) {
    if (!target) return;

    let timerId = 0;
    let pointerId = null;
    let startX = 0;
    let startY = 0;

    const cancel = () => {
      if (timerId) {
        window.clearTimeout(timerId);
        timerId = 0;
      }
      pointerId = null;
    };

    target.addEventListener('pointerdown', (event) => {
      if ((event.pointerType || 'mouse') === 'mouse' || event.button !== 0) return;
      startX = event.pageX;
      startY = event.pageY;
      pointerId = event.pointerId;
      timerId = window.setTimeout(() => {
        timerId = 0;
        target.dataset.longPressHandled = 'true';
        onTrigger({ x: startX, y: startY });
      }, 420);
    });

    target.addEventListener('pointermove', (event) => {
      if (pointerId == null || event.pointerId !== pointerId) return;
      if (Math.abs(event.pageX - startX) > 10 || Math.abs(event.pageY - startY) > 10) cancel();
    });

    ['pointerup', 'pointercancel', 'pointerleave'].forEach((eventName) => {
      target.addEventListener(eventName, (event) => {
        if (pointerId == null || (event.pointerId != null && event.pointerId !== pointerId)) return;
        cancel();
      });
    });

    target.addEventListener('click', (event) => {
      if (target.dataset.longPressHandled === 'true') {
        delete target.dataset.longPressHandled;
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);
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

  async function submitMoveEvent(eventId, targetDate, anchorDate) {
    if (!eventId || !targetDate) return;
    let moveMode = 'all';
    const details = await fetchEventDetails(eventId);
    const occurrenceDate = anchorDate || details?.start_date || '';
    if (supportsScopedAction(details, occurrenceDate)) {
      moveMode = askActionScope(details, 'move');
      if (!moveMode) return;
    }
    eventActionForm.action = `/events/move/${eventId}`;
    eventActionTargetDate.value = targetDate;
    eventActionAnchorDate.value = anchorDate || '';
    if (eventActionMoveMode) eventActionMoveMode.value = moveMode;
    eventActionForm.submit();
  }

  document.getElementById('contextModifyEvent').addEventListener('click', async () => {
    hideMenus();
    if (activeEventSourceType === 'holiday' && activeEventOccurrenceDate) {
      openBuiltinOverrideEditor(holidayOverrideDraft(activeEventOccurrenceDate));
      return;
    }
    if (activeEventSourceType === 'usa-jamaat') {
      if (!activeEventOccurrenceDate) return;
      const seriesItems = visibleUsaJamaatSeriesItems(activeEventSeriesKey);
      const startDate = seriesItems[0]?.date || activeEventOccurrenceDate;
      const endDate = seriesItems[seriesItems.length - 1]?.date || activeEventOccurrenceDate;
      const scope = activeEventSeriesSpanDays > 1
        ? askActionScope(
          {
            recurrence_type: 'none',
            start_date: startDate,
            end_date: endDate,
          },
          'edit'
        )
        : 'single';
      if (!scope) return;
      openBuiltinOverrideEditor(
        usaJamaatOverrideDraft({
          occurrenceDate: activeEventOccurrenceDate,
          occurrenceKey: activeEventOccurrenceKey,
          seriesKey: activeEventSeriesKey,
          scope,
        })
      );
      return;
    }
    if (activeEventSourceType !== 'user' || !activeEventId) return;
    await openEventById(activeEventId, activeEventOccurrenceDate || '');
  });

  document.getElementById('contextMoveEvent').addEventListener('click', async () => {
    hideMenus();
    if (activeEventSourceType !== 'user' || !activeEventId) return;

    const defaultDate = activeEventOccurrenceDate || '';
    const nextStart = window.prompt('Move event to start on (YYYY-MM-DD):', defaultDate);
    if (!nextStart) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextStart)) {
      showValidation('Please enter the new date in YYYY-MM-DD format.');
      return;
    }
    await submitMoveEvent(activeEventId, nextStart, activeEventOccurrenceDate || '');
  });

  function applyDateStyles() {
    document.querySelectorAll('.calendar-cell[data-in-month="true"]').forEach((cell) => {
      const iso = cell.dataset.date;
      const day = new Date(`${iso}T00:00:00`);
      const jsDay = day.getUTCDay();
      const showHoliday = Boolean(data.holidays[iso]) && !isHiddenMeta('holidays', iso);
      const islamicLabel = !isHiddenMeta('islamic', iso) ? islamicLabelForDate(iso) : '';
      if (jsDay === 0 || jsDay === 6) cell.classList.add('weekend');
      cell.classList.toggle('holiday', showHoliday);
      if (data.longWeekends.includes(iso)) cell.classList.add('long-weekend');
      if (data.styles[iso]) cell.style.background = data.styles[iso];
      const holidayPill = cell.querySelector('.holiday-pill');
      if (holidayPill) {
        const lines = [];
        if (showHoliday && data.holidays[iso]) lines.push(`<span class="calendar-meta-line">${escapeHtml(data.holidays[iso])}</span>`);
        if (islamicLabel) lines.push(`<span class="calendar-meta-line islamic-note">${escapeHtml(islamicLabel)}</span>`);
        holidayPill.innerHTML = lines.join('');
        holidayPill.classList.toggle('has-content', lines.length > 0);
        holidayPill.classList.remove('holiday-pill-long');
      }
    });
  }

  function themeSettingsStorageKey() {
    return 'mycal.theme.settings.v1';
  }

  function fontStackForPreset(preset) {
    return fontPresets[preset] || fontPresets.system;
  }

  function themeNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function normalizeFontPointValue(value, fallback) {
    const parsed = themeNumber(value, fallback);
    if (parsed > 0 && parsed <= 2.5) {
      return Number((Math.round(parsed * legacyRemToPt * 2) / 2).toFixed(1));
    }
    return parsed;
  }

  function formatPointCssValue(value) {
    return `${normalizeFontPointValue(value, 0)}pt`;
  }

  function formatFontControlValue(value) {
    return String(Number(normalizeFontPointValue(value, 0).toFixed(1)));
  }

  function derivedThemeSizes(theme) {
    const bodyFontSize = normalizeFontPointValue(theme.bodyFontSize, defaultThemeSettings.bodyFontSize);
    const titleFontSize = normalizeFontPointValue(theme.titleFontSize, defaultThemeSettings.titleFontSize);
    const eventFontSize = normalizeFontPointValue(theme.eventFontSize, defaultThemeSettings.eventFontSize);

    return {
      bodyFontSize,
      titleFontSize,
      eventFontSize,
      weekdayFontSize: Math.max(8.6, Number((bodyFontSize - 1.6).toFixed(1))),
      dayNumberFontSize: Math.max(9.8, Number((bodyFontSize - 0.6).toFixed(1))),
      metaFontSize: Math.max(6.5, Number((bodyFontSize - 4.3).toFixed(1))),
      noteFontSize: Math.max(6.7, Number((bodyFontSize - 4.2).toFixed(1))),
    };
  }

  function loadThemeSettings() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(themeSettingsStorageKey()) || '{}');
      return {
        ...defaultThemeSettings,
        ...parsed,
        bodyFontSize: normalizeFontPointValue(parsed.bodyFontSize, defaultThemeSettings.bodyFontSize),
        titleFontSize: normalizeFontPointValue(parsed.titleFontSize, defaultThemeSettings.titleFontSize),
        eventFontSize: normalizeFontPointValue(parsed.eventFontSize, defaultThemeSettings.eventFontSize),
      };
    } catch (error) {
      return { ...defaultThemeSettings };
    }
  }

  function saveThemeSettings() {
    window.localStorage.setItem(themeSettingsStorageKey(), JSON.stringify(themeSettings));
  }

  function applyThemeSettings() {
    const sizes = derivedThemeSizes(themeSettings);
    const root = document.documentElement;
    root.style.setProperty('--outside-month-color', themeSettings.outsideMonthColor);
    root.style.setProperty('--weekend-color', themeSettings.weekendHolidayColor);
    root.style.setProperty('--weekday-header-color', themeSettings.weekdayHeaderColor);
    root.style.setProperty('--grid-line-color', themeSettings.lineColor);
    root.style.setProperty('--grid-line-width', `${themeSettings.lineThickness}px`);
    root.style.setProperty('--calendar-font-family', fontStackForPreset(themeSettings.bodyFontPreset));
    root.style.setProperty('--calendar-title-font-family', fontStackForPreset(themeSettings.titleFontPreset));
    root.style.setProperty('--calendar-body-font-size', formatPointCssValue(sizes.bodyFontSize));
    root.style.setProperty('--calendar-title-font-size', formatPointCssValue(sizes.titleFontSize));
    root.style.setProperty('--calendar-weekday-font-size', formatPointCssValue(sizes.weekdayFontSize));
    root.style.setProperty('--calendar-day-number-font-size', formatPointCssValue(sizes.dayNumberFontSize));
    root.style.setProperty('--calendar-meta-font-size', formatPointCssValue(sizes.metaFontSize));
    root.style.setProperty('--calendar-event-font-size', formatPointCssValue(sizes.eventFontSize));
    root.style.setProperty('--calendar-note-font-size', formatPointCssValue(sizes.noteFontSize));
    scaleCalendar();
  }

  function setupColorSettings() {
    if (!nonDateColorInput) return;

    nonDateColorInput.value = themeSettings.outsideMonthColor;
    weekendHolidayColorInput.value = themeSettings.weekendHolidayColor;
    weekdayColorInput.value = themeSettings.weekdayHeaderColor;
    lineColorInput.value = themeSettings.lineColor;
    lineThicknessInput.value = String(themeSettings.lineThickness);
    lineThicknessValue.textContent = `${themeSettings.lineThickness}px`;
    bodyFontPresetSelect.value = themeSettings.bodyFontPreset;
    titleFontPresetSelect.value = themeSettings.titleFontPreset;
    bodyFontSizeInput.value = String(themeSettings.bodyFontSize);
    bodyFontSizeValue.textContent = formatFontControlValue(themeSettings.bodyFontSize);
    titleFontSizeInput.value = String(themeSettings.titleFontSize);
    titleFontSizeValue.textContent = formatFontControlValue(themeSettings.titleFontSize);
    eventFontSizeInput.value = String(themeSettings.eventFontSize);
    eventFontSizeValue.textContent = formatFontControlValue(themeSettings.eventFontSize);

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
    bodyFontPresetSelect.addEventListener('change', () => {
      themeSettings.bodyFontPreset = bodyFontPresetSelect.value;
      applyThemeSettings();
      saveThemeSettings();
    });
    titleFontPresetSelect.addEventListener('change', () => {
      themeSettings.titleFontPreset = titleFontPresetSelect.value;
      applyThemeSettings();
      saveThemeSettings();
    });
    bodyFontSizeInput.addEventListener('input', () => {
      themeSettings.bodyFontSize = Number(bodyFontSizeInput.value);
      bodyFontSizeValue.textContent = formatFontControlValue(themeSettings.bodyFontSize);
      applyThemeSettings();
      saveThemeSettings();
    });
    titleFontSizeInput.addEventListener('input', () => {
      themeSettings.titleFontSize = Number(titleFontSizeInput.value);
      titleFontSizeValue.textContent = formatFontControlValue(themeSettings.titleFontSize);
      applyThemeSettings();
      saveThemeSettings();
    });
    eventFontSizeInput.addEventListener('input', () => {
      themeSettings.eventFontSize = Number(eventFontSizeInput.value);
      eventFontSizeValue.textContent = formatFontControlValue(themeSettings.eventFontSize);
      applyThemeSettings();
      saveThemeSettings();
    });

    resetSettingsBtn.addEventListener('click', () => {
      themeSettings = { ...defaultThemeSettings };
      applyThemeSettings();
      nonDateColorInput.value = themeSettings.outsideMonthColor;
      weekendHolidayColorInput.value = themeSettings.weekendHolidayColor;
      weekdayColorInput.value = themeSettings.weekdayHeaderColor;
      lineColorInput.value = themeSettings.lineColor;
      lineThicknessInput.value = String(themeSettings.lineThickness);
      lineThicknessValue.textContent = `${themeSettings.lineThickness}px`;
      bodyFontPresetSelect.value = themeSettings.bodyFontPreset;
      titleFontPresetSelect.value = themeSettings.titleFontPreset;
      bodyFontSizeInput.value = String(themeSettings.bodyFontSize);
      bodyFontSizeValue.textContent = formatFontControlValue(themeSettings.bodyFontSize);
      titleFontSizeInput.value = String(themeSettings.titleFontSize);
      titleFontSizeValue.textContent = formatFontControlValue(themeSettings.titleFontSize);
      eventFontSizeInput.value = String(themeSettings.eventFontSize);
      eventFontSizeValue.textContent = formatFontControlValue(themeSettings.eventFontSize);
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
    window.addEventListener('resize', () => {
      scaleCalendar();
      scheduleCalendarAutoFit();
    }, { passive: true });
    window.addEventListener('load', () => {
      scaleCalendar();
      scheduleCalendarAutoFit();
    });
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

    document.querySelectorAll('input[name="recurrence_weekdays"]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        syncRecurringEndDate();
        syncRecurrenceType();
        buildDayLabels();
      });
    });
    document.getElementById('clearRecurringWeekdays').addEventListener('click', () => {
      document.querySelectorAll('input[name="recurrence_weekdays"]').forEach((checkbox) => {
        checkbox.checked = false;
      });
      syncRecurrenceType();
      syncRecurringEndDate();
      buildDayLabels(getCurrentLabelValues());
    });
    document.getElementById('title').addEventListener('input', () => buildDayLabels(getCurrentLabelValues()));
    document.getElementById('startDate').addEventListener('change', () => {
      syncRecurringEndDate();
      buildDayLabels(getCurrentLabelValues());
    });
    document.getElementById('endDate').addEventListener('change', () => buildDayLabels(getCurrentLabelValues()));

    syncRecurringEndDate();
    setupAudienceColorSettings();
    syncRecurrenceType();
    eventForm.addEventListener('submit', (event) => {
      const error = validateEventForm();
      if (error) {
        event.preventDefault();
        showValidation(error);
        return;
      }
      const builtinOverride = builtinEditState();
      if (builtinOverride.sourceType && builtinOverride.hideType && builtinOverride.hideKey) {
        ensureHiddenMeta(builtinOverride.hideType, builtinOverride.hideKey);
      }
    });
  }

  function openEventModal(payload, occurrenceDate = '') {
    resetScopedEditState();
    const builtinOverride = payload?.builtinOverride || null;
    const requestedOccurrenceDate = occurrenceDate || payload.start_date || payload.startDate || '';
    let scopedPayload = payload;
    if (builtinOverride?.sourceType) setBuiltinEditState(builtinOverride);

    if (payload.id && supportsScopedAction(payload, requestedOccurrenceDate)) {
      const editMode = askActionScope(payload, 'edit');
      if (!editMode) return;
      if (editMode === 'single') {
        scopedPayload = buildSingleOccurrenceDraft(payload, requestedOccurrenceDate);
        if (editSourceEventIdInput) editSourceEventIdInput.value = String(payload.id);
        if (editScopeModeInput) editScopeModeInput.value = 'single';
        if (editOccurrenceDateInput) editOccurrenceDateInput.value = requestedOccurrenceDate;
        setScopedEditBanner(`Editing only ${formatMonthDate(requestedOccurrenceDate)}. Saving will create a standalone event and remove that date from the original series.`);
      }
    }

    const candidateStartDate = scopedPayload.start_date || scopedPayload.startDate || '';
    const candidateEndDate = scopedPayload.end_date || scopedPayload.endDate || candidateStartDate;
    if (
      (candidateStartDate && !isSelectableDate(candidateStartDate))
      || (candidateEndDate && !isSelectableDate(candidateEndDate))
    ) {
      showValidation('Event dates for add/edit must stay within the current month.');
      return;
    }

    eventForm.reset();
    validationEl.classList.add('d-none');
    document.getElementById('eventId').value = scopedPayload.id || '';
    document.getElementById('title').value = scopedPayload.title || '';
    document.getElementById('startDate').value = scopedPayload.start_date || scopedPayload.startDate || '';
    document.getElementById('endDate').value = scopedPayload.end_date || scopedPayload.endDate || scopedPayload.start_date || '';
    document.getElementById('startTime').value = scopedPayload.start_time || '';
    document.getElementById('location').value = scopedPayload.location || '';
    document.getElementById('audience').value = scopedPayload.audience || 'Unspecified';
    const eventColorField = document.getElementById('eventColor');
    eventColorField.dataset.touched = scopedPayload.color ? 'true' : 'false';
    eventColorField.value = scopedPayload.color || colorForAudience(document.getElementById('audience').value);
    document.getElementById('notes').value = scopedPayload.notes || '';
    document.querySelectorAll('input[name="recurrence_weekdays"]').forEach((checkbox) => {
      checkbox.checked = (scopedPayload.recurrence_weekdays || '').split(',').includes(checkbox.value);
    });
    syncRecurrenceType();
    syncRecurringEndDate(Boolean(scopedPayload.id));
    buildDayLabels(scopedPayload.labels || {});
    const deleteButton = document.getElementById('deleteEventBtn');
    if (deleteButton) {
      deleteButton.classList.toggle('d-none', !scopedPayload.id);
      deleteButton.dataset.occurrenceDate = requestedOccurrenceDate || candidateStartDate || '';
    }
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

  function syncRecurrenceType() {
    const recurrenceTypeField = document.getElementById('recurrenceType');
    const hasWeekdays = document.querySelectorAll('input[name="recurrence_weekdays"]:checked').length > 0;
    recurrenceTypeField.value = hasWeekdays ? 'weekly' : 'none';
  }

  function validateEventForm() {
    const title = document.getElementById('title').value.trim();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const recurrenceType = document.getElementById('recurrenceType').value;
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
    if (recurrenceType === 'weekly' && selectedWeekdays === 0) {
      return 'Choose at least one weekday for a weekly recurring event.';
    }
    return '';
  }

  function loadAudienceColors() {
    try {
      const stored = window.localStorage.getItem(audienceColorStorageKey);
      if (!stored) return { ...defaultAudienceColors };
      const parsed = JSON.parse(stored);
      if (!parsed || typeof parsed !== 'object') return { ...defaultAudienceColors };
      return Object.entries(defaultAudienceColors).reduce((acc, [audience, defaultColor]) => {
        acc[audience] = typeof parsed[audience] === 'string' ? parsed[audience] : defaultColor;
        return acc;
      }, {});
    } catch (error) {
      return { ...defaultAudienceColors };
    }
  }

  function persistAudienceColors() {
    window.localStorage.setItem(audienceColorStorageKey, JSON.stringify(audienceColors));
  }

  function setupAudienceColorSettings() {
    document.querySelectorAll('.audience-color-input').forEach((input) => {
      const audience = input.dataset.audience;
      if (!audience) return;
      input.value = audienceColors[audience] || input.dataset.defaultColor || '#4b5563';
      input.addEventListener('input', () => {
        audienceColors[audience] = input.value;
        persistAudienceColors();
        if (document.getElementById('audience').value === audience && document.getElementById('eventColor').dataset.touched !== 'true') {
          document.getElementById('eventColor').value = input.value;
        }
        renderCalendarDecorations();
      });
    });
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
    const isMultiDay = getSpanDays(details.start_date, details.end_date) > 1;
    const deleteMode = (isRecurring || isMultiDay) ? await askDeleteMode(isRecurring) : 'all';
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

  async function openEventById(eventId, occurrenceDate = '') {
    const payload = await fetchEventDetails(eventId);
    if (!payload) {
      showValidation('Unable to load this event right now. Please try again.');
      return;
    }
    openEventModal(payload, occurrenceDate || activeEventOccurrenceDate || payload.start_date || '');
  }

  function askDeleteMode(isRecurring = false) {
    if (!deleteScopeModal || !deleteScopeSingleBtn || !deleteScopeAllBtn || !deleteScopeCancelBtn || !deleteScopeModalMessage) {
      const fallbackMessage = isRecurring
        ? 'Delete this occurrence only? Click Cancel to choose deleting all or to cancel.'
        : 'Delete this date only? Click Cancel to choose deleting all or to cancel.';
      const deleteOne = window.confirm(fallbackMessage);
      if (deleteOne) return Promise.resolve('single');
      const deleteAll = window.confirm('Delete all dates in this event series?');
      return Promise.resolve(deleteAll ? 'all' : '');
    }

    deleteScopeModalMessage.textContent = isRecurring
      ? 'This event repeats. Choose exactly what you want to remove.'
      : 'This event spans multiple dates. Choose exactly what you want to remove.';

    return new Promise((resolve) => {
      let finished = false;
      const done = (value) => {
        if (finished) return;
        finished = true;
        cleanup();
        resolve(value);
      };
      const onSingle = () => {
        deleteScopeModal.hide();
        done('single');
      };
      const onAll = () => {
        deleteScopeModal.hide();
        done('all');
      };
      const onCancel = () => {
        deleteScopeModal.hide();
        done('');
      };
      const onHidden = () => done('');
      const cleanup = () => {
        deleteScopeSingleBtn.removeEventListener('click', onSingle);
        deleteScopeAllBtn.removeEventListener('click', onAll);
        deleteScopeCancelBtn.removeEventListener('click', onCancel);
        deleteScopeModalEl.removeEventListener('hidden.bs.modal', onHidden);
      };

      deleteScopeSingleBtn.addEventListener('click', onSingle);
      deleteScopeAllBtn.addEventListener('click', onAll);
      deleteScopeCancelBtn.addEventListener('click', onCancel);
      deleteScopeModalEl.addEventListener('hidden.bs.modal', onHidden);
      deleteScopeModal.show();
    });
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
      const usaJamaatOccurrences = Array.isArray(parsed.usaJamaatOccurrences)
        ? parsed.usaJamaatOccurrences.filter((value) => typeof value === 'string')
        : [];
      const usaJamaatSeries = Array.isArray(parsed.usaJamaatSeries)
        ? parsed.usaJamaatSeries.filter((value) => typeof value === 'string')
        : [];
      return {
        holidays: new Set(holidays),
        islamic: new Set(islamic),
        usaJamaatOccurrences: new Set(usaJamaatOccurrences),
        usaJamaatSeries: new Set(usaJamaatSeries),
      };
    } catch (error) {
      return { holidays: new Set(), islamic: new Set(), usaJamaatOccurrences: new Set(), usaJamaatSeries: new Set() };
    }
  }

  function persistHiddenMeta() {
    const payload = {
      holidays: Array.from(hiddenMeta.holidays),
      islamic: Array.from(hiddenMeta.islamic),
      usaJamaatOccurrences: Array.from(hiddenMeta.usaJamaatOccurrences),
      usaJamaatSeries: Array.from(hiddenMeta.usaJamaatSeries),
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
    const modifyHolidayButton = document.getElementById('contextModifyHoliday');
    const modifyIslamicButton = document.getElementById('contextModifyIslamic');
    const holidayButton = document.getElementById('contextToggleHoliday');
    const islamicButton = document.getElementById('contextToggleIslamic');
    const selectableDate = isSelectableDate(activeDate);
    const hasHoliday = Boolean(activeDate && data.holidays[activeDate]);
    const hasIslamic = Boolean(activeDate && islamicLabelForDate(activeDate));
    const holidayHidden = Boolean(activeDate && isHiddenMeta('holidays', activeDate));
    const islamicHidden = Boolean(activeDate && isHiddenMeta('islamic', activeDate));

    addEventButton.classList.toggle('d-none', !selectableDate);
    modifyHolidayButton.classList.toggle('d-none', !selectableDate);
    modifyIslamicButton.classList.toggle('d-none', !selectableDate);
    holidayButton.classList.toggle('d-none', !selectableDate);
    islamicButton.classList.toggle('d-none', !selectableDate);
    modifyHolidayButton.disabled = !selectableDate || !hasHoliday || holidayHidden;
    modifyIslamicButton.disabled = !selectableDate || !hasIslamic || islamicHidden;
    holidayButton.disabled = !selectableDate || !hasHoliday;
    islamicButton.disabled = !selectableDate || !hasIslamic;
    holidayButton.textContent = holidayHidden ? 'Show U.S. holiday on this day' : 'Hide U.S. holiday on this day';
    islamicButton.textContent = islamicHidden ? 'Show Islamic date on this day' : 'Hide Islamic date on this day';
  }

  function syncEventMenuLabels() {
    const modifyButton = document.getElementById('contextModifyEvent');
    const moveButton = document.getElementById('contextMoveEvent');
    const deleteButton = document.getElementById('contextDeleteEvent');
    const isUsaJamaat = activeEventSourceType === 'usa-jamaat';
    const isHoliday = activeEventSourceType === 'holiday';
    const isUser = activeEventSourceType === 'user';
    modifyButton.classList.toggle('d-none', false);
    modifyButton.textContent = (isUsaJamaat || isHoliday) ? 'Modify as custom event' : 'Modify event';
    moveButton.classList.toggle('d-none', !isUser);
    deleteButton.textContent = isUsaJamaat
      ? `Hide USA Jamaat event on ${activeEventOccurrenceDate || 'this day'}`
      : isHoliday
        ? `Hide U.S. holiday on ${activeEventOccurrenceDate || 'this day'}`
        : 'Remove event';
  }

  function renderCalendarDecorations() {
    applyDateStyles();
    renderEvents();
    renderHiddenItemsUI();
    scheduleCalendarAutoFit();
  }

  const deleteEventBtn = document.getElementById('deleteEventBtn');
  if (deleteEventBtn) {
    deleteEventBtn.addEventListener('click', async () => {
      const eventId = Number(document.getElementById('eventId').value);
      const occurrenceDate = deleteEventBtn.dataset.occurrenceDate || document.getElementById('startDate').value;
      await submitDeleteEvent(eventId, occurrenceDate);
      eventModal.hide();
    });
  }
});
