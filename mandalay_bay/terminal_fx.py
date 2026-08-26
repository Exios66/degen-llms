"""Lightweight terminal display pacing for gambling activities."""
from __future__ import annotations

import sys
import time
from typing import TYPE_CHECKING, Iterable

if TYPE_CHECKING:
    from mandalay_bay.display import TerminalUI


def _supports_tty() -> bool:
    return sys.stdout.isatty()


def spin_pause(seconds: float = 0.35) -> None:
    if seconds <= 0 or not _supports_tty():
        return
    time.sleep(seconds)


def animate_reel_tease(
    ui: TerminalUI,
    symbols: Iterable[str],
    final_line: str,
    *,
    steps: int = 4,
    step_delay: float = 0.12,
) -> None:
    """Brief reel blur before revealing the final spin line."""
    if not _supports_tty() or steps <= 0:
        ui.print(f"\n  [ {final_line} ]")
        return
    pool = list(symbols)
    if not pool:
        ui.print(f"\n  [ {final_line} ]")
        return
    import random

    for i in range(steps):
        fake = " | ".join(random.choice(pool) for _ in range(3))
        ui.print(f"\r  [ {fake} ]", end="")
        sys.stdout.flush()
        time.sleep(step_delay * (0.85 + 0.15 * (i + 1) / steps))
    ui.print(f"\r  [ {final_line} ]")


def animate_countdown(ui: TerminalUI, label: str, *, ticks: int = 3, delay: float = 0.25) -> None:
    if not _supports_tty():
        return
    for n in range(ticks, 0, -1):
        ui.print(f"\r  {label} {n}...", end="")
        sys.stdout.flush()
        time.sleep(delay)
    ui.print(f"\r  {label}     ")


def animate_dice_roll(ui: TerminalUI, final_label: str, *, steps: int = 3) -> None:
    faces = ("⚀", "⚁", "⚂", "⚃", "⚄", "⚅")
    if not _supports_tty():
        ui.print(f"\n  🎲 {final_label}")
        return
    import random

    for _ in range(steps):
        face = random.choice(faces)
        ui.print(f"\r  🎲 {face} ", end="")
        sys.stdout.flush()
        time.sleep(0.1)
    ui.print(f"\r  🎲 {final_label}")
