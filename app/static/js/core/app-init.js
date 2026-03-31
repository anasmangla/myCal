import { MONTH_NAMES, WEEKDAY_NAMES, AUDIENCE_CHOICES, AUDIENCE_COLORS, LEGACY_STORAGE_KEY, TITLE_STORAGE_PREFIX } from './constants.js';
import { appState, pushUndo } from './state.js';
import { firstVisibleMonth, monthIso } from '../utils/dates.js';
import { createDocumentForView } from '../models/document-model.js';
import { normalizeEvent } from '../models/event-model.js';
import { renderCalendar } from '../ui/calendar-renderer.js';
import { flash } from '../ui/toasts.js';
import { saveActiveMonth, getActiveMonth, getMeta } from '../storage/local-meta.js';
import { loadDocument, schedulePersist, persistDocument } from '../storage/persistence.js';
import { migrateLegacyState } from './migration.js';
import { openCellEditor, saveCellFromPanel } from '../features/cell-editor.js';
import { setCellColor } from '../features/cell-colors.js';
import { addImageToCell, removeImageFromCell } from '../features/attachments.js';
import { exportDocumentIcs, exportDocumentJson, parseImportJson } from '../features/import-export.js';
import { bindSidePanel } from '../ui/sidepanel.js';
import { printCalendar, exportCalendarImage } from '../features/print-export.js';
import { searchDocument } from '../features/search.js';

let eventModal;
let activeDateContext = '';
let activeEventContext = { eventId: '', occurrenceDate: '' };
const FONT_PRESETS = {
  system: '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  trebuchet: '"Trebuchet MS", "Segoe UI", sans-serif',
  georgia: 'Georgia, "Times New Roman", serif',
  palatino: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
  verdana: 'Verdana, Geneva, sans-serif',
};
const defaultThemeSettings = {
  outsideMonthColor: '#f5f5f5',
  weekendHolidayColor: '#d9d9d9',
  weekdayHeaderColor: '#0f172a',
  lineColor: '#d6deea',
  lineThickness: 1,
  bodyFontPreset: 'system',
  titleFontPreset: 'system',
  bodyFontSize: 0.95,
  titleFontSize: 1.15,
  eventFontSize: 0.62,
};

function fontStackForPreset(preset) {
  return FONT_PRESETS[preset] || FONT_PRESETS.system;
}

function themeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatRemValue(value) {
  return `${themeNumber(value, 0).toFixed(2)}rem`;
}

