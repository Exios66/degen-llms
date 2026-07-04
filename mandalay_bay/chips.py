from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum


class TransactionKind(str, Enum):
    BUY_IN = "buy_in"
    CASH_OUT = "cash_out"
    WAGER = "wager"
    WIN = "win"
    PUSH = "push"
    REFUND = "refund"


@dataclass(frozen=True, slots=True)
class ChipTransaction:
    timestamp: datetime
    kind: TransactionKind
    amount: int
    activity: str
    description: str
    balance_after: int


@dataclass
class ChipWallet:
    """Unified chip economy shared across all casino activities."""

    balance: int
    transactions: list[ChipTransaction] = field(default_factory=list)

    def __post_init__(self) -> None:
        if self.balance < 0:
            raise ValueError("Chip balance cannot be negative")

    def _record(self, kind: TransactionKind, amount: int, activity: str, description: str) -> None:
        self.transactions.append(
            ChipTransaction(
                timestamp=datetime.now(timezone.utc),
                kind=kind,
                amount=amount,
                activity=activity,
                description=description,
                balance_after=self.balance,
            )
        )

    def can_afford(self, amount: int) -> bool:
        return amount > 0 and self.balance >= amount

    def debit(self, amount: int, activity: str, description: str) -> bool:
        if not self.can_afford(amount):
            return False
        self.balance -= amount
        self._record(TransactionKind.WAGER, -amount, activity, description)
        return True

    def credit(self, amount: int, activity: str, description: str, *, kind: TransactionKind = TransactionKind.WIN) -> None:
        if amount <= 0:
            return
        self.balance += amount
        self._record(kind, amount, activity, description)

    def buy_in(self, amount: int) -> None:
        if amount <= 0:
            raise ValueError("Buy-in must be positive")
        self.balance += amount
        self._record(TransactionKind.BUY_IN, amount, "cashier", f"Purchased ${amount:,} in chips")

    def cash_out(self, amount: int) -> bool:
        if amount <= 0 or amount > self.balance:
            return False
        self.balance -= amount
        self._record(TransactionKind.CASH_OUT, -amount, "cashier", f"Cashed out ${amount:,} in chips")
        return True

    def apply_delta(self, delta: int, activity: str, description: str) -> None:
        """Apply a net chip change and record it in the ledger."""
        if delta == 0:
            return
        self.balance += delta
        kind = TransactionKind.WIN if delta > 0 else TransactionKind.WAGER
        self._record(kind, delta, activity, description)

    def reconcile(self, expected_balance: int, activity: str, description: str) -> None:
        """Align wallet balance with an external source (e.g. table rail)."""
        self.apply_delta(expected_balance - self.balance, activity, description)

    def sync_balance(self, new_balance: int, activity: str, description: str) -> None:
        """Legacy alias for reconcile."""
        self.reconcile(new_balance, activity, description)

    @property
    def net_session(self) -> int:
        return sum(
            t.amount
            for t in self.transactions
            if t.kind not in (TransactionKind.BUY_IN, TransactionKind.CASH_OUT)
        )

    def recent_transactions(self, limit: int = 10) -> list[ChipTransaction]:
        return self.transactions[-limit:]
