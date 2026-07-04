import pytest

from mandalay_bay.chips import ChipWallet, TransactionKind
from mandalay_bay.session import PlayerSession


def test_wallet_debit_and_credit() -> None:
    wallet = ChipWallet(balance=1000)
    assert wallet.debit(100, "slots", "spin")
    assert wallet.balance == 900
    wallet.credit(250, "slots", "jackpot")
    assert wallet.balance == 1150


def test_wallet_cannot_overdraft() -> None:
    wallet = ChipWallet(balance=50)
    assert not wallet.debit(100, "blackjack", "bet")
    assert wallet.balance == 50


def test_buy_in_and_cash_out() -> None:
    wallet = ChipWallet(balance=500)
    wallet.buy_in(500)
    assert wallet.balance == 1000
    assert wallet.cash_out(200)
    assert wallet.balance == 800


def test_session_stats() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=1000))
    session.record_visit("slots")
    session.record_result("slots", 150, bets=10)
    stats = session.stat_for("slots")
    assert stats.visits == 1
    assert stats.hands_or_bets == 10
    assert stats.net_winnings == 150


def test_negative_balance_rejected() -> None:
    with pytest.raises(ValueError):
        ChipWallet(balance=-1)