function derivedThemeSizes(theme) {
  const bodyFontSize = themeNumber(theme.bodyFontSize, defaultThemeSettings.bodyFontSize);
  const titleFontSize = themeNumber(theme.titleFontSize, defaultThemeSettings.titleFontSize);
  const eventFontSize = themeNumber(theme.eventFontSize, defaultThemeSettings.eventFontSize);

  return {
    bodyFontSize,
    titleFontSize,
    eventFontSize,
    weekdayFontSize: Math.max(0.72, Number((bodyFontSize - 0.13).toFixed(2))),
    dayNumberFontSize: Math.max(0.82, Number((bodyFontSize - 0.05).toFixed(2))),
    metaFontSize: Math.max(0.54, Number((bodyFontSize - 0.36).toFixed(2))),
    noteFontSize: Math.max(0.56, Number((bodyFontSize - 0.35).toFixed(2))),
  };
}

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : `doc_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function titleStorageKey(year, month) {
  return `${TITLE_STORAGE_PREFIX}.${year}-${String(month).padStart(2, '0')}`;
}

function syncTitle() {
  const key = titleStorageKey(appState.view.year, appState.view.month);
  const title = localStorage.getItem(key) || appState.doc.title;
  appState.doc.title = title;
  document.getElementById('calendarTitle').textContent = title;
  document.getElementById('calendarTitleInput').value = title;
}

function fillSelects() {
  const now = new Date();
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthYearSel = document.getElementById('monthYearSelect');
  for (let offset = -6; offset <= 12; offset += 1) {
    const valueDate = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + offset, 1));
    const year = valueDate.getUTCFullYear();
    const month = valueDate.getUTCMonth() + 1;
    const label = `${MONTH_NAMES[month - 1]} ${year}`;
    monthYearSel.add(new Option(label, `${year}-${String(month).padStart(2, '0')}`));
  }
  AUDIENCE_CHOICES.forEach((v) => document.getElementById('audience').add(new Option(v, v)));
  const wk = document.getElementById('weekdayCheckboxes');
  WEEKDAY_NAMES.forEach((w, i) => {
    const div = document.createElement('div');
    div.className = 'form-check';
    div.innerHTML = `<input class="form-check-input" type="checkbox" value="${i}" id="weekday${i}"><label class="form-check-label" for="weekday${i}">${w}</label>`;
    wk.appendChild(div);
  });
}

function mergedAudienceColors() {
  return { ...AUDIENCE_COLORS, ...(appState.doc.settings?.audienceColors || {}) };
}

function renderAudienceColorSettings() {
  const host = document.getElementById('audienceColorSettings');
  if (!host) return;
  const merged = mergedAudienceColors();
  host.innerHTML = '';
  AUDIENCE_CHOICES.forEach((audience) => {
    const wrap = document.createElement('label');
    wrap.className = 'audience-color-setting';
    wrap.innerHTML = `
      <span class="audience-color-setting-label">
        <span>${audience}</span>
        <span class="text-muted">${AUDIENCE_COLORS[audience] || AUDIENCE_COLORS.Unspecified}</span>
      </span>
        <input type="color" class="form-control form-control-color audience-color-input" data-audience="${audience}" value="${merged[audience] || AUDIENCE_COLORS.Unspecified}">
    `;
    host.appendChild(wrap);
  });
  host.querySelectorAll('.audience-color-input').forEach((input) => {
    input.addEventListener('input', () => {
      const audience = input.dataset.audience;
      if (!audience) return;
      appState.doc.settings.audienceColors = { ...mergedAudienceColors(), [audience]: input.value };
      schedulePersist(appState.doc, 'audience-color', setLastSaved);
      rerender();
    });
  });
}


function renderUnscheduled() {
  const list = document.getElementById('unscheduledList');
  list.innerHTML = appState.doc.unscheduled.map((item) => `<li class="list-group-item py-1 d-flex justify-content-between align-items-start"><span>${item.title || 'Untitled'} <small class="text-muted">(${item.visibility})</small></span><button class="btn btn-sm btn-link" data-unsched-id="${item.id}">Assign</button></li>`).join('');
  list.querySelectorAll('[data-unsched-id]').forEach((btn) => btn.addEventListener('click', () => {
    const item = appState.doc.unscheduled.find((x) => x.id === btn.dataset.unschedId);
    if (!item || !appState.activeDate) return;
    const target = appState.doc.cells[appState.activeDate] || (appState.doc.cells[appState.activeDate] = { date: appState.activeDate, plainText: '', richTextHtml: '', contentType: 'plain', backgroundColor: null, textColor: null, attachments: [], visibility: 'public', updatedAt: new Date().toISOString() });
    target.plainText = [target.plainText, item.title, item.plainText].filter(Boolean).join('\n');
    appState.doc.unscheduled = appState.doc.unscheduled.filter((x) => x.id !== item.id);
    schedulePersist(appState.doc, 'unscheduled-assign', setLastSaved);
    rerender();
  }));
}

function rerender() {
  syncTitle();
  syncDateInputsToMonth();
  document.getElementById('monthYearSelect').value = `${appState.view.year}-${String(appState.view.month).padStart(2, '0')}`;
  document.getElementById('islamicToggle').checked = appState.doc.settings.showIslamicDates;
  document.getElementById('holidaysToggle').checked = appState.doc.settings.showUSHolidays;
  renderCalendar({
    state: appState,
    audienceColors: mergedAudienceColors(),
    onSelectDate: ({ date, inMonth }) => {
      appState.activeDate = date;
      if (!inMonth) openCellEditor({ state: appState, date });
      else document.getElementById('sidePanel').classList.add('d-none');
      rerender();
    },
    onOpenEvent: (payload) => openEventModal(payload),
    onOpenActions: (date) => openEventModal({ startDate: date, endDate: date }),
    onEditCellText: (date) => {
      appState.activeDate = date;
      openCellEditor({ state: appState, date });
      document.getElementById('cellNoteInput').focus();
    },
    onDateContext: ({ date, x, y }) => {
      activeDateContext = date;
      updateDateContextLabels(date);
      showMenu(document.getElementById('dateContextMenu'), x, y);
    },
    onEventContext: ({ eventId, occurrenceDate, x, y }) => {
      activeEventContext = { eventId, occurrenceDate };
      showMenu(document.getElementById('eventContextMenu'), x, y);
    },
    onMoveEvent: ({ eventId, targetDate, anchorDate }) => moveEvent(eventId, targetDate, anchorDate),
    onDropImage: async (date, files) => {
      const file = Array.from(files)[0];
      if (!file) return;
      try { await addImageToCell({ state: appState, date, file }); schedulePersist(appState.doc, 'attachment', setLastSaved); rerender(); }
      catch (error) { flash(error.message, 'danger'); }
    },
    onRemoveImage: async ({ date, attachmentId }) => {
      const confirmed = window.confirm('Remove this image from the selected field?');
      if (!confirmed) return;
      await removeImageFromCell({ state: appState, date, attachmentId });
      schedulePersist(appState.doc, 'attachment-remove', setLastSaved);
      rerender();
    },
  });
  renderUnscheduled();
  renderAudienceColorSettings();
}

function getThemeSettings() {
  const existing = appState.doc.settings?.theme || {};
  return { ...defaultThemeSettings, ...existing };
}

function applyThemeSettings() {
  const theme = getThemeSettings();
  const sizes = derivedThemeSizes(theme);
  const root = document.documentElement;
  root.style.setProperty('--outside-month-color', theme.outsideMonthColor);
  root.style.setProperty('--weekend-color', theme.weekendHolidayColor);
  root.style.setProperty('--weekday-header-color', theme.weekdayHeaderColor);
  root.style.setProperty('--grid-line-color', theme.lineColor);
  root.style.setProperty('--grid-line-width', `${theme.lineThickness}px`);
  root.style.setProperty('--calendar-font-family', fontStackForPreset(theme.bodyFontPreset));
  root.style.setProperty('--calendar-title-font-family', fontStackForPreset(theme.titleFontPreset));
  root.style.setProperty('--calendar-body-font-size', formatRemValue(sizes.bodyFontSize));
  root.style.setProperty('--calendar-title-font-size', formatRemValue(sizes.titleFontSize));
  root.style.setProperty('--calendar-weekday-font-size', formatRemValue(sizes.weekdayFontSize));
  root.style.setProperty('--calendar-day-number-font-size', formatRemValue(sizes.dayNumberFontSize));
  root.style.setProperty('--calendar-meta-font-size', formatRemValue(sizes.metaFontSize));
  root.style.setProperty('--calendar-event-font-size', formatRemValue(sizes.eventFontSize));
  root.style.setProperty('--calendar-note-font-size', formatRemValue(sizes.noteFontSize));
}

function bindThemeControls() {
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

  if (!nonDateColorInput) return;

  const syncControls = () => {
    const theme = getThemeSettings();
    nonDateColorInput.value = theme.outsideMonthColor;
    weekendHolidayColorInput.value = theme.weekendHolidayColor;
    weekdayColorInput.value = theme.weekdayHeaderColor;
    lineColorInput.value = theme.lineColor;
    lineThicknessInput.value = String(theme.lineThickness);
    lineThicknessValue.textContent = `${theme.lineThickness}px`;
    bodyFontPresetSelect.value = theme.bodyFontPreset;
    titleFontPresetSelect.value = theme.titleFontPreset;
    bodyFontSizeInput.value = String(theme.bodyFontSize);
    bodyFontSizeValue.textContent = formatRemValue(theme.bodyFontSize);
    titleFontSizeInput.value = String(theme.titleFontSize);
    titleFontSizeValue.textContent = formatRemValue(theme.titleFontSize);
    eventFontSizeInput.value = String(theme.eventFontSize);
    eventFontSizeValue.textContent = formatRemValue(theme.eventFontSize);
  };

  const updateTheme = (patch) => {
    appState.doc.settings.theme = { ...getThemeSettings(), ...patch };
    applyThemeSettings();
    syncControls();
    schedulePersist(appState.doc, 'theme', setLastSaved);
    rerender();
  };

  nonDateColorInput.addEventListener('input', () => updateTheme({ outsideMonthColor: nonDateColorInput.value }));
  weekendHolidayColorInput.addEventListener('input', () => updateTheme({ weekendHolidayColor: weekendHolidayColorInput.value }));
  weekdayColorInput.addEventListener('input', () => updateTheme({ weekdayHeaderColor: weekdayColorInput.value }));
  lineColorInput.addEventListener('input', () => updateTheme({ lineColor: lineColorInput.value }));
  lineThicknessInput.addEventListener('input', () => updateTheme({ lineThickness: Number(lineThicknessInput.value) }));
  bodyFontPresetSelect.addEventListener('change', () => updateTheme({ bodyFontPreset: bodyFontPresetSelect.value }));
  titleFontPresetSelect.addEventListener('change', () => updateTheme({ titleFontPreset: titleFontPresetSelect.value }));
  bodyFontSizeInput.addEventListener('input', () => updateTheme({ bodyFontSize: Number(bodyFontSizeInput.value) }));
  titleFontSizeInput.addEventListener('input', () => updateTheme({ titleFontSize: Number(titleFontSizeInput.value) }));
  eventFontSizeInput.addEventListener('input', () => updateTheme({ eventFontSize: Number(eventFontSizeInput.value) }));
  resetSettingsBtn.addEventListener('click', () => updateTheme({ ...defaultThemeSettings }));

  syncControls();
}

function showMenu(menu, x, y) {
  hideMenus();
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.classList.remove('d-none');
}

function hideMenus() {
  document.querySelectorAll('.context-menu').forEach((menu) => menu.classList.add('d-none'));
}

function hiddenDateSet(type) {
  const hiddenMeta = appState.doc.settings.hiddenMeta || (appState.doc.settings.hiddenMeta = { holidays: [], islamic: [] });
  const values = Array.isArray(hiddenMeta[type]) ? hiddenMeta[type] : [];
  return new Set(values);
}

function setHiddenDateSet(type, values) {
  const hiddenMeta = appState.doc.settings.hiddenMeta || (appState.doc.settings.hiddenMeta = { holidays: [], islamic: [] });
  hiddenMeta[type] = Array.from(values);
}

function updateDateContextLabels(date) {
  const addEventBtn = document.getElementById('contextAddEvent');
  const holidayBtn = document.getElementById('contextToggleHoliday');
  const islamicBtn = document.getElementById('contextToggleIslamic');
  const inVisibleMonth = !isOutsideVisibleMonth(date);
  const holidayHidden = hiddenDateSet('holidays').has(date);
  const islamicHidden = hiddenDateSet('islamic').has(date);
  addEventBtn.classList.toggle('d-none', !inVisibleMonth);
  holidayBtn.classList.toggle('d-none', !inVisibleMonth);
  islamicBtn.classList.toggle('d-none', !inVisibleMonth);
  holidayBtn.textContent = holidayHidden ? 'Show U.S. holiday on this day' : 'Hide U.S. holiday on this day';
  islamicBtn.textContent = islamicHidden ? 'Show Islamic date on this day' : 'Hide Islamic date on this day';
  holidayBtn.disabled = !inVisibleMonth || !appState.doc.settings.showUSHolidays;
  islamicBtn.disabled = !inVisibleMonth || !appState.doc.settings.showIslamicDates;
}

function toggleHiddenDate(type, date) {
  if (!date) return;
  const values = hiddenDateSet(type);
  if (values.has(date)) values.delete(date);
  else values.add(date);
  setHiddenDateSet(type, values);
}

function shiftIsoDate(iso, deltaDays) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

function isOutsideVisibleMonth(iso) {
  if (!iso) return false;
  const monthPrefix = `${appState.view.year}-${String(appState.view.month).padStart(2, '0')}`;
  return !iso.startsWith(monthPrefix);
}

function moveEvent(eventId, targetDate, anchorDate) {
  const existing = appState.doc.events.find((item) => item.id === eventId);
  if (!existing || !targetDate || !anchorDate) return;
  const source = new Date(`${anchorDate}T00:00:00Z`);
  const target = new Date(`${targetDate}T00:00:00Z`);
  const delta = Math.round((target - source) / 86400000);
  if (!Number.isFinite(delta) || delta === 0) return;
  const updated = {
    ...existing,
    startDate: shiftIsoDate(existing.startDate, delta),
    endDate: shiftIsoDate(existing.endDate, delta),
  };
  const index = appState.doc.events.findIndex((item) => item.id === eventId);
  if (index < 0) return;
  appState.doc.events[index] = updated;
  schedulePersist(appState.doc, 'event-move', setLastSaved);
  rerender();
}

function setLastSaved(ts) {
  appState.lastSavedAt = ts;
  const lastSavedText = document.getElementById('lastSavedText');
  if (lastSavedText) {
    lastSavedText.textContent = ts ? `Last saved: ${new Date(ts).toLocaleTimeString()}` : 'Not saved yet';
  }
}

function openEventModal(payload) {
  const p = typeof payload === 'string' ? appState.doc.events.find((e) => e.id === payload) : payload;
  if (!p) return;
  syncDateInputsToMonth();
  document.getElementById('eventId').value = p.id || '';
  document.getElementById('title').value = p.title || '';
  document.getElementById('startDate').value = p.startDate || p.start_date || '';
  document.getElementById('endDate').value = p.endDate || p.end_date || p.startDate || p.start_date || '';
  document.getElementById('startTime').value = p.startTime || p.start_time || '';
  document.getElementById('location').value = p.location || '';
  document.getElementById('audience').value = p.audience || 'Unspecified';
  document.getElementById('notes').value = p.notes || '';
  document.querySelectorAll('#weekdayCheckboxes input').forEach((cb) => { cb.checked = (p.recurrenceWeekdays || []).includes(cb.value); });
  syncRecurrenceTypeFromWeekdays();
  document.getElementById('deleteEventBtn').classList.toggle('d-none', !p.id);
  eventModal.show();
}

function monthBoundsIso() {
  const month = String(appState.view.month).padStart(2, '0');
  const start = `${appState.view.year}-${month}-01`;
  const lastDay = new Date(Date.UTC(appState.view.year, appState.view.month, 0)).getUTCDate();
  const end = `${appState.view.year}-${month}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

