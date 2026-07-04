# degen-llms

**The Mandalay Bay** — a choose-your-adventure digital casino CLI. Explore the floor, build your chip stack across blackjack tables, slot machines, and the sports book, all backed by a unified chip economy and secure OS RNG.

## Quick start

Requires **Python 3.11+** (stdlib only at runtime).

```bash
# Enter the full casino
python3 -m mandalay_bay

# Standalone blackjack (original mode)
python3 -m blackjack

# Run tests
python3 -m pytest -v
```

## The Mandalay Bay

Welcome to the floor. One chip wallet powers every activity:

| Area | Activity | Min bet |
|------|----------|---------|
| **Table Games** | Blackjack (solo or full table with AI players) | 10 chips |
| **Slot Machines** | Mandalay Fortune & High Roller slots | 5 chips |
| **Sports Book** | Moneyline & spread on simulated live events | 10 chips |

### Casino navigation

```
══════════════════════════════════
  The Mandalay Bay
══════════════════════════════════
Welcome, Guest
Chips: $1,000

Choose your adventure:
  1) Explore Table Games
  2) Explore Slot Machines
  3) Explore Sports Book
  4) Cashier
  5) Player Stats
  6) Leave Casino
  0) Back
```

- **Cashier** — buy chips, cash out, view transaction ledger
- **Player Stats** — visits, bets, and net winnings per activity
- **Chip economy** — all wagers debit/credit one shared wallet with full audit trail

### Command-line options

```bash
python3 -m mandalay_bay --chips 2500 --name "High Roller"
python3 -m mandalay_bay --no-color --ascii
```

| Flag | Purpose |
|------|---------|
| `--chips` | Starting balance (default 1000) |
| `--name` | Player name |
| `--no-color` | Disable ANSI colors |
| `--ascii` | ASCII symbols instead of Unicode |

## Blackjack (Table Games)

Full Vegas-style rules: 6-deck shoe, H17, 3:2 blackjack, split/double/insurance/surrender, secure Fisher–Yates shuffle via `secrets.SystemRandom()`.

When played inside The Mandalay Bay, your chip wallet is synced after every hand. Standalone mode remains available:

```bash
python3 -m blackjack --quick --bots 3 --seat 2
```

## Slot Machines

Three-reel slots with weighted symbols and a classic paytable:

| Result | Payout |
|--------|--------|
| 7-7-7 | 100x |
| 💎💎💎 | 50x |
| 🔔🔔🔔 | 25x |
| BAR×3 | 15x |
| 🍒🍒🍒 | 10x |
| Two cherries | 2x |
| One cherry | Bet returned |

## Sports Book

Simulated events across NFL, NBA, MLB, and Soccer with moneyline and spread lines. Place tickets, then settle for randomly generated final scores (secure RNG).

## Architecture

```
mandalay_bay/           # Casino hub & chip economy
  hub.py                # Floor navigation / choose-your-adventure
  chips.py              # Unified ChipWallet + ledger
  session.py            # Player session & per-activity stats
  activities/
    blackjack.py        # Table game wrapper
    slots.py            # Slot machines
    sportsbook.py       # Sports wagering
blackjack/              # Full blackjack engine
tests/                  # pytest suite
```

Activities implement a common `Activity` interface — new games (roulette, poker, etc.) plug in via the registry without changing the hub.

## RNG & legitimacy

All random outcomes use `secrets.SystemRandom()` (OS CSPRNG):

- Blackjack shoe shuffles
- Slot reel spins (weighted symbol pool)
- Sports event lines and final scores

No outcome manipulation; payouts follow stated rules and paytables.

## License

MIT — see [LICENSE](LICENSE).
