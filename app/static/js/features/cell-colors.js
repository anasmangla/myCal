import { ensureCell } from '../models/cell-model.js';
import { contrastTextColor } from '../utils/colors.js';

export function setCellColor(doc, date, color) {
  const cell = ensureCell(doc, date);
  cell.backgroundColor = color || null;
  cell.textColor = color ? contrastTextColor(color) : null;
}
