from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from mandalay_bay.session import PlayerSession

DEFAULT_ACCOUNT_NAME = "Off-Strip Checking"


class BankTransactionKind(str, Enum):
    DEPOSIT = "deposit"
    WITHDRAW = "withdraw"
    EXPENSE = "expense"


OUTSIDE_EXPENSE_CATEGORIES: tuple[tuple[str, str], ...] = (
    ("dining", "Dining & drinks (off-property)"),
    ("transport", "Rideshare / taxi"),
    ("shopping", "Shopping & souvenirs"),
    ("lodging", "Nearby lodging"),
    ("entertainment", "Shows & entertainment"),
    ("other", "Miscellaneous"),
)


@dataclass(frozen=True, slots=True)
class BankTransaction:
    timestamp: datetime
    kind: BankTransactionKind
    amount: int
    category: str
    description: str
    balance_after: int


@dataclass
class BankAccount:
    """Off-floor account where cashed-out chips land and outside expenses are paid."""

    balance: int = 0
    account_name: str = DEFAULT_ACCOUNT_NAME
    transactions: list[BankTransaction] = field(default_factory=list)

    def __post_init__(self) -> None:
        if self.balance < 0:
            raise ValueError("Bank balance cannot be negative")

    def _record(
        self,
        kind: BankTransactionKind,
        amount: int,
        category: str,
        description: str,
    ) -> None:
        self.transactions.append(
            BankTransaction(
                timestamp=datetime.now(timezone.utc),
                kind=kind,
                amount=amount,
                category=category,
                description=description,
                balance_after=self.balance,
            )
        )

    def can_afford(self, amount: int) -> bool:
        return amount > 0 and self.balance >= amount

    def deposit(self, amount: int, category: str, description: str) -> None:
        if amount <= 0:
            raise ValueError("Deposit must be positive")
        self.balance += amount
        self._record(BankTransactionKind.DEPOSIT, amount, category, description)

    def withdraw(self, amount: int, category: str, description: str) -> bool:
        if not self.can_afford(amount):
            return False
        self.balance -= amount
        self._record(BankTransactionKind.WITHDRAW, -amount, category, description)
        return True

    def pay_expense(self, amount: int, category: str, description: str) -> bool:
        if not self.can_afford(amount):
            return False
        self.balance -= amount
        self._record(BankTransactionKind.EXPENSE, -amount, category, description)
        return True

    def recent_transactions(self, limit: int = 10) -> list[BankTransaction]:
        return self.transactions[-limit:]


def default_bank_account() -> BankAccount:
    return BankAccount()


def ensure_bank(session: PlayerSession) -> BankAccount:
    bank = getattr(session, "bank", None)
    if bank is None:
        bank = default_bank_account()
        session.bank = bank
    return bank


def cash_out_to_bank(session: PlayerSession, amount: int) -> bool:
    """Move floor chips to the off-strip bank account."""
    if amount <= 0 or amount > session.wallet.balance:
        return False
    if not session.wallet.cash_out(amount):
        return False
    ensure_bank(session).deposit(
        amount,
        "casino",
        f"Cashed out ${amount:,} in chips from the floor",
    )
    return True


def buy_in_for_session(session: PlayerSession, amount: int, *, use_outside_funds: bool = False) -> str:
    """Buy chips for the floor wallet. Returns outcome token."""
    if amount <= 0:
        raise ValueError("Buy-in must be positive")

    bank = ensure_bank(session)
    if bank.balance >= amount:
        if not bank.withdraw(amount, "casino", f"Buy-in for ${amount:,} in floor chips"):
            return "failed"
        session.wallet.buy_in(amount)
        return "from_bank"

    if use_outside_funds or bank.balance == 0:
        session.wallet.buy_in(amount)
        return "outside_funds"

    return "insufficient"


def fund_bank_from_outside(session: PlayerSession, amount: int) -> None:
    """Symbolic deposit of personal funds into the off-strip account."""
    ensure_bank(session).deposit(
        amount,
        "outside",
        f"Personal funds deposited to {session.bank.account_name}",
    )


def rename_bank_account(session: PlayerSession, name: str) -> None:
    cleaned = name.strip()
    if cleaned:
        ensure_bank(session).account_name = cleaned


def expense_category_label(category_id: str) -> str:
    for cid, label in OUTSIDE_EXPENSE_CATEGORIES:
        if cid == category_id:
            return label
    return category_id.replace("_", " ").title()
