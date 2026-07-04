# Getting Started

## Requirements

- **Python 3.11+**
- No third-party runtime dependencies (stdlib only)
- Optional: `pytest` for running tests

## Installation

Clone the repository and run directly — no install step required:

```bash
git clone https://github.com/Exios66/degen-llms.git
cd degen-llms
python3 -m mandalay_bay
```

Optional editable install:

```bash
pip install -e ".[dev]"
mandalay-bay
```

## Launch the casino

```bash
python3 -m mandalay_bay
```

You arrive at **The Mandalay Bay** with **$1,000** in chips by default.

### Command-line options

| Flag | Default | Description |
|------|---------|-------------|
| `--chips N` | 1000 | Starting chip balance |
| `--name "Name"` | Guest | Player name on your card |
| `--no-color` | off | Disable ANSI terminal colors |
| `--ascii` | off | ASCII card/symbol rendering |
| `--no-intro` | off | Skip the welcome screen |

Examples:

```bash
python3 -m mandalay_bay --chips 5000 --name "High Roller"
python3 -m mandalay_bay --no-color --ascii --no-intro
```

## Standalone blackjack

Blackjack can still be played outside the casino hub:

```bash
python3 -m blackjack
python3 -m blackjack --quick --bots 3 --seat 2
python3 -m blackjack --help
```

When played inside The Mandalay Bay, blackjack shares your casino chip wallet.

## First visit walkthrough

1. **Welcome screen** — overview of the floor and your starting chips
2. **Main lobby** — choose an activity or visit the Cashier
3. **Explore a floor** — e.g. Table Games → Blackjack
4. **Play** — wager chips; wins and losses update your wallet automatically
5. **Return** — press `0` at sub-menus to go back to the lobby
6. **Cashier** — buy more chips or review your transaction ledger
7. **Leave** — exit when done; your final balance is displayed

## Running tests

```bash
python3 -m pytest -v
```

See [Testing](testing.md) for details.

## Next steps

- Read the [Player Guide](player-guide.md) for every menu and dialog
- Review [Chip Economy](chip-economy.md) for wallet behavior
- Use **Casino Guide** (option 6) in the in-game lobby for quick reference
