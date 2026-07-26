# Sports Book

Simulated sports wagering and prediction markets at the **Sports Book** floor.

## Supported sports

- NFL, NBA, MLB, MLS Soccer
- NHL, NCAA Football, NCAA Basketball
- UFC/MMA, Tennis, PGA Golf

Events use real team names, division-aware matchups, strength-based odds, and sport-accurate score simulation.

## Game flow

```
Sports Book → Sports | Predictions tabs → Place wagers → Settle all → Wallet updated
```

## Sports bet types

| Type | Description |
|------|-------------|
| **Moneyline** | Outright winner |
| **Spread** | Cover the point spread (-110 juice) |
| **Total (O/U)** | Combined score over/under the line |
| **Props** | e.g. both teams score, combined TDs |
| **Outright** | UFC, tennis, golf winner markets |

**Push**: Ties on moneyline, exact spread, or exact total return the stake.

## Prediction markets

Binary YES/NO contracts priced in cents (Polymarket-style):

| Category | Examples |
|----------|----------|
| **Sports Pulse** | Cover spreads, totals — linked to board events |
| **Headlines & Buzz** | Award shows, viral stories |
| **Vegas & Resort** | Strip traffic, pool attendance |
| **Public Sentiment** | Crowd/poll swings, social buzz |
| **History Desk** | Real historical events with fixed, deterministic resolutions |
| **Easter Eggs** | Ludicrous scenarios — alien disclosure, buffet infinity, time-travel whales |

- Buy YES @ 35¢ with 100 chips → max payout ~286 chips if YES resolves
- Prices drift ±5¢ on refresh (history markets drift less)
- **High volatility** — you can lose your entire stake
- History markets resolve to documented truth, not random simulation

### Pixel RPG

Talk to **Bookie Blake** in the Race & Sports Book. He opens the board on the sports tab, or straight onto the prediction markets if you ask what's on it.

## Board

- 10 events with sport filter chips
- Optional live fixture sync (web) when network and API are available
- Refresh preserves open tickets against original events

## Settlement

One **Settle all open positions** run:

1. Simulates final scores (sport-specific models, correlated with pre-game strength)
2. Resolves sports tickets and prediction contracts
3. Credits winnings and clears the slip

## Minimum wager

$10 chips per ticket or contract.

## Implementation

- `docs/js/sportSimulator.js`, `docs/js/predictionMarkets.js`, `docs/js/sportsbook.js`
- `mandalay_bay/sport_simulator.py`, `mandalay_bay/prediction_markets.py`
- Data: `docs/data/sports_catalog.json`
- Tests: `tests/test_sportsbook.py`, `tests/test_sport_simulator.py`, `tests/test_prediction_markets.py`
