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
| `--new` | off | Create new save (with `--slot`) |
| `--save-label "Label"` | — | Label for `--slot --new` |
| `--list-saves` | off | Print save library and exit |
| `--save-dir PATH` | ~/.local/share/... | Custom save directory |
| `--no-color` | off | Disable ANSI terminal colors |
| `--ascii` | off | ASCII card/symbol rendering |
| `--no-intro` | off | Skip the welcome screen |

Examples:

```bash
python3 -m mandalay_bay --list-saves
python3 -m mandalay_bay --slot 2
python3 -m mandalay_bay --slot 1 --new --name "Ace" --chips 5000 --save-label "High Roller"
python3 -m mandalay_bay --save-dir ./my_saves
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

1. **Save Library** — load a slot, create a new save, or delete old ones
2. **Welcome screen** — overview of the floor and your chips
3. **Main lobby** — choose an activity or visit the Cashier
4. **Explore a floor** — e.g. Table Games → Blackjack
5. **Play** — wager chips; progress auto-saves when you return to the lobby
6. **Save Game** — manual save from the lobby (option 6)
7. **Leave** — auto-saves and exits (option 8)

See [Save Slots](saves.md) for full save system documentation.

## Running tests

```bash
python3 -m pytest -v
```

See [Testing](testing.md) for details.

## GitHub Pages (web casino)

The browser casino and pixel RPG live in [`docs/`](.) and publish to **https://exios66.github.io/degen-llms/** via the `gh-pages` branch.

**One-time setup:** Repository **Settings → Pages → Deploy from a branch → `gh-pages` → `/docs`**.

**Deploy after editing `docs/` on `main`:**

```bash
./scripts/deploy-gh-pages.sh
```

Pushes to `main` that change `docs/**` also trigger [`.github/workflows/deploy-gh-pages.yml`](../.github/workflows/deploy-gh-pages.yml) automatically.

- Terminal casino: `/` ( [`index.html`](index.html) )
- Pixel RPG: [`/rpg/`](rpg/index.html)

## Next steps

- Read the [Player Guide](player-guide.md) for every menu and dialog
- Review [Chip Economy](chip-economy.md) for wallet behavior
- Use **Casino Guide** (option 6) in the in-game lobby for quick reference
