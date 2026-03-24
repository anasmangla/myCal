export function flash(message, level = 'success') {
  const el = document.getElementById('flashMessage');
  if (!el) return;
  el.className = `mb-3 no-print alert alert-${level}`;
  el.textContent = message;
  el.classList.remove('d-none');
  clearTimeout(flash.timer);
  flash.timer = setTimeout(() => el.classList.add('d-none'), 3500);
}
