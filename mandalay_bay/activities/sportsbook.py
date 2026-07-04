from __future__ import annotations

from dataclasses import dataclass

from blackjack.rng import SECURE_RANDOM
from mandalay_bay.activities.base import Activity, ActivityInfo
from mandalay_bay.session import PlayerSession


@dataclass
class SportsEvent:
    event_id: str
    sport: str
    home: str
    away: str
    home_odds: int
    away_odds: int
    spread: float
    spread_home_odds: int
    spread_away_odds: int
    home_score: int = 0
    away_score: int = 0
    settled: bool = False

    @property
    def label(self) -> str:
        return f"{self.away} @ {self.home}"


@dataclass
class BetSlip:
    event: SportsEvent
    bet_type: str
    pick: str
    amount: int
    odds: int


class SportsbookActivity(Activity):
    info = ActivityInfo(
        id="sportsbook",
        name="Mandalay Sports Book",
        floor="Sports Book",
        description="Wager on simulated live events — moneyline and spread betting.",
        min_bet=10,
    )

    SPORTS = ["NFL", "NBA", "MLB", "Soccer"]

    TEAMS: dict[str, list[str]] = {
        "NFL": ["Raiders", "Chiefs", "Bills", "49ers", "Cowboys", "Eagles"],
        "NBA": ["Lakers", "Celtics", "Warriors", "Heat", "Nuggets", "Bucks"],
        "MLB": ["Yankees", "Dodgers", "Red Sox", "Cubs", "Giants", "Mets"],
        "Soccer": ["Bay FC", "LA United", "Seattle Sound", "Miami FC", "NY City", "Austin FC"],
    }

    def __init__(self) -> None:
        self._events: list[SportsEvent] = []
        self._pending: list[BetSlip] = []
        self._refresh_board()

    def run(self, session: PlayerSession, ui) -> None:
        session.record_visit(self.info.id)
        ui.banner(f"{self.info.floor} — {self.info.name}")
        ui.chip_line(session.wallet.balance)

        if not self.can_enter(session):
            ui.error(f"Minimum wager is {self.info.min_bet} chips.")
            ui.pause()
            return

        session_net = 0
        bets_placed = 0

        while True:
            self._refresh_board()
            ui.print("\n--- Today's Board ---")
            for i, event in enumerate(self._events, start=1):
                ui.print(
                    f"  {i}) [{event.sport}] {event.label}\n"
                    f"     ML: {event.away} {self._fmt_odds(event.away_odds)} | "
                    f"{event.home} {self._fmt_odds(event.home_odds)}\n"
                    f"     Spread: {event.home} {event.spread:+.1f} ({self._fmt_odds(event.spread_home_odds)}) | "
                    f"{event.away} {-event.spread:+.1f} ({self._fmt_odds(event.spread_away_odds)})"
                )

            choice = ui.menu_choice(
                [
                    f"Place a wager ({len(self._pending)} open ticket(s))" if self._pending else "Place a wager",
                    f"Settle all open bets ({len(self._pending)} ticket(s))" if self._pending else "Settle all open bets (simulate results)",
                    "Refresh lines",
                ],
                title="Sports Book:",
            )
            if choice == 0:
                break
            if choice == 1:
                net, count = self._place_wager(session, ui)
                session_net += net
                bets_placed += count
            elif choice == 2:
                net, count = self._settle_pending(session, ui)
                session_net += net
                bets_placed += count
            elif choice == 3:
                self._refresh_board(force=True)
                ui.success("Lines refreshed.")

        session.record_result(self.info.id, session_net, bets=bets_placed)
        ui.pause()

    def _refresh_board(self, force: bool = False) -> None:
        if self._events and not force:
            return
        self._events = [self._generate_event(i) for i in range(4)]

    def _generate_event(self, seed_offset: int) -> SportsEvent:
        sport = self.SPORTS[SECURE_RANDOM.randrange(0, len(self.SPORTS))]
        teams = self.TEAMS[sport][:]
        SECURE_RANDOM.shuffle(teams)
        home, away = teams[0], teams[1]
        home_strength = SECURE_RANDOM.randint(1, 10)
        away_strength = SECURE_RANDOM.randint(1, 10)
        diff = home_strength - away_strength
        if diff >= 3:
            home_odds, away_odds = -150, 130
        elif diff <= -3:
            home_odds, away_odds = 130, -150
        else:
            home_odds, away_odds = -110, -110
        spread = round(diff * 0.5 - 0.5, 1)
        return SportsEvent(
            event_id=f"{sport}-{home}-{away}-{SECURE_RANDOM.randrange(1000, 9999)}",
            sport=sport,
            home=home,
            away=away,
            home_odds=home_odds,
            away_odds=away_odds,
            spread=spread,
            spread_home_odds=-110,
            spread_away_odds=-110,
        )

    def _place_wager(self, session: PlayerSession, ui) -> tuple[int, int]:
        idx = ui.prompt_int("Event number", 1, len(self._events), default=1) - 1
        event = self._events[idx]
        bet_type = ui.menu_choice(["Moneyline", "Spread"], title="Bet type:")
        if bet_type == 0:
            return 0, 0
        if bet_type == 1:
            pick = ui.menu_choice([event.away, event.home], title="Pick winner:")
            if pick == 0:
                return 0, 0
            team = event.away if pick == 1 else event.home
            odds = event.away_odds if pick == 1 else event.home_odds
            btype = "moneyline"
        else:
            pick = ui.menu_choice(
                [f"{event.home} {event.spread:+.1f}", f"{event.away} {-event.spread:+.1f}"],
                title="Pick spread:",
            )
            if pick == 0:
                return 0, 0
            team = event.home if pick == 1 else event.away
            odds = event.spread_home_odds if pick == 1 else event.spread_away_odds
            btype = "spread"

        amount = ui.prompt_int(
            f"Wager ({self.info.min_bet}-{session.wallet.balance})",
            self.info.min_bet,
            session.wallet.balance,
            default=self.info.min_bet,
        )
        if not session.wallet.debit(amount, self.info.id, f"{btype} on {team}"):
            ui.error("Insufficient chips.")
            return 0, 0

        slip = BetSlip(event=event, bet_type=btype, pick=team, amount=amount, odds=odds)
        ui.print(f"\nTicket placed: {amount:,} chips on {team} ({btype}, {self._fmt_odds(odds)})")
        ui.print("Select 'Settle all open bets' when ready for results.\n")

        self._pending.append(slip)
        return 0, 1

    def _settle_pending(self, session: PlayerSession, ui) -> tuple[int, int]:
        pending = self._pending
        if not pending:
            ui.error("No open tickets. Place a wager first.")
            return 0, 0

        session_net = 0
        ui.banner("FINAL SCORES")
        for slip in pending:
            event = slip.event
            event.home_score = SECURE_RANDOM.randint(10, 35)
            event.away_score = SECURE_RANDOM.randint(10, 35)
            if event.sport == "Soccer":
                event.home_score = SECURE_RANDOM.randint(0, 3)
                event.away_score = SECURE_RANDOM.randint(0, 3)

            ui.print(f"\n{event.label}: {event.away} {event.away_score} — {event.home} {event.home_score}")
            won, payout, reason = self._resolve_slip(slip)
            if won:
                session.wallet.credit(payout, self.info.id, reason)
                session_net += payout - slip.amount
                ui.success(f"  WIN: {reason} (+{payout - slip.amount:,} chips)")
            else:
                session_net -= slip.amount
                ui.error(f"  LOSE: {reason} (-{slip.amount:,} chips)")
            event.settled = True

        self._pending = []
        ui.chip_line(session.wallet.balance)
        return session_net, len(pending)

    def _resolve_slip(self, slip: BetSlip) -> tuple[bool, int, str]:
        event = slip.event
        if slip.bet_type == "moneyline":
            if event.home_score == event.away_score:
                return True, slip.amount, "Push — stake returned"
            winner = event.home if event.home_score > event.away_score else event.away
            if winner == slip.pick:
                profit = self._profit(slip.amount, slip.odds)
                return True, slip.amount + profit, f"{slip.pick} wins outright"
            return False, 0, f"{slip.pick} did not win"

        margin = event.home_score - event.away_score
        if slip.pick == event.home:
            adjusted = margin + event.spread
        else:
            adjusted = (-margin) + (-event.spread)

        if adjusted == 0:
            return True, slip.amount, "Push — stake returned"
        if adjusted > 0:
            profit = self._profit(slip.amount, slip.odds)
            return True, slip.amount + profit, f"{slip.pick} covered the spread"
        return False, 0, f"{slip.pick} did not cover"

    @staticmethod
    def _profit(amount: int, american_odds: int) -> int:
        if american_odds > 0:
            return amount * american_odds // 100
        return amount * 100 // abs(american_odds)

    @staticmethod
    def _fmt_odds(odds: int) -> str:
        return f"+{odds}" if odds > 0 else str(odds)
