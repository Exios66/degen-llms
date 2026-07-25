"""Las Vegas local time — Pacific Time (America/Los_Angeles), two hours behind Central."""

from __future__ import annotations

from datetime import datetime, timezone
from zoneinfo import ZoneInfo

VEGAS_TZ = ZoneInfo("America/Los_Angeles")


def to_vegas(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(VEGAS_TZ)


def format_vegas_datetime(dt: datetime | None) -> str:
    if dt is None:
        return "never"
    return to_vegas(dt).strftime("%Y-%m-%d %H:%M PT")


def format_vegas_time(dt: datetime) -> str:
    return to_vegas(dt).strftime("%H:%M:%S")


def format_vegas_now() -> str:
    return format_vegas_time(datetime.now(timezone.utc))


def format_vegas_clock_label() -> str:
    return f"Las Vegas: {format_vegas_now()} PT"


def format_vegas_signed_at(iso: str) -> str:
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return to_vegas(dt).strftime("%b %d, %Y %H:%M PT")
