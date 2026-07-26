from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from mandalay_bay.session import PlayerSession

DEFAULT_ACCOUNT_NAME = "Private Offshore Account"


class BankTransactionKind(str, Enum):
    DEPOSIT = "deposit"
    WITHDRAW = "withdraw"
    EXPENSE = "expense"


OUTSIDE_EXPENSE_GROUPS: tuple[dict[str, Any], ...] = (
    {
        "id": "personal",
        "label": "Personal lifestyle",
        "blurb": "Dining, rides, shopping, lodging, and shows off-property.",
        "categories": (
            ("dining", "Dining & drinks (off-property)"),
            ("transport", "Rideshare / taxi"),
            ("shopping", "Shopping & souvenirs"),
            ("lodging", "Nearby lodging"),
            ("entertainment", "Shows & entertainment"),
        ),
    },
    {
        "id": "legal",
        "label": "Legal & obligations",
        "blurb": "Counsel retainers and debt repayments from offshore cash.",
        "categories": (
            ("legal_fees", "Legal fees & counsel"),
            ("debt_repayment", "Debt repayments"),
        ),
    },
    {
        "id": "business",
        "label": "Business affairs",
        "blurb": "Operating costs and contract retainers for your side hustle.",
        "categories": (
            ("business_expenses", "Business operating expenses"),
            ("business_contracts", "Business contracts & retainers"),
        ),
    },
    {
        "id": "other",
        "label": "Miscellaneous",
        "blurb": "Anything that does not fit a cleaner ledger line.",
        "categories": (("other", "Miscellaneous"),),
    },
)

OUTSIDE_EXPENSE_CATEGORIES: tuple[tuple[str, str], ...] = tuple(
    cat for group in OUTSIDE_EXPENSE_GROUPS for cat in group["categories"]
)

