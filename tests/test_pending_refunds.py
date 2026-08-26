"""Refund open wagers when leaving without settling."""
from mandalay_bay.chips import ChipWallet
from mandalay_bay.pending_refunds import refund_slips, refund_trading_positions
from mandalay_bay.session import PlayerSession


def test_refund_open_tickets() -> None:
    session = PlayerSession()
    session.wallet = ChipWallet(balance=1000)
    session.wallet.debit(100, "horse_racing", "win bet")
    session.wallet.debit(50, "horse_racing", "place bet")
    assert session.wallet.balance == 850
    total = refund_slips(
        session,
        "horse_racing",
        [{"amount": 100}, {"amount": 50}],
        reason="test refund",
    )
    assert total == 150
    assert session.wallet.balance == 1000


def test_refund_trading_positions() -> None:
    session = PlayerSession()
    session.wallet = ChipWallet(balance=500)
    session.wallet.debit(200, "trading_desk", "buy contract")
    total = refund_trading_positions(
        session,
        "trading_desk",
        [{"cost": 200}],
        reason="leave refund",
    )
    assert total == 200
    assert session.wallet.balance == 500
