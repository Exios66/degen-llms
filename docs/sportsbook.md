# Sports Book

Simulated sports wagering at the **Sports Book** floor.

## Supported sports

- NFL
- NBA
- MLB
- Soccer

Events are generated with team matchups, moneyline odds, and point spreads.

## Game flow

```
Sports Book → Review board → Place wager(s) → Settle open bets → Back to lobby
```

```mermaid
flowchart LR
    board[Event Board]
    board --> pick[Pick Event]
    pick --> type[Moneyline or Spread]
    type --> team[Pick Team/Side]
    team --> amount[Enter Wager]
    amount --> ticket[Open Ticket]
    ticket --> settle[Settle All]
    settle --> payout[Wallet Updated]
```

## Event board

Each event shows:

```
1) [NFL] Chiefs @ Raiders
   ML: Chiefs +130 | Raiders -150
   Spread: Raiders -1.5 (-110) | Chiefs +1.5 (-110)
```

- **ML** — Moneyline (outright winner)
- **Spread** — Point spread with standard -110 juice

## Bet types

### Moneyline

Pick the team to win outright.

| Odds | Meaning |
|------|---------|
| +130 | $100 bet wins $130 profit |
| -150 | Bet $150 to win $100 profit |

**Push**: If scores tie, stake is returned.

### Spread

Pick a team to cover the point spread.

- **Raiders -1.5** — Raiders must win by 2+
- **Chiefs +1.5** — Chiefs can lose by 1 or win outright

**Push**: If the adjusted margin is exactly 0 (whole-number spreads only), stake is returned.

## Placing tickets

1. Select **Place a wager**
2. Enter event number
3. Choose Moneyline or Spread
4. Pick team/side
5. Enter wager ($10 minimum, up to balance)

Chips debit immediately. The menu shows your open ticket count.

## Settling bets

Select **Settle all open bets** to:

1. Generate random final scores (sport-appropriate ranges)
2. Resolve each ticket
3. Credit winnings or confirm losses
4. Clear the pending queue

You control when results are simulated — place multiple tickets, then settle together.

## Refresh lines

Generates four new events with fresh odds. **Open tickets are preserved** against their original events.

## Minimum wager

$10 chips per ticket.

## RNG

- Event generation: random sport, teams, strength ratings
- Final scores: `secrets.SystemRandom()` within sport-specific ranges
- Soccer: 0–3 goals per team; others: 10–35 points

## Implementation

- `mandalay_bay/activities/sportsbook.py`
- Tests: `tests/test_sportsbook.py`
