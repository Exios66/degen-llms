from __future__ import annotations

from dataclasses import replace

from blackjack.cards import Shoe
from blackjack.config import GameConfig, make_bot_names
from blackjack.display import Display
from blackjack.table import Table
from mandalay_bay.activities.base import Activity, ActivityInfo
from mandalay_bay.session import PlayerSession


def _prompt_int(prompt: str, low: int, high: int, default: int) -> int:
    while True:
        raw = input(f"{prompt} [{default}]: ").strip()
        if not raw:
            return default
        try:
            value = int(raw)
        except ValueError:
            print("Enter a number.")
            continue
        if low <= value <= high:
            return value
        print(f"Enter a value between {low} and {high}.")


class BlackjackActivity(Activity):
    info = ActivityInfo(
        id="blackjack",
        name="Blackjack",
        floor="Table Games",
        description="Classic 21 with solo or full-table play. 3:2 blackjack, split, double, insurance.",
        min_bet=10,
    )

    def run(self, session: PlayerSession, ui) -> None:
        from blackjack.runner import run_casino_blackjack

        session.record_visit(self.info.id)
        ui.banner(f"{self.info.floor} — {self.info.name}")
        ui.chip_line(session.wallet.balance)

        if not self.can_enter(session):
            ui.error(f"You need at least {self.info.min_bet} chips to sit down.")
            ui.pause()
            return

        mode = ui.menu_choice(
            ["Quick hand (solo, table minimums)", "Custom table setup"],
            title="Choose your table:",
        )
        if mode == 0:
            return

        if mode == 1:
            config = GameConfig(
                starting_bankroll=session.wallet.balance,
                min_bet=self.info.min_bet,
                max_bet=min(100, session.wallet.balance),
                use_color=session.use_color,
                use_unicode=session.use_unicode,
            )
        else:
            config = self._custom_wizard(session)

        config = replace(
            config,
            starting_bankroll=session.wallet.balance,
            use_color=session.use_color,
            use_unicode=session.use_unicode,
        )

        net = run_casino_blackjack(config, session.wallet, activity_id=self.info.id)
        session.record_result(self.info.id, net)
        ui.success(f"Leaving table. Session net: {'+' if net >= 0 else ''}{net:,} chips")
        ui.chip_line(session.wallet.balance)
        ui.pause()

    def _custom_wizard(self, session: PlayerSession) -> GameConfig:
        print("\n--- Table Setup ---")
        mode = input("Mode: (1) solo  (2) table with bots [1]: ").strip() or "1"
        bankroll = session.wallet.balance
        min_bet = _prompt_int("Minimum bet", 1, bankroll, 10)
        max_bet = _prompt_int("Maximum bet", min_bet, bankroll, min(100, bankroll))
        num_decks = _prompt_int("Decks in shoe (1-8)", 1, 8, 6)
        if mode == "2":
            num_bots = _prompt_int("Simulated players (1-6)", 1, 6, 2)
            total = num_bots + 1
            human_seat = _prompt_int(f"Your seat (1-{total})", 1, total, min(2, total))
            bot_names = make_bot_names(num_bots)
        else:
            num_bots = 0
            human_seat = 1
            bot_names = []
        dealer = input("Dealer: (1) H17  (2) S17 [1]: ").strip() or "1"
        return GameConfig(
            starting_bankroll=bankroll,
            min_bet=min_bet,
            max_bet=max_bet,
            num_decks=num_decks,
            dealer_hits_soft_17=dealer != "2",
            num_bots=num_bots,
            human_seat=human_seat,
            bot_names=bot_names,
        )
