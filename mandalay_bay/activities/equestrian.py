from __future__ import annotations

from dataclasses import dataclass

from blackjack.rng import SECURE_RANDOM
from mandalay_bay.activities.base import Activity, ActivityInfo
from mandalay_bay.dealers import announce_dealer, pick_quip
from mandalay_bay.session import PlayerSession
from mandalay_bay.stakes import effective_table_stakes, pick_stake_tier

# ── Dressage ──────────────────────────────────────────────────────────────────

DRESSAGE_RIDERS = [
    ("Isabelle Fontaine", "Éclat du Soir"),
    ("Klaus von Reiter", "Silbersturm"),
    ("Sofia Ramirez", "Fuego Dorado"),
    ("Emma Blackwell", "Midnight Sonata"),
    ("Henrik Larsson", "Kronborg Prince"),
    ("Yuki Tanaka", "Sakura Waltz"),
    ("Olivia Hartford", "Royal Minuet"),
    ("Marco Bellini", "Venezia Danza"),
]

DRESSAGE_LEVELS = ["Grand Prix", "Grand Prix Spécial", "Grand Prix Freestyle"]

DRESSAGE_MOVEMENTS = [
    "piaffe", "passage", "half-pass", "pirouette",
    "tempi changes", "extended trot", "collected canter",
]


@dataclass
class DressageEntry:
    number: int
    rider: str
    horse: str
    technical_score: float   # 0–100 points from judges
    artistic_score: float    # 0–100 points from judges
    odds: int

    @property
    def total_score(self) -> float:
        return (self.technical_score + self.artistic_score) / 2

    @property
    def label(self) -> str:
        return f"#{self.number} {self.rider} on {self.horse}"


@dataclass
class DressageCard:
    level: str
    arena: str
    entries: list[DressageEntry]
    results: list[int] | None = None


def _generate_dressage() -> DressageCard:
    level = SECURE_RANDOM.choice(DRESSAGE_LEVELS)
    arena = SECURE_RANDOM.choice([
        "Mandalay Grand Arena", "Pavilion Dressage Ring", "Indoor Arena A",
    ])
    count = SECURE_RANDOM.randrange(4, 7)
    pool = list(range(len(DRESSAGE_RIDERS)))
    SECURE_RANDOM.shuffle(pool)
    chosen = [DRESSAGE_RIDERS[i] for i in pool[:count]]

    entries: list[DressageEntry] = []
    for i, (rider, horse) in enumerate(chosen):
        tech = SECURE_RANDOM.uniform(55.0, 85.0)
        art = SECURE_RANDOM.uniform(55.0, 85.0)
        combined = (tech + art) / 2
        if combined >= 75:
            odds = SECURE_RANDOM.choice([-180, -150, -120])
        elif combined >= 67:
            odds = SECURE_RANDOM.choice([110, 140, 180])
        else:
            odds = SECURE_RANDOM.choice([220, 300, 450])
        entries.append(DressageEntry(i + 1, rider, horse, tech, art, odds))
    return DressageCard(level=level, arena=arena, entries=entries)


def _simulate_dressage(card: DressageCard) -> list[int]:
    """Return entry numbers ordered by simulated final score (highest first)."""
    scored = []
    for e in card.entries:
        noise = SECURE_RANDOM.uniform(-3.0, 3.0)
        scored.append((e.number, e.total_score + noise))
    scored.sort(key=lambda x: x[1], reverse=True)
    return [num for num, _ in scored]


def _payout_win(amount: int, odds: int) -> int:
    if odds > 0:
        return amount + (amount * odds) // 100
    return amount + (amount * 100) // abs(odds)


