from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from mandalay_bay.activities.base import Activity, ActivityInfo
from mandalay_bay.prediction_markets import (
    MARKET_CATEGORIES,
    PredictionMarketsState,
    category_label,
    filter_markets,
    prediction_payout,
    refresh_market_prices,
    resolve_market,
    resolve_position,
)
from mandalay_bay.session import PlayerSession
from mandalay_bay.sport_simulator import (
    board_from_scenarios,
    generate_board,
    load_catalog,
    load_sports_scenarios,
    simulate_event_outcome,
)
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
    legs: list[BetSlip] = field(default_factory=list)


def combine_american_odds(legs: list[int]) -> int:
    decimal = 1.0
    for odds in legs:
        if odds > 0:
            decimal *= 1 + odds / 100
        else:
            decimal *= 1 + 100 / abs(odds)
    if decimal >= 2:
        return int(round((decimal - 1) * 100))
    return int(round(-100 / (decimal - 1)))


def available_bet_types(event: dict[str, Any]) -> list[str]:
    et = event.get("eventType")
    if et == "futures":
        return ["futures"]
    if et == "outright":
        return ["outright"]
    types = ["moneyline", "spread", "total"]
    if event.get("props"):
        types.append("prop")
    return types


class SportsbookActivity(Activity):
    info = ActivityInfo(
        id="sportsbook",
        name="Mandalay Sports Book",
        floor="Sports Book",
        description=(
            "125+ stored sports scenarios and prediction markets — "
            "ML, spread, totals, props, parlays, futures."
        ),
        min_bet=10,
    )

    def __init__(self) -> None:
        self._catalog = load_catalog()
        self._scenario_db = load_sports_scenarios()
        self._scenario_cursor = 0
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
        n_scenarios = len(self._scenario_db.get("scenarios") or [])

        while True:
            self._predictions.sync_markets(self._events)
            choice = ui.menu_choice(
                [
                    f"Sports board ({len(self._events)} events, {len(self._pending)} ticket(s))",
                    f"Prediction markets ({len(self._predictions.positions)} open)",
                    "Settle all open positions",
                    f"Next scenario slate (cursor {self._scenario_cursor}/{n_scenarios})",
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
                self._predictions.next_slate(self._events)
                ui.success(
                    f"Next slate loaded — sports cursor {self._scenario_cursor}, "
                    f"predictions cursor {self._predictions.scenario_cursor}."
                )

        session.record_result(self.info.id, session_net, bets=bets_placed)
        ui.pause()

    def _refresh_board(self, force: bool = False) -> None:
        if self._events and not force:
            return
        scenarios = self._scenario_db.get("scenarios") or []
        if scenarios:
            self._events, self._scenario_cursor = board_from_scenarios(
                self._scenario_db, self._scenario_cursor,
            )
        else:
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
            ui.dim(
                f"Stored scenarios · cursor {self._scenario_cursor} · "
                f"{len(self._scenario_db.get('scenarios') or [])} in book"
            )
            for i, event in enumerate(self._events, start=1):
                ui.print(self._format_event_line(i, event))

            choice = ui.menu_choice(
                ["Place a wager", "Build parlay (2–4 legs)", "Back"],
                title="Sports board:",
            )
            if choice == 0 or choice == 3:
                break
            if choice == 1:
                placed = self._place_wager(session, ui, wager_min, wager_max)
                if placed:
                    count += 1
            elif choice == 2:
                placed = self._place_parlay(session, ui, wager_min, wager_max)
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
            ui.dim(
                "YES/NO contracts — History Desk settles to recorded truth; Easter Eggs are longshots. "
                f"Slate cursor {self._predictions.scenario_cursor}."
            )
            visible = filter_markets(self._predictions.markets, self._predictions.category_filter)
            if not visible:
                visible = self._predictions.markets
            for i, market in enumerate(visible, start=1):
                blurb = f"\n     {market['blurb']}" if market.get("blurb") else ""
                desk = " · History Desk" if market.get("fixedResolution") else ""
                ui.print(
                    f"  {i}) [{category_label(market['category'])}] {market['question']}{desk}\n"
                    f"     YES {market['yesPrice']}¢ | NO {market['noPrice']}¢ | Vol {market['volume']:,}{blurb}"
                )

            choice = ui.menu_choice(
                [
                    "Buy YES/NO contract",
                    "Filter category",
                    "Refresh prices",
                    "Next prediction slate",
                    "Back",
                ],
                title="Predictions:",
            )
            if choice == 0 or choice == 5:
                break
            if choice == 1:
                placed = self._place_prediction(session, ui, wager_min, wager_max, visible)
                if placed:
                    count += 1
            elif choice == 2:
                cat_labels = ["All categories", *[c["label"] for c in MARKET_CATEGORIES]]
                cat_choice = ui.menu_choice(cat_labels, title="Board filter:")
                if cat_choice == 1:
                    self._predictions.category_filter = "all"
                elif cat_choice > 1:
                    self._predictions.category_filter = MARKET_CATEGORIES[cat_choice - 2]["id"]
            elif choice == 3:
                self._predictions.markets = refresh_market_prices(self._predictions.markets)
                ui.success("Market prices updated.")
            elif choice == 4:
                self._predictions.next_slate(self._events)
                ui.success(f"Next prediction slate — cursor {self._predictions.scenario_cursor}.")
        return net, count

    def _format_event_line(self, index: int, event: dict[str, Any]) -> str:
        sport = event.get("sportLabel") or event["sport"]
        et = event.get("eventType")
        if et in ("outright", "futures"):
            tag = "FUTURES" if et == "futures" else "OUTRIGHT"
            field = event.get("field") or [event["home"], event["away"]]
            odds_map = event.get("outrightOdds") or {}
            picks = " | ".join(
                f"{name} {self._fmt_odds(odds_map.get(name, event.get('homeOdds', 100)))}"
                for name in field[:4]
            )
            return (
                f"  {index}) [{sport} · {tag}] {event['label']}\n"
                f"     {picks}"
            )
        props = event.get("props") or []
        prop_line = ""
        if props:
            prop_line = "\n     Props: " + "; ".join(p["label"] for p in props[:3])
        return (
            f"  {index}) [{sport}] {event['label']}\n"
            f"     ML: {event['away']} {self._fmt_odds(event['awayOdds'])} | "
            f"{event['home']} {self._fmt_odds(event['homeOdds'])}\n"
            f"     Spread: {event['home']} {event['spread']:+.1f} ({self._fmt_odds(event['spreadHomeOdds'])}) | "
            f"{event['away']} {-event['spread']:+.1f} ({self._fmt_odds(event['spreadAwayOdds'])})\n"
            f"     Total: O/U {event['total']} ({self._fmt_odds(event['totalOverOdds'])})"
            f"{prop_line}"
        )

    def _place_wager(
        self,
        session: PlayerSession,
        ui,
        wager_min: int,
        wager_max: int,
        events: list[dict[str, Any]] | None = None,
    ) -> bool:
        board = events or self._events
        if not board:
            ui.error("No events on the board.")
            return False
        idx = ui.prompt_int("Event number", 1, len(board), default=1) - 1
        event = board[idx]
        types = available_bet_types(event)
        labels = {
            "moneyline": "Moneyline",
            "spread": "Spread",
            "total": "Total (O/U)",
            "prop": "Game prop",
            "outright": "Outright winner",
            "futures": "Futures contract",
        }
        bet_choice = ui.menu_choice([labels[t] for t in types], title="Bet type:")
        if bet_choice == 0:
            return False
        btype = types[bet_choice - 1]

        team = event["home"]
        odds = event.get("homeOdds", -110)
        prop_id = None
        prop_label = None

        if btype in ("outright", "futures"):
            names = list(event.get("field") or [event["home"], event["away"]])
            pick = ui.menu_choice(names, title="Pick winner:")
            if pick == 0:
                return False
            team = names[pick - 1]
            odds = event.get("outrightOdds", {}).get(team, event.get("homeOdds", 100))
        elif btype == "moneyline":
            pick = ui.menu_choice([event["away"], event["home"]], title="Pick winner:")
            if pick == 0:
                return False
            team = event["away"] if pick == 1 else event["home"]
            odds = event["awayOdds"] if pick == 1 else event["homeOdds"]
        elif btype == "spread":
            pick = ui.menu_choice(
                [f"{event['home']} {event['spread']:+.1f}", f"{event['away']} {-event['spread']:+.1f}"],
                title="Pick spread:",
            )
            if pick == 0:
                return False
            team = event["home"] if pick == 1 else event["away"]
            odds = event["spreadHomeOdds"] if pick == 1 else event["spreadAwayOdds"]
        elif btype == "total":
            pick = ui.menu_choice([f"Over {event['total']}", f"Under {event['total']}"], title="Pick total:")
            if pick == 0:
                return False
            team = "over" if pick == 1 else "under"
            odds = event["totalOverOdds"] if pick == 1 else event["totalUnderOdds"]
        else:
            props = event.get("props") or []
            if not props:
                ui.error("No props available for this event.")
                return False
            prop_labels = [p["label"] for p in props]
            prop_pick = ui.menu_choice(prop_labels, title="Pick prop:")
            if prop_pick == 0:
                return False
            prop = props[prop_pick - 1]
            side = ui.menu_choice(["Yes", "No"], title=f"{prop['label']}:")
            if side == 0:
                return False
            team = "yes" if side == 1 else "no"
            odds = prop["yesOdds"] if side == 1 else prop["noOdds"]
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

    def _place_parlay(
        self,
        session: PlayerSession,
        ui,
        wager_min: int,
        wager_max: int,
    ) -> bool:
        games = [e for e in self._events if e.get("eventType", "game") == "game"]
        if len(games) < 2:
            ui.error("Need at least two game events on the board for a parlay.")
            return False

        n_legs = ui.prompt_int("Number of legs (2–4)", 2, min(4, len(games)), default=2)
        legs: list[BetSlip] = []
        used: set[str] = set()
        for leg_i in range(n_legs):
            available = [e for e in games if e["eventId"] not in used]
            for i, event in enumerate(available, start=1):
                ui.print(f"  {i}) {event['label']}")
            idx = ui.prompt_int(f"Leg {leg_i + 1} event", 1, len(available), default=1) - 1
            event = available[idx]
            used.add(event["eventId"])
            side = ui.menu_choice(
                [
                    f"ML {event['away']} ({self._fmt_odds(event['awayOdds'])})",
                    f"ML {event['home']} ({self._fmt_odds(event['homeOdds'])})",
                    f"Over {event['total']} ({self._fmt_odds(event['totalOverOdds'])})",
                    f"Under {event['total']} ({self._fmt_odds(event['totalUnderOdds'])})",
                ],
                title=f"Leg {leg_i + 1} pick:",
            )
            if side == 0:
                return False
            if side == 1:
                pick, odds, btype = event["away"], event["awayOdds"], "moneyline"
            elif side == 2:
                pick, odds, btype = event["home"], event["homeOdds"], "moneyline"
            elif side == 3:
                pick, odds, btype = "over", event["totalOverOdds"], "total"
            else:
                pick, odds, btype = "under", event["totalUnderOdds"], "total"
            legs.append(BetSlip(event=event, bet_type=btype, pick=pick, amount=0, odds=odds))

        combined = combine_american_odds([leg.odds for leg in legs])
        amount = ui.prompt_int(
            f"Parlay stake ({wager_min}-{wager_max})",
            wager_min,
            wager_max,
            default=wager_min,
        )
        if not session.wallet.debit(amount, self.info.id, f"{len(legs)}-leg parlay"):
            ui.error("Insufficient chips.")
            return False

        slip = BetSlip(
            event=legs[0].event,
            bet_type="parlay",
            pick=f"{len(legs)}-leg",
            amount=amount,
            odds=combined,
            legs=legs,
        )
        self._pending.append(slip)
        ui.print(f"\nParlay placed: {amount:,} chips @ {self._fmt_odds(combined)}")
        return True

    def _place_prediction(
        self,
        session: PlayerSession,
        ui,
        wager_min: int,
        wager_max: int,
        markets: list[dict[str, Any]] | None = None,
    ) -> bool:
        board = markets or self._predictions.markets
        if not board:
            ui.error("No markets on the board.")
            return False
        idx = ui.prompt_int("Market number", 1, len(board), default=1) - 1
        market = board[idx]
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
                events_to_sim = [leg.event for leg in slip.legs] if slip.bet_type == "parlay" else [slip.event]
                for event in events_to_sim:
                    eid = event.get("eventId") or id(event)
                    if eid not in simulated and not event.get("settled"):
                        simulate_event_outcome(self._catalog, event)
                        simulated.add(eid)
                    if slip.bet_type != "parlay":
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
        if event.get("eventType") in ("outright", "futures"):
            return f"Winner: {event.get('winner', 'TBD')}"
        return f"{event['away']} {event['awayScore']} — {event['home']} {event['homeScore']}"

    def _resolve_slip(self, slip: BetSlip) -> tuple[bool, int, str]:
        if slip.bet_type == "parlay":
            all_won = True
            for leg in slip.legs:
                won, _, reason = self._resolve_slip(leg)
                if not won:
                    all_won = False
                    break
            if not all_won:
                return False, 0, "Parlay lost — a leg missed"
            profit = self._profit(slip.amount, slip.odds)
            return True, slip.amount + profit, f"Parlay cashes ({len(slip.legs)} legs)"

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

        if slip.bet_type in ("outright", "futures"):
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
