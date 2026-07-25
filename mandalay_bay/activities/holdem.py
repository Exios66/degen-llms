from __future__ import annotations

from mandalay_bay.activities.base import Activity, ActivityInfo
from mandalay_bay.dealers import announce_dealer, pick_quip
from mandalay_bay.session import PlayerSession
from mandalay_bay.stakes import effective_table_stakes, pick_stake_tier
from poker.hand_eval import HAND_CLASS_NAMES
from poker.holdem import BettingAction, STREET_ORDER, HoldemTable, human_net_change


class HoldemActivity(Activity):
    info = ActivityInfo(
        id="holdem",
        name="Texas Hold'em",
        floor="Table Games",
        description="No-limit Hold'em vs 4 AI opponents — full streets through showdown.",
        min_bet=10,
    )

    def run(self, session: PlayerSession, ui) -> None:
        session.record_visit(self.info.id)
        ui.banner(f"{self.info.floor} — {self.info.name}")
        ui.chip_line(session.wallet.balance)
        dealer = announce_dealer(session, ui, self.info.id)

        if not self.can_enter(session):
            ui.error(f"Minimum buy-in is {self.info.min_bet} chips.")
            ui.pause()
            return

        tier = pick_stake_tier(session, ui, title="Choose stake tier:")
        if tier is None:
            return
        ui.dim(tier.description)
        buy_in_min, buy_in_max = effective_table_stakes(
            tier, session.wallet.balance, activity_min=self.info.min_bet
        )

        buy_in = ui.prompt_int(
            f"Buy-in amount ({buy_in_min}-{buy_in_max}, 0 to leave)",
            0,
            buy_in_max,
            default=min(200, buy_in_max),
        )
        if buy_in == 0 or buy_in < buy_in_min:
            return
        if not session.wallet.debit(buy_in, self.info.id, f"Hold'em buy-in ${buy_in}"):
            ui.error("Insufficient chips.")
            ui.pause()
            return

        table = HoldemTable.quick_table(buy_in, num_bots=4)
        hands = 0

        ui.print("\nNo-limit Hold'em · 5-handed (you + 4 bots).")
        ui.print("Streets: " + " → ".join(s.value for s in STREET_ORDER[:-1]) + " → showdown")
        ui.print("Buy-in stays on the table across hands and moves with wins/losses.")
        ui.print("\nHand rankings follow the UCI/Kaggle poker-hands dataset (CLASS 0–9):")
        for i, name in enumerate(HAND_CLASS_NAMES):
            ui.dim(f"  {i}: {name}")

        while table.human.stack >= table.big_blind:
            ui.print(f"\n--- Hand {hands + 1} ---")
            ui.print(
                f"Your stack: {table.human.stack:,} | Buy-in: {buy_in:,} | "
                f"Session: {human_net_change(table, buy_in):+,}"
            )
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

                street_flow = " → ".join(
                    (f"[{s.value}]" if s == table.street else s.value) for s in STREET_ORDER
                )
                ui.chip_line(session.wallet.balance)
                ui.print(f"Street: {street_flow}")
                ui.print(f"Pot: {table.pot:,} | Current bet: {table.current_bet:,}")
                if table.community:
                    ui.print(f"Board: {' '.join(c.label(session.use_unicode) for c in table.community)}")
                for p in table.players:
                    status = []
                    if p.folded:
                        status.append("folded")
                    if p.all_in:
                        status.append("all-in")
                    if p.bet_this_street:
                        status.append(f"bet {p.bet_this_street}")
                    mark = "->" if p is player else "  "
                    ui.dim(
                        f"{mark} {p.name}: stack {p.stack:,}"
                        + (f" [{', '.join(status)}]" if status else "")
                    )
                ui.print(f"Your cards: {' '.join(c.label(session.use_unicode) for c in table.human.hole)}")

                if player.is_human:
                    legal = table.legal_actions(player)
                    to_call = max(0, table.current_bet - player.bet_this_street)
                    labels = []
                    mapping: dict[int, BettingAction] = {}
                    idx = 1
                    for act in (
                        BettingAction.CHECK,
                        BettingAction.CALL,
                        BettingAction.RAISE,
                        BettingAction.FOLD,
                    ):
                        if act not in legal:
                            continue
                        if act == BettingAction.CALL:
                            labels.append(f"(c) Call {to_call:,}")
                        elif act == BettingAction.RAISE:
                            min_to = table.min_raise_to(player)
                            max_to = table.max_raise_to(player)
                            verb = "Bet" if to_call <= 0 else "Raise to"
                            labels.append(f"(r) {verb} ({min_to:,}-{max_to:,})")
                        else:
                            labels.append(f"({act.value[0]}) {act.value.title()}")
                        mapping[idx] = act
                        idx += 1
                    choice = ui.menu_choice(labels, title="Your action:")
                    if choice == 0:
                        session_net = human_net_change(table, buy_in)
                        session.wallet.credit(
                            table.human.stack, self.info.id, "Cash out from Hold'em table"
                        )
                        session.record_result(self.info.id, session_net, bets=hands)
                        ui.print(
                            f"Left table. Session net: {'+' if session_net >= 0 else ''}{session_net:,}"
                        )
                        ui.pause()
                        return

                    action = mapping[choice]
                    raise_to = None
                    if action == BettingAction.RAISE:
                        min_to = table.min_raise_to(player)
                        max_to = table.max_raise_to(player)
                        raise_to = ui.prompt_int(
                            f"Raise to amount ({min_to}-{max_to})",
                            min_to,
                            max_to,
                            default=min_to,
                        )
                    table.apply_action(player, action, raise_to=raise_to)
                    ui.print(table.last_message)
                else:
                    action, raise_to = table.bot_action(player)
                    table.apply_action(player, action, raise_to=raise_to)
                    ui.dim(f"{table.last_message}")

            hands += 1
            if table.showdown_scores:
                for name, score in table.showdown_scores:
                    ui.print(f"  {name}: {score.name}")
            if table.winners:
                ui.print(f"Winners: {', '.join(table.winners)}")
            if table.last_message and table.human.name in table.last_message:
                if "wins" in table.last_message.lower():
                    ui.dim(f'  {dealer.name}: "{pick_quip(dealer, "win")}"')
                elif "fold" in table.last_message.lower():
                    ui.dim(f'  {dealer.name}: "{pick_quip(dealer, "lose")}"')

        cash = table.human.stack
        session.wallet.credit(cash, self.info.id, "Cash out from Hold'em table")
        session_net = cash - buy_in
        session.record_result(self.info.id, session_net, bets=hands)
        ui.print(f"\nHold'em session: {'+' if session_net >= 0 else ''}{session_net:,} over {hands} hand(s)")
        ui.pause()
