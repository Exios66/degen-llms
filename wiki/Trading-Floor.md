# Trading Floor

**Mandalay Markets** — long-only futures and call/put options on NYSE equities, commodities, and crypto. Contracts come from a stored catalog (`trading_catalog.json`, 700+ listings) with filterable pages. Underlyings and performance series live in `market_symbols.json`.

## Game flow

```
Trading Floor → Category filter → Live tape (full book or isolated class) → 1D/1W chart + recent prints → Buy contract → Settle / expire → Wallet updated
```

## Symbol database

`market_symbols.json` holds every tradable underlying (NYSE, commodities, crypto) with base spots, synthetic **1D/1W** performance, and chart series. The live tape random-walks from those marks.

## Live underlying tape

- **All assets** — full-spectrum scroll of every symbol
- **Category chips** — isolate NYSE / Commodities / Crypto on the tape and charts
- Chart toggle **1D / 1W** plus recent print activity before you buy
- Buy screen keeps a focused ticker on the selected underlying

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

## Pixel RPG

Hosted Trading Floor encounter mounts the same terminal screens (ticker + filters).

## Implementation

- Web: `docs/js/tradingDesk.js`, `docs/js/marketSymbols.js`, `docs/js/marketTicker.js`, `docs/js/ui/trading-desk-renderers.js`
- CLI: `mandalay_bay/trading_desk.py`, `mandalay_bay/activities/trading_desk.py`
- Data: `docs/data/trading_catalog.json`, `docs/data/market_symbols.json` (Python twins under `mandalay_bay/data/`)
- Tests: `tests/test_market_scenarios.py`
