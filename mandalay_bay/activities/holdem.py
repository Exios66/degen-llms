from __future__ import annotations

from mandalay_bay.activities.base import Activity, ActivityInfo
from mandalay_bay.session import PlayerSession
from poker.hand_eval import HAND_CLASS_NAMES
from poker.holdem import BettingAction, HoldemTable, human_net_change


class HoldemActivity(Activity):
    info = ActivityInfo(
        id="holdem",
        name="Texas Hold'em",
        floor="Table Games",
        description="No-limit-style Hold'em vs AI opponents — full streets through showdown.",
        min_bet=10,
    )

    def run(self, session: PlayerSession, ui) -> None:
        session.record_visit(self.info.id)
        ui.banner(f"{self.info.floor} — {self.info.name}")
        ui.chip_line(session.wallet.balance)

        if not self.can_enter(session):
            ui.error(f"Minimum buy-in is {self.info.min_bet} chips.")
            ui.pause()
            return

        buy_in = ui.prompt_int(
            f"Buy-in amount ({self.info.min_bet}-{session.wallet.balance}, 0 to leave)",
            0,
            session.wallet.balance,
            default=min(200, session.wallet.balance),
        )
        if buy_in == 0 or buy_in < self.info.min_bet:
            return
        if not session.wallet.debit(buy_in, self.info.id, f"Hold'em buy-in ${buy_in}"):
            ui.error("Insufficient chips.")
            ui.pause()
            return

        table = HoldemTable.quick_table(buy_in)
        hands = 0
        session_net = 0

        ui.print("\nHand rankings follow the UCI/Kaggle poker-hands dataset (CLASS 0–9):")
        for i, name in enumerate(HAND_CLASS_NAMES):
            ui.dim(f"  {i}: {name}")

        while table.human.stack >= table.big_blind:
            ui.print(f"\n--- Hand {hands + 1} ({table.street.value}) ---")
            table.start_hand()
            if table.hand_over:
                ui.print(table.last_message)
                break

            while not table.hand_over:
                player = table.players[table.action_index]
                if player.folded or player.all_in:
                    table.action_index = (table.action_index + 1) % len(table.players)
                    table._seek_actor()
                    continue

                ui.chip_line(session.wallet.balance)
                ui.print(f"Pot: {table.pot:,} | Current bet: {table.current_bet:,}")
                if table.community:
                    ui.print(f"Board: {' '.join(c.label(session.use_unicode) for c in table.community)}")
                ui.print(f"Your cards: {' '.join(c.label(session.use_unicode) for c in table.human.hole)}")

                if player.is_human:
                    legal = table.legal_actions(player)
                    labels = []
                    mapping: dict[int, BettingAction] = {}
                    idx = 1
                    for act in (BettingAction.CHECK, BettingAction.CALL, BettingAction.RAISE, BettingAction.FOLD):
                        if act in legal:
                            labels.append(f"({act.value[0]}) {act.value.title()}")
                            mapping[idx] = act
                            idx += 1
                    choice = ui.menu_choice(labels, title="Your action:")
                    if choice == 0:
                        table.human.stack += table.human.total_in_hand
                        session_net = human_net_change(table, buy_in)
                        session.wallet.credit(table.human.stack, self.info.id, "Cash out from Hold'em table")
                        session.record_result(self.info.id, session_net, bets=hands)
                        ui.print(f"Left table. Session net: {'+' if session_net >= 0 else ''}{session_net:,}")
                        ui.pause()
                        return
                    table.apply_action(player, mapping[choice])
                    ui.print(table.last_message)
                else:
                    action = table.bot_action(player)
                    table.apply_action(player, action)
                    ui.dim(f"{table.last_message}")

            hands += 1
            if table.showdown_scores:
                for name, score in table.showdown_scores:
                    ui.print(f"  {name}: {score.name}")

        cash = table.human.stack
        session.wallet.credit(cash, self.info.id, "Cash out from Hold'em table")
        session_net = cash - buy_in
        session.record_result(self.info.id, session_net, bets=hands)
        ui.print(f"\nHold'em session: {'+' if session_net >= 0 else ''}{session_net:,} over {hands} hand(s)")
        ui.pause()
