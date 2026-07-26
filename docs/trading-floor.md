# Trading Floor

**Mandalay Markets** — long-only futures and call/put options on NYSE equities, commodities, and crypto. Contracts come from a stored catalog (`trading_catalog.json`, 700+ listings) with filterable pages.

## Game flow

```
Trading Floor → Live ticker + sparkline → Filter asset / instrument → Buy contracts → Settle / expire → Wallet updated
```

## Live underlying tape

While on the Trading Floor, a **LIVE** scrolling ticker shows spot prices for every underlying (NYSE, commodities, crypto) derived from futures marks, plus a rotating sparkline chart. Quotes random-walk so you can see where the book is trading before you buy.

## Asset classes

| Class | Examples |
|-------|----------|
| **NYSE** | Large-cap equities & index proxies |
| **Commodities** | Energy, metals, softs |
| **Crypto** | Major coins and pairs |

## Instruments

| Instrument | Entry cost | Settlement |
|------------|------------|------------|
| **Future** | Margin stub ≈ 10% of notional (min 25 chips) | PnL = (exit − entry) × multiplier × qty |
| **Call** | Premium = ask × multiplier × qty | Intrinsic = max(0, spot − strike) |
| **Put** | Premium = ask × multiplier × qty | Intrinsic = max(0, strike − spot) |

Exit spot is the contract mark drifted by a small random move at settlement. No naked shorts.

## Filters & paging

- Asset chips: All / NYSE / Commodities / Crypto
- Instrument chips: All / Future / Call / Put
- **Next contract page** advances the catalog cursor within the active filter

## Minimum trade

25 chips.

## Implementation

- Web: `docs/js/tradingDesk.js`, `docs/js/ui/trading-desk-renderers.js`
- CLI: `mandalay_bay/trading_desk.py`, `mandalay_bay/activities/trading_desk.py`
- Data: `docs/data/trading_catalog.json` / `mandalay_bay/data/trading_catalog.json`
- Tests: `tests/test_market_scenarios.py`
