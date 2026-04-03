import { MONTH_NAMES, WEEKDAY_NAMES, AUDIENCE_CHOICES, AUDIENCE_COLORS, LEGACY_STORAGE_KEY, TITLE_STORAGE_PREFIX } from './constants.js';
import { appState, pushUndo } from './state.js';
import { firstVisibleMonth, monthIso } from '../utils/dates.js';
import { createDocumentForView } from '../models/document-model.js';
import { normalizeEvent } from '../models/event-model.js';
import { renderCalendar, buildIslamicLabels, simpleUSHolidays } from '../ui/calendar-renderer.js';
import { flash } from '../ui/toasts.js';
import { saveActiveMonth, getActiveMonth, getMeta } from '../storage/local-meta.js';
import { loadDocument, schedulePersist, persistDocument } from '../storage/persistence.js';
import { migrateLegacyState } from './migration.js';
import { applyCellTextStylePatch, openCellEditor, saveCellFromPanel, updateCellText } from '../features/cell-editor.js';
import { setCellColor } from '../features/cell-colors.js';
import { addImageToCell, clearImagesFromCell, moveImageBetweenCells, removeImageFromCell } from '../features/attachments.js';
import { exportDocumentIcs, exportDocumentJson, parseImportJson } from '../features/import-export.js';
import { getSpanDays } from '../features/events.js';
import { bindSidePanel } from '../ui/sidepanel.js';
import { printCalendar, exportCalendarImage } from '../features/print-export.js';
import { searchDocument } from '../features/search.js';
import { USA_JAMAAT_EVENTS_2026 } from '../data/usa-jamaat-calendar-2026.js';

let eventModal;
let activeDateContext = '';
let activeEventContext = { eventId: '', occurrenceDate: '', sourceType: 'user', occurrenceKey: '', seriesKey: '', seriesSpanDays: 1, title: '' };
let pendingCellEditorFocus = false;
let activeDraggedCellImage = null;
const FONT_PRESETS = {
  system: '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  trebuchet: '"Trebuchet MS", "Segoe UI", sans-serif',
  georgia: 'Georgia, "Times New Roman", serif',
  palatino: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
  verdana: 'Verdana, Geneva, sans-serif',
};
const LEGACY_REM_TO_PT = 12;
const monthDateFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const usaJamaatSeriesLookup = new Map(USA_JAMAAT_EVENTS_2026.map((event) => [event.id, event]));
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

function fontStackForPreset(preset) {
  return FONT_PRESETS[preset] || FONT_PRESETS.system;
}

function themeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeFontPointValue(value, fallback) {
  const parsed = themeNumber(value, fallback);
  if (parsed > 0 && parsed <= 2.5) {
    return Number((Math.round(parsed * LEGACY_REM_TO_PT * 2) / 2).toFixed(1));
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

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : `doc_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function titleStorageKey(year, month) {
  return `${TITLE_STORAGE_PREFIX}.${year}-${String(month).padStart(2, '0')}`;
}

function browserTabTitle(year, month) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function syncTitle() {
  const key = titleStorageKey(appState.view.year, appState.view.month);
  const title = localStorage.getItem(key) || appState.doc.title;
  appState.doc.title = title;
  document.getElementById('calendarTitle').textContent = title;
  document.getElementById('calendarTitleInput').value = title;
  document.title = browserTabTitle(appState.view.year, appState.view.month);
}

function formatMonthDate(iso) {
  if (!iso) return '';
  return monthDateFormatter.format(new Date(`${iso}T00:00:00Z`));
}

function currentShareMessage() {
  const monthLabel = browserTabTitle(appState.view.year, appState.view.month);
  const includesUsaJamaat = appState.doc.settings.showUsaJamaat !== false;
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

function setEventScopeBanner(message = '') {
  const banner = document.getElementById('eventScopeBanner');
  const text = document.getElementById('eventScopeBannerText');
  if (!banner || !text) return;
  text.textContent = message;
  banner.classList.toggle('d-none', !message);
}

function resetEventScopeState() {
  document.getElementById('editScopeMode').value = 'all';
  document.getElementById('editSourceEventId').value = '';
  document.getElementById('editOccurrenceDate').value = '';
  setEventScopeBanner('');
}

function supportsScopedAction(event, occurrenceDate) {
  if (!event || !occurrenceDate) return false;
  const isRecurring = event.recurrenceType && event.recurrenceType !== 'none';
  const isMultiDay = eventSpanDays(event) > 1;
  return (isRecurring || isMultiDay) && eventOccursOnDate(event, occurrenceDate);
}

function askSeriesActionMode(event, actionVerb) {
  const isRecurring = event.recurrenceType && event.recurrenceType !== 'none';
  const intro = isRecurring ? 'This is a recurring event.' : 'This is a multi-day event.';
  const affectSelectedDate = window.confirm(
    `${intro}\n\nPress OK to ${actionVerb} only the selected date.\nPress Cancel to choose whether to ${actionVerb} the entire series.`
  );
  if (affectSelectedDate) return 'single';
  const affectSeries = window.confirm(`${actionVerb.charAt(0).toUpperCase()}${actionVerb.slice(1)} the entire series?`);
  return affectSeries ? 'all' : '';
}

function buildSingleOccurrenceDraft(event, occurrenceDate) {
  return normalizeEvent({
    ...event,
    id: '',
    startDate: occurrenceDate,
    endDate: occurrenceDate,
    recurrenceType: 'none',
    recurrenceWeekdays: [],
    labels: {},
    updatedAt: new Date().toISOString(),
  });
}

function hiddenItemEntries() {
  const hiddenMeta = appState.doc.settings.hiddenMeta || {};
  const holidayMap = simpleUSHolidays(appState.view.year, appState.view.month);
  const entries = [];

  (hiddenMeta.holidays || []).forEach((iso) => {
    entries.push({
      type: 'holidays',
      key: iso,
      sortKey: `0-${iso}`,
      title: holidayMap.get(iso) || 'U.S. holiday',
      meta: `Hidden U.S. holiday on ${formatMonthDate(iso)}`,
    });
  });

  (hiddenMeta.islamic || []).forEach((iso) => {
    const islamicLabel = buildIslamicLabels(iso)[0]?.text || 'Islamic date';
    entries.push({
      type: 'islamic',
      key: iso,
      sortKey: `1-${iso}`,
      title: islamicLabel,
      meta: `Hidden Islamic date on ${formatMonthDate(iso)}`,
    });
  });

  (hiddenMeta.usaJamaatOccurrences || []).forEach((occurrenceKey) => {
    const [seriesId, occurrenceDate] = String(occurrenceKey).split('@');
    const series = usaJamaatSeriesLookup.get(seriesId);
    entries.push({
      type: 'usaJamaatOccurrences',
      key: occurrenceKey,
      sortKey: `2-${occurrenceDate || seriesId}-${series?.title || occurrenceKey}`,
      title: series?.title || 'USA Jamaat event',
      meta: `Hidden USA Jamaat occurrence on ${formatMonthDate(occurrenceDate)}${series?.location ? ` • ${series.location}` : ''}`,
    });
  });

  (hiddenMeta.usaJamaatSeries || []).forEach((seriesKey) => {
    const series = usaJamaatSeriesLookup.get(String(seriesKey));
    entries.push({
      type: 'usaJamaatSeries',
      key: String(seriesKey),
      sortKey: `3-${series?.startDate || seriesKey}-${series?.title || seriesKey}`,
      title: series?.title || 'USA Jamaat series',
      meta: `Hidden USA Jamaat series${series?.startDate ? ` starting ${formatMonthDate(series.startDate)}` : ''}${series?.endDate && series.endDate !== series.startDate ? ` through ${formatMonthDate(series.endDate)}` : ''}`,
    });
  });

  return entries.sort((left, right) => left.sortKey.localeCompare(right.sortKey));
}

function removeHiddenItem(type, key) {
  const values = hiddenDateSet(type);
  values.delete(key);
  setHiddenDateSet(type, values);
}

function restoreAllHiddenItems() {
  if (hiddenItemEntries().length === 0) return;
  ['holidays', 'islamic', 'usaJamaatOccurrences', 'usaJamaatSeries'].forEach((type) => setHiddenDateSet(type, new Set()));
  schedulePersist(appState.doc, 'hidden-items-restore', setLastSaved);
  rerender();
  flash('Hidden items restored for this month.');
}

function renderHiddenItemsUI() {
  const entries = hiddenItemEntries();
  const summaryText = entries.length
    ? `${entries.length} hidden item${entries.length === 1 ? '' : 's'} in ${browserTabTitle(appState.view.year, appState.view.month)}.`
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
        <div class="hidden-item-title">${entry.title}</div>
        <div class="hidden-item-meta">${entry.meta}</div>
      </div>
      <button type="button" class="btn btn-outline-primary btn-sm" data-hidden-type="${entry.type}" data-hidden-key="${entry.key}" aria-label="Restore hidden item ${index + 1}">Restore</button>
    </div>
  `).join('');

  list.querySelectorAll('[data-hidden-type][data-hidden-key]').forEach((button) => {
    button.addEventListener('click', () => {
      removeHiddenItem(button.dataset.hiddenType, button.dataset.hiddenKey);
      schedulePersist(appState.doc, 'hidden-item-restore', setLastSaved);
      rerender();
      flash('Hidden item restored.');
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
  updateShareUI();
  renderHiddenItemsUI();
  syncDateInputsToMonth();
  document.getElementById('monthYearSelect').value = `${appState.view.year}-${String(appState.view.month).padStart(2, '0')}`;
  document.getElementById('islamicToggle').checked = appState.doc.settings.showIslamicDates;
  document.getElementById('holidaysToggle').checked = appState.doc.settings.showUSHolidays;
  document.getElementById('usaJamaatToggle').checked = appState.doc.settings.showUsaJamaat !== false;
  renderCalendar({
    state: appState,
    audienceColors: mergedAudienceColors(),
    onSelectDate: ({ date, inMonth }) => {
      appState.activeDate = date;
      if (appState.editingCell && appState.editingCell !== date) appState.editingCell = null;
      if (!inMonth) openCellEditor({ state: appState, date });
      else document.getElementById('sidePanel').classList.add('d-none');
      rerender();
    },
    onOpenEvent: (payload) => openEventModal(payload),
    onOpenActions: (date) => openEventModal({ startDate: date, endDate: date }),
    onEditCellText: (date) => {
      appState.activeDate = date;
      appState.editingCell = date;
      pendingCellEditorFocus = true;
      document.getElementById('sidePanel').classList.add('d-none');
      rerender();
    },
    onStopCellEdit: (date) => {
      if (appState.editingCell !== date) return;
      appState.editingCell = null;
      rerender();
    },
    onCellTextInput: ({ date, value }) => {
      updateCellText({ state: appState, date, value });
      schedulePersist(appState.doc, 'cell-note-inline', setLastSaved);
    },
    onCellTextStyleChange: ({ date, patch }) => {
      applyCellTextStylePatch({ state: appState, date, patch });
      schedulePersist(appState.doc, 'cell-text-style', setLastSaved);
    },
    onDateContext: ({ date, x, y }) => {
      activeDateContext = date;
      updateDateContextLabels(date);
      showMenu(document.getElementById('dateContextMenu'), x, y);
    },
    onEventContext: ({ eventId, occurrenceDate, sourceType, occurrenceKey, seriesKey, seriesSpanDays, title, x, y }) => {
      activeEventContext = {
        eventId,
        occurrenceDate,
        sourceType: sourceType || 'user',
        occurrenceKey: occurrenceKey || '',
        seriesKey: seriesKey || '',
        seriesSpanDays: seriesSpanDays || 1,
        title: title || '',
      };
      updateEventContextLabels();
      showMenu(document.getElementById('eventContextMenu'), x, y);
    },
    onMoveEvent: ({ eventId, targetDate, anchorDate }) => moveEvent(eventId, targetDate, anchorDate),
    onMoveCellImage: async ({ fromDate, toDate, attachmentId }) => {
      await moveImageBetweenCells({ state: appState, fromDate, toDate, attachmentId });
      if (appState.editingCell === fromDate || appState.editingCell === toDate) pendingCellEditorFocus = true;
      schedulePersist(appState.doc, 'attachment-move', setLastSaved);
      rerender();
    },
    onDropImage: async (date, files) => {
      const file = Array.from(files)[0];
      if (!file) return;
      try {
        appState.activeDate = date;
        if (appState.editingCell === date) pendingCellEditorFocus = true;
        await addImageToCell({ state: appState, date, file });
        schedulePersist(appState.doc, 'attachment', setLastSaved);
        rerender();
      }
      catch (error) { flash(error.message, 'danger'); }
    },
    onRemoveImage: async ({ date, attachmentId }) => {
      const confirmed = window.confirm('Remove this image from the selected field?');
      if (!confirmed) return;
      await removeImageFromCell({ state: appState, date, attachmentId });
      if (appState.editingCell === date) pendingCellEditorFocus = true;
      schedulePersist(appState.doc, 'attachment-remove', setLastSaved);
      rerender();
    },
    onStartCellImageDrag: ({ date, attachmentId }) => {
      activeDraggedCellImage = { date, attachmentId };
      toggleImageTrash(true);
    },
    onEndCellImageDrag: () => {
      activeDraggedCellImage = null;
      toggleImageTrash(false);
    },
  });
  renderUnscheduled();
  renderAudienceColorSettings();
  if (pendingCellEditorFocus && appState.editingCell) {
    const editor = document.querySelector(`[data-cell-editor="${appState.editingCell}"]`);
    if (editor) {
      editor.focus();
      editor.setSelectionRange(editor.value.length, editor.value.length);
    }
  }
  pendingCellEditorFocus = false;
}

function getThemeSettings() {
  const existing = appState.doc.settings?.theme || {};
  return {
    ...defaultThemeSettings,
    ...existing,
    bodyFontSize: normalizeFontPointValue(existing.bodyFontSize, defaultThemeSettings.bodyFontSize),
    titleFontSize: normalizeFontPointValue(existing.titleFontSize, defaultThemeSettings.titleFontSize),
    eventFontSize: normalizeFontPointValue(existing.eventFontSize, defaultThemeSettings.eventFontSize),
  };
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
  root.style.setProperty('--calendar-body-font-size', formatPointCssValue(sizes.bodyFontSize));
  root.style.setProperty('--calendar-title-font-size', formatPointCssValue(sizes.titleFontSize));
  root.style.setProperty('--calendar-weekday-font-size', formatPointCssValue(sizes.weekdayFontSize));
  root.style.setProperty('--calendar-day-number-font-size', formatPointCssValue(sizes.dayNumberFontSize));
  root.style.setProperty('--calendar-meta-font-size', formatPointCssValue(sizes.metaFontSize));
  root.style.setProperty('--calendar-event-font-size', formatPointCssValue(sizes.eventFontSize));
  root.style.setProperty('--calendar-note-font-size', formatPointCssValue(sizes.noteFontSize));
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
    bodyFontSizeValue.textContent = formatFontControlValue(theme.bodyFontSize);
    titleFontSizeInput.value = String(theme.titleFontSize);
    titleFontSizeValue.textContent = formatFontControlValue(theme.titleFontSize);
    eventFontSizeInput.value = String(theme.eventFontSize);
    eventFontSizeValue.textContent = formatFontControlValue(theme.eventFontSize);
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

function toggleImageTrash(visible, active = false) {
  const dropzone = document.getElementById('imageTrashDropzone');
  if (!dropzone) return;
  dropzone.classList.toggle('d-none', !visible);
  dropzone.classList.toggle('is-active', Boolean(visible && active));
}

function parseDragPayload(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function hiddenDateSet(type) {
  const hiddenMeta = appState.doc.settings.hiddenMeta || (appState.doc.settings.hiddenMeta = {
    holidays: [],
    islamic: [],
    usaJamaatOccurrences: [],
    usaJamaatSeries: [],
  });
  const values = Array.isArray(hiddenMeta[type]) ? hiddenMeta[type] : [];
  return new Set(values);
}

function setHiddenDateSet(type, values) {
  const hiddenMeta = appState.doc.settings.hiddenMeta || (appState.doc.settings.hiddenMeta = {
    holidays: [],
    islamic: [],
    usaJamaatOccurrences: [],
    usaJamaatSeries: [],
  });
  hiddenMeta[type] = Array.from(values);
}

function updateDateContextLabels(date) {
  const addEventBtn = document.getElementById('contextAddEvent');
  const addCellImageBtn = document.getElementById('contextAddCellImage');
  const removeCellImagesBtn = document.getElementById('contextRemoveCellImages');
  const holidayBtn = document.getElementById('contextToggleHoliday');
  const islamicBtn = document.getElementById('contextToggleIslamic');
  const inVisibleMonth = !isOutsideVisibleMonth(date);
  const outsideMonth = !inVisibleMonth;
  const holidayHidden = hiddenDateSet('holidays').has(date);
  const islamicHidden = hiddenDateSet('islamic').has(date);
  const activeCell = appState.doc.cells[date];
  const imageCount = activeCell?.attachments?.length || 0;
  addEventBtn.classList.toggle('d-none', !inVisibleMonth);
  addCellImageBtn.classList.toggle('d-none', !outsideMonth);
  removeCellImagesBtn.classList.toggle('d-none', !outsideMonth);
  holidayBtn.classList.toggle('d-none', !inVisibleMonth);
  islamicBtn.classList.toggle('d-none', !inVisibleMonth);
  addCellImageBtn.disabled = !outsideMonth;
  removeCellImagesBtn.disabled = !outsideMonth || imageCount === 0;
  removeCellImagesBtn.textContent = imageCount > 1 ? 'Remove all box images' : 'Remove box image';
  holidayBtn.textContent = holidayHidden ? 'Show U.S. holiday on this day' : 'Hide U.S. holiday on this day';
  islamicBtn.textContent = islamicHidden ? 'Show Islamic date on this day' : 'Hide Islamic date on this day';
  holidayBtn.disabled = !inVisibleMonth || !appState.doc.settings.showUSHolidays;
  islamicBtn.disabled = !inVisibleMonth || !appState.doc.settings.showIslamicDates;
}

function updateEventContextLabels() {
  const modifyBtn = document.getElementById('contextModifyEvent');
  const moveBtn = document.getElementById('contextMoveEvent');
  const deleteBtn = document.getElementById('contextDeleteEvent');
  const isUsaJamaat = activeEventContext.sourceType === 'usa-jamaat';
  modifyBtn.classList.toggle('d-none', isUsaJamaat);
  moveBtn.classList.toggle('d-none', isUsaJamaat);
  deleteBtn.textContent = isUsaJamaat ? 'Hide USA Jamaat event on this day' : 'Remove event';
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
  const { start: monthStart, end: monthEnd } = monthBoundsIso();
  if (targetDate < monthStart || targetDate > monthEnd) {
    flash('Moved event must stay within the current month.', 'danger');
    return;
  }

  if (supportsScopedAction(existing, anchorDate)) {
    const moveMode = askSeriesActionMode(existing, 'move');
    if (!moveMode) return;
    if (moveMode === 'single') {
      if (!eventOccursOnDate(existing, anchorDate)) {
        flash('Could not move the selected event date.', 'danger');
        return;
      }
      const standalone = normalizeEvent({
        ...existing,
        id: uuid(),
        startDate: targetDate,
        endDate: targetDate,
        recurrenceType: 'none',
        recurrenceWeekdays: [],
        labels: {},
        updatedAt: new Date().toISOString(),
      });
      pushUndo(appState.doc);
      if (!deleteSingleEventOccurrence(existing, anchorDate)) {
        flash('Could not move the selected event date.', 'danger');
        return;
      }
      appState.doc.events.push(standalone);
      schedulePersist(appState.doc, 'event-move-occurrence', setLastSaved);
      rerender();
      flash('Selected event date moved as a standalone event.');
      return;
    }
  }

  const source = new Date(`${anchorDate}T00:00:00Z`);
  const target = new Date(`${targetDate}T00:00:00Z`);
  const delta = Math.round((target - source) / 86400000);
  if (!Number.isFinite(delta) || delta === 0) return;
  const nextStart = shiftIsoDate(existing.startDate, delta);
  const nextEnd = shiftIsoDate(existing.endDate, delta);
  if (nextStart < monthStart || nextEnd > monthEnd) {
    flash('Moved event must stay within the current month.', 'danger');
    return;
  }
  const updated = {
    ...existing,
    startDate: nextStart,
    endDate: nextEnd,
  };
  const index = appState.doc.events.findIndex((item) => item.id === eventId);
  if (index < 0) return;
  appState.doc.events[index] = updated;
  schedulePersist(appState.doc, 'event-move', setLastSaved);
  rerender();
}

function askSeriesDeleteMode(event) {
  const isRecurring = event.recurrenceType && event.recurrenceType !== 'none';
  const intro = isRecurring ? 'This is a recurring event.' : 'This is a multi-day event.';
  const deleteSelectedDate = window.confirm(
    `${intro}\n\nPress OK to delete only the selected date.\nPress Cancel to choose whether to delete the entire series.`
  );
  if (deleteSelectedDate) return 'single';
  const deleteSeries = window.confirm('Delete the entire series?');
  return deleteSeries ? 'all' : '';
}

function eventSpanDays(event) {
  return getSpanDays(event.startDate, event.endDate);
}

function labelsForSegment(event, segmentStart, segmentEnd) {
  const labels = event.labels || {};
  const startOffset = getSpanDays(event.startDate, segmentStart) - 1;
  const endOffset = getSpanDays(event.startDate, segmentEnd) - 1;
  const nextLabels = {};
  Object.entries(labels).forEach(([offsetKey, label]) => {
    const offset = Number(offsetKey);
    if (!Number.isFinite(offset) || offset < startOffset || offset > endOffset) return;
    nextLabels[String(offset - startOffset)] = label;
  });
  return nextLabels;
}

function eventSegment(event, segmentStart, segmentEnd, id = event.id) {
  return {
    ...event,
    id,
    startDate: segmentStart,
    endDate: segmentEnd,
    labels: labelsForSegment(event, segmentStart, segmentEnd),
    updatedAt: new Date().toISOString(),
  };
}

function eventOccursOnDate(event, occurrenceDate) {
  if (!event || !occurrenceDate || occurrenceDate < event.startDate || occurrenceDate > event.endDate) return false;
  if (event.recurrenceType === 'daily') return true;
  if (event.recurrenceType === 'weekly') {
    const weekday = String(new Date(`${occurrenceDate}T00:00:00Z`).getUTCDay());
    const weekdays = new Set((event.recurrenceWeekdays || []).map(String));
    return weekdays.has(weekday);
  }
  return true;
}

function deleteSingleEventOccurrence(event, occurrenceDate) {
  const index = appState.doc.events.findIndex((item) => item.id === event.id);
  if (index < 0) return false;

  const originalEnd = event.endDate;
  const beforeEnd = shiftIsoDate(occurrenceDate, -1);
  const afterStart = shiftIsoDate(occurrenceDate, 1);
  const keepBefore = beforeEnd >= event.startDate;
  const keepAfter = afterStart <= originalEnd;

  if (keepBefore && keepAfter) {
    appState.doc.events[index] = eventSegment(event, event.startDate, beforeEnd, event.id);
    appState.doc.events.splice(index + 1, 0, eventSegment(event, afterStart, originalEnd, uuid()));
    return true;
  }
  if (keepBefore) {
    appState.doc.events[index] = eventSegment(event, event.startDate, beforeEnd, event.id);
    return true;
  }
  if (keepAfter) {
    appState.doc.events[index] = eventSegment(event, afterStart, originalEnd, event.id);
    return true;
  }

  appState.doc.events.splice(index, 1);
  return true;
}

function deleteUserEvent(eventId, occurrenceDate = '') {
  const index = appState.doc.events.findIndex((item) => item.id === eventId);
  if (index < 0) return false;

  const event = appState.doc.events[index];
  const isRecurring = event.recurrenceType && event.recurrenceType !== 'none';
  const isMultiDay = eventSpanDays(event) > 1;
  const targetOccurrenceDate = occurrenceDate || event.startDate;

  if (!isRecurring && !isMultiDay) {
    pushUndo(appState.doc);
    appState.doc.events.splice(index, 1);
    schedulePersist(appState.doc, 'event-delete', setLastSaved);
    rerender();
    return true;
  }

  const deleteMode = askSeriesDeleteMode(event);
  if (!deleteMode) return false;

  pushUndo(appState.doc);
  if (deleteMode === 'all') {
    appState.doc.events.splice(index, 1);
    schedulePersist(appState.doc, 'event-delete-series', setLastSaved);
    rerender();
    return true;
  }

  if (!eventOccursOnDate(event, targetOccurrenceDate) || !deleteSingleEventOccurrence(event, targetOccurrenceDate)) {
    flash('Could not delete the selected event date.', 'danger');
    return false;
  }

  schedulePersist(appState.doc, 'event-delete-occurrence', setLastSaved);
  rerender();
  return true;
}

function setLastSaved(ts) {
  appState.lastSavedAt = ts;
  const lastSavedText = document.getElementById('lastSavedText');
  if (lastSavedText) {
    lastSavedText.textContent = ts ? `Last saved: ${new Date(ts).toLocaleTimeString()}` : 'Not saved yet';
  }
}

function openEventModal(payload) {
  const requestedOccurrenceDate = typeof payload === 'object'
    ? (payload.occurrenceDate || payload.occurrence_date || '')
    : '';
  const sourceEvent = typeof payload === 'string'
    ? appState.doc.events.find((e) => e.id === payload)
    : (payload?.eventId ? appState.doc.events.find((e) => e.id === payload.eventId) : payload);
  if (!sourceEvent) return;

  resetEventScopeState();
  let occurrenceDate = requestedOccurrenceDate || sourceEvent.startDate || sourceEvent.start_date || '';
  let modalEvent = sourceEvent;

  if (sourceEvent.id && supportsScopedAction(sourceEvent, occurrenceDate)) {
    const editMode = askSeriesActionMode(sourceEvent, 'edit');
    if (!editMode) return;
    if (editMode === 'single') {
      modalEvent = buildSingleOccurrenceDraft(sourceEvent, occurrenceDate);
      document.getElementById('editScopeMode').value = 'single';
      document.getElementById('editSourceEventId').value = sourceEvent.id;
      document.getElementById('editOccurrenceDate').value = occurrenceDate;
      setEventScopeBanner(`Editing only ${formatMonthDate(occurrenceDate)}. Saving will create a standalone event and remove that date from the original series.`);
    }
  }

  syncDateInputsToMonth();
  document.getElementById('eventId').value = modalEvent.id || '';
  document.getElementById('title').value = modalEvent.title || '';
  document.getElementById('startDate').value = modalEvent.startDate || modalEvent.start_date || '';
  document.getElementById('endDate').value = modalEvent.endDate || modalEvent.end_date || modalEvent.startDate || modalEvent.start_date || '';
  document.getElementById('startTime').value = modalEvent.startTime || modalEvent.start_time || '';
  document.getElementById('location').value = modalEvent.location || '';
  document.getElementById('audience').value = modalEvent.audience || 'Unspecified';
  document.getElementById('notes').value = modalEvent.notes || '';
  document.querySelectorAll('#weekdayCheckboxes input').forEach((cb) => { cb.checked = (modalEvent.recurrenceWeekdays || []).includes(cb.value); });
  syncRecurrenceTypeFromWeekdays();
  document.getElementById('deleteEventBtn').classList.toggle('d-none', !modalEvent.id);
  document.getElementById('deleteEventBtn').dataset.occurrenceDate = occurrenceDate || modalEvent.startDate || '';
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
  const contextCellImageInput = document.getElementById('contextCellImageInput');
  const imageTrashDropzone = document.getElementById('imageTrashDropzone');
  const monthYearSelect = document.getElementById('monthYearSelect');

  const applySelectedMonth = async () => {
    const [yearText, monthText] = monthYearSelect.value.split('-');
    appState.view.month = Number(monthText);
    appState.view.year = Number(yearText);
    appState.editingCell = null;
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
    const editScopeMode = document.getElementById('editScopeMode').value;
    const sourceEventId = document.getElementById('editSourceEventId').value;
    const occurrenceDate = document.getElementById('editOccurrenceDate').value;
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
    if (editScopeMode === 'single' && sourceEventId && occurrenceDate) {
      const sourceEvent = appState.doc.events.find((item) => item.id === sourceEventId);
      if (!sourceEvent || !eventOccursOnDate(sourceEvent, occurrenceDate)) {
        flash('The selected event date could not be edited.', 'danger');
        return;
      }
      pushUndo(appState.doc);
      if (!deleteSingleEventOccurrence(sourceEvent, occurrenceDate)) {
        flash('The selected event date could not be edited.', 'danger');
        return;
      }
      appState.doc.events.push({ ...payload, id: uuid() });
    } else {
      pushUndo(appState.doc);
      const idx = appState.doc.events.findIndex((e) => e.id === payload.id);
      if (idx >= 0) appState.doc.events[idx] = payload;
      else appState.doc.events.push(payload);
    }
    schedulePersist(appState.doc, 'event', setLastSaved);
    resetEventScopeState();
    eventModal.hide();
    rerender();
  });

  document.getElementById('deleteEventBtn').addEventListener('click', () => {
    const id = document.getElementById('eventId').value;
    const occurrenceDate = document.getElementById('deleteEventBtn').dataset.occurrenceDate || document.getElementById('startDate').value;
    if (deleteUserEvent(id, occurrenceDate)) eventModal.hide();
  });
  document.getElementById('eventModal').addEventListener('hidden.bs.modal', () => {
    resetEventScopeState();
  });

  document.getElementById('holidaysToggle').addEventListener('change', (e) => {
    appState.doc.settings.showUSHolidays = e.target.checked;
    schedulePersist(appState.doc, 'settings', setLastSaved);
    rerender();
  });
  document.getElementById('usaJamaatToggle').addEventListener('change', (e) => {
    appState.doc.settings.showUsaJamaat = e.target.checked;
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
  contextCellImageInput.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file || !activeDateContext || !isOutsideVisibleMonth(activeDateContext)) return;
    try {
      appState.activeDate = activeDateContext;
      if (appState.editingCell === activeDateContext) pendingCellEditorFocus = true;
      await addImageToCell({ state: appState, date: activeDateContext, file });
      schedulePersist(appState.doc, 'attachment', setLastSaved);
      rerender();
    } catch (error) {
      flash(error.message, 'danger');
    } finally {
      event.target.value = '';
    }
  });
  imageTrashDropzone.addEventListener('dragover', (event) => {
    if (!activeDraggedCellImage) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    toggleImageTrash(true, true);
  });
  imageTrashDropzone.addEventListener('dragleave', () => {
    if (!activeDraggedCellImage) return;
    toggleImageTrash(true, false);
  });
  imageTrashDropzone.addEventListener('drop', async (event) => {
    const parsed = parseDragPayload(event.dataTransfer?.getData('text/plain'));
    if (!parsed?.attachmentId || !parsed?.sourceDate) return;
    event.preventDefault();
    toggleImageTrash(false);
    activeDraggedCellImage = null;
    await removeImageFromCell({ state: appState, date: parsed.sourceDate, attachmentId: parsed.attachmentId });
    schedulePersist(appState.doc, 'attachment-remove', setLastSaved);
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
  document.getElementById('restoreHiddenItemsBtn').addEventListener('click', restoreAllHiddenItems);
  document.getElementById('restoreAllHiddenItemsBtn').addEventListener('click', restoreAllHiddenItems);
  document.getElementById('hiddenItemsModal').addEventListener('show.bs.modal', () => {
    renderHiddenItemsUI();
  });
  document.getElementById('shareModal').addEventListener('show.bs.modal', () => {
    updateShareUI();
  });
  document.getElementById('copyShareMessageBtn').addEventListener('click', async () => {
    const copied = await copyText(currentShareMessage());
    flash(copied ? 'Share message copied.' : 'Could not copy the share message.', copied ? 'success' : 'danger');
  });
  document.getElementById('copyWhatsappMessageBtn').addEventListener('click', async () => {
    const copied = await copyText(currentShareMessage());
    flash(copied ? 'WhatsApp text copied.' : 'Could not copy the WhatsApp text.', copied ? 'success' : 'danger');
  });
  document.getElementById('nativeShareBtn').addEventListener('click', async () => {
    if (typeof navigator.share !== 'function') return;
    try {
      await navigator.share({ title: browserTabTitle(appState.view.year, appState.view.month), text: currentShareMessage() });
    } catch (error) {
      if (error?.name !== 'AbortError') flash('Could not open the device share sheet.', 'danger');
    }
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

  document.getElementById('contextAddEvent').addEventListener('click', () => {
    hideMenus();
    if (!activeDateContext) return;
    openEventModal({ startDate: activeDateContext, endDate: activeDateContext });
  });
  document.getElementById('contextAddCellImage').addEventListener('click', () => {
    hideMenus();
    if (!activeDateContext || !isOutsideVisibleMonth(activeDateContext)) return;
    contextCellImageInput.click();
  });
  document.getElementById('contextRemoveCellImages').addEventListener('click', async () => {
    hideMenus();
    if (!activeDateContext || !isOutsideVisibleMonth(activeDateContext)) return;
    const activeCell = appState.doc.cells[activeDateContext];
    if (!activeCell?.attachments?.length) return;
    const confirmed = window.confirm(activeCell.attachments.length > 1 ? 'Remove all images from this box?' : 'Remove this box image?');
    if (!confirmed) return;
    if (appState.editingCell === activeDateContext) pendingCellEditorFocus = true;
    await clearImagesFromCell({ state: appState, date: activeDateContext });
    schedulePersist(appState.doc, 'attachment-remove-all', setLastSaved);
    rerender();
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
    openEventModal({ eventId: activeEventContext.eventId, occurrenceDate: activeEventContext.occurrenceDate });
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
    const { eventId, sourceType, occurrenceKey, occurrenceDate, seriesKey, seriesSpanDays } = activeEventContext;
    if (sourceType === 'usa-jamaat') {
      if (!occurrenceKey) return;
      const deleteMode = seriesSpanDays > 1
        ? askSeriesDeleteMode({ recurrenceType: 'none', startDate: occurrenceDate, endDate: shiftIsoDate(occurrenceDate, seriesSpanDays - 1) })
        : 'single';
      if (!deleteMode) return;
      if (deleteMode === 'all' && seriesKey) {
        toggleHiddenDate('usaJamaatSeries', seriesKey);
        schedulePersist(appState.doc, 'usa-jamaat-hide-series', setLastSaved);
      } else {
        toggleHiddenDate('usaJamaatOccurrences', occurrenceKey);
        schedulePersist(appState.doc, 'usa-jamaat-hide', setLastSaved);
      }
      rerender();
      return;
    }
    if (!eventId) return;
    deleteUserEvent(eventId, occurrenceDate);
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.context-menu')) hideMenus();
    if (appState.editingCell && !event.target.closest('.outside-month-editor-shell')) {
      appState.editingCell = null;
      rerender();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      hideMenus();
      if (appState.editingCell) {
        appState.editingCell = null;
        rerender();
      }
    }
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
