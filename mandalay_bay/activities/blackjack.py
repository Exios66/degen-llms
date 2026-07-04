from __future__ import annotations

from dataclasses import replace

from blackjack.config import GameConfig, make_bot_names
from mandalay_bay.activities.base import Activity, ActivityInfo
from mandalay_bay.dealers import announce_dealer, pick_quip
from mandalay_bay.session import PlayerSession


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
        dealer = announce_dealer(session, ui, self.info.id)

        if not self.can_enter(session):
            ui.error(f"You need at least {self.info.min_bet} chips to sit down.")
            ui.dim("Visit the Cashier to buy more chips.")
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
                max_bet=min(100, max(self.info.min_bet, session.wallet.balance)),
                use_color=session.use_color,
                use_unicode=session.use_unicode,
            )
        else:
            config = self._custom_wizard(session, ui)

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

    def _custom_wizard(self, session: PlayerSession, ui) -> GameConfig:
        ui.print("\n--- Table Setup ---")
        mode = ui.menu_choice(["Solo vs dealer", "Full table with AI players"], title="Table mode:")
        if mode == 0:
            mode = 1
        bankroll = session.wallet.balance
        min_bet = ui.prompt_int("Minimum bet", 1, bankroll, default=min(10, bankroll))
        max_bet = ui.prompt_int("Maximum bet", min_bet, bankroll, default=min(100, bankroll))
        num_decks = ui.prompt_int("Decks in shoe (1-8)", 1, 8, default=6)
        if mode == 2:
            num_bots = ui.prompt_int("Simulated players (1-6)", 1, 6, default=2)
            total = num_bots + 1
            human_seat = ui.prompt_int(f"Your seat (1-{total})", 1, total, default=min(2, total))
            bot_names = make_bot_names(num_bots)
        else:
            num_bots = 0
            human_seat = 1
            bot_names = []
        dealer = ui.menu_choice(["Dealer hits soft 17 (H17)", "Dealer stands on soft 17 (S17)"], title="Dealer rule:")
        if dealer == 0:
            dealer = 1
        return GameConfig(
            starting_bankroll=bankroll,
            min_bet=min_bet,
            max_bet=max_bet,
            num_decks=num_decks,
            dealer_hits_soft_17=dealer == 1,
            num_bots=num_bots,
            human_seat=human_seat,
            bot_names=bot_names,
        )