class DressageActivity(Activity):
    info = ActivityInfo(
        id="dressage",
        name="Dressage Arena",
        floor="Equestrian Arena",
        description="Score-based dressage competition — bet on the top-placing horse and rider.",
        min_bet=5,
    )

    def run(self, session: PlayerSession, ui) -> None:
        session.record_visit(self.info.id)
        ui.banner(f"{self.info.floor} — {self.info.name}")
        ui.chip_line(session.wallet.balance)
        dealer = announce_dealer(session, ui, "horse_racing")

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

        card = _generate_dressage()
        pending: list[dict] = []
        session_net = 0
        events = 0

        while True:
            ui.chip_line(session.wallet.balance)
            ui.print(f"\n{card.level} — {card.arena}")
            for e in card.entries:
                sign = "+" if e.odds > 0 else ""
                ui.print(
                    f"  #{e.number} {e.rider} / {e.horse}  "
                    f"Tech {e.technical_score:.1f}  Art {e.artistic_score:.1f}  ({sign}{e.odds})"
                )

            if pending:
                ui.print("\nOpen tickets:")
                for slip in pending:
                    ui.print(f"  {slip['amount']:,} on #{slip['entry']} ({slip['bet_type']})")

            choice = ui.menu_choice(
                ["Place a wager", "Run test & settle tickets", "New entry list"],
                title="Dressage arena:",
            )
            if choice == 0:
                break
            if choice == 1:
                labels = [f"#{e.number} {e.rider}" for e in card.entries]
                pick = ui.menu_choice(labels, title="Pick a rider:")
                if pick == 0:
                    continue
                bet_choice = ui.menu_choice(
                    ["Win (1st place)", "Place (top 2)", "Show (top 3)"],
                    title="Bet type:",
                )
                if bet_choice == 0:
                    continue
                bet_types = ["win", "place", "show"]
                amount = ui.prompt_int(
                    f"Wager ({wager_min}-{wager_max})",
                    wager_min,
                    wager_max,
                    default=wager_min,
                )
                entry = card.entries[pick - 1]
                if not session.wallet.debit(amount, self.info.id, f"{bet_types[bet_choice - 1]} on #{entry.number}"):
                    ui.error("Insufficient chips.")
                    continue
                pending.append({
                    "entry": entry.number,
                    "rider": entry.rider,
                    "odds": entry.odds,
                    "bet_type": bet_types[bet_choice - 1],
                    "amount": amount,
                })
                ui.success(f"Ticket placed: {amount:,} chips on #{entry.number} ({bet_types[bet_choice - 1]}).")
            elif choice == 2:
                if not pending:
                    ui.error("No open tickets.")
                    continue
                card.results = _simulate_dressage(card)
                ui.dim(f'  {dealer.name}: "{pick_quip(dealer, "deal")}"')
                ui.print("\nFINAL STANDINGS:")
                for pos, num in enumerate(card.results, 1):
                    entry = next(e for e in card.entries if e.number == num)
                    ui.print(f"  {pos}. #{num} {entry.rider} / {entry.horse}")
                events += 1
                for slip in pending:
                    pos = card.results.index(slip["entry"]) + 1
                    won = False
                    payout = 0
                    if slip["bet_type"] == "win" and pos == 1:
                        payout = _payout_win(slip["amount"], slip["odds"])
                        won = True
                    elif slip["bet_type"] == "place" and pos <= 2:
                        payout = slip["amount"] * 2
                        won = True
                    elif slip["bet_type"] == "show" and pos <= 3:
                        payout = slip["amount"] * 2
                        won = True
                    if won:
                        session.wallet.credit(payout, self.info.id, f"{slip['bet_type']} #{slip['entry']}")
                        session_net += payout - slip["amount"]
                        ui.success(f"  WIN #{slip['entry']} {slip['bet_type']}: +{payout - slip['amount']:,}")
                        ui.dim(f'  {dealer.name}: "{pick_quip(dealer, "win")}"')
                    else:
                        session_net -= slip["amount"]
                        ui.dim(f"  LOSE #{slip['entry']} {slip['bet_type']}: -{slip['amount']:,}")
                        ui.dim(f'  {dealer.name}: "{pick_quip(dealer, "lose")}"')
                pending.clear()
            elif choice == 3:
                card = _generate_dressage()
                ui.print("New entry list posted.")

        session.record_result(self.info.id, session_net, bets=events)
        ui.print(f"\nDressage session: {'+' if session_net >= 0 else ''}{session_net:,} over {events} event(s)")
        ui.pause()


