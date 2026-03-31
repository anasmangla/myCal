import { ensureCell } from '../models/cell-model.js';

export const CELL_FONT_PRESETS = {
  system: '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  trebuchet: '"Trebuchet MS", "Segoe UI", sans-serif',
  georgia: 'Georgia, "Times New Roman", serif',
  palatino: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
  verdana: 'Verdana, Geneva, sans-serif',
};

export const CELL_FONT_PRESET_OPTIONS = [
  { value: 'system', label: 'System Sans' },
  { value: 'trebuchet', label: 'Trebuchet Sans' },
  { value: 'georgia', label: 'Georgia Serif' },
  { value: 'palatino', label: 'Palatino Serif' },
  { value: 'verdana', label: 'Verdana Sans' },
];

export const CELL_FONT_SIZE_OPTIONS = [
  { value: 0.62, label: 'Small' },
  { value: 0.72, label: 'Medium' },
  { value: 0.84, label: 'Large' },
  { value: 0.96, label: 'XL' },
  { value: 1.08, label: 'XXL' },
];

const DEFAULT_CELL_TEXT_STYLE = {
  fontPreset: 'system',
  fontSize: 0.72,
  fontWeight: '400',
  italic: false,
};

export function getCellTextStyle(cell) {
  return { ...DEFAULT_CELL_TEXT_STYLE, ...(cell?.textStyle || {}) };
}

export function openCellEditor({ state, date }) {
  const panel = document.getElementById('sidePanel');
  const title = document.getElementById('sidePanelTitle');
  const note = document.getElementById('cellNoteInput');
  const visibility = document.getElementById('cellVisibility');
  const bgColor = document.getElementById('cellBgColor');
  const textColor = document.getElementById('cellTextColor');
  state.activeDate = date;
  const cell = ensureCell(state.doc, date);
  panel.classList.remove('d-none');
  title.textContent = `Day details: ${date}`;
  note.value = cell.plainText || '';
  visibility.value = cell.visibility || 'public';
  bgColor.value = cell.backgroundColor || '#ffffff';
  textColor.value = cell.textColor || '#0f172a';
}

export function saveCellFromPanel({ state }) {
  const date = state.activeDate;
  if (!date) return;
  const cell = ensureCell(state.doc, date);
  cell.plainText = document.getElementById('cellNoteInput').value;
  cell.visibility = document.getElementById('cellVisibility').value;
  cell.textColor = document.getElementById('cellTextColor').value || null;
  cell.contentType = 'plain';
}

export function updateCellText({ state, date, value }) {
  const cell = ensureCell(state.doc, date);
  cell.plainText = value;
  cell.contentType = 'plain';
  return cell;
}

export function applyCellTextStylePatch({ state, date, patch }) {
  const cell = ensureCell(state.doc, date);
  cell.textStyle = { ...getCellTextStyle(cell), ...patch };
  return cell;
}

export function applyCellTextPresentation(node, cell) {
  if (!node) return;
  const style = getCellTextStyle(cell);
  node.style.fontFamily = CELL_FONT_PRESETS[style.fontPreset] || CELL_FONT_PRESETS.system;
  node.style.fontSize = `${Number(style.fontSize || DEFAULT_CELL_TEXT_STYLE.fontSize).toFixed(2)}rem`;
  node.style.fontWeight = style.fontWeight || DEFAULT_CELL_TEXT_STYLE.fontWeight;
  node.style.fontStyle = style.italic ? 'italic' : 'normal';
  node.style.color = cell?.textColor || '#334155';
}
