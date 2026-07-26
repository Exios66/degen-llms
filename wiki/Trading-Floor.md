# Trading Floor

**Mandalay Markets** — long-only futures and call/put options on NYSE equities, commodities, and crypto. Contracts come from a stored catalog (`trading_catalog.json`, 700+ listings) with filterable pages.

## Game flow

```
Trading Floor → Filter asset / instrument → Buy contracts → Settle / expire → Wallet updated
```

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

## Pixel RPG

Trading Desk encounters mount the shared terminal renderers when present on the property maps.

## Implementation

| Path | Role |
|------|------|
| `mandalay_bay/trading_desk.py` | Python engine |
| `mandalay_bay/activities/trading_desk.py` | CLI activity |
| `docs/js/tradingDesk.js` | Browser mirror |
| `docs/js/ui/trading-desk-renderers.js` | Screens the RPG mounts too |
| `docs/data/trading_catalog.json` | Shared catalog twin |

See [[Casino-Offerings]] and [[Sports-Book-and-Prediction-Markets]].
