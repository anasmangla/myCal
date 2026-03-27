# Interaction Improvement Suggestions (March 27, 2026)

This plan focuses on improving day-to-day usability in `myCal` by making click/hover interactions more discoverable, faster, and less error-prone.

## 1) Left-click improvements

1. **Single-click should select + show quick summary in sidepanel**
   - Current behavior already selects a date.
   - Improve by immediately surfacing a compact summary (events count, note preview, attachment count) without opening extra dialogs.

2. **Shift+Click for range selection (future multi-day actions)**
   - Enables bulk actions such as color, copy note template, add recurring label.
   - Keep this behind a feature flag if needed.

3. **Click-empty-space to create fast note/event**
   - If a day has no events, clicking the lower cell area could open a lightweight “Quick Add” input.

## 2) Right-click (context menu) improvements

1. **Unified date context menu**
   - Keep existing context support, but standardize options:
     - Add event
     - Edit note
     - Change color
     - Paste from clipboard
     - Duplicate previous week
     - Clear day

2. **Event-specific context menu expansion**
   - For event chips, add:
     - Edit occurrence only
     - Edit series
     - Duplicate event
     - Pin to top for that day
     - Mark complete / archive

3. **Safety for destructive actions**
   - Keep delete/clear options visually separated and require a confirmation toast with undo.

## 3) Double-click improvements

1. **Double-click day opens cell editor directly**
   - Already implemented; keep as default.

2. **Double-click event chip opens edit modal (not detail-only)**
   - Speeds up heavy editing workflows.

3. **Debounce ambiguity between single and double clicks**
   - Add small timing guard so single-click action does not produce flicker when user intended double-click.

## 4) Hover improvements

1. **Hover cards for event chips**
   - On hover/focus, show small preview card:
     - full title
     - time / recurrence info
     - tags/color meaning
     - next occurrence

2. **Day-cell hover affordances**
   - Show subtle inline action icons on hover (add note, add event, attach image) and hide when not hovered.

3. **Delayed tooltip strategy**
   - Use 200–300ms delay to reduce noisy tooltips.
   - Ensure same data is available by keyboard focus for accessibility.

## 5) Drag/drop and pointer behavior

1. **Stronger drop feedback**
   - Improve visual target indication with stronger border + background transition.

2. **Cross-month drag guardrails**
   - If dragging event to hidden/outside-month cells, prompt “Move to next month?” before committing.

3. **Touch support parity**
   - Add long-press to open context menu on mobile/tablets where right-click is unavailable.

## 6) Accessibility and keyboard parity

1. **Keyboard equivalents for all click actions**
   - Enter: open selected date
   - Shift+Enter: quick add event
   - ContextMenu key: open same right-click menu

2. **ARIA labels for clickable chips and buttons**
   - Include date and action in accessible names.

3. **Reduced-motion and focus visibility**
   - Ensure hover animations respect reduced-motion settings and focus rings remain obvious.

## 7) Suggested phased rollout

### Phase 1 (quick wins)
- Hover cards for event chips
- Unified context menu labels
- Single vs double-click timing guard
- Undo toast for clear/delete actions

### Phase 2 (power-user features)
- Shift+click range select
- Quick add inline composer
- Event pinning/completion state

### Phase 3 (touch and advanced UX)
- Long-press context menu
- Cross-month drag confirmation
- Bulk actions toolbar for selected ranges

## 8) Success metrics

Track these before/after implementation:

- Time-to-create-event (median)
- Time-to-edit-existing-event (median)
- Undo usage rate (for destructive operations)
- Context menu usage rate (desktop + mobile long-press)
- Error rate: accidental edits/deletes per 100 active users

## 9) Technical notes for current codebase

- Calendar interactions are centered in `app/static/js/ui/calendar-renderer.js`.
- Context menu behavior already exists for day cells and event chips; improvements can extend current hooks (`onDateContext`, `onEventContext`) rather than replacing architecture.
- Hover cards can be implemented as a lightweight UI module in `app/static/js/ui/` and reused by both day and event elements.
