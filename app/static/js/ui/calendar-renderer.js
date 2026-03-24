import { buildMonthGrid, isoDate } from '../utils/dates.js';
import { WEEKDAY_NAMES } from '../core/constants.js';
import { visibleEventMap } from '../features/events.js';
import { previewText, escapeHtml } from '../utils/text.js';
import { contrastTextColor } from '../utils/colors.js';

let weekdayBuilt = false;

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

export function renderCalendar({ state, onSelectDate, onOpenEvent, onOpenActions, onDropImage }) {
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
  const holidays = state.doc.settings.showUSHolidays ? simpleUSHolidays(year, month) : new Map();
  holidays.forEach((name, key) => {
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
          <div class="event-list"></div>
          <div class="cell-note-preview ${preview ? '' : 'd-none'}">${escapeHtml(preview)}</div>
          <div class="cell-image-strip"></div>
        `;

        cell.addEventListener('click', () => onSelectDate(key));
        cell.addEventListener('dblclick', () => onOpenEvent({ startDate: key, endDate: key }));
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
          if (item.sourceEventId) onOpenEvent(item.sourceEventId);
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

      monthGrid.appendChild(cell);
    });
  });
}
