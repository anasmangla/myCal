import { buildMonthGrid, isoDate } from '../utils/dates.js';
import { WEEKDAY_NAMES } from '../core/constants.js';
import { visibleEventMap } from '../features/events.js';
import { previewText, escapeHtml } from '../utils/text.js';
import { contrastTextColor } from '../utils/colors.js';

let weekdayBuilt = false;
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
  const labels = [{ text: `${islamic.month} ${islamic.day}`, italic: true, important: false }];
  const importantDay = islamicHolidayMap[`${islamic.monthNumber}-${islamic.day}`];
  if (importantDay) labels.push({ text: importantDay, italic: false, important: true });
  return labels;
}

function simpleUSHolidays(year, month) {
  const map = new Map();
  const add = (m, d, label) => {
    if (m === month) map.set(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`, label);
  };
  add(1, 1, "New Year's Day");
  add(7, 4, 'Independence Day');
  add(11, 11, 'Veterans Day');
  add(12, 25, 'Christmas Day');
  return map;
}

export function renderCalendar({
  state,
  onSelectDate,
  onOpenEvent,
  onOpenActions,
  onDateContext,
  onEventContext,
  onMoveEvent,
  onDropImage,
}) {
  if (!weekdayBuilt) {
    const weekdayHeader = document.getElementById('weekdayHeader');
    WEEKDAY_NAMES.forEach((name) => {
      const cell = document.createElement('div');
      cell.className = 'weekday-cell';
      cell.textContent = name;
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

  const events = visibleEventMap(state.doc.events, visibleStart, visibleEnd);
  const hiddenHolidayDates = new Set(state.doc.settings?.hiddenMeta?.holidays || []);
  const hiddenIslamicDates = new Set(state.doc.settings?.hiddenMeta?.islamic || []);
  const holidays = state.doc.settings.showUSHolidays ? simpleUSHolidays(year, month) : new Map();
  holidays.forEach((name, key) => {
    if (hiddenHolidayDates.has(key)) return;
    events[key] ||= [];
    events[key].unshift({ isHoliday: true, displayText: name, color: '#7c3aed', title: name });
  });

  monthGrid.innerHTML = '';
  monthGrid.setAttribute('role', 'grid');
  grid.forEach((week) => {
    week.forEach((day) => {
      const key = isoDate(day);
      const inMonth = day.getUTCMonth() === month - 1;
      const cellData = state.doc.cells[key];
      const preview = cellData?.contentType === 'rich-html' ? '' : previewText(cellData?.plainText || '', 80);

      const cell = document.createElement('div');
      cell.className = `calendar-cell day-cell ${inMonth ? '' : 'outside-month'}`;
      cell.dataset.date = key;
      cell.tabIndex = inMonth ? 0 : -1;
      cell.setAttribute('role', 'gridcell');
      if (state.activeDate === key) cell.classList.add('selected-day');
      if (cellData?.backgroundColor) {
        cell.style.backgroundColor = cellData.backgroundColor;
        cell.style.color = cellData.textColor || contrastTextColor(cellData.backgroundColor);
      }

      if (inMonth) {
        cell.innerHTML = `
          <div class="calendar-cell-header">
            <button type="button" class="btn btn-sm btn-light date-action-btn no-print">⋮</button>
            <div class="day-number">${day.getUTCDate()}</div>
          </div>
          <div class="holiday-pill small"></div>
          <div class="event-list"></div>
          <div class="cell-note-preview ${preview ? '' : 'd-none'}">${escapeHtml(preview)}</div>
          <div class="cell-image-strip"></div>
        `;

        cell.addEventListener('click', () => onSelectDate(key));
        cell.addEventListener('dblclick', () => onOpenEvent({ startDate: key, endDate: key }));
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
          const dragPayload = event.dataTransfer?.getData('text/plain');
          if (dragPayload) {
            try {
              const parsed = JSON.parse(dragPayload);
              if (parsed?.eventId && parsed?.anchorDate) {
                onMoveEvent({ eventId: parsed.eventId, targetDate: key, anchorDate: parsed.anchorDate });
                return;
              }
            } catch (error) {
              // Fall through to image drop handling.
            }
          }
          onDropImage(key, event.dataTransfer?.files || []);
        });
      } else {
        cell.innerHTML = '<div class="outside-month-fill"></div>';
      }

      const list = cell.querySelector('.event-list');
      (events[key] || []).forEach((item) => {
        const chip = document.createElement('a');
        chip.href = '#';
        chip.className = `event-chip ${item.isHoliday ? 'holiday-chip' : ''}`;
        chip.style.backgroundColor = item.color;
        chip.textContent = item.displayText;
        chip.title = item.title || item.displayText;
        chip.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
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
        list.appendChild(chip);
      });

      if (cellData?.attachments?.length) {
        const strip = cell.querySelector('.cell-image-strip');
        cellData.attachments.slice(0, 3).forEach((attId) => {
          const att = state.doc.attachments[attId];
          if (!att?.thumbnailDataUrl) return;
          const img = document.createElement('img');
          img.src = att.thumbnailDataUrl;
          img.alt = att.altText || att.name || 'Cell image';
          img.className = 'cell-thumb';
          strip.appendChild(img);
        });
      }

      if (inMonth) {
        const lines = [];
        const holidayLabel = holidays.get(key);
        if (holidayLabel && !hiddenHolidayDates.has(key)) {
          lines.push(`<span class="calendar-meta-line">${escapeHtml(holidayLabel)}</span>`);
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
