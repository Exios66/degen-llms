# Trading Floor

**Mandalay Markets** — long-only futures and call/put options on NYSE equities, commodities, and crypto. Contracts come from a stored catalog (`trading_catalog.json`, 700+ listings) with filterable pages. Underlyings and performance series live in `market_symbols.json`.

## Game flow

```
Trading Floor → Category filter → Live tape (full book or isolated class) → 1D/1W chart + recent prints → Buy contract → Settle / expire → Wallet updated
```

## Symbol database

`market_symbols.json` holds every tradable underlying (NYSE, commodities, crypto) with:

- Base spot seeded from futures marks
- Synthetic **1D** and **1W** performance percentages
- Chart series for day (24 pts) and week (28 pts)

The live tape random-walks from those base spots so the book keeps moving while you browse.

## Live underlying tape

While on the Trading Floor (and on the buy ticket):

- **All assets** — full-spectrum scroll of every symbol in the DB
- **NYSE / Commodities / Crypto** — tape and rotating charts isolate to that category
- Chart toggle **1D / 1W** shows the performance path for the focused underlying
- **Recent activity** lists the latest tape prints before you send an order
- Buy screen keeps a focused ticker on the selected contract’s underlying

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

- Asset chips: All / NYSE / Commodities / Crypto (also scopes the ticker)
- Instrument chips: All / Future / Call / Put
- **Next contract page** advances the catalog cursor within the active filter

## Minimum trade

25 chips.

## Implementation

- Web: `docs/js/tradingDesk.js`, `docs/js/marketSymbols.js`, `docs/js/marketTicker.js`, `docs/js/ui/trading-desk-renderers.js`
- CLI: `mandalay_bay/trading_desk.py`, `mandalay_bay/activities/trading_desk.py`
- Data: `docs/data/trading_catalog.json`, `docs/data/market_symbols.json` (Python twins under `mandalay_bay/data/`)
- Tests: `tests/test_market_scenarios.py`
