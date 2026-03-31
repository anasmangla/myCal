import { buildMonthGrid, isoDate } from '../utils/dates.js';
import { WEEKDAY_NAMES } from '../core/constants.js';
import { visibleEventMap } from '../features/events.js';
import { CELL_FONT_PRESET_OPTIONS, CELL_FONT_SIZE_OPTIONS, applyCellTextPresentation, getCellTextStyle } from '../features/cell-editor.js';
import { previewText, escapeHtml } from '../utils/text.js';
import { contrastTextColor } from '../utils/colors.js';

let weekdayBuilt = false;
const islamicFormatter = new Intl.DateTimeFormat('en-u-ca-islamic-tbla', { month: 'long', day: 'numeric', timeZone: 'UTC' });

function getIslamicParts(iso) {
  const date = new Date(`${iso}T00:00:00Z`);
  const parts = islamicFormatter.formatToParts(date);
  return {
    month: parts.find((part) => part.type === 'month')?.value || '',
    day: Number(parts.find((part) => part.type === 'day')?.value || 0),
  };
}

function buildIslamicLabels(iso) {
  const islamic = getIslamicParts(iso);
  const isFirstGregorian = iso.endsWith('-01');
  const isFirstIslamic = islamic.day === 1;
  if (!isFirstGregorian && !isFirstIslamic) return [];
  return [{ text: `${islamic.month} ${islamic.day}`, italic: true, important: false }];
}

function simpleUSHolidays(year, month) {
  const map = new Map();
  const pushHoliday = (date, label) => {
    const holidayMonth = date.getUTCMonth() + 1;
    if (holidayMonth !== month) return;
    map.set(isoDate(date), label);
  };
  const fixedHoliday = (m, d, label) => {
    const date = new Date(Date.UTC(year, m - 1, d));
    pushHoliday(date, label);

    const weekday = date.getUTCDay();
    if (weekday === 6) {
      const observed = new Date(date);
      observed.setUTCDate(observed.getUTCDate() - 1);
      pushHoliday(observed, `${label} (observed)`);
    } else if (weekday === 0) {
      const observed = new Date(date);
      observed.setUTCDate(observed.getUTCDate() + 1);
      pushHoliday(observed, `${label} (observed)`);
    }
  };
  const nthWeekday = (m, weekday, ordinal, label) => {
    const firstDay = new Date(Date.UTC(year, m - 1, 1)).getUTCDay();
    const day = 1 + ((7 + weekday - firstDay) % 7) + ((ordinal - 1) * 7);
    pushHoliday(new Date(Date.UTC(year, m - 1, day)), label);
  };
  const lastWeekday = (m, weekday, label) => {
    const lastDate = new Date(Date.UTC(year, m, 0));
    const day = lastDate.getUTCDate() - ((7 + lastDate.getUTCDay() - weekday) % 7);
    pushHoliday(new Date(Date.UTC(year, m - 1, day)), label);
  };

  fixedHoliday(1, 1, "New Year's Day");
  nthWeekday(1, 1, 3, 'Martin Luther King Jr. Day');
  nthWeekday(2, 1, 3, "Washington's Birthday");
  fixedHoliday(6, 19, 'Juneteenth National Independence Day');
  fixedHoliday(7, 4, 'Independence Day');
  nthWeekday(9, 1, 1, 'Labor Day');
  nthWeekday(10, 1, 2, 'Columbus Day');
  fixedHoliday(11, 11, 'Veterans Day');
  nthWeekday(11, 4, 4, 'Thanksgiving Day');
  fixedHoliday(12, 25, 'Christmas Day');
  lastWeekday(5, 1, 'Memorial Day');
  return map;
}

function fontPresetOptions(selected) {
  return CELL_FONT_PRESET_OPTIONS
    .map((option) => `<option value="${option.value}" ${option.value === selected ? 'selected' : ''}>${option.label}</option>`)
    .join('');
}

function fontSizeOptions(selected) {
  return CELL_FONT_SIZE_OPTIONS
    .map((option) => `<option value="${option.value}" ${Number(option.value) === Number(selected) ? 'selected' : ''}>${option.label}</option>`)
    .join('');
}

