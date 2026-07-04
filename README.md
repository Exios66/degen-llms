# degen-llms

**The Mandalay Bay** — a choose-your-adventure digital casino CLI with **save slots**, unified chip economy, blackjack, slots, and sports book.

## Quick start

```bash
python3 -m mandalay_bay                  # Save library → casino floor
python3 -m mandalay_bay --list-saves     # View save slots
python3 -m mandalay_bay --slot 1 --new   # New game in slot 1
python3 -m pytest -v
```

## Documentation

Full docs in [`docs/`](docs/README.md) — highlights:

| Guide | Description |
|-------|-------------|
| [Player Guide](docs/player-guide.md) | Every menu, dialog, and shortcut |
| [Save Slots](docs/saves.md) | **Load, create, and manage saves via CLI** |
| [Getting Started](docs/getting-started.md) | Install, launch, CLI flags |
| [Chip Economy](docs/chip-economy.md) | Wallet & ledger |
| [Architecture](docs/architecture.md) | Developer overview |

## Save system

- **5 save slots** with most-recent-first library ordering
- Interactive picker on launch, or direct CLI: `--slot N`, `--slot N --new`
- Auto-save on leave, after activities, and on Ctrl+C
- Default location: `~/.local/share/mandalay-bay/saves/`

## The casino floor

| Floor | Activity | Min bet |
|-------|----------|---------|
| Table Games | Blackjack | 10 chips |
| Slot Machines | Mandalay Fortune & High Roller | 5 chips |
| Sports Book | Moneyline & spread | 10 chips |

Lobby also includes **Cashier**, **Player Stats**, **Save Game**, **Casino Guide**, and **Leave Casino**.

## Command-line options

```bash
python3 -m mandalay_bay --slot 2                    # Load slot 2
python3 -m mandalay_bay --slot 3 --new --name Ace   # New save in slot 3
python3 -m mandalay_bay --save-dir ./backups        # Custom save path
python3 -m mandalay_bay --chips 2500 --no-color
```

## License

MIT — see [LICENSE](LICENSE).

