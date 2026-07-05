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


def format_play_time_real(ms: int) -> str:
    if ms <= 0:
        return "00:00:00"
    total_sec = ms // 1000
    hours = total_sec // 3600
    minutes = (total_sec % 3600) // 60
    seconds = total_sec % 60
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


def format_casino_time_in_game(ms: int) -> str:
    if ms <= 0:
        return "0m in the casino"

    total_game_minutes = (ms / MS_PER_GAME_DAY) * 24 * 60
    days = int(total_game_minutes // (24 * 60))
    hours = int((total_game_minutes % (24 * 60)) // 60)
    minutes = int(total_game_minutes % 60)

    if days > 0:
        if hours > 0:
            return f"{days}d {hours}h in the casino"
        if minutes > 0:
            return f"{days}d {minutes}m in the casino"
        return f"{days}d in the casino"
    if hours > 0:
        if minutes > 0:
            return f"{hours}h {minutes}m in the casino"
        return f"{hours}h in the casino"
    return f"{minutes}m in the casino"


def format_save_slot_play_times(ms: int) -> str:
    return f"{format_play_time_real(ms)} played · {format_casino_time_in_game(ms)}"


def format_play_time_label(ms: int) -> str:
    return f"Play time: {format_play_time_real(ms)}"


def format_casino_time_label(ms: int) -> str:
    return f"Casino time: {format_casino_time_in_game(ms)}"


def format_play_time_summary(ms: int) -> str:
    return f"{format_play_time_label(ms)} · {format_casino_time_label(ms)}"