BANK_RESORT_PURCHASES: tuple[dict[str, Any], ...] = (
    {
        "id": "floor_float",
        "label": "Floor float — $500 chips",
        "blurb": "Wire a working float straight to your cage wallet.",
        "cost": 500,
        "kind": "chips",
        "amount": 500,
        "repeatable": True,
    },
    {
        "id": "high_roller_float",
        "label": "High-roller float — $2,500 chips",
        "blurb": "A thicker rail for High Limit nights.",
        "cost": 2500,
        "kind": "chips",
        "amount": 2500,
        "repeatable": True,
    },
    {
        "id": "betty_welcome",
        "label": "Betty's welcome round",
        "blurb": "Unlock a complimentary welcome cocktail voucher on Rewards.",
        "cost": 175,
        "kind": "comp",
        "comp_id": "welcome_drink",
        "repeatable": False,
    },
    {
        "id": "arcade_voucher",
        "label": "Arcade free-spin voucher",
        "blurb": "Narrative free-spin flag for Arcade Alley.",
        "cost": 200,
        "kind": "flag",
        "flag": "arcade_slot_voucher",
        "repeatable": False,
    },
    {
        "id": "arcade_drink",
        "label": "Arcade drink refill",
        "blurb": "Welcome-drink refill flag for the cabinet floor.",
        "cost": 125,
        "kind": "flag",
        "flag": "arcade_drink_refill",
        "repeatable": False,
    },
    {
        "id": "late_checkout_credit",
        "label": "Concierge late-checkout credit",
        "blurb": "Carmen holds the room two extra hours — no floor net required.",
        "cost": 350,
        "kind": "perk",
        "perk_id": "late_checkout_credit",
        "repeatable": False,
    },
    {
        "id": "vip_host_retainer",
        "label": "VIP host retainer",
        "blurb": "Opens Foundation Room entry as a host-goodwill path.",
        "cost": 2500,
        "kind": "perk",
        "perk_id": "vip_host_retainer",
        "repeatable": False,
    },
    {
        "id": "high_limit_marker",
        "label": "High Limit salon marker",
        "blurb": "Waives the $10k floor-chip velvet-rope check for the salon.",
        "cost": 5000,
        "kind": "perk",
        "perk_id": "high_limit_marker",
        "repeatable": False,
    },
    {
        "id": "recovery_spa",
        "label": "Eleven Acres recovery spa",
        "blurb": "Clears max intoxication screen effects and resets to sober.",
        "cost": 400,
        "kind": "settle_intox",
        "repeatable": True,
    },
    {
        "id": "lucky_rail",
        "label": "Lucky rail tip",
        "blurb": "Tip the crew — $250 lands on your floor wallet.",
        "cost": 250,
        "kind": "chips",
        "amount": 250,
        "repeatable": True,
    },
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
    resort_perks: dict[str, bool] = field(default_factory=dict)

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

    def has_perk(self, perk_id: str) -> bool:
        return bool(self.resort_perks.get(perk_id))

    def grant_perk(self, perk_id: str) -> None:
        self.resort_perks[perk_id] = True

    def consume_perk(self, perk_id: str) -> bool:
        if not self.resort_perks.get(perk_id):
            return False
        del self.resort_perks[perk_id]
        return True

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
    if getattr(bank, "resort_perks", None) is None:
        bank.resort_perks = {}
    return bank


def cash_out_to_bank(session: PlayerSession, amount: int) -> bool:
    """Move floor chips to the private offshore bank account."""
    from mandalay_bay.chip_limits import CASHOUT_TO_BANK_MAX

    if amount <= 0 or amount > session.wallet.balance:
        return False
    if amount > CASHOUT_TO_BANK_MAX:
        return False
    if not session.wallet.cash_out(amount):
        return False
    ensure_bank(session).deposit(
        amount,
        "casino",
        f"Cashed out ${amount:,} in chips to offshore account",
    )
    return True


def buy_in_for_session(session: PlayerSession, amount: int, *, use_outside_funds: bool = False) -> str:
    """Buy chips for the floor wallet. Returns outcome token."""
    from mandalay_bay.chip_limits import BUY_CHIPS_MAX, bank_withdraw_max_for_session

    if amount <= 0:
        raise ValueError("Buy-in must be positive")
    if amount > BUY_CHIPS_MAX:
        return "over_buy_limit"

    bank = ensure_bank(session)
    if bank.balance >= amount:
        if amount > bank_withdraw_max_for_session(session):
            return "tier_withdraw_limit"
        if not bank.withdraw(amount, "casino", f"Buy-in for ${amount:,} in floor chips"):
            return "failed"
        session.wallet.buy_in(amount)
        return "from_bank"

    if use_outside_funds or bank.balance == 0:
        session.wallet.buy_in(amount)
        return "outside_funds"

    return "insufficient"


def pay_bank_expense(session: PlayerSession, amount: int, category: str, description: str) -> str:
    """Pay an outside expense, capped by MGM Rewards tier withdraw limit."""
    from mandalay_bay.chip_limits import bank_withdraw_max_for_session

    if amount <= 0:
        return "invalid"
    if not is_known_expense_category(category):
        return "invalid_category"
    if amount > bank_withdraw_max_for_session(session):
        return "tier_withdraw_limit"
    bank = ensure_bank(session)
    if not bank.pay_expense(amount, category, description):
        return "insufficient"
    return "ok"


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


def expense_group_by_id(group_id: str) -> dict[str, Any] | None:
    for group in OUTSIDE_EXPENSE_GROUPS:
        if group["id"] == group_id:
            return group
    return None


def is_known_expense_category(category_id: str) -> bool:
    return any(cid == category_id for cid, _ in OUTSIDE_EXPENSE_CATEGORIES)


def get_resort_purchase(item_id: str) -> dict[str, Any] | None:
    for item in BANK_RESORT_PURCHASES:
        if item["id"] == item_id:
            return item
    return None


def resort_purchase_available(session: PlayerSession, item: dict[str, Any]) -> tuple[bool, str]:
    from mandalay_bay.chip_limits import bank_withdraw_max_for_session

    bank = ensure_bank(session)
    cost = int(item["cost"])
    if bank.balance < cost:
        return False, f"Need ${cost:,} offshore."
    if cost > bank_withdraw_max_for_session(session):
        return False, "Above your MGM Rewards withdraw limit."
    if not item.get("repeatable", True):
        if item["kind"] == "perk" and bank.has_perk(str(item["perk_id"])):
            return False, "Already purchased."
        if item["kind"] == "flag":
            flags = _rpg_flags(session)
            if flags.get(item["flag"]):
                return False, "Already unlocked."
        if item["kind"] == "comp":
            rewards = getattr(session, "rewards", None)
            unlocked = list(
                getattr(rewards, "unlocked_comps", None) or getattr(rewards, "unlockedComps", None) or []
            )
            redeemed = list(
                getattr(rewards, "redeemed_comps", None) or getattr(rewards, "redeemedComps", None) or []
            )
            comp_id = item["comp_id"]
            if comp_id in unlocked and comp_id not in redeemed:
                return False, "Voucher already waiting to redeem."
    return True, ""


def _rpg_flags(session: PlayerSession) -> dict[str, Any]:
    web = getattr(session, "web_only_state", None)
    if web is None:
        session.web_only_state = {}
        web = session.web_only_state
    rpg = web.get("rpg")
    if not isinstance(rpg, dict):
        rpg = {}
        web["rpg"] = rpg
    flags = rpg.get("flags")
    if not isinstance(flags, dict):
        flags = {}
        rpg["flags"] = flags
    session.rpg = rpg
    return flags


def purchase_bank_resort_item(session: PlayerSession, item_id: str) -> str:
    """Buy a resort privilege with offshore cash."""
    item = get_resort_purchase(item_id)
    if item is None:
        return "invalid"
    ok, reason = resort_purchase_available(session, item)
    if not ok:
        if "withdraw limit" in reason:
            return "tier_withdraw_limit"
        if reason.startswith("Need"):
            return "insufficient"
        return "unavailable"

    bank = ensure_bank(session)
    cost = int(item["cost"])
    if not bank.pay_expense(cost, "resort", str(item["label"])):
        return "insufficient"

    kind = item["kind"]
    if kind == "chips":
        session.wallet.buy_in(int(item["amount"]))
    elif kind == "comp":
        from mandalay_bay.rewards import ensure_rewards

        rewards = ensure_rewards(session)
        comp_id = str(item["comp_id"])
        unlocked = list(rewards.unlocked_comps)
        if comp_id not in unlocked:
            unlocked.append(comp_id)
            rewards.unlocked_comps = unlocked
        rewards.redeemed_comps = [c for c in rewards.redeemed_comps if c != comp_id]
        flags = _rpg_flags(session)
        if comp_id == "welcome_drink":
            flags["has_welcome_drink_comp"] = True
    elif kind == "flag":
        flags = _rpg_flags(session)
        flags[str(item["flag"])] = True
    elif kind == "perk":
        bank.grant_perk(str(item["perk_id"]))
    elif kind == "settle_intox":
        from mandalay_bay.intoxication import settle_intoxication

        settle_intoxication(session)
    else:
        return "failed"
    return "ok"
