export const appState = {
  view: { year: 0, month: 0 },
  doc: null,
  activeDate: null,
  selectedCell: null,
  undoStack: [],
  redoStack: [],
  lastSavedAt: null,
};

export function pushUndo(snapshot) {
  appState.undoStack.push(structuredClone(snapshot));
  if (appState.undoStack.length > 20) appState.undoStack.shift();
  appState.redoStack = [];
}
