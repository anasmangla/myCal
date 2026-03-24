export function printCalendar() {
  window.print();
}

export async function exportCalendarImage() {
  const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm');
  const calendarNode = document.getElementById('calendarSheet');
  const canvas = await html2canvas(calendarNode, { backgroundColor: '#ffffff', scale: 2, useCORS: true, logging: false });
  const link = document.createElement('a');
  link.download = `calendar-export.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
