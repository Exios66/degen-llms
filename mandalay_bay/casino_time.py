"""Track active casino play time, expressed in resort in-game units."""

from __future__ import annotations

import time

from mandalay_bay.session import PlayerSession
from mandalay_bay.world_cycle import MS_PER_GAME_DAY


def start_casino_clock(session: PlayerSession) -> None:
    if session.slot_id is not None:
        session._casino_clock_start = time.time() * 1000


def stop_casino_clock(session: PlayerSession) -> None:
    session._casino_clock_start = None


def get_casino_time_ms(session: PlayerSession) -> int:
    stored = getattr(session, "casino_time_ms", 0)
    start = getattr(session, "_casino_clock_start", None)
    if session.slot_id is None or start is None:
        return stored
    return stored + max(0, int(time.time() * 1000 - start))


def flush_casino_time(session: PlayerSession) -> None:
    if session.slot_id is None:
        return
    start = getattr(session, "_casino_clock_start", None)
    if start is None:
        return
    session.casino_time_ms = get_casino_time_ms(session)
    session._casino_clock_start = time.time() * 1000


def format_casino_time_in_game(ms: int) -> str:
    if ms <= 0:
        return "0m in resort"

    total_game_minutes = (ms / MS_PER_GAME_DAY) * 24 * 60
    days = int(total_game_minutes // (24 * 60))
    hours = int((total_game_minutes % (24 * 60)) // 60)
    minutes = int(total_game_minutes % 60)

    if days > 0:
        if hours > 0:
            return f"{days}d {hours}h in resort"
        if minutes > 0:
            return f"{days}d {minutes}m in resort"
        return f"{days}d in resort"
    if hours > 0:
        if minutes > 0:
            return f"{hours}h {minutes}m in resort"
        return f"{hours}h in resort"
    return f"{minutes}m in resort"


def format_casino_time_label(ms: int) -> str:
    return f"Time in casino: {format_casino_time_in_game(ms)}"
