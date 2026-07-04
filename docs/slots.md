# Slot Machines

Three-reel slot machines on the **Slot Machines** floor.

## Machines

| Machine | Min bet | Max bet |
|---------|---------|---------|
| Mandalay Fortune | $5 | $50 |
| High Roller | $25 | $500 |

Max bet is capped by your current chip balance. High Roller requires at least $25 to play.

## Game flow

```
Slot Machines → Mandalay Fortune Slots → Pick machine → Spin loop → Leave
```

1. Select a machine
2. Paytable is displayed
3. Enter spin amount (or `0` to leave)
4. Reels spin with secure weighted RNG
5. Payout applied immediately
6. Choose to spin again or leave

## Symbols & weights

Symbols are drawn from a weighted pool (rarer = higher payout potential):

| Symbol | Display | Weight |
|--------|---------|--------|
| 7 | `7` | 1 |
| Diamond | `💎` | 2 |
| BAR | `BAR` | 3 |
| Bell | `🔔` | 4 |
| Cherry | `🍒` | 6 |
| Lemon | `🍋` | 8 |

## Paytable

| Result | Multiplier |
|--------|------------|
| 7 — 7 — 7 | 100x |
| 💎 — 💎 — 💎 | 50x |
| 🔔 — 🔔 — 🔔 | 25x |
| BAR — BAR — BAR | 15x |
| 🍒 — 🍒 — 🍒 | 10x |
| 🍒 — 🍒 (first two) | 2x |
| 🍒 (first reel only) | 1x (bet returned) |

### Examples

- $10 bet, three 7s → win $1,000
- $25 bet, two cherries → win $50 (net +$25)
- $5 bet, one cherry → win $5 (push, net $0)

## RNG

Each reel independently selects a symbol via `secrets.SystemRandom()` from the weighted pool. Outcomes are not manipulated.

## ASCII mode

With `--ascii`, emoji symbols render as three-letter codes (CER, BEL, DIA, etc.).

## Implementation

- `mandalay_bay/activities/slots.py` — activity, paytable, spin logic
- Tests: `tests/test_casino_activities.py`
