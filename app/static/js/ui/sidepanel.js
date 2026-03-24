export function bindSidePanel({ onSaveCell, onAddImage }) {
  document.getElementById('saveCellNoteBtn').addEventListener('click', onSaveCell);
  document.getElementById('cellImageInput').addEventListener('change', (event) => onAddImage(event.target.files));
}
