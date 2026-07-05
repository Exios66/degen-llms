from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from blackjack.rng import SECURE_RANDOM
from mandalay_bay.activities.base import Activity, ActivityInfo
from mandalay_bay.prediction_markets import (
    PredictionMarketsState,
    category_label,
    generate_markets,
    prediction_payout,
    refresh_market_prices,
    resolve_market,
    resolve_position,
)
from mandalay_bay.session import PlayerSession
from mandalay_bay.sport_simulator import generate_board, load_catalog, simulate_event_outcome
from mandalay_bay.stakes import effective_table_stakes, pick_stake_tier


@dataclass
class BetSlip:
    event: dict[str, Any]
    bet_type: str
    pick: str
    amount: int
    odds: int
    prop_id: str | None = None
    prop_label: str | None = None


class SportsbookActivity(Activity):
    info = ActivityInfo(
        id="sportsbook",
        name="Mandalay Sports Book",
        floor="Sports Book",
        description="Sports wagering and prediction markets — moneyline, spread, totals, props, and YES/NO contracts.",
        min_bet=10,
    )

    def __init__(self) -> None:
        self._catalog = load_catalog()
        self._events: list[dict[str, Any]] = []
        self._pending: list[BetSlip] = []
        self._predictions = PredictionMarketsState()
        self._refresh_board()

    def run(self, session: PlayerSession, ui) -> None:
        session.record_visit(self.info.id)
        ui.banner(f"{self.info.floor} — {self.info.name}")
        ui.chip_line(session.wallet.balance)

        if not self.can_enter(session):
            ui.error(f"Minimum wager is {self.info.min_bet} chips.")
            ui.pause()
            return

        tier = pick_stake_tier(session, ui, title="Choose stake tier:")
        if tier is None:
            return
        ui.dim(tier.description)
        wager_min, wager_max = effective_table_stakes(
            tier, session.wallet.balance, activity_min=self.info.min_bet
        )

        session_net = 0
        bets_placed = 0

        while True:
            self._predictions.sync_markets(self._events)
            choice = ui.menu_choice(
                [
                    f"Sports board ({len(self._events)} events, {len(self._pending)} ticket(s))",
                    f"Prediction markets ({len(self._predictions.positions)} open)",
                    "Settle all open positions",
                    "Refresh lines & markets",
                ],
                title="Sports Book:",
            )
            if choice == 0:
                break
            if choice == 1:
                net, count = self._sports_board_loop(session, ui, wager_min, wager_max)
                session_net += net
                bets_placed += count
            elif choice == 2:
                net, count = self._prediction_markets_loop(session, ui, wager_min, wager_max)
                session_net += net
                bets_placed += count
            elif choice == 3:
                net, count = self._settle_all(session, ui)
                session_net += net
                bets_placed += count
            elif choice == 4:
                self._refresh_board(force=True)
                self._predictions.sync_markets(self._events, force=True)
                ui.success("Lines and prediction markets refreshed.")

        session.record_result(self.info.id, session_net, bets=bets_placed)
        ui.pause()

    def _refresh_board(self, force: bool = False) -> None:
        if self._events and not force:
            return
        self._events = generate_board(self._catalog)

    def _sports_board_loop(
        self,
        session: PlayerSession,
        ui,
        wager_min: int,
        wager_max: int,
    ) -> tuple[int, int]:
        net = 0
        count = 0
        while True:
            ui.print("\n--- Today's Board ---")
            for i, event in enumerate(self._events, start=1):
                ui.print(self._format_event_line(i, event))

            choice = ui.menu_choice(
                ["Place a wager", "Back"],
                title="Sports board:",
            )
            if choice == 0 or choice == 2:
                break
            if choice == 1:
                placed = self._place_wager(session, ui, wager_min, wager_max)
                if placed:
                    count += 1
        return net, count

    def _prediction_markets_loop(
        self,
        session: PlayerSession,
        ui,
        wager_min: int,
        wager_max: int,
    ) -> tuple[int, int]:
        net = 0
        count = 0
        while True:
            ui.print("\n--- Prediction Markets ---")
            ui.dim("High-volatility YES/NO contracts. Prices in cents.")
            for i, market in enumerate(self._predictions.markets, start=1):
                ui.print(
                    f"  {i}) [{category_label(market['category'])}] {market['question']}\n"
                    f"     YES {market['yesPrice']}¢ | NO {market['noPrice']}¢ | Vol {market['volume']:,}"
                )

            choice = ui.menu_choice(
                ["Buy YES/NO contract", "Refresh prices", "Back"],
                title="Predictions:",
            )
            if choice == 0 or choice == 3:
                break
            if choice == 1:
                placed = self._place_prediction(session, ui, wager_min, wager_max)
                if placed:
                    count += 1
            elif choice == 2:
                self._predictions.markets = refresh_market_prices(self._predictions.markets)
                ui.success("Market prices updated.")
        return net, count

    def _format_event_line(self, index: int, event: dict[str, Any]) -> str:
        sport = event.get("sportLabel") or event["sport"]
        if event.get("eventType") == "outright":
            return (
                f"  {index}) [{sport}] {event['label']}\n"
                f"     Outright: {event['home']} {self._fmt_odds(event['homeOdds'])} | "
                f"{event['away']} {self._fmt_odds(event['awayOdds'])}"
            )
        return (
            f"  {index}) [{sport}] {event['label']}\n"
            f"     ML: {event['away']} {self._fmt_odds(event['awayOdds'])} | "
            f"{event['home']} {self._fmt_odds(event['homeOdds'])}\n"
            f"     Spread: {event['home']} {event['spread']:+.1f} ({self._fmt_odds(event['spreadHomeOdds'])}) | "
            f"{event['away']} {-event['spread']:+.1f} ({self._fmt_odds(event['spreadAwayOdds'])})\n"
            f"     Total: O/U {event['total']} ({self._fmt_odds(event['totalOverOdds'])})"
        )

    def _place_wager(
        self,
        session: PlayerSession,
        ui,
        wager_min: int,
        wager_max: int,
    ) -> bool:
        idx = ui.prompt_int("Event number", 1, len(self._events), default=1) - 1
        event = self._events[idx]

        if event.get("eventType") == "outright":
            bet_types = ["Outright winner"]
        else:
            bet_types = ["Moneyline", "Spread", "Total (O/U)", "Game prop"]

        bet_choice = ui.menu_choice(bet_types, title="Bet type:")
        if bet_choice == 0:
            return False

        btype = "moneyline"
        team = event["home"]
        odds = event["home_odds"]
        prop_id = None
        prop_label = None

        if event.get("eventType") == "outright":
            pick = ui.menu_choice(list(event.get("field") or [event["home"], event["away"]]), title="Pick winner:")
            if pick == 0:
                return False
            names = event.get("field") or [event["home"], event["away"]]
            team = names[pick - 1]
            odds = event.get("outrightOdds", {}).get(team, event["homeOdds"])
            btype = "outright"
        elif bet_choice == 1:
            pick = ui.menu_choice([event["away"], event["home"]], title="Pick winner:")
            if pick == 0:
                return False
            team = event["away"] if pick == 1 else event["home"]
            odds = event["awayOdds"] if pick == 1 else event["homeOdds"]
            btype = "moneyline"
        elif bet_choice == 2:
            pick = ui.menu_choice(
                [f"{event['home']} {event['spread']:+.1f}", f"{event['away']} {-event['spread']:+.1f}"],
                title="Pick spread:",
            )
            if pick == 0:
                return False
            team = event["home"] if pick == 1 else event["away"]
            odds = event["spreadHomeOdds"] if pick == 1 else event["spreadAwayOdds"]
            btype = "spread"
        elif bet_choice == 3:
            pick = ui.menu_choice([f"Over {event['total']}", f"Under {event['total']}"], title="Pick total:")
            if pick == 0:
                return False
            team = "over" if pick == 1 else "under"
            odds = event["totalOverOdds"] if pick == 1 else event["totalUnderOdds"]
            btype = "total"
        else:
            props = event.get("props") or []
            if not props:
                ui.error("No props available for this event.")
                return False
            labels = [p["label"] for p in props]
            prop_pick = ui.menu_choice(labels, title="Pick prop:")
            if prop_pick == 0:
                return False
            prop = props[prop_pick - 1]
            side = ui.menu_choice(["Yes", "No"], title=f"{prop['label']}:")
            if side == 0:
                return False
            team = "yes" if side == 1 else "no"
            odds = prop["yesOdds"] if side == 1 else prop["noOdds"]
            btype = "prop"
            prop_id = prop["id"]
            prop_label = prop["label"]

        amount = ui.prompt_int(
            f"Wager ({wager_min}-{wager_max})",
            wager_min,
            wager_max,
            default=wager_min,
        )
        if not session.wallet.debit(amount, self.info.id, f"{btype} on {team}"):
            ui.error("Insufficient chips.")
            return False

        slip = BetSlip(
            event=event,
            bet_type=btype,
            pick=team,
            amount=amount,
            odds=odds,
            prop_id=prop_id,
            prop_label=prop_label,
        )
        ui.print(f"\nTicket placed: {amount:,} chips on {team} ({btype}, {self._fmt_odds(odds)})")
        self._pending.append(slip)
        return True

    def _place_prediction(
        self,
        session: PlayerSession,
        ui,
        wager_min: int,
        wager_max: int,
    ) -> bool:
        idx = ui.prompt_int("Market number", 1, len(self._predictions.markets), default=1) - 1
        market = self._predictions.markets[idx]
        side_choice = ui.menu_choice(["YES", "NO"], title="Buy side:")
        if side_choice == 0:
            return False
        side = "yes" if side_choice == 1 else "no"
        price = market["yesPrice"] if side == "yes" else market["noPrice"]

        amount = ui.prompt_int(
            f"Stake ({wager_min}-{wager_max})",
            wager_min,
            wager_max,
            default=wager_min,
        )
        if not session.wallet.debit(amount, self.info.id, f"Prediction {side.upper()} @ {price}¢"):
            ui.error("Insufficient chips.")
            return False

        payout = prediction_payout(amount, price)
        self._predictions.positions.append({
            "marketId": market["marketId"],
            "question": market["question"],
            "side": side,
            "priceCents": price,
            "amount": amount,
            "maxPayout": payout,
        })
        ui.print(f"\nContract placed: {amount:,} chips on {side.upper()} @ {price}¢ (max payout {payout:,})")
        return True

    def _settle_all(self, session: PlayerSession, ui) -> tuple[int, int]:
        if not self._pending and not self._predictions.positions:
            ui.error("No open positions.")
            return 0, 0

        session_net = 0
        count = 0
        simulated: set[str] = set()

        if self._pending:
            ui.banner("FINAL SCORES")
            for slip in self._pending:
                event = slip.event
                if event["eventId"] not in simulated and not event.get("settled"):
                    simulate_event_outcome(self._catalog, event)
                    simulated.add(event["eventId"])

                ui.print(f"\n{event['label']}: {self._score_line(event)}")
                won, payout, reason = self._resolve_slip(slip)
                if won:
                    session.wallet.credit(payout, self.info.id, reason)
                    session_net += payout - slip.amount
                    ui.success(f"  WIN: {reason} (+{payout - slip.amount:,} chips)")
                else:
                    session_net -= slip.amount
                    ui.error(f"  LOSE: {reason} (-{slip.amount:,} chips)")
                count += 1
            self._pending = []

        if self._predictions.positions:
            ui.banner("PREDICTION MARKET RESULTS")
            for position in self._predictions.positions:
                market = next(
                    (m for m in self._predictions.markets if m["marketId"] == position["marketId"]),
                    None,
                )
                if not market:
                    continue
                resolution = resolve_market(market, self._events)
                market["resolution"] = resolution
                result = resolve_position(position, resolution)
                ui.print(f"\n{position['question']}: {resolution.upper()}")
                if result["won"]:
                    session.wallet.credit(result["payout"], self.info.id, result["reason"])
                    session_net += result["payout"] - position["amount"]
                    ui.success(f"  WIN: {result['reason']}")
                else:
                    session_net -= position["amount"]
                    ui.error(f"  LOSE: {result['reason']} (-{position['amount']:,} chips)")
                count += 1
            self._predictions.positions = []

        ui.chip_line(session.wallet.balance)
        return session_net, count

    def _score_line(self, event: dict[str, Any]) -> str:
        if event.get("eventType") == "outright":
            return f"Winner: {event.get('winner', 'TBD')}"
        return f"{event['away']} {event['awayScore']} — {event['home']} {event['homeScore']}"

    def _resolve_slip(self, slip: BetSlip) -> tuple[bool, int, str]:
        event = slip.event
        if slip.bet_type == "moneyline":
            if event["homeScore"] == event["awayScore"]:
                return True, slip.amount, "Push — stake returned"
            winner = event["home"] if event["homeScore"] > event["awayScore"] else event["away"]
            if winner == slip.pick:
                profit = self._profit(slip.amount, slip.odds)
                return True, slip.amount + profit, f"{slip.pick} wins outright"
            return False, 0, f"{slip.pick} did not win"

        if slip.bet_type == "spread":
            margin = event["homeScore"] - event["awayScore"]
            adjusted = margin + event["spread"] if slip.pick == event["home"] else -margin - event["spread"]
            if adjusted == 0:
                return True, slip.amount, "Push — stake returned"
            if adjusted > 0:
                profit = self._profit(slip.amount, slip.odds)
                return True, slip.amount + profit, f"{slip.pick} covered the spread"
            return False, 0, f"{slip.pick} did not cover"

        if slip.bet_type == "total":
            combined = event["homeScore"] + event["awayScore"]
            is_over = slip.pick == "over"
            if combined == event["total"]:
                return True, slip.amount, "Push — stake returned"
            hit = combined > event["total"] if is_over else combined < event["total"]
            if hit:
                profit = self._profit(slip.amount, slip.odds)
                label = "Over" if is_over else "Under"
                return True, slip.amount + profit, f"{label} {event['total']} hit ({combined} total)"
            return False, 0, f"{'Over' if is_over else 'Under'} {event['total']} missed"

        if slip.bet_type == "prop":
            outcome = (event.get("propOutcomes") or {}).get(slip.prop_id or "")
            want_yes = slip.pick == "yes"
            if outcome == want_yes:
                profit = self._profit(slip.amount, slip.odds)
                return True, slip.amount + profit, f"{slip.prop_label}: {slip.pick.upper()}"
            return False, 0, f"{slip.prop_label}: {slip.pick.upper()} missed"

        if slip.bet_type == "outright":
            if event.get("winner") == slip.pick:
                profit = self._profit(slip.amount, slip.odds)
                return True, slip.amount + profit, f"{slip.pick} wins"
            return False, 0, f"{slip.pick} did not win"

        return False, 0, "Unknown bet type"

    @staticmethod
    def _profit(amount: int, american_odds: int) -> int:
        if american_odds > 0:
            return amount * american_odds // 100
        return amount * 100 // abs(american_odds)

    @staticmethod
    def _fmt_odds(odds: int) -> str:
        return f"+{odds}" if odds > 0 else str(odds)
