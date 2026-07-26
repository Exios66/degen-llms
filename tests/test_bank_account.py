import pytest

from mandalay_bay.bank_account import (
    BANK_RESORT_PURCHASES,
    OUTSIDE_EXPENSE_CATEGORIES,
    OUTSIDE_EXPENSE_GROUPS,
    BankAccount,
    buy_in_for_session,
    cash_out_to_bank,
    ensure_bank,
    fund_bank_from_outside,
    pay_bank_expense,
    purchase_bank_resort_item,
)
from mandalay_bay.chips import ChipWallet
from mandalay_bay.hotel import late_checkout
from mandalay_bay.intoxication import INTOXICATION_MAX, attach_intoxication_to_session, get_intoxication_level
from mandalay_bay.rewards import ensure_rewards
from mandalay_bay.session import PlayerSession


def test_bank_deposit_and_expense() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=1000))
    fund_bank_from_outside(session, 500)
    bank = ensure_bank(session)
    assert bank.balance == 500
    assert bank.pay_expense(120, "dining", "Late-night tacos")
    assert bank.balance == 380


def test_cash_out_deposits_to_bank() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=1000))
    assert cash_out_to_bank(session, 300)
    assert session.wallet.balance == 700
    assert ensure_bank(session).balance == 300


def test_buy_in_from_bank() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=100))
    fund_bank_from_outside(session, 400)
    outcome = buy_in_for_session(session, 250)
    assert outcome == "from_bank"
    assert session.wallet.balance == 350
    assert ensure_bank(session).balance == 150


def test_buy_in_outside_funds_when_bank_empty() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=100))
    outcome = buy_in_for_session(session, 200, use_outside_funds=True)
    assert outcome == "outside_funds"
    assert session.wallet.balance == 300
    assert ensure_bank(session).balance == 0


def test_bank_negative_balance_rejected() -> None:
    with pytest.raises(ValueError):
        BankAccount(balance=-1)


def test_expense_groups_include_legal_and_business() -> None:
    ids = {cid for cid, _ in OUTSIDE_EXPENSE_CATEGORIES}
    assert "legal_fees" in ids
    assert "debt_repayment" in ids
    assert "business_expenses" in ids
    assert "business_contracts" in ids
    group_ids = {g["id"] for g in OUTSIDE_EXPENSE_GROUPS}
    assert group_ids == {"personal", "legal", "business", "other"}


def test_pay_legal_and_business_expenses() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=0))
    fund_bank_from_outside(session, 10_000)
    assert pay_bank_expense(session, 500, "legal_fees", "Counsel retainer") == "ok"
    assert pay_bank_expense(session, 800, "debt_repayment", "Card payoff") == "ok"
    assert pay_bank_expense(session, 1200, "business_expenses", "Ops") == "ok"
    assert pay_bank_expense(session, 2000, "business_contracts", "Retainer") == "ok"
    assert ensure_bank(session).balance == 10_000 - 500 - 800 - 1200 - 2000


def test_resort_floor_float_credits_wallet() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=100))
    fund_bank_from_outside(session, 1000)
    assert purchase_bank_resort_item(session, "floor_float") == "ok"
    assert session.wallet.balance == 600
    assert ensure_bank(session).balance == 500


def test_resort_vip_retainer_perk() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=0))
    fund_bank_from_outside(session, 5000)
    assert purchase_bank_resort_item(session, "vip_host_retainer") == "ok"
    bank = ensure_bank(session)
    assert bank.has_perk("vip_host_retainer")
    assert purchase_bank_resort_item(session, "vip_host_retainer") == "unavailable"


def test_late_checkout_consumes_offshore_credit() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=0))
    fund_bank_from_outside(session, 1000)
    assert purchase_bank_resort_item(session, "late_checkout_credit") == "ok"
    res = late_checkout(session)
    assert res.ok
    assert "offshore late-checkout credit" in res.message
    assert not ensure_bank(session).has_perk("late_checkout_credit")


def test_recovery_spa_settles_intoxication() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=0))
    attach_intoxication_to_session(session, {"intoxication": {"level": INTOXICATION_MAX, "total_doses": 20}})
    fund_bank_from_outside(session, 1000)
    assert purchase_bank_resort_item(session, "recovery_spa") == "ok"
    assert get_intoxication_level(session) == 0


def test_resort_catalog_nonempty() -> None:
    assert len(BANK_RESORT_PURCHASES) >= 8
    ensure_rewards(PlayerSession(wallet=ChipWallet(balance=0)))
