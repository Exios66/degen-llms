# Sports Book

Simulated sports wagering and prediction markets at the **Sports Book** floor, backed by stored scenario databases (≥125 entries each) that cycle as you refresh the slate.

## Supported sports

- NFL, NBA, MLB, MLS Soccer
- NHL, NCAA Football, NCAA Basketball
- UFC/MMA, Tennis, PGA Golf

Events use real team names, division-aware matchups, strength-based odds, and sport-accurate score simulation. Stored scenarios also include **futures** (season/tournament winners) and richer prop boards.

## Game flow

```
Sports Book → Sports | Predictions tabs → Place wagers / parlays → Next slate → Settle all → Wallet updated
```

## Sports bet types

| Type | Description |
|------|-------------|
| **Moneyline** | Outright winner |
| **Spread** | Cover the point spread (-110 juice) |
| **Total (O/U)** | Combined score over/under the line |
| **Props** | e.g. both teams score, combined TDs |
| **Outright** | UFC, tennis, golf winner markets |
| **Futures** | Season / tournament winner contracts from the scenario book |
| **Parlay** | 2–4 legs (ML or totals); American odds combined |

**Push**: Ties on moneyline, exact spread, or exact total return the stake.

## Prediction markets

Binary YES/NO contracts priced in cents (Polymarket-style), paged from `prediction_scenarios.json`:

| Category | Examples |
|----------|----------|
| **Sports Pulse** | Cover spreads, totals — linked to board events |
| **Headlines & Buzz** | Award shows, viral stories |
| **Vegas & Resort** | Strip traffic, pool attendance |
| **Public Sentiment** | Crowd/poll swings, social buzz |
| **History Desk** | Real historical events with fixed, deterministic resolutions |
| **Easter Eggs** | Ludicrous scenarios — alien disclosure, buffet infinity, time-travel whales |

- Buy YES @ 35¢ with 100 chips → max payout ~286 chips if YES resolves
- **Refresh prices** drifts quotes ±5¢ (history markets drift less)
- **Next prediction slate** advances the stored DB cursor
- History markets resolve to documented truth, not random simulation

### Pixel RPG

Talk to **Bookie Blake** in the Race & Sports Book. He opens the board on the sports tab, or straight onto the prediction markets if you ask what's on it.

## Board & scenario DBs

- Page size ~10 sports events / ~20 prediction markets
- **Next scenario slate** advances `scenarioCursor` through `sports_scenarios.json` (wraps)
- Optional live fixture sync (web) when network and API are available
- Open tickets remain tied to the events they were placed on

Data files:

- `docs/data/sports_scenarios.json` / `mandalay_bay/data/sports_scenarios.json`
- `docs/data/prediction_scenarios.json` / `mandalay_bay/data/prediction_scenarios.json`
- `docs/data/sports_catalog.json` (procedural fallback generators)

## Settlement

One **Settle all open positions** run:

1. Simulates final scores (or futures winners) with sport-specific models
2. Resolves sports tickets (including parlays) and prediction contracts
3. Credits winnings and clears the slip

## Minimum wager

$10 chips per ticket or contract.

## Related

- [Trading Floor](trading-floor.md) — NYSE / commodities / crypto futures & options

## Implementation

- `docs/js/sportSimulator.js`, `docs/js/predictionMarkets.js`, `docs/js/sportsbook.js`
- `mandalay_bay/sport_simulator.py`, `mandalay_bay/prediction_markets.py`
- Tests: `tests/test_sportsbook.py`, `tests/test_sport_simulator.py`, `tests/test_prediction_markets.py`, `tests/test_market_scenarios.py`
