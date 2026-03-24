export function bindGridKeyboardNavigation() {
  document.addEventListener('keydown', (event) => {
    const active = document.activeElement;
    if (!active || !active.classList?.contains('day-cell')) return;
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) return;
    const cells = Array.from(document.querySelectorAll('.day-cell[data-date]')).filter((cell) => cell.tabIndex >= 0);
    const idx = cells.indexOf(active);
    if (idx < 0) return;
    event.preventDefault();
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowDown' ? 7 : -7;
    const next = cells[Math.max(0, Math.min(cells.length - 1, idx + step))];
    next?.focus();
  });
}
