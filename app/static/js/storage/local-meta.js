import { ACTIVE_MONTH_KEY, META_KEY } from '../core/constants.js';

export function saveActiveMonth(month) {
  localStorage.setItem(ACTIVE_MONTH_KEY, month);
}

export function getActiveMonth() {
  return localStorage.getItem(ACTIVE_MONTH_KEY);
}

export function getMeta() {
  try { return JSON.parse(localStorage.getItem(META_KEY) || '{}'); } catch { return {}; }
}

export function saveMeta(meta) {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}
