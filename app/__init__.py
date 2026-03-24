from __future__ import annotations

from pathlib import Path

from flask import Flask
from sqlalchemy import text
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()


def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(__name__, instance_relative_config=True)
    instance_path = Path(app.instance_path)
    instance_path.mkdir(parents=True, exist_ok=True)

    app.config.from_mapping(
        SECRET_KEY='dev-secret-key',
        SQLALCHEMY_DATABASE_URI=f"sqlite:///{instance_path / 'calendar.db'}",
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
    )

    if test_config:
        app.config.update(test_config)

    db.init_app(app)

    from . import models  # noqa: F401
    from .routes import bp

    app.register_blueprint(bp)

    with app.app_context():
        db.create_all()
        _ensure_schema_updates()

    return app


def _ensure_schema_updates() -> None:
    event_columns = {
        row[1]
        for row in db.session.execute(text('PRAGMA table_info(event)')).all()
    }
    if 'color' not in event_columns:
        db.session.execute(text('ALTER TABLE event ADD COLUMN color VARCHAR(7)'))
        db.session.commit()
