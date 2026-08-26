"""Text-mode arcade cabinets for the Python CLI."""
from __future__ import annotations

import random
from typing import TYPE_CHECKING

from blackjack.rng import SECURE_RANDOM

if TYPE_CHECKING:
    from mandalay_bay.display import TerminalUI

BEAT_LABELS = ("KICK", "SNARE", "HAT")


def play_strip_cross(ui: TerminalUI) -> tuple[int, bool, float]:
    """Frogger-style lane dash. Returns (score, cleared, payout_mult)."""
    cols, rows = 9, 10
    player_c, player_r = cols // 2, rows - 1
    goal_r = 0
    lives = 3
    score = 0
    hazards: list[dict] = []
    lane_dirs = {
        8: 1, 7: -1, 6: 1, 4: -1, 3: 1, 2: -1,
    }
    hazard_pos: dict[int, list[int]] = {r: [random.randint(0, cols - 1) for _ in range(2)] for r in lane_dirs}

    def render() -> None:
        ui.print("")
        for r in range(rows):
            row_chars = ["·"] * cols
            if r in hazard_pos:
                for c in hazard_pos[r]:
                    if 0 <= c < cols:
                        row_chars[c] = "▓"
            if r == goal_r:
                row_chars[cols // 2] = "★"
            if r == player_r:
                row_chars[player_c] = "@"
            ui.print("  " + "".join(row_chars))
        ui.print(f"  Lives: {lives}  Score: {score}  (W/A/S/D move, Q quit)")

    def advance_hazards() -> None:
        for r, direction in lane_dirs.items():
            positions = hazard_pos[r]
            for i, c in enumerate(positions):
                positions[i] = (c + direction) % cols

    def collision() -> bool:
        if player_r not in hazard_pos:
            return False
        return player_c in hazard_pos[player_r]

    ui.print("\nStrip Cross — reach ★ at the top. Avoid ▓ traffic.")
    while lives > 0:
        render()
        move = ui.prompt("Move: ").strip().lower()
        if move in {"q", "quit"}:
            break
        dc, dr = 0, 0
        if move in {"w", "up"}:
            dr = -1
        elif move in {"s", "down"}:
            dr = 1
        elif move in {"a", "left"}:
            dc = -1
        elif move in {"d", "right"}:
            dc = 1
        else:
            ui.error("Use W/A/S/D or Q.")
            continue
        player_c = max(0, min(cols - 1, player_c + dc))
        player_r = max(0, min(rows - 1, player_r + dr))
        advance_hazards()
        if collision():
            lives -= 1
            score = max(0, score - 25)
            player_c, player_r = cols // 2, rows - 1
            ui.error("Splat! A limo clipped you.")
            continue
        score += 10
        if player_r == goal_r and player_c == cols // 2:
            score += 150
            ui.success("Neon marquee reached!")
            mult = min(3.0, 1.5 + score / 400)
            return score, True, mult
    mult = min(2.5, max(0.0, score / 300))
    return score, False, mult


def play_neon_invaders(ui: TerminalUI) -> tuple[int, bool, float]:
    """Space-invaders style grid shooter."""
    width = 11
    invaders = [(c, r) for r in range(3) for c in range(2, width - 2)]
    player_x = width // 2
    lives = 3
    score = 0

    def render() -> None:
        grid = [[" " for _ in range(width)] for _ in range(6)]
        for c, r in invaders:
            if 0 <= r < 6 and 0 <= c < width:
                grid[r][c] = "V"
        grid[5][player_x] = "^"
        ui.print("")
        for row in grid:
            ui.print("  " + "".join(row))
        ui.print(f"  Invaders: {len(invaders)}  Lives: {lives}  Score: {score}  (A/D move, F fire, Q quit)")

    ui.print("\nNeon Invaders — clear the V signs.")
    while lives > 0 and invaders:
        render()
        cmd = ui.prompt("Action: ").strip().lower()
        if cmd in {"q", "quit"}:
            break
        if cmd in {"a", "left"}:
            player_x = max(0, player_x - 1)
        elif cmd in {"d", "right"}:
            player_x = min(width - 1, player_x + 1)
        elif cmd in {"f", "fire", " "}:
            target_col = player_x
            hit = None
            for idx, (c, r) in enumerate(invaders):
                if c == target_col:
                    hit = idx
                    break
            if hit is not None:
                invaders.pop(hit)
                score += 50
                ui.success("Direct hit!")
            else:
                ui.dim("Missed.")
        else:
            ui.error("Use A/D, F, or Q.")
            continue
        # Invaders creep down occasionally
        if SECURE_RANDOM.random() < 0.35:
            invaders = [(c, r + 1) for c, r in invaders if r + 1 < 5]
            if any(c == player_x and r == 4 for c, r in invaders):
                lives -= 1
                ui.error("They landed on you!")
    cleared = not invaders and lives > 0
    if cleared:
        score += 120
        ui.success("Strip cleared!")
    mult = 2.8 if cleared else min(2.0, score / 400)
    return score, cleared, mult


def play_high_roller_breakout(ui: TerminalUI) -> tuple[int, bool, float]:
    """Turn-based breakout against card-suit bricks."""
    bricks = [(c, r) for r in range(3) for c in range(1, 10)]
    paddle = 5
    ball_c, ball_r = paddle, 4
    ball_v = (1, -1)
    lives = 3
    score = 0

    def render() -> None:
        ui.print("")
        for r in range(5):
            row = [" "] * 11
            for c, br in bricks:
                if br == r:
                    row[c] = "█"
            if r == 4:
                row[paddle] = "_"
                row[ball_c] = "●" if ball_c != paddle else "●"
            ui.print("  " + "".join(row))
        ui.print(f"  Bricks: {len(bricks)}  Lives: {lives}  Score: {score}  (A/D paddle, F launch, Q quit)")

    ui.print("\nHigh-Roller Breakout — smash the felt wall.")
    launched = False
    while lives > 0 and bricks:
        render()
        cmd = ui.prompt("Action: ").strip().lower()
        if cmd in {"q", "quit"}:
            break
        if cmd in {"a", "left"}:
            paddle = max(0, paddle - 1)
            if not launched:
                ball_c = paddle
        elif cmd in {"d", "right"}:
            paddle = min(10, paddle + 1)
            if not launched:
                ball_c = paddle
        elif cmd in {"f", "fire", " "}:
            launched = True
        else:
            ui.error("Use A/D, F, or Q.")
            continue
        if not launched:
            continue
        ball_c += ball_v[0]
        ball_r += ball_v[1]
        if ball_c <= 0 or ball_c >= 10:
            ball_v = (-ball_v[0], ball_v[1])
            ball_c = max(0, min(10, ball_c))
        if ball_r <= 0:
            ball_v = (ball_v[0], 1)
            ball_r = 1
        hit = None
        for idx, (c, r) in enumerate(bricks):
            if c == ball_c and r == ball_r:
                hit = idx
                break
        if hit is not None:
            bricks.pop(hit)
            score += 20
            ball_v = (ball_v[0], 1)
        if ball_r >= 4:
            if abs(ball_c - paddle) <= 1:
                ball_r = 3
                ball_v = (ball_v[0], -1)
            else:
                lives -= 1
                launched = False
                ball_c, ball_r = paddle, 4
                ball_v = (1, -1)
                ui.error("Ball dropped!")
    cleared = not bricks and lives > 0
    if cleared:
        score += 100
    mult = 2.5 if cleared else min(2.0, score / 350)
    return score, cleared, mult


def play_showgirl_beat(ui: TerminalUI) -> tuple[int, bool, float]:
    """Rhythm sequence matcher (Simon-style)."""
    lives = 3
    score = 0
    round_num = 1
    target_rounds = 5

    ui.print("\nShowgirl Beat — repeat the KICK / SNARE / HAT sequence.")
    while lives > 0 and round_num <= target_rounds:
        length = min(3 + round_num, 7)
        sequence = [SECURE_RANDOM.randrange(3) for _ in range(length)]
        ui.print(f"\nRound {round_num} — watch:")
        for idx in sequence:
            ui.print(f"  ♪ {BEAT_LABELS[idx]}")
        ui.print("Your turn (enter digits 1-3 separated by spaces, or q):")
        raw = ui.prompt("Sequence: ").strip().lower()
        if raw in {"q", "quit"}:
            break
        try:
            picks = [int(x) - 1 for x in raw.split()]
        except ValueError:
            ui.error("Enter numbers 1, 2, 3.")
            lives -= 1
            continue
        if picks != sequence:
            lives -= 1
            ui.error("Off beat!")
            continue
        score += 30 + round_num * 5 + length * 10
        ui.success("Clean take!")
        round_num += 1
    cleared = round_num > target_rounds and lives > 0
    if cleared:
        score += 200
        ui.success("Standing ovation!")
    mult = 2.8 if cleared else min(2.0, score / 500)
    return score, cleared, mult


PLAYERS = {
    "strip_cross": play_strip_cross,
    "neon_invaders": play_neon_invaders,
    "high_roller_breakout": play_high_roller_breakout,
    "showgirl_beat": play_showgirl_beat,
}


def run_cabinet(game_id: str, ui: TerminalUI) -> tuple[int, bool, float]:
    fn = PLAYERS.get(game_id)
    if fn is None:
        raise ValueError(f"Unknown cabinet: {game_id}")
    return fn(ui)
