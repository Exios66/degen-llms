"""Cashier buy / offshore cash-out / MGM-tier withdraw ceilings."""

from mandalay_bay.bank_account import (
    buy_in_for_session,
    cash_out_to_bank,
    ensure_bank,
    pay_bank_expense,
)
from mandalay_bay.chip_limits import (
    BUY_CHIPS_MAX,
    CASHOUT_TO_BANK_MAX,
    TIER_BANK_WITHDRAW_MAX,
    bank_withdraw_max_for_session,
)
from mandalay_bay.rewards import RewardsState
from mandalay_bay.session import PlayerSession
from mandalay_bay.trading_desk import underlyings_from_catalog


def test_buy_chips_max_is_one_million() -> None:
    assert BUY_CHIPS_MAX == 1_000_000


def test_cashout_max_is_one_billion() -> None:
    assert CASHOUT_TO_BANK_MAX == 1_000_000_000


def test_chairman_withdraw_matches_cashout_ceiling() -> None:
    assert TIER_BANK_WITHDRAW_MAX["chairman"] == CASHOUT_TO_BANK_MAX
    assert TIER_BANK_WITHDRAW_MAX["sapphire"] < TIER_BANK_WITHDRAW_MAX["pearl"]


def test_withdraw_max_scales_with_rewards_tier() -> None:
    session = PlayerSession()
    session.rewards = RewardsState(lifetime_wagered=0)
    assert bank_withdraw_max_for_session(session) == TIER_BANK_WITHDRAW_MAX["sapphire"]
    session.rewards.lifetime_wagered = 25_000
    assert bank_withdraw_max_for_session(session) == TIER_BANK_WITHDRAW_MAX["chairman"]


def test_buy_in_rejects_over_purchase_limit() -> None:
    session = PlayerSession()
    assert buy_in_for_session(session, BUY_CHIPS_MAX + 1, use_outside_funds=True) == "over_buy_limit"


def test_cash_out_rejects_over_billion() -> None:
    session = PlayerSession()
    session.wallet.balance = CASHOUT_TO_BANK_MAX + 5
    assert cash_out_to_bank(session, CASHOUT_TO_BANK_MAX + 1) is False
    assert cash_out_to_bank(session, CASHOUT_TO_BANK_MAX) is True


def test_expense_respects_tier_withdraw_cap() -> None:
    session = PlayerSession()
    session.rewards = RewardsState(lifetime_wagered=0)
    bank = ensure_bank(session)
    bank.deposit(10_000_000, "outside", "seed")
    cap = bank_withdraw_max_for_session(session)
    assert pay_bank_expense(session, cap + 1, "other", "too much") == "tier_withdraw_limit"
    assert pay_bank_expense(session, cap, "other", "ok") == "ok"


def test_underlyings_from_catalog_has_spots() -> None:
    quotes = underlyings_from_catalog()
    assert len(quotes) >= 10
    assert all(q["spot"] > 0 for q in quotes)
    symbols = {q["symbol"] for q in quotes}
    assert "AAPL" in symbols or "BTC" in symbols or "ETH" in symbols
