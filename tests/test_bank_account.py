from mandalay_bay.bank_account import (
    BankAccount,
    buy_in_for_session,
    cash_out_to_bank,
    ensure_bank,
    fund_bank_from_outside,
)
from mandalay_bay.chips import ChipWallet
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
    import pytest

    with pytest.raises(ValueError):
        BankAccount(balance=-1)