function parseDragPayload(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function renderCalendar({
  state,
  audienceColors,
  onSelectDate,
  onOpenEvent,
  onOpenActions,
  onEditCellText,
  onStopCellEdit,
  onCellTextInput,
  onCellTextStyleChange,
  onDateContext,
  onEventContext,
  onMoveEvent,
  onMoveCellImage,
  onDropImage,
  onRemoveImage,
  onStartCellImageDrag,
  onEndCellImageDrag,
}) {
  if (!weekdayBuilt) {
    const weekdayHeader = document.getElementById('weekdayHeader');
    WEEKDAY_NAMES.forEach((name) => {
      const cell = document.createElement('div');
      cell.className = 'weekday-cell';
      cell.textContent = name.slice(0, 3).toUpperCase();
      weekdayHeader.appendChild(cell);
    });
    weekdayBuilt = true;
  }

  const monthGrid = document.getElementById('calendarBody');
  const { year, month } = state.view;
  const grid = buildMonthGrid(year, month);
  const visibleStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const visibleEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const events = visibleEventMap(state.doc.events, visibleStart, visibleEnd, audienceColors);
  const hiddenHolidayDates = new Set(state.doc.settings?.hiddenMeta?.holidays || []);
  const hiddenIslamicDates = new Set(state.doc.settings?.hiddenMeta?.islamic || []);
  const holidays = state.doc.settings.showUSHolidays ? simpleUSHolidays(year, month) : new Map();

  monthGrid.innerHTML = '';
  monthGrid.setAttribute('role', 'grid');
  grid.forEach((week) => {
    week.forEach((day) => {
      const key = isoDate(day);
      const inMonth = day.getUTCMonth() === month - 1;
      const cellData = state.doc.cells[key];
      const rawText = cellData?.plainText || '';
      const preview = cellData?.contentType === 'rich-html' ? '' : previewText(rawText, inMonth ? 80 : 180);
      const isEditingCell = !inMonth && state.editingCell === key;
      const cellTextStyle = getCellTextStyle(cellData);

      const cell = document.createElement('div');
      cell.className = `calendar-cell day-cell ${inMonth ? '' : 'outside-month'}`;
      cell.dataset.date = key;
      cell.dataset.inMonth = inMonth ? 'true' : 'false';
      cell.tabIndex = inMonth ? 0 : -1;
      cell.setAttribute('role', 'gridcell');
      const isWeekend = day.getUTCDay() === 0 || day.getUTCDay() === 6;
      const isHoliday = holidays.has(key) && !hiddenHolidayDates.has(key);
      if (inMonth && isWeekend) cell.classList.add('weekend');
      if (inMonth && isHoliday) cell.classList.add('holiday');
      if (state.activeDate === key) cell.classList.add('selected-day');
      if (cellData?.backgroundColor) {
        cell.style.backgroundColor = cellData.backgroundColor;
        cell.style.color = cellData.textColor || contrastTextColor(cellData.backgroundColor);
      }

      if (inMonth) {
        cell.innerHTML = `
          <div class="calendar-cell-header">
            <button type="button" class="btn btn-sm btn-light date-action-btn no-print">...</button>
            <div class="day-number">${day.getUTCDate()}</div>
          </div>
          <div class="holiday-pill small"></div>
          <div class="event-list"></div>
          <div class="cell-note-preview ${preview ? '' : 'd-none'}">${escapeHtml(preview)}</div>
          <div class="cell-image-strip"></div>
        `;

        cell.addEventListener('click', () => onSelectDate({ date: key, inMonth: true }));
        cell.addEventListener('dblclick', (event) => {
          const eventChip = event.target.closest('.event-chip');
          if (eventChip) return;
          const firstEvent = (events[key] || []).find((item) => item.sourceEventId && !item.isHoliday);
          if (firstEvent) {
            onOpenEvent(firstEvent.sourceEventId);
            return;
          }
          onOpenActions(key);
        });
        cell.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          onDateContext({ date: key, x: event.pageX, y: event.pageY });
        });
        cell.querySelector('.date-action-btn').addEventListener('click', (event) => {
          event.stopPropagation();
          onOpenActions(key, event);
        });
        cell.addEventListener('dragover', (event) => {
          event.preventDefault();
          cell.classList.add('drop-target');
        });
        cell.addEventListener('dragleave', () => cell.classList.remove('drop-target'));
        cell.addEventListener('drop', (event) => {
          event.preventDefault();
          cell.classList.remove('drop-target');
          const parsed = parseDragPayload(event.dataTransfer?.getData('text/plain'));
          if (parsed?.eventId && parsed?.anchorDate) {
            onMoveEvent({ eventId: parsed.eventId, targetDate: key, anchorDate: parsed.anchorDate });
            return;
          }
          onDropImage(key, event.dataTransfer?.files || []);
        });
      } else {
        let outsideMonthClickTimer = 0;
        cell.innerHTML = `
          <div class="outside-month-fill extra-cell-fill">
            ${isEditingCell ? `
              <div class="outside-month-editor-shell" data-editor-shell="${key}">
                <div class="outside-month-editor-toolbar no-print">
                  <select class="form-select form-select-sm cell-style-select" data-style-control="fontPreset" aria-label="Text font">
                    ${fontPresetOptions(cellTextStyle.fontPreset)}
                  </select>
                  <select class="form-select form-select-sm cell-style-select" data-style-control="fontSize" aria-label="Text size">
                    ${fontSizeOptions(cellTextStyle.fontSize)}
                  </select>
                  <button type="button" class="btn btn-sm btn-outline-secondary cell-style-toggle ${cellTextStyle.fontWeight === '700' ? 'active' : ''}" data-style-toggle="bold" aria-pressed="${cellTextStyle.fontWeight === '700'}">B</button>
                  <button type="button" class="btn btn-sm btn-outline-secondary cell-style-toggle ${cellTextStyle.italic ? 'active' : ''}" data-style-toggle="italic" aria-pressed="${cellTextStyle.italic}">I</button>
                </div>
                <textarea class="outside-month-editor" data-cell-editor="${key}" spellcheck="true" placeholder="Write directly in this box. Text wraps and stays inside the cell."></textarea>
              </div>
            ` : `
              <div class="cell-note-preview cell-note-fit ${preview ? '' : 'd-none'}">${escapeHtml(preview)}</div>
            `}
            <div class="cell-image-strip"></div>
          </div>
        `;
        cell.tabIndex = 0;
        cell.addEventListener('click', () => {
          window.clearTimeout(outsideMonthClickTimer);
          outsideMonthClickTimer = window.setTimeout(() => onSelectDate({ date: key, inMonth: false }), 180);
        });
        cell.addEventListener('dblclick', (event) => {
          event.preventDefault();
          window.clearTimeout(outsideMonthClickTimer);
          onEditCellText(key);
        });
        cell.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          onDateContext({ date: key, x: event.pageX, y: event.pageY });
        });
        cell.addEventListener('dragover', (event) => {
          event.preventDefault();
          cell.classList.add('drop-target');
        });
        cell.addEventListener('dragleave', () => cell.classList.remove('drop-target'));
        cell.addEventListener('drop', (event) => {
          event.preventDefault();
          cell.classList.remove('drop-target');
          const parsed = parseDragPayload(event.dataTransfer?.getData('text/plain'));
          if (parsed?.type === 'cell-image' && parsed?.attachmentId && parsed?.sourceDate && parsed.sourceDate !== key) {
            onMoveCellImage({ fromDate: parsed.sourceDate, toDate: key, attachmentId: parsed.attachmentId });
            return;
          }
          onDropImage(key, event.dataTransfer?.files || []);
        });

        if (isEditingCell) {
          const shell = cell.querySelector('.outside-month-editor-shell');
          const textarea = cell.querySelector('.outside-month-editor');
          let liveTextStyle = { ...cellTextStyle };

          textarea.value = rawText;
          applyCellTextPresentation(textarea, { ...(cellData || {}), textStyle: liveTextStyle });

          shell.addEventListener('click', (event) => event.stopPropagation());
          shell.addEventListener('dblclick', (event) => event.stopPropagation());
          shell.addEventListener('mousedown', (event) => event.stopPropagation());

          textarea.addEventListener('input', () => {
            onCellTextInput({ date: key, value: textarea.value });
          });
          textarea.addEventListener('contextmenu', (event) => {
            event.stopPropagation();
          });
          textarea.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              onStopCellEdit(key);
            }
          });

          const syncEditorStyle = () => {
            applyCellTextPresentation(textarea, { ...(cellData || {}), textStyle: liveTextStyle });
          };

          shell.querySelector('[data-style-control="fontPreset"]').addEventListener('change', (event) => {
            liveTextStyle = { ...liveTextStyle, fontPreset: event.target.value };
            onCellTextStyleChange({ date: key, patch: { fontPreset: event.target.value } });
            syncEditorStyle();
          });
          shell.querySelector('[data-style-control="fontSize"]').addEventListener('change', (event) => {
            liveTextStyle = { ...liveTextStyle, fontSize: Number(event.target.value) };
            onCellTextStyleChange({ date: key, patch: { fontSize: Number(event.target.value) } });
            syncEditorStyle();
          });
          shell.querySelectorAll('[data-style-toggle]').forEach((button) => {
            button.addEventListener('click', (event) => {
              event.preventDefault();
              event.stopPropagation();
              if (button.dataset.styleToggle === 'bold') {
                const nextWeight = liveTextStyle.fontWeight === '700' ? '400' : '700';
                liveTextStyle = { ...liveTextStyle, fontWeight: nextWeight };
                onCellTextStyleChange({ date: key, patch: { fontWeight: nextWeight } });
                button.classList.toggle('active', nextWeight === '700');
                button.setAttribute('aria-pressed', String(nextWeight === '700'));
              }
              if (button.dataset.styleToggle === 'italic') {
                const nextItalic = !liveTextStyle.italic;
                liveTextStyle = { ...liveTextStyle, italic: nextItalic };
                onCellTextStyleChange({ date: key, patch: { italic: nextItalic } });
                button.classList.toggle('active', nextItalic);
                button.setAttribute('aria-pressed', String(nextItalic));
              }
              syncEditorStyle();
              textarea.focus();
            });
          });
        } else {
          const previewNode = cell.querySelector('.cell-note-preview');
          if (previewNode) {
            applyCellTextPresentation(previewNode, { ...(cellData || {}), textStyle: cellTextStyle });
          }
        }
      }

      const list = cell.querySelector('.event-list');
      (events[key] || []).forEach((item) => {
        const chip = document.createElement('a');
        chip.href = '#';
        chip.className = `event-chip ${item.isHoliday ? 'holiday-chip' : ''}`;
        chip.style.backgroundColor = item.color;
        chip.textContent = item.displayText;
        chip.title = item.title || item.displayText;
        chip.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (item.sourceEventId) onOpenEvent(item.sourceEventId);
        });
        chip.addEventListener('dblclick', (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (item.sourceEventId) onOpenEvent(item.sourceEventId);
        });
        chip.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!item.sourceEventId || item.isHoliday) return;
          onEventContext({
            eventId: item.sourceEventId,
            occurrenceDate: item.occurrenceDate || key,
            x: event.pageX,
            y: event.pageY,
          });
        });
        chip.draggable = Boolean(item.sourceEventId && !item.isHoliday);
        chip.addEventListener('dragstart', (event) => {
          if (!item.sourceEventId || item.isHoliday) return;
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', JSON.stringify({ eventId: item.sourceEventId, anchorDate: item.occurrenceDate || key }));
        });
        list?.appendChild(chip);
      });

      if (cellData?.attachments?.length) {
        const strip = cell.querySelector('.cell-image-strip');
        const attachIds = inMonth ? cellData.attachments.slice(0, 3) : cellData.attachments.slice(0, isEditingCell ? 4 : 2);
        attachIds.forEach((attId, index) => {
          const att = state.doc.attachments[attId];
          if (!att?.thumbnailDataUrl) return;
          const img = document.createElement('img');
          img.src = att.thumbnailDataUrl;
          img.alt = att.altText || att.name || 'Cell image';
          img.className = index === 0 && !inMonth && !isEditingCell ? 'cell-thumb cell-thumb-primary' : 'cell-thumb';
          img.dataset.attachmentId = attId;
          img.addEventListener('click', (event) => event.stopPropagation());
          img.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemoveImage({ date: key, attachmentId: attId });
          });
          if (!inMonth) {
            img.draggable = true;
            img.addEventListener('dragstart', (event) => {
              event.stopPropagation();
              img.classList.add('is-dragging');
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'cell-image', attachmentId: attId, sourceDate: key }));
              onStartCellImageDrag({ date: key, attachmentId: attId });
            });
            img.addEventListener('dragend', () => {
              img.classList.remove('is-dragging');
              onEndCellImageDrag();
            });
          }
          strip.appendChild(img);
        });
      }

      if (inMonth) {
        const lines = [];
        const holidayLabel = holidays.get(key);
        if (holidayLabel && !hiddenHolidayDates.has(key)) {
          lines.push(`<span class="calendar-meta-line us-holiday-note">${escapeHtml(holidayLabel)}</span>`);
        }
        if (state.doc.settings.showIslamicDates && !hiddenIslamicDates.has(key)) {
          buildIslamicLabels(key).forEach((label) => {
            lines.push(
              `<span class="calendar-meta-line ${label.italic ? 'islamic-note' : ''} ${label.important ? 'islamic-important' : ''}">${escapeHtml(label.text)}</span>`
            );
          });
        }
        const holidayPill = cell.querySelector('.holiday-pill');
        holidayPill.innerHTML = lines.join('');
        holidayPill.classList.toggle('has-content', lines.length > 0);
      }

      monthGrid.appendChild(cell);
    });
  });
}
