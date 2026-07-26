"""Trading Floor — futures and call/put options on NYSE, commodities, crypto."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from blackjack.rng import SECURE_RANDOM

_CATALOG: dict[str, Any] | None = None


def catalog_path() -> Path:
    return Path(__file__).resolve().parent / "data" / "trading_catalog.json"


def load_catalog() -> dict[str, Any]:
    global _CATALOG
    if _CATALOG is not None:
        return _CATALOG
    with catalog_path().open(encoding="utf-8") as f:
        _CATALOG = json.load(f)
    return _CATALOG


def filter_contracts(
    contracts: list[dict[str, Any]],
    asset_class: str = "all",
    instrument: str = "all",
) -> list[dict[str, Any]]:
    out = []
    for c in contracts:
        if asset_class != "all" and c.get("assetClass") != asset_class:
            continue
        if instrument != "all" and c.get("instrument") != instrument:
            continue
        out.append(c)
    return out


def entry_cost_chips(contract: dict[str, Any], qty: int = 1) -> int:
    px = float(contract.get("ask") or contract.get("markPrice") or 0)
    mult = int(contract.get("multiplier") or 1)
    if contract.get("instrument") == "future":
        return max(25, int(px * mult * 0.1 * qty))
    return max(1, int(px * mult * qty))


def drift_spot(mark: float) -> float:
    pct = SECURE_RANDOM.randint(-40, 40) / 1000
    return max(0.0001, round(mark * (1 + pct), 4))


def settle_position(position: dict[str, Any], exit_spot: float) -> dict[str, Any]:
    contract = position["contract"]
    qty = int(position["qty"])
    entry = float(position["entryPrice"])
    cost = int(position["cost"])
    mult = int(contract.get("multiplier") or 1)
    instrument = contract.get("instrument")

    if instrument == "future":
        pnl = int((exit_spot - entry) * mult * qty)
        reason = f"Future {contract['symbol']} ({entry} → {exit_spot})"
    elif instrument == "call":
        intrinsic = max(0.0, exit_spot - float(contract.get("strike") or 0))
        proceeds = int(intrinsic * mult * qty)
        pnl = proceeds - cost
        reason = f"Call {contract['symbol']} {contract.get('strike')} intrinsic {intrinsic}"
    else:
        intrinsic = max(0.0, float(contract.get("strike") or 0) - exit_spot)
        proceeds = int(intrinsic * mult * qty)
        pnl = proceeds - cost
        reason = f"Put {contract['symbol']} {contract.get('strike')} intrinsic {intrinsic}"

    payout = max(0, cost + pnl)
    return {"won": pnl >= 0, "pnl": pnl, "payout": payout, "exitSpot": exit_spot, "reason": reason}
