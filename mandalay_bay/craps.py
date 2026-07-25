"""Craps table engine — pass line + common side bets."""

from __future__ import annotations

from dataclasses import dataclass, field

from blackjack.rng import SECURE_RANDOM

FIELD_NUMBERS = frozenset({2, 3, 4, 9, 10, 11, 12})
FIELD_DOUBLE = frozenset({2, 12})

SIDE_BETS = {
    "field": {"label": "Field (2,3,4,9,10,11,12)", "kind": "one_roll"},
    "any_craps": {"label": "Any Craps (2,3,12) — 7:1", "kind": "one_roll", "payout": 7},
    "any_seven": {"label": "Any Seven — 4:1", "kind": "one_roll", "payout": 4},
    "hard_4": {"label": "Hard 4 — 7:1", "kind": "hardway", "payout": 7, "target": 4},
    "hard_6": {"label": "Hard 6 — 9:1", "kind": "hardway", "payout": 9, "target": 6},
    "hard_8": {"label": "Hard 8 — 9:1", "kind": "hardway", "payout": 9, "target": 8},
    "hard_10": {"label": "Hard 10 — 7:1", "kind": "hardway", "payout": 7, "target": 10},
}


@dataclass
class DiceRoll:
    die1: int
    die2: int

    @property
    def total(self) -> int:
        return self.die1 + self.die2

    @property
    def is_hard(self) -> bool:
        return self.die1 == self.die2 and self.total in {4, 6, 8, 10}

    def label(self) -> str:
        hard = " hard" if self.is_hard else ""
        return f"{self.die1}-{self.die2} ({self.total}{hard})"


@dataclass
class BetResult:
    payout: int
    working: bool
    message: str


@dataclass
class CrapsTable:
    point: int | None = None
    last_roll: DiceRoll | None = None
    rolls: list[DiceRoll] = field(default_factory=list)
    message: str = "Place your bets — come-out roll."

    @property
    def phase(self) -> str:
        return "point" if self.point else "comeout"

    def roll(self) -> DiceRoll:
        roll = DiceRoll(SECURE_RANDOM.randint(1, 6), SECURE_RANDOM.randint(1, 6))
        self.last_roll = roll
        self.rolls.append(roll)
        if len(self.rolls) > 24:
            self.rolls = self.rolls[-24:]
        return roll

    def resolve_pass_line(self, stake: int, roll: DiceRoll) -> BetResult:
        total = roll.total
        if self.point is None:
            if total in (7, 11):
                self.message = f"Come-out {roll.label()} — Pass Line wins!"
                return BetResult(stake * 2, False, self.message)
            if total in (2, 3, 12):
                self.message = f"Come-out {roll.label()} — craps, Pass Line loses."
                return BetResult(0, False, self.message)
            self.point = total
            self.message = f"Come-out {roll.label()} — point is {total}."
            return BetResult(0, True, self.message)
        if total == self.point:
            self.message = f"{roll.label()} — point {self.point} hit! Pass Line wins."
            self.point = None
            return BetResult(stake * 2, False, self.message)
        if total == 7:
            self.message = f"{roll.label()} — seven-out. Pass Line loses."
            self.point = None
            return BetResult(0, False, self.message)
        self.message = f"{roll.label()} — point {self.point} still working."
        return BetResult(0, True, self.message)

    def resolve_dont_pass(self, stake: int, roll: DiceRoll, point_before: int | None) -> BetResult:
        total = roll.total
        if point_before is None:
            if total in (2, 3):
                return BetResult(stake * 2, False, f"Come-out {roll.label()} — Don't Pass wins!")
            if total == 12:
                return BetResult(stake, False, f"Come-out {roll.label()} — Don't Pass push (12).")
            if total in (7, 11):
                return BetResult(0, False, f"Come-out {roll.label()} — Don't Pass loses.")
            return BetResult(0, True, f"Don't Pass working against point {total}.")
        if total == 7:
            return BetResult(stake * 2, False, f"{roll.label()} — seven-out! Don't Pass wins.")
        if total == point_before:
            return BetResult(0, False, f"{roll.label()} — point hit. Don't Pass loses.")
        return BetResult(0, True, f"Don't Pass still working against {point_before}.")

    def resolve_side_bet(self, bet_id: str, stake: int, roll: DiceRoll) -> BetResult:
        total = roll.total
        meta = SIDE_BETS.get(bet_id)
        if not meta:
            raise ValueError(f"Unknown side bet {bet_id}")

        if bet_id == "field":
            if total in FIELD_DOUBLE:
                payout = stake + stake * 2
                return BetResult(payout, False, f"Field hits {total} (2:1) — paid {payout}.")
            if total in FIELD_NUMBERS:
                payout = stake * 2
                return BetResult(payout, False, f"Field hits {total} — paid {payout}.")
            return BetResult(0, False, f"Field misses on {total}.")
        if bet_id == "any_craps":
            if total in (2, 3, 12):
                payout = stake + stake * 7
                return BetResult(payout, False, f"Any Craps hits {total} — paid {payout}.")
            return BetResult(0, False, f"Any Craps misses on {total}.")
        if bet_id == "any_seven":
            if total == 7:
                payout = stake + stake * 4
                return BetResult(payout, False, f"Any Seven hits — paid {payout}.")
            return BetResult(0, False, f"Any Seven misses on {total}.")

        target = int(meta["target"])
        payout_odds = int(meta["payout"])
        if total == target and roll.is_hard:
            payout = stake + stake * payout_odds
            return BetResult(payout, False, f"Hard {target} hits — paid {payout}.")
        if total == target or total == 7:
            return BetResult(0, False, f"Hard {target} loses on {roll.label()}.")
        return BetResult(0, True, f"Hard {target} still working ({roll.label()}).")
