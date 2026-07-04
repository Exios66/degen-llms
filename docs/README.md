# The Mandalay Bay — Documentation

Complete documentation for the digital casino CLI.

## Player documentation

| Guide | Description |
|-------|-------------|
| [Getting Started](getting-started.md) | Installation, launch, first visit |
| [Player Guide](player-guide.md) | Full navigation, menus, dialog flows, UX |
| [Chip Economy](chip-economy.md) | Wallet, ledger, buy-ins, cash-outs |
| [Save Slots](saves.md) | Save library, load/create, CLI saves |
| [Blackjack](blackjack.md) | Table rules, controls, casino & standalone modes |
| [Slot Machines](slots.md) | Machines, paytable, spin flow |
| [Sports Book](sportsbook.md) | Events, moneyline, spread, settlement |

## Developer documentation

| Guide | Description |
|-------|-------------|
| [Architecture](architecture.md) | Packages, data flow, activity system |
| [Adding Activities](adding-activities.md) | How to plug in new games |
| [Testing](testing.md) | Running tests, writing integration tests |

## Quick reference

```bash
python3 -m mandalay_bay              # Enter the casino
python3 -m mandalay_bay --help       # CLI flags
python3 -m blackjack                 # Standalone blackjack
python3 -m pytest -v                 # Run all tests
```

In-game help: select **Casino Guide** from the main lobby.
