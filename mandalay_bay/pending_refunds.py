"""Refund open wagers when leaving an activity without settling."""
from __future__ import annotations

from typing import Any


def refund_ticket_amounts(
    session,
    activity_id: str,
    amounts: list[int],
    *,
    reason: str,
) -> int:
    total = sum(amounts)
    if total <= 0:
        return 0
    session.wallet.credit(total, activity_id, reason)
    return total


def refund_slips(session, activity_id: str, slips: list[dict[str, Any]], *, reason: str) -> int:
    return refund_ticket_amounts(
        session,
        activity_id,
        [int(s.get("amount", 0)) for s in slips],
        reason=reason,
    )


def refund_trading_positions(session, activity_id: str, positions: list[dict[str, Any]], *, reason: str) -> int:
    return refund_ticket_amounts(
        session,
        activity_id,
        [int(p.get("cost", 0)) for p in positions],
        reason=reason,
    )
