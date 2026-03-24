# Code Review Recommendations (March 24, 2026)

This document summarizes practical improvements for maintainability, security, performance, and reliability across the current `myCal` codebase.

## 1) Security and production hardening (highest priority)

1. **Remove hardcoded development secret key defaults in runtime environments.**
   - `SECRET_KEY='dev-secret-key'` is currently set directly in app config.
   - Recommendation: load from environment (for example, `os.environ['SECRET_KEY']`) and fail fast when missing in non-dev mode.

2. **Add CSRF protection for POST routes/forms.**
   - The app has multiple POST endpoints for event create/update/delete/import and date-style updates.
   - Recommendation: integrate Flask-WTF CSRF protection or a lightweight CSRF token middleware.

3. **Add upload limits and strict MIME/content validation for JSON import.**
   - The import form supports JSON upload; enforce max payload size and robust parse/shape validation.

## 2) Database and data model improvements

1. **Adopt Alembic/Flask-Migrate for schema evolution.**
   - Current startup migration helper `_ensure_schema_updates()` only addresses one column and does not scale for future schema changes.
   - Recommendation: move all schema changes into versioned migrations.

2. **Add uniqueness + integrity guards where applicable.**
   - Candidate: `(event_id, day_offset)` in `EventDayLabel` should likely be unique.
   - This avoids duplicate labels for the same day offset.

3. **Add database indexes for high-frequency filters.**
   - Existing date indexes are good.
   - Consider index support for recurrence fields if recurring event counts grow significantly.

## 3) Flask/SQLAlchemy modernization

1. **Replace legacy `Model.query.get()` usage with SQLAlchemy 2 style.**
   - Recommendation: use `db.session.get(Event, event_id)` and explicit select constructs over legacy query APIs.
   - This reduces deprecation risk and eases future upgrades.

2. **Consolidate repeating return URL and form parsing logic.**
   - Several routes repeat return-month argument handling.
   - Recommendation: helper functions/decorators to standardize redirect/query parameter restoration and reduce drift.

## 4) Performance and UX

1. **Avoid full page reloads for date-style changes.**
   - Frontend currently reloads after changing/clearing date color.
   - Recommendation: update the specific cell style in-place for a faster interaction.

2. **Reduce full-table date style load if data grows.**
   - `load_date_styles()` fetches all rows globally.
   - Recommendation: fetch styles for visible month range only.

3. **Handle fetch/network failures consistently in JavaScript.**
   - `fetch('/api/event/:id')` path should include non-200 checks and user feedback.

## 5) Code quality and maintainability

1. **Create a shared domain layer for duplicated calendar logic.**
   - `app/static/js/static-app.js` and backend calendar logic implement similar concepts separately.
   - Recommendation: document intentional divergence, or generate static-mode structures from a common spec to avoid behavior drift.

2. **Add automated tests and CI baseline.**
   - Add unit tests for `event_utils.py` validators/parsers and recurrence expansion edge cases.
   - Add route tests for save/delete/move/import/export flows.

3. **Improve type strictness and static checks.**
   - Add mypy/pyright configuration and run in CI for Python; keep ESLint/Prettier for JS.

## 6) Portability and compatibility

1. **Use platform-safe date formatting for week labels.**
   - `strftime('%b %-d')` can break on Windows.
   - Recommendation: use explicit formatting logic that does not rely on `%-d`.

2. **Document timezone assumptions clearly.**
   - JavaScript uses UTC in several helpers while backend uses date-only fields.
   - Recommendation: add explicit policy in README (all-day/local vs UTC behavior).

## Suggested implementation order

1. Security hardening (`SECRET_KEY`, CSRF, upload limits).
2. Migration setup with Alembic and model constraints.
3. SQLAlchemy modernization (`db.session.get`, explicit selects).
4. UX optimization (remove forced reloads on style updates).
5. Test suite + CI pipeline.
