from __future__ import annotations

from dataclasses import dataclass

from blackjack.rng import SECURE_RANDOM
from mandalay_bay.activities.base import Activity, ActivityInfo
from mandalay_bay.session import PlayerSession

RED_NUMBERS = {
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
}


@dataclass(frozen=True, slots=True)
class RouletteBet:
    kind: str
    label: str
    payout: int
    numbers: frozenset[int]


BET_TYPES: list[RouletteBet] = [
    RouletteBet("straight", "Single number (35:1)", 35, frozenset()),
    RouletteBet("red", "Red (1:1)", 1, frozenset(RED_NUMBERS)),
    RouletteBet("black", "Black (1:1)", 1, frozenset(n for n in range(1, 37) if n not in RED_NUMBERS)),
    RouletteBet("odd", "Odd (1:1)", 1, frozenset(n for n in range(1, 37) if n % 2 == 1)),
    RouletteBet("even", "Even (1:1)", 1, frozenset(n for n in range(1, 37) if n % 2 == 0)),
    RouletteBet("low", "1–18 (1:1)", 1, frozenset(range(1, 19))),
    RouletteBet("high", "19–36 (1:1)", 1, frozenset(range(19, 37))),
    RouletteBet("dozen1", "1st dozen 1–12 (2:1)", 2, frozenset(range(1, 13))),
    RouletteBet("dozen2", "2nd dozen 13–24 (2:1)", 2, frozenset(range(13, 25))),
    RouletteBet("dozen3", "3rd dozen 25–36 (2:1)", 2, frozenset(range(25, 37))),
]


def spin_wheel() -> int:
    """European roulette — 0 plus 1–36."""
    return SECURE_RANDOM.randrange(0, 37)


def resolve_bet(bet: RouletteBet, amount: int, number: int, straight_pick: int | None = None) -> tuple[int, str]:
    if bet.kind == "straight":
        if straight_pick is None:
            return 0, "No number selected"
        if number == straight_pick:
            win = amount * bet.payout + amount
            return win, f"Hit {number}! {bet.payout}:1"
        return 0, f"Ball landed on {number}, you picked {straight_pick}"
    if number == 0:
        return 0, "Ball landed on 0 (green) — outside bets lose"
    if number in bet.numbers:
        win = amount * bet.payout + amount
        return win, f"Winner! {bet.label.split('(')[0].strip()} — {bet.payout}:1"
    return 0, f"Ball on {number} — no win"


class RouletteActivity(Activity):
    info = ActivityInfo(
        id="roulette",
        name="Mandalay Roulette",
        floor="Table Games",
        description="European single-zero wheel — straights, colors, dozens, and even-money bets.",
        min_bet=5,
    )

    def run(self, session: PlayerSession, ui) -> None:
        session.record_visit(self.info.id)
        ui.banner(f"{self.info.floor} — {self.info.name}")
        ui.chip_line(session.wallet.balance)

        if not self.can_enter(session):
            ui.error(f"Minimum bet is {self.info.min_bet} chips.")
            ui.pause()
            return

        ui.print("European wheel (0–36). 0 is green; red/black and dozens exclude zero.")
        session_net = 0
        spins = 0

        while True:
            ui.chip_line(session.wallet.balance)
            labels = [b.label for b in BET_TYPES]
            choice = ui.menu_choice(labels, title="Place a bet (or back):")
            if choice == 0:
                break
            bet_type = BET_TYPES[choice - 1]
            max_bet = session.wallet.balance
            amount = ui.prompt_int(
                f"Wager ({self.info.min_bet}-{max_bet}, 0 to cancel)",
                0,
                max_bet,
                default=self.info.min_bet,
            )
            if amount == 0 or amount < self.info.min_bet:
                continue
            straight_pick = None
            if bet_type.kind == "straight":
                straight_pick = ui.prompt_int("Pick a number (0–36)", 0, 36, default=7)
            if not session.wallet.debit(amount, self.info.id, f"Roulette {bet_type.kind}"):
                ui.error("Insufficient chips.")
                continue

            number = spin_wheel()
            win, reason = resolve_bet(bet_type, amount, number, straight_pick)
            spins += 1
            color = "green" if number == 0 else ("red" if number in RED_NUMBERS else "black")
            ui.print(f"\n  🎡 The ball lands on {number} ({color})")
            if win > 0:
                session.wallet.credit(win, self.info.id, reason)
                session_net += win - amount
                ui.success(f"{reason} — Won {win:,} chips!")
            else:
                session_net -= amount
                ui.dim(reason)

            if not ui.prompt_yes_no("Spin again?", default=True):
                break

        session.record_result(self.info.id, session_net, bets=spins)
        ui.print(f"\nRoulette session: {'+' if session_net >= 0 else ''}{session_net:,} over {spins} spin(s)")
        ui.pause()
