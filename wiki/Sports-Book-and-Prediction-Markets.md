# Sports Book and Prediction Markets

Simulated sports wagering and prediction markets at the **Sports Book** floor.

![Sports Book floor in the web terminal](images/sportsbook.png)

Minimum wager: **10 chips** per ticket or contract.

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

## Board

- 10 events with sport filter chips
- Optional live fixture sync (web) when network and API are available
- Refresh preserves open tickets against original events

## Settlement

One **Settle all open positions** run:

1. Simulates final scores (sport-specific models)
2. Resolves sports tickets and prediction contracts
3. Credits winnings and clears the slip

---

## Prediction markets

Binary YES/NO contracts priced in cents (Polymarket-style). Accessible via the **Predictions** tab in the Sports Book.

### Categories

| Category | Content |
|----------|---------|
| **Sports Pulse** | Cover spreads, totals — linked to board events |
| **Headlines & Buzz** | Award shows, viral stories |
| **Vegas & Resort** | Strip traffic, pool attendance |
| **Public Sentiment** | Crowd/poll swings, social buzz |
| **History Desk** | Real historical events with fixed, deterministic resolutions |
| **Easter Eggs** | Ludicrous scenarios — alien disclosure, buffet infinity, time-travel whales |

### How contracts work

- Buy YES @ 35¢ with 100 chips → max payout ~286 chips if YES resolves
- Prices drift ±5¢ on refresh (history markets drift less)
- **High volatility** — you can lose your entire stake
- History markets resolve to documented truth, not random simulation

### Filtering

Category filter chips let you browse Sports Pulse, Headlines, Vegas, History, Easter Eggs, and more.

### Example easter egg markets

- "Will the Mandalay Bay wave pool achieve sentience by 2027?"
- "Buffet line exceeds 4 hours at the Bellagio on a Tuesday"
- "A whale tips the valet in cryptocurrency"

## Pixel RPG

Talk to **Bookie Blake** in the Race & Sports Book. He opens the board on the
sports tab, or straight onto the prediction markets if you ask what's on it.

## Implementation

| Path | Role |
|------|------|
| `mandalay_bay/sport_simulator.py` | Score simulation |
| `mandalay_bay/prediction_markets.py` | Market generation & resolution |
| `mandalay_bay/activities/sportsbook.py` | CLI activity |
| `docs/js/sportSimulator.js` | Browser sim |
| `docs/js/predictionMarkets.js` | Browser markets |
| `docs/js/sportsbook.js` | Board UI |
| `docs/js/ui/sportsbook-renderers.js` | Board, wager types, and market screens the RPG mounts too |
