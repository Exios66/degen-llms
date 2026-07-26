"""Trading Floor — futures and call/put options on NYSE, commodities, crypto."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from blackjack.rng import SECURE_RANDOM

_CATALOG: dict[str, Any] | None = None
_SYMBOLS: dict[str, Any] | None = None


def catalog_path() -> Path:
    return Path(__file__).resolve().parent / "data" / "trading_catalog.json"


def market_symbols_path() -> Path:
    return Path(__file__).resolve().parent / "data" / "market_symbols.json"


def load_catalog() -> dict[str, Any]:
    global _CATALOG
    if _CATALOG is not None:
        return _CATALOG
    with catalog_path().open(encoding="utf-8") as f:
        _CATALOG = json.load(f)
    return _CATALOG


def load_market_symbols() -> dict[str, Any]:
    """Underlying symbol database with 1d/1w performance series."""
    global _SYMBOLS
    if _SYMBOLS is not None:
        return _SYMBOLS
    path = market_symbols_path()
    if not path.exists():
        _SYMBOLS = {"version": 0, "symbols": []}
        return _SYMBOLS
    with path.open(encoding="utf-8") as f:
        _SYMBOLS = json.load(f)
    return _SYMBOLS


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


def underlyings_from_catalog(
    catalog: dict[str, Any] | None = None,
    *,
    asset_class: str = "all",
) -> list[dict[str, Any]]:
    """Unique underlyings with spot ≈ futures mark, enriched from symbol DB."""
    catalog = catalog or load_catalog()
    symbol_db = load_market_symbols()
    by_sym = {row["symbol"]: row for row in symbol_db.get("symbols") or []}
    best: dict[str, dict[str, Any]] = {}
    for c in catalog.get("contracts") or []:
        if c.get("instrument") != "future":
            continue
        sym = c["symbol"]
        mark = float(c.get("markPrice") or 0)
        prev = best.get(sym)
        if prev is None or mark > float(prev["spot"]):
            meta = by_sym.get(sym) or {}
            best[sym] = {
                "symbol": sym,
                "underlying": c.get("underlying", sym),
                "assetClass": c.get("assetClass", "nyse"),
                "spot": mark,
                "perf1dPct": float(meta.get("perf1dPct") or 0),
                "perf1wPct": float(meta.get("perf1wPct") or 0),
                "sector": meta.get("sector") or c.get("assetClass", "nyse"),
                "series1d": list(meta.get("series1d") or [mark]),
                "series1w": list(meta.get("series1w") or [mark]),
            }
    rows = sorted(best.values(), key=lambda q: (q["assetClass"], q["symbol"]))
    if asset_class != "all":
        rows = [q for q in rows if q["assetClass"] == asset_class]
    return rows


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
