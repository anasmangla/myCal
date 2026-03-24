import { ensureCell } from '../models/cell-model.js';

export function openCellEditor({ state, date }) {
  const panel = document.getElementById('sidePanel');
  const title = document.getElementById('sidePanelTitle');
  const note = document.getElementById('cellNoteInput');
  const visibility = document.getElementById('cellVisibility');
  state.activeDate = date;
  const cell = ensureCell(state.doc, date);
  panel.classList.remove('d-none');
  title.textContent = `Day details: ${date}`;
  note.value = cell.plainText || '';
  visibility.value = cell.visibility || 'public';
}

export function saveCellFromPanel({ state }) {
  const date = state.activeDate;
  if (!date) return;
  const cell = ensureCell(state.doc, date);
  cell.plainText = document.getElementById('cellNoteInput').value;
  cell.visibility = document.getElementById('cellVisibility').value;
  cell.contentType = 'plain';
}
