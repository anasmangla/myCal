export function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function parseIsoDate(value) {
  return new Date(`${value}T00:00:00Z`);
}

export function monthIso(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function firstVisibleMonth(today = new Date()) {
  const month = today.getUTCMonth();
  const year = today.getUTCFullYear();
  return month === 11 ? { year: year + 1, month: 1 } : { year, month: month + 2 };
}

export function buildMonthGrid(year, month) {
  const monthIndex = month - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const first = new Date(start);
  first.setUTCDate(first.getUTCDate() - first.getUTCDay());
  const grid = [];
  for (let week = 0; week < 6; week += 1) {
    const days = [];
    for (let day = 0; day < 7; day += 1) {
      const current = new Date(first);
      current.setUTCDate(first.getUTCDate() + (week * 7) + day);
      days.push(current);
    }
    grid.push(days);
  }
  while (grid.length > 0 && grid[grid.length - 1].every((d) => d.getUTCMonth() !== monthIndex)) grid.pop();
  return grid;
}