function syncDateInputsToMonth() {
  const startInput = document.getElementById('startDate');
  const endInput = document.getElementById('endDate');
  const { start, end } = monthBoundsIso();
  startInput.min = start;
  startInput.max = end;
  endInput.min = start;
  endInput.max = end;
}

function syncRecurrenceTypeFromWeekdays() {
  const selected = document.querySelectorAll('#weekdayCheckboxes input:checked').length;
  document.getElementById('recurrenceType').value = selected ? 'weekly' : 'none';
}

async function loadOrCreateDoc(year, month) {
  const monthValue = monthIso(year, month);
  const meta = getMeta();
  let doc = meta.lastDocId ? await loadDocument(meta.lastDocId) : null;
  if (!doc || doc.month !== monthValue) {
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw && !meta.migrationDone) {
      doc = migrateLegacyState({ legacyRaw, month: monthValue, docId: uuid(), title: `${MONTH_NAMES[month - 1]} ${year}` });
      await persistDocument(doc, 'migration');
      meta.migrationDone = true;
      localStorage.setItem('mycal.migration.complete', 'true');
    } else {
      doc = createDocumentForView({ year, month, docId: uuid() });
      await persistDocument(doc, 'init');
    }
  }
  return doc;
}

function bindMainUI() {
  const dateColorPicker = document.getElementById('dateColorPicker');
  const monthYearSelect = document.getElementById('monthYearSelect');

  const applySelectedMonth = async () => {
    const [yearText, monthText] = monthYearSelect.value.split('-');
    appState.view.month = Number(monthText);
    appState.view.year = Number(yearText);
    appState.doc = await loadOrCreateDoc(appState.view.year, appState.view.month);
    saveActiveMonth(monthIso(appState.view.year, appState.view.month));
    rerender();
  };

  document.getElementById('calendarControls').addEventListener('submit', async (event) => {
    event.preventDefault();
    await applySelectedMonth();
  });
  monthYearSelect.addEventListener('change', applySelectedMonth);

  document.querySelectorAll('#weekdayCheckboxes input').forEach((checkbox) => {
    checkbox.addEventListener('change', syncRecurrenceTypeFromWeekdays);
  });
  document.getElementById('clearRecurringWeekdays').addEventListener('click', () => {
    document.querySelectorAll('#weekdayCheckboxes input').forEach((checkbox) => { checkbox.checked = false; });
    syncRecurrenceTypeFromWeekdays();
  });

  document.getElementById('eventForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    syncRecurrenceTypeFromWeekdays();
    const { start, end } = monthBoundsIso();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    if (!startDate || !endDate || startDate < start || startDate > end || endDate < start || endDate > end) {
      flash('Event start/end dates must stay within the selected month.', 'danger');
      return;
    }
    const payload = normalizeEvent({
      id: document.getElementById('eventId').value || uuid(),
      title: document.getElementById('title').value.trim(),
      startDate: document.getElementById('startDate').value,
      endDate: document.getElementById('endDate').value,
      startTime: document.getElementById('startTime').value,
      allDay: !document.getElementById('startTime').value,
      location: document.getElementById('location').value.trim(),
      audience: document.getElementById('audience').value,
      notes: document.getElementById('notes').value.trim(),
      recurrenceType: document.getElementById('recurrenceType').value,
      recurrenceWeekdays: Array.from(document.querySelectorAll('#weekdayCheckboxes input:checked')).map((cb) => cb.value),
    });
    pushUndo(appState.doc);
    const idx = appState.doc.events.findIndex((e) => e.id === payload.id);
    if (idx >= 0) appState.doc.events[idx] = payload;
    else appState.doc.events.push(payload);
    schedulePersist(appState.doc, 'event', setLastSaved);
    eventModal.hide();
    rerender();
  });

  document.getElementById('deleteEventBtn').addEventListener('click', () => {
    const id = document.getElementById('eventId').value;
    appState.doc.events = appState.doc.events.filter((e) => e.id !== id);
    schedulePersist(appState.doc, 'event-delete', setLastSaved);
    eventModal.hide();
    rerender();
  });

  document.getElementById('holidaysToggle').addEventListener('change', (e) => {
    appState.doc.settings.showUSHolidays = e.target.checked;
    schedulePersist(appState.doc, 'settings', setLastSaved);
    rerender();
  });
  document.getElementById('islamicToggle').addEventListener('change', (e) => {
    appState.doc.settings.showIslamicDates = e.target.checked;
    schedulePersist(appState.doc, 'settings', setLastSaved);
    rerender();
  });

  document.getElementById('calendarTitle').addEventListener('click', () => {
    document.getElementById('calendarTitle').classList.add('d-none');
    document.getElementById('calendarTitleInput').classList.remove('d-none');
    document.getElementById('calendarTitleInput').focus();
  });
  document.getElementById('calendarTitleInput').addEventListener('blur', () => {
    const val = document.getElementById('calendarTitleInput').value.trim() || `${MONTH_NAMES[appState.view.month - 1]} ${appState.view.year}`;
    localStorage.setItem(titleStorageKey(appState.view.year, appState.view.month), val);
    appState.doc.title = val;
    schedulePersist(appState.doc, 'title', setLastSaved);
    document.getElementById('calendarTitleInput').classList.add('d-none');
    document.getElementById('calendarTitle').classList.remove('d-none');
    rerender();
  });

  bindSidePanel({
    onSaveCell: () => {
      if (!isOutsideVisibleMonth(appState.activeDate)) return;
      pushUndo(appState.doc);
      saveCellFromPanel({ state: appState });
      schedulePersist(appState.doc, 'cell-note', setLastSaved);
      rerender();
    },
    onAddImage: async (files) => {
      if (!appState.activeDate || !files.length || !isOutsideVisibleMonth(appState.activeDate)) return;
      await addImageToCell({ state: appState, date: appState.activeDate, file: files[0] });
      schedulePersist(appState.doc, 'attachment', setLastSaved);
      rerender();
    },
  });

  document.getElementById('cellBgColor').addEventListener('input', (e) => {
    if (!appState.activeDate || !isOutsideVisibleMonth(appState.activeDate)) return;
    const textColor = document.getElementById('cellTextColor').value;
    setCellColor(appState.doc, appState.activeDate, e.target.value, textColor);
    schedulePersist(appState.doc, 'cell-color', setLastSaved);
    rerender();
  });
  document.getElementById('cellTextColor').addEventListener('input', (e) => {
    if (!appState.activeDate || !isOutsideVisibleMonth(appState.activeDate)) return;
    const activeCell = appState.doc.cells[appState.activeDate];
    if (!activeCell) return;
    activeCell.textColor = e.target.value || null;
    schedulePersist(appState.doc, 'cell-text-color', setLastSaved);
    rerender();
  });
  document.getElementById('clearCellColorBtn').addEventListener('click', () => {
    if (!appState.activeDate || !isOutsideVisibleMonth(appState.activeDate)) return;
    setCellColor(appState.doc, appState.activeDate, null);
    schedulePersist(appState.doc, 'cell-color-clear', setLastSaved);
    rerender();
  });

  document.getElementById('exportJsonBtn').addEventListener('click', () => exportDocumentJson(appState.doc));
  document.getElementById('exportIcsBtn').addEventListener('click', () => exportDocumentIcs(appState.doc));
  document.getElementById('importJsonInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const doc = parseImportJson(await file.text());
      appState.doc = doc;
      await persistDocument(appState.doc, 'import');
      rerender();
      flash('JSON imported successfully.');
    } catch (error) {
      flash(`Import failed: ${error.message}`, 'danger');
    }
  });

  document.getElementById('printBtn').addEventListener('click', printCalendar);
  document.getElementById('exportImageBtn').addEventListener('click', async () => {
    try { await exportCalendarImage(); } catch { flash('Image export failed.', 'danger'); }
  });
  document.getElementById('clearStorageBtn').addEventListener('click', async () => {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    appState.doc = createDocumentForView({ year: appState.view.year, month: appState.view.month, docId: uuid() });
    await persistDocument(appState.doc, 'clear');
    rerender();
  });

  document.getElementById('addUnscheduledBtn').addEventListener('click', () => {
    const title = document.getElementById('unscheduledTitleInput').value.trim();
    if (!title) return;
    appState.doc.unscheduled.push({ id: uuid(), title, plainText: '', richTextHtml: '', contentType: 'plain', backgroundColor: null, textColor: null, attachments: [], visibility: 'private', updatedAt: new Date().toISOString() });
    document.getElementById('unscheduledTitleInput').value = '';
    schedulePersist(appState.doc, 'unscheduled-add', setLastSaved);
    rerender();
  });

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      const out = document.getElementById('searchResults');
      const results = searchDocument(appState.doc, event.target.value, { events: true, notes: true });
      out.innerHTML = results.slice(0, 8).map((r) => `<li class="list-group-item">${r.label}</li>`).join('');
    });
  }

  document.getElementById('undoBtn').addEventListener('click', () => {
    const prev = appState.undoStack.pop();
    if (!prev) return;
    appState.redoStack.push(structuredClone(appState.doc));
    appState.doc = prev;
    rerender();
  });
  document.getElementById('redoBtn').addEventListener('click', () => {
    const next = appState.redoStack.pop();
    if (!next) return;
    appState.undoStack.push(structuredClone(appState.doc));
    appState.doc = next;
    rerender();
  });
  document.getElementById('contextAddEvent').addEventListener('click', () => {
    hideMenus();
    if (!activeDateContext) return;
    openEventModal({ startDate: activeDateContext, endDate: activeDateContext });
  });
  document.getElementById('contextChangeColor').addEventListener('click', () => {
    hideMenus();
    if (!activeDateContext) return;
    const activeCell = appState.doc.cells[activeDateContext];
    dateColorPicker.value = activeCell?.backgroundColor || '#fef3c7';
    dateColorPicker.click();
  });
  document.getElementById('contextClearColor').addEventListener('click', () => {
    hideMenus();
    if (!activeDateContext) return;
    setCellColor(appState.doc, activeDateContext, null);
    schedulePersist(appState.doc, 'cell-color-clear', setLastSaved);
    rerender();
  });
  dateColorPicker.addEventListener('input', (event) => {
    if (!activeDateContext) return;
    setCellColor(appState.doc, activeDateContext, event.target.value);
    schedulePersist(appState.doc, 'cell-color', setLastSaved);
    rerender();
  });
  document.getElementById('contextToggleHoliday').addEventListener('click', () => {
    hideMenus();
    if (!activeDateContext) return;
    toggleHiddenDate('holidays', activeDateContext);
    schedulePersist(appState.doc, 'settings', setLastSaved);
    rerender();
  });
  document.getElementById('contextToggleIslamic').addEventListener('click', () => {
    hideMenus();
    if (!activeDateContext) return;
    toggleHiddenDate('islamic', activeDateContext);
    schedulePersist(appState.doc, 'settings', setLastSaved);
    rerender();
  });
  document.getElementById('contextModifyEvent').addEventListener('click', () => {
    hideMenus();
    if (!activeEventContext.eventId) return;
    openEventModal(activeEventContext.eventId);
  });
  document.getElementById('contextMoveEvent').addEventListener('click', () => {
    hideMenus();
    const { eventId, occurrenceDate } = activeEventContext;
    if (!eventId || !occurrenceDate) return;
    const nextDate = window.prompt('Move event to start on (YYYY-MM-DD):', occurrenceDate);
    if (!nextDate || !/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) return;
    moveEvent(eventId, nextDate, occurrenceDate);
  });
  document.getElementById('contextDeleteEvent').addEventListener('click', () => {
    hideMenus();
    const { eventId } = activeEventContext;
    if (!eventId) return;
    appState.doc.events = appState.doc.events.filter((item) => item.id !== eventId);
    schedulePersist(appState.doc, 'event-delete', setLastSaved);
    rerender();
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.context-menu')) hideMenus();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hideMenus();
  });
  document.querySelectorAll('.context-menu').forEach((menu) => {
    menu.addEventListener('contextmenu', (event) => event.preventDefault());
    menu.addEventListener('click', (event) => event.stopPropagation());
  });
  renderUnscheduled();
}

export async function initStaticApp() {
  fillSelects();
  const savedMonth = getActiveMonth();
  const defaults = firstVisibleMonth();
  appState.view = savedMonth && /^\d{4}-\d{2}$/.test(savedMonth)
    ? { year: Number(savedMonth.slice(0, 4)), month: Number(savedMonth.slice(5, 7)) }
    : defaults;

  appState.doc = await loadOrCreateDoc(appState.view.year, appState.view.month);
  appState.doc.settings.theme = { ...defaultThemeSettings, ...(appState.doc.settings.theme || {}) };
  applyThemeSettings();
  eventModal = new bootstrap.Modal(document.getElementById('eventModal'));
  bindMainUI();
  bindThemeControls();
  setLastSaved(getMeta().lastSavedAt || null);
  rerender();
}