# ── Show Jumping ──────────────────────────────────────────────────────────────

JUMPER_RIDERS = [
    ("Claudia Mercer", "Firefly"),
    ("Jan de Vries", "Dutch Courage"),
    ("Amara Osei", "Golden Horizon"),
    ("Lucas Bertrand", "Vent du Nord"),
    ("Priya Sharma", "Maharaja"),
    ("Caitlin O'Brien", "Irish Storm"),
    ("Tomas Kowalski", "Warsaw Knight"),
    ("Rin Nakamura", "Hayabusa"),
]

JUMPER_COURSES = [
    "Mandalay Grand Prix Course",
    "Pavilion Jumper Ring",
    "Open Derby Field",
]

FENCE_COUNT = 12


@dataclass
class JumperEntry:
    number: int
    rider: str
    horse: str
    ability: float     # underlying clean-round probability (0–1)
    odds: int

    @property
    def label(self) -> str:
        return f"#{self.number} {self.rider} on {self.horse}"


@dataclass
class JumperResult:
    entry_number: int
    faults: int        # 4 per knockdown, 1 per refusal
    time_seconds: float

    @property
    def sort_key(self) -> tuple[int, float]:
        return (self.faults, self.time_seconds)


@dataclass
class JumperCard:
    course: str
    entries: list[JumperEntry]
    results: list[JumperResult] | None = None


def _generate_jumper() -> JumperCard:
    course = SECURE_RANDOM.choice(JUMPER_COURSES)
    count = SECURE_RANDOM.randrange(4, 7)
    pool = list(range(len(JUMPER_RIDERS)))
    SECURE_RANDOM.shuffle(pool)
    chosen = [JUMPER_RIDERS[i] for i in pool[:count]]

    entries: list[JumperEntry] = []
    for i, (rider, horse) in enumerate(chosen):
        ability = SECURE_RANDOM.uniform(0.45, 0.95)
        if ability > 0.82:
            odds = SECURE_RANDOM.choice([-200, -160, -130])
        elif ability > 0.65:
            odds = SECURE_RANDOM.choice([100, 130, 170])
        else:
            odds = SECURE_RANDOM.choice([230, 310, 500])
        entries.append(JumperEntry(i + 1, rider, horse, ability, odds))
    return JumperCard(course=course, entries=entries)


def _simulate_jumper(card: JumperCard) -> list[JumperResult]:
    results: list[JumperResult] = []
    for e in card.entries:
        faults = 0
        for _ in range(FENCE_COUNT):
            if SECURE_RANDOM.random() > e.ability:
                fault_type = SECURE_RANDOM.choice([4, 4, 1])
                faults += fault_type
        base_time = SECURE_RANDOM.uniform(58.0, 78.0)
        time_noise = SECURE_RANDOM.uniform(-2.0, 2.0)
        results.append(JumperResult(e.number, faults, round(base_time + time_noise, 2)))
    results.sort(key=lambda r: r.sort_key)
    return results


