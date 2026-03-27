import { ensureCell } from '../models/cell-model.js';
import { contrastTextColor } from '../utils/colors.js';

export function setCellColor(doc, date, color, textColor = null) {
  const cell = ensureCell(doc, date);
  cell.backgroundColor = color || null;
  cell.textColor = color ? (textColor || cell.textColor || contrastTextColor(color)) : null;
}
