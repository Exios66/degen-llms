"""Tests for Las Vegas timezone formatting."""

from __future__ import annotations

from datetime import datetime, timezone

from mandalay_bay.vegas_time import (
    format_vegas_clock_label,
    format_vegas_datetime,
    format_vegas_signed_at,
    format_vegas_time,
    to_vegas,
)


def test_to_vegas_from_utc() -> None:
    dt = datetime(2026, 7, 5, 3, 30, tzinfo=timezone.utc)
    vegas = to_vegas(dt)
    assert vegas.hour == 20
    assert vegas.minute == 30
    assert vegas.day == 4


def test_format_vegas_time_uses_24_hour_clock() -> None:
    dt = datetime(2026, 7, 5, 3, 30, 45, tzinfo=timezone.utc)
    assert format_vegas_time(dt) == "20:30:45"


def test_format_vegas_datetime_none() -> None:
    assert format_vegas_datetime(None) == "never"


def test_format_vegas_signed_at() -> None:
    iso = "2026-07-05T03:30:00Z"
    assert format_vegas_signed_at(iso) == "Jul 04, 2026 20:30 PT"


def test_format_vegas_clock_label() -> None:
    label = format_vegas_clock_label()
    assert label.startswith("Las Vegas: ")
    assert label.endswith(" PT")
