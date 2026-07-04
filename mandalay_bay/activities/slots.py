from __future__ import annotations

from dataclasses import dataclass

from blackjack.rng import SECURE_RANDOM
from mandalay_bay.activities.base import Activity, ActivityInfo
from mandalay_bay.session import PlayerSession


@dataclass(frozen=True, slots=True)
class Symbol:
    name: str
    display: str
    weight: int


SYMBOLS = [
    Symbol("seven", "7", 1),
    Symbol("bar", "BAR", 3),
    Symbol("bell", "🔔", 4),
    Symbol("cherry", "🍒", 6),
    Symbol("lemon", "🍋", 8),
    Symbol("diamond", "💎", 2),
]

PAYTABLE: dict[str, int] = {
    "seven|seven|seven": 100,
    "diamond|diamond|diamond": 50,
    "bell|bell|bell": 25,
    "bar|bar|bar": 15,
    "cherry|cherry|cherry": 10,
    "cherry|cherry": 2,
    "cherry": 1,
}


def _weighted_pick(symbols: list[Symbol]) -> Symbol:
    pool = [s for s in symbols for _ in range(s.weight)]
    return pool[SECURE_RANDOM.randrange(0, len(pool))]


def _spin_reels(use_unicode: bool) -> list[Symbol]:
    return [_weighted_pick(SYMBOLS) for _ in range(3)]


def _display_symbol(sym: Symbol, use_unicode: bool) -> str:
    if not use_unicode and sym.name in {"bell", "cherry", "lemon", "diamond"}:
        return sym.name[:3].upper()
    return sym.display


def _payout(reels: list[Symbol], bet: int) -> tuple[int, str]:
    keys = [r.name for r in reels]
    line = "|".join(keys)
    if line in PAYTABLE:
        mult = PAYTABLE[line]
        return bet * mult, f"Three {reels[0].display}! {mult}x"
    if keys[0] == keys[1] == "cherry":
        return bet * PAYTABLE["cherry|cherry"], "Two cherries! 2x"
    if keys[0] == "cherry":
        return bet * PAYTABLE["cherry"], "Cherry on line! 1x (bet returned)"
    return 0, "No win"


class SlotsActivity(Activity):
    info = ActivityInfo(
        id="slots",
        name="Mandalay Fortune Slots",
        floor="Slot Machines",
        description="Three-reel slots with weighted symbols and classic paylines.",
        min_bet=5,
    )

    MACHINES = [
        ("fortune", "Mandalay Fortune (5-50 chips)"),
        ("high_roller", "High Roller (25-500 chips)"),
    ]

    def run(self, session: PlayerSession, ui) -> None:
        session.record_visit(self.info.id)
        ui.banner(f"{self.info.floor} — {self.info.name}")
        ui.chip_line(session.wallet.balance)

        if not self.can_enter(session):
            ui.error(f"Minimum spin is {self.info.min_bet} chips.")
            ui.pause()
            return

        machine = ui.menu_choice([m[1] for m in self.MACHINES], title="Pick a machine:")
        if machine == 0:
            return

        if machine == 1:
            min_bet, max_bet = 5, min(50, session.wallet.balance)
        else:
            min_bet, max_bet = 25, min(500, session.wallet.balance)

        if max_bet < min_bet:
            ui.error(f"This machine requires at least {min_bet} chips per spin.")
            ui.pause()
            return

        ui.print(f"\nPaytable: 7-7-7 = 100x | 💎💎💎 = 50x | 🔔🔔🔔 = 25x | BAR x3 = 15x")
        ui.print("Two cherries = 2x | One cherry = bet returned\n")

        session_net = 0
        spins = 0
        while True:
            ui.chip_line(session.wallet.balance)
            bet = ui.prompt_int(
                f"Spin amount ({min_bet}-{max_bet}, 0 to leave)",
                0,
                max_bet,
                default=min_bet,
            )
            if bet == 0:
                break
            if bet < min_bet:
                ui.error(f"Minimum spin is {min_bet}.")
                continue
            if not session.wallet.debit(bet, self.info.id, f"Slot spin ${bet}"):
                ui.error("Insufficient chips.")
                continue

            reels = _spin_reels(session.use_unicode)
            shown = " | ".join(_display_symbol(r, session.use_unicode) for r in reels)
            ui.print(f"\n  [ {shown} ]")

            win, reason = _payout(reels, bet)
            spins += 1
            if win > 0:
                session.wallet.credit(win, self.info.id, reason)
                session_net += win - bet
                ui.success(f"{reason} — Won {win:,} chips!")
            else:
                session_net -= bet
                ui.dim("No win this spin.")

            if not ui.prompt_yes_no("Spin again?", default=True):
                break

        session.record_result(self.info.id, session_net, bets=spins)
        ui.print(f"\nSlots session: {'+' if session_net >= 0 else ''}{session_net:,} chips over {spins} spin(s)")
        ui.pause()
