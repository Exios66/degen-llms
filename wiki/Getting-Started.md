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

You begin at the **Save Library** to load an existing save or create a new one (5 slots). Default starting balance for new saves is **$1,000**.

### Command-line options

| Flag | Default | Description |
|------|---------|-------------|
| `--chips N` | 1000 | Starting chips for **new** saves |
| `--name "Name"` | Guest | Default player name for new saves |
| `--slot N` | — | Load save slot 1–5 directly |
| `--new` / `--new-save` | off | Create new save (with `--slot`) |
| `--save-label "Label"` | — | Label for `--slot --new` |
| `--list-saves` | off | Print save library and exit |
| `--save-dir PATH` | `~/.mandalay_bay/saves/` | Custom save directory |
| `--no-color` | off | Disable ANSI terminal colors |
| `--ascii` | off | ASCII card/symbol rendering |
| `--no-intro` | off | Skip the welcome screen |
| `--no-save` | off | Ephemeral session (no persistence) |

Examples:

```bash
python3 -m mandalay_bay --list-saves
python3 -m mandalay_bay --slot 2
python3 -m mandalay_bay --slot 1 --new --name "Ace" --chips 5000 --save-label "High Roller"
python3 -m mandalay_bay --save-dir ./my_saves
```

## Play in the browser

No install required:

| Surface | URL |
|---------|-----|
| Web terminal | https://exios66.github.io/degen-llms/ |
| Pixel RPG | https://exios66.github.io/degen-llms/rpg/ |

Browser saves use `localStorage` key `mandalay-bay-library` (shared between terminal and RPG).

## Standalone blackjack

Blackjack can be played outside the casino hub:

```bash
python3 -m blackjack
python3 -m blackjack --quick --bots 3 --seat 2
python3 -m blackjack --help
```

When played inside The Mandalay Bay, blackjack shares your casino chip wallet.

## First visit walkthrough

1. **Save Library** — load a slot, create a new save, or delete old ones
2. **Welcome screen** — overview of the floor and your chips
3. **Main lobby** — choose an activity or visit the Cashier
4. **Explore a floor** — e.g. Table Games → Blackjack
5. **Play** — wager chips; progress auto-saves when you return to the lobby
6. **Save Game** — manual save from the lobby
7. **Leave** — auto-saves and exits

## Running tests

```bash
pip install -e ".[dev]"
python3 -m pytest -v    # 200+ tests
```

See [[Developer-Guide#testing]] for details.

## Next steps

- [[Player-Guide]] — every menu and dialog
- [[Chip-Economy]] — wallet behavior
- [[Casino-Offerings]] — full activity catalog
- [[Pixel-RPG-Simulator]] — overworld mode
- Use **Casino Guide** in the in-game lobby for quick reference
