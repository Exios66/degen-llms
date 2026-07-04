# degen-llms

**The Mandalay Bay** — a choose-your-adventure digital casino CLI. Explore the floor, build your chip stack across blackjack tables, slot machines, and the sports book, all backed by a unified chip economy and secure OS RNG.

## Quick start

Requires **Python 3.11+** (stdlib only at runtime).

```bash
python3 -m mandalay_bay
python3 -m pytest -v
```

## Documentation

Full documentation is in the [`docs/`](docs/README.md) directory:

| Guide | Description |
|-------|-------------|
| [Getting Started](docs/getting-started.md) | Install, launch, first visit |
| [Player Guide](docs/player-guide.md) | **Complete navigation, menus & dialog reference** |
| [Chip Economy](docs/chip-economy.md) | Wallet, ledger, buy-ins |
| [Blackjack](docs/blackjack.md) | Rules, controls, standalone mode |
| [Slot Machines](docs/slots.md) | Paytable, machines |
| [Sports Book](docs/sportsbook.md) | Moneyline, spread, settlement |
| [Architecture](docs/architecture.md) | Developer overview |
| [Adding Activities](docs/adding-activities.md) | Plug in new games |
| [Testing](docs/testing.md) | Test suite guide |

In-game help: select **Casino Guide** (option 6) from the main lobby.

## The casino floor

| Floor | Activity | Min bet |
|-------|----------|---------|
| **Table Games** | Blackjack (solo or AI table) | 10 chips |
| **Slot Machines** | Mandalay Fortune & High Roller | 5 chips |
| **Sports Book** | Moneyline & spread wagering | 10 chips |

Plus **Cashier**, **Player Stats**, and **Casino Guide** from the main lobby.

## Command-line options

```bash
python3 -m mandalay_bay --chips 2500 --name "High Roller"
python3 -m mandalay_bay --no-color --ascii --no-intro
python3 -m blackjack --quick --bots 3    # Standalone blackjack
```

## Project structure

```
mandalay_bay/     Casino hub, chip economy, activities
blackjack/        Full blackjack engine
docs/             Complete documentation
tests/            pytest suite (35+ tests)
```

## RNG & legitimacy

All random outcomes use `secrets.SystemRandom()` (OS CSPRNG). No outcome manipulation.

## License

MIT — see [LICENSE](LICENSE).
