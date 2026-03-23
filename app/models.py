from __future__ import annotations

from datetime import date, time

from . import db


class Event(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    start_date = db.Column(db.Date, nullable=False, index=True)
    end_date = db.Column(db.Date, nullable=False, index=True)
    start_time = db.Column(db.Time, nullable=True)
    end_time = db.Column(db.Time, nullable=True)
    all_day = db.Column(db.Boolean, nullable=False, default=False)
    location = db.Column(db.String(200), nullable=True)
    audience = db.Column(db.String(50), nullable=False, default='Unspecified')
    notes = db.Column(db.Text, nullable=True)
    recurrence_type = db.Column(db.String(20), nullable=False, default='none')
    recurrence_weekdays = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        server_default=db.func.now(),
        onupdate=db.func.now(),
    )

    day_labels = db.relationship(
        'EventDayLabel',
        back_populates='event',
        cascade='all, delete-orphan',
        lazy='joined',
    )


class EventDayLabel(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'), nullable=False, index=True)
    day_offset = db.Column(db.Integer, nullable=False)
    label = db.Column(db.String(200), nullable=False)

    event = db.relationship('Event', back_populates='day_labels')


class DateStyle(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    day = db.Column(db.Date, nullable=False, unique=True, index=True)
    background_color = db.Column(db.String(32), nullable=False)
