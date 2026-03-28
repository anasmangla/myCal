# Code Review Recommendations (March 28, 2026)

This review focuses on practical improvements for reliability, security, and maintainability across the Flask backend and the modular static frontend.

## 1) Security and production hardening (highest priority)

1. **Stop shipping with a default secret key in runtime config.**
   - `app.config.from_mapping(...)` still sets `SECRET_KEY='dev-secret-key'` directly.
   - Recommendation: read from environment by default, and fail fast for non-development deployments when missing.

2. **Add CSRF protection to all form-based POST routes.**
   - Event save/delete/duplicate/move, import, and date-style updates are all state-changing POST operations.
   - Recommendation: add Flask-WTF CSRF middleware (or equivalent token validation) and include tokens in forms/fetch requests.

3. **Enforce upload size limits for import.**
   - JSON import currently reads uploaded files in-memory.
   - Recommendation: add `MAX_CONTENT_LENGTH` and return clear user feedback when limits are exceeded.

## 2) Data integrity and schema hygiene

1. **Move schema evolution from ad-hoc startup SQL to migrations.**
   - `_ensure_schema_updates()` currently performs one-off `ALTER TABLE` checks at app startup.
   - Recommendation: adopt Alembic/Flask-Migrate and version all schema changes.

2. **Guard day-label uniqueness by `(event_id, day_offset)`.**
   - Duplicate day labels for the same offset are possible unless constrained.
   - Recommendation: add a unique constraint at the database/model level.

3. **Validate recurrence data more defensively during import.**
   - Weekly recurrence should require weekdays and non-weekly recurrences should normalize weekday data.
   - Recommendation: enforce invariant rules in import validators for consistency.

## 3) Flask/SQLAlchemy modernization

1. **Replace legacy query APIs with SQLAlchemy 2-style session access.**
   - Several handlers use `Event.query.get(...)` / `get_or_404(...)` patterns.
   - Recommendation: move to `db.session.get(...)` and explicit `select(...)` statements for forward compatibility.

2. **Separate route handlers from mutation/business logic.**
   - Route functions combine parsing, validation, persistence, and branching logic.
   - Recommendation: extract service functions for save/move/delete/import paths to improve testability.

## 4) Frontend robustness and UX

1. **Standardize async error handling for API calls.**
   - API calls should consistently handle non-200 responses, parse failures, and offline conditions.
   - Recommendation: centralize fetch wrappers and toast/error rendering behavior.

2. **Prefer targeted UI updates over full refresh flows.**
   - Some interactions can be updated in-place to avoid page reload penalties.
   - Recommendation: update specific calendar cells/sidepanel state after successful mutations where feasible.

## 5) Testing and release confidence

1. **Add backend tests for parser and recurrence edge cases.**
   - Priority targets: `parse_event_form`, import validation, recurring deletion splits, and move semantics.

2. **Add route-level tests for critical workflows.**
   - Save, delete (single vs all), move (occurrence vs whole series), import/export, and date-style endpoints.

3. **Add CI baseline checks.**
   - Recommendation: run Python lint + unit tests and a lightweight JavaScript lint/build check on every PR.

## Suggested implementation order

1. Secret key + CSRF + upload limit hardening.
2. Migration framework + integrity constraints.
3. Route/service refactor and SQLAlchemy 2-style query updates.
4. Test coverage for recurrence/import flows.
5. Frontend interaction polish and async error consistency.
