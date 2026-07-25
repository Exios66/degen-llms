# RNG and Fairness

All random outcomes in **The Mandalay Bay** use cryptographically secure random number generation. No outcome manipulation.

## Python (CLI)

```python
from blackjack.rng import SECURE_RANDOM  # secrets.SystemRandom() singleton
```

- Card shuffles: **Fisher–Yates** via `fisher_yates_shuffle()`
- Slot reels: weighted symbol selection per reel
- Sports scores: strength-based simulation with secure randomness
- Craps dice: independent uniform rolls
- Lottery draws: secure digit selection
- Prediction market price drift: secure random walk

## Browser (web terminal + RPG)

```javascript
// crypto.getRandomValues() for all outcomes
```

Every game module in `docs/js/` uses `crypto.getRandomValues()` — never `Math.random()` for gameplay.

## What is NOT random

| System | Behavior |
|--------|----------|
| **History prediction markets** | Fixed resolutions based on documented historical truth |
| **Blackjack basic strategy bots** | Deterministic decision tables (not RNG) |
| **MGM Rewards tiers** | Threshold-based on lifetime wagered |

## Testing vs production

Blackjack unit tests inject a **seeded RNG** for reproducibility:

```python
class SeededRandom:
    def __init__(self, seed: int) -> None:
        self._rng = random.Random(seed)
```

This is test-only. Production code always uses `secrets.SystemRandom()`.

## Audit trail

The chip wallet ledger records every wager and payout with timestamps. Player Stats track per-activity net results. No hidden house edge adjustments beyond documented game rules and paytables.

## Paytable transparency

- Slot paytables shown when you sit at a machine
- Blackjack rules documented in [[Blackjack]] and in-game Casino Guide
- Sports odds displayed on the board before wagering
- Prediction market prices shown at purchase time