class JumperActivity(Activity):
    info = ActivityInfo(
        id="jumper",
        name="Show Jumping",
        floor="Equestrian Arena",
        description="Fault-and-time show jumping — wager on clear rounds and podium finishes.",
        min_bet=5,
    )

    def run(self, session: PlayerSession, ui) -> None:
        session.record_visit(self.info.id)
        ui.banner(f"{self.info.floor} — {self.info.name}")
        ui.chip_line(session.wallet.balance)
        dealer = announce_dealer(session, ui, "horse_racing")

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

        card = _generate_jumper()
        pending: list[dict] = []
        session_net = 0
        events = 0

        while True:
            ui.chip_line(session.wallet.balance)
            ui.print(f"\n{card.course} — {len(card.entries)} competitors, {FENCE_COUNT} fences")
            for e in card.entries:
                sign = "+" if e.odds > 0 else ""
                ui.print(f"  #{e.number} {e.rider} / {e.horse}  ({sign}{e.odds})")

            if pending:
                ui.print("\nOpen tickets:")
                for slip in pending:
                    ui.print(f"  {slip['amount']:,} on #{slip['entry']} ({slip['bet_type']})")

            choice = ui.menu_choice(
                ["Place a wager", "Run course & settle tickets", "New draw"],
                title="Show jumping:",
            )
            if choice == 0:
                break
            if choice == 1:
                labels = [f"#{e.number} {e.rider}" for e in card.entries]
                pick = ui.menu_choice(labels, title="Pick a rider:")
                if pick == 0:
                    continue
                bet_choice = ui.menu_choice(
                    ["Win (1st place)", "Place (top 2)", "Show (top 3)", "Clear round (0 faults)"],
                    title="Bet type:",
                )
                if bet_choice == 0:
                    continue
                bet_map = {1: "win", 2: "place", 3: "show", 4: "clear"}
                bet_type = bet_map[bet_choice]
                amount = ui.prompt_int(
                    f"Wager ({wager_min}-{wager_max})",
                    wager_min,
                    wager_max,
                    default=wager_min,
                )
                entry = card.entries[pick - 1]
                if not session.wallet.debit(amount, self.info.id, f"{bet_type} on #{entry.number}"):
                    ui.error("Insufficient chips.")
                    continue
                pending.append({
                    "entry": entry.number,
                    "rider": entry.rider,
                    "odds": entry.odds,
                    "bet_type": bet_type,
                    "amount": amount,
                })
                ui.success(f"Ticket placed: {amount:,} chips on #{entry.number} ({bet_type}).")
            elif choice == 2:
                if not pending:
                    ui.error("No open tickets.")
                    continue
                card.results = _simulate_jumper(card)
                ui.dim(f'  {dealer.name}: "{pick_quip(dealer, "deal")}"')
                ui.print("\nFINAL STANDINGS:")
                for pos, r in enumerate(card.results, 1):
                    entry = next(e for e in card.entries if e.number == r.entry_number)
                    fault_str = "Clear" if r.faults == 0 else f"{r.faults} faults"
                    ui.print(f"  {pos}. #{r.entry_number} {entry.rider} / {entry.horse}  {fault_str}  {r.time_seconds}s")
                events += 1
                ordered_nums = [r.entry_number for r in card.results]
                for slip in pending:
                    pos = ordered_nums.index(slip["entry"]) + 1
                    result = next(r for r in card.results if r.entry_number == slip["entry"])
                    won = False
                    payout = 0
                    bt = slip["bet_type"]
                    if bt == "win" and pos == 1:
                        payout = _payout_win(slip["amount"], slip["odds"])
                        won = True
                    elif bt == "place" and pos <= 2:
                        payout = slip["amount"] * 2
                        won = True
                    elif bt == "show" and pos <= 3:
                        payout = slip["amount"] * 2
                        won = True
                    elif bt == "clear" and result.faults == 0:
                        payout = slip["amount"] * 3
                        won = True
                    if won:
                        session.wallet.credit(payout, self.info.id, f"{bt} #{slip['entry']}")
                        session_net += payout - slip["amount"]
                        ui.success(f"  WIN #{slip['entry']} {bt}: +{payout - slip['amount']:,}")
                        ui.dim(f'  {dealer.name}: "{pick_quip(dealer, "win")}"')
                    else:
                        session_net -= slip["amount"]
                        ui.dim(f"  LOSE #{slip['entry']} {bt}: -{slip['amount']:,}")
                        ui.dim(f'  {dealer.name}: "{pick_quip(dealer, "lose")}"')
                pending.clear()
            elif choice == 3:
                card = _generate_jumper()
                ui.print("New draw posted.")

        session.record_result(self.info.id, session_net, bets=events)
        ui.print(f"\nJumper session: {'+' if session_net >= 0 else ''}{session_net:,} over {events} event(s)")
        ui.pause()
