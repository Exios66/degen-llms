"""Refund open wagers when leaving an activity without settling."""
from __future__ import annotations

from typing import Any

from mandalay_bay.chips import TransactionKind, is_finite_amount


def refund_ticket_amounts(
    session,
    activity_id: str,
    amounts: list[int],
    *,
    reason: str,
) -> int:
    total = sum(amount for amount in amounts if is_finite_amount(amount) and amount > 0)
    if total <= 0:
        return 0
    session.wallet.credit(total, activity_id, reason, kind=TransactionKind.REFUND)
    return total


def refund_slips(session, activity_id: str, slips: list[dict[str, Any]], *, reason: str) -> int:
    return refund_ticket_amounts(
        session,
        activity_id,
        [s.get("amount", 0) for s in slips if isinstance(s, dict)],
        reason=reason,
    )


def refund_trading_positions(session, activity_id: str, positions: list[dict[str, Any]], *, reason: str) -> int:
    return refund_ticket_amounts(
        session,
        activity_id,
        [p.get("cost", 0) for p in positions if isinstance(p, dict)],
        reason=reason,
    )
