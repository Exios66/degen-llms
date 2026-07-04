from __future__ import annotations

from dataclasses import dataclass

from blackjack.rng import SECURE_RANDOM, fisher_yates_shuffle
from mandalay_bay.activities.base import Activity, ActivityInfo
from mandalay_bay.dealers import announce_dealer, pick_quip
from mandalay_bay.session import PlayerSession

HORSE_NAMES = [
    "Midnight Runner", "Desert Wind", "Golden Mane", "Silver Streak",
    "Lucky Charm", "Thunder Bolt", "Royal Flush", "Neon Star",
]


@dataclass
class RaceHorse:
    number: int
    name: str
    odds: int
    strength: float


@dataclass
class RaceCard:
    track: str
    horses: list[RaceHorse]
    results: list[int] | None = None

    @property
    def label(self) -> str:
        return f"{self.track} — {len(self.horses)} runners"


def _generate_race() -> RaceCard:
    track = SECURE_RANDOM.choice(["Mandalay Turf", "Bay Downs", "Sunset Mile", "Neon Park"])
    names = HORSE_NAMES.copy()
    fisher_yates_shuffle(names, SECURE_RANDOM)
    count = SECURE_RANDOM.randrange(5, 7)
    horses: list[RaceHorse] = []
    for i in range(count):
        strength = SECURE_RANDOM.uniform(0.4, 1.0)
        if strength > 0.85:
            odds = SECURE_RANDOM.choice([-150, -120, -110])
        elif strength > 0.65:
            odds = SECURE_RANDOM.choice([120, 150, 180])
        else:
            odds = SECURE_RANDOM.choice([250, 300, 400, 600])
        horses.append(RaceHorse(i + 1, names[i], odds, strength))
    return RaceCard(track=track, horses=horses)


def _simulate_race(card: RaceCard) -> list[int]:
    weights = [h.strength for h in card.horses]
    order: list[int] = []
    remaining = list(card.horses)
    while remaining:
        total = sum(h.strength for h in remaining)
        roll = SECURE_RANDOM.random() * total
        acc = 0.0
        for h in remaining:
            acc += h.strength
            if roll <= acc:
                order.append(h.number)
                remaining.remove(h)
                break
    return order


def _payout_win(amount: int, odds: int) -> int:
    if odds > 0:
        return amount + (amount * odds) // 100
    return amount + (amount * 100) // abs(odds)


def _payout_place_show(amount: int) -> int:
    return amount * 2


class HorseRacingActivity(Activity):
    info = ActivityInfo(
        id="horse_racing",
        name="Mandalay Racing",
        floor="Racing Pavilion",
        description="Simulated thoroughbred racing — win, place, and show wagers.",
        min_bet=5,
    )

    def run(self, session: PlayerSession, ui) -> None:
        session.record_visit(self.info.id)
        ui.banner(f"{self.info.floor} — {self.info.name}")
        ui.chip_line(session.wallet.balance)
        dealer = announce_dealer(session, ui, self.info.id)

        if not self.can_enter(session):
            ui.error(f"Minimum wager is {self.info.min_bet} chips.")
            ui.pause()
            return

        card = _generate_race()
        pending: list[dict] = []
        session_net = 0
        races = 0

        while True:
            ui.chip_line(session.wallet.balance)
            ui.print(f"\n{card.label}")
            for h in card.horses:
                sign = "+" if h.odds > 0 else ""
                ui.print(f"  #{h.number} {h.name} ({sign}{h.odds})")

            if pending:
                ui.print("\nOpen tickets:")
                for slip in pending:
                    ui.print(f"  {slip['amount']:,} on #{slip['horse']} ({slip['bet_type']})")

            choice = ui.menu_choice(
                ["Place a wager", "Run race & settle tickets", "New race card"],
                title="Racing pavilion:",
            )
            if choice == 0:
                break
            if choice == 1:
                labels = [f"#{h.number} {h.name}" for h in card.horses]
                pick = ui.menu_choice(labels, title="Pick a horse:")
                if pick == 0:
                    continue
                bet_choice = ui.menu_choice(["Win", "Place (top 2)", "Show (top 3)"], title="Bet type:")
                if bet_choice == 0:
                    continue
                bet_types = ["win", "place", "show"]
                amount = ui.prompt_int(
                    f"Wager ({self.info.min_bet}-{session.wallet.balance})",
                    self.info.min_bet,
                    session.wallet.balance,
                    default=self.info.min_bet,
                )
                horse = card.horses[pick - 1]
                if not session.wallet.debit(amount, self.info.id, f"{bet_types[bet_choice - 1]} on #{horse.number}"):
                    ui.error("Insufficient chips.")
                    continue
                pending.append({
                    "horse": horse.number,
                    "horse_name": horse.name,
                    "odds": horse.odds,
                    "bet_type": bet_types[bet_choice - 1],
                    "amount": amount,
                })
                ui.success(f"Ticket placed: {amount:,} chips on #{horse.number} ({bet_types[bet_choice - 1]}).")
            elif choice == 2:
                if not pending:
                    ui.error("No open tickets.")
                    continue
                card.results = _simulate_race(card)
                ui.dim(f'  {dealer.name}: "{pick_quip(dealer, "deal")}"')
                ui.print("\nFINISH ORDER:")
                for pos, num in enumerate(card.results, 1):
                    horse = next(h for h in card.horses if h.number == num)
                    ui.print(f"  {pos}. #{num} {horse.name}")
                races += 1
                for slip in pending:
                    pos = card.results.index(slip["horse"]) + 1
                    won = False
                    payout = 0
                    if slip["bet_type"] == "win" and pos == 1:
                        payout = _payout_win(slip["amount"], slip["odds"])
                        won = True
                    elif slip["bet_type"] == "place" and pos <= 2:
                        payout = _payout_place_show(slip["amount"])
                        won = True
                    elif slip["bet_type"] == "show" and pos <= 3:
                        payout = _payout_place_show(slip["amount"])
                        won = True
                    if won:
                        session.wallet.credit(payout, self.info.id, f"{slip['bet_type']} #{slip['horse']}")
                        session_net += payout - slip["amount"]
                        ui.success(f"  WIN #{slip['horse']} {slip['bet_type']}: +{payout - slip['amount']:,}")
                        ui.dim(f'  {dealer.name}: "{pick_quip(dealer, "win")}"')
                    else:
                        session_net -= slip["amount"]
                        ui.dim(f"  LOSE #{slip['horse']} {slip['bet_type']}: -{slip['amount']:,}")
                        ui.dim(f'  {dealer.name}: "{pick_quip(dealer, "lose")}"')
                pending.clear()
            elif choice == 3:
                card = _generate_race()
                ui.print("Fresh race card posted.")

        session.record_result(self.info.id, session_net, bets=races)
        ui.print(f"\nRacing session: {'+' if session_net >= 0 else ''}{session_net:,} over {races} race(s)")
        ui.pause()
