# Architecture

## Package overview

```
degen-llms/
├── mandalay_bay/          # Resort hub & economy
│   ├── main.py            # CLI entry, session bootstrap
│   ├── hub.py             # Lobby navigation
│   ├── chips.py           # ChipWallet & ledger
│   ├── session.py         # PlayerSession & stats
│   ├── hotel.py           # Hotel state, hallway, checkout lifecycle
│   ├── hotel_experience.py
│   ├── room_amenities.py  # In-room TV, minibar, phone, events
│   ├── pool_complex.py    # 11-acre pool zones & events
│   ├── resort_bridge.py   # Cross-system event requirements
│   ├── resort_completion.py
│   ├── casino_amenities.py
│   ├── rewards.py / rewards_perks.py
│   ├── craps.py / lottery.py / prediction_markets.py / trading_desk.py
│   └── activities/
│       ├── base.py        # Activity ABC
│       ├── registry.py    # Activity catalog
│       ├── blackjack.py / holdem.py / roulette.py / craps.py
│       ├── slots.py / lottery.py / sportsbook.py / trading_desk.py
│       └── horse_racing.py / equestrian.py
├── blackjack/             # Blackjack engine
│   ├── table.py           # Round orchestration
│   ├── cards.py           # Shoe & dealing
│   ├── rules.py           # Action legality
│   ├── runner.py          # Casino wallet integration
│   └── ...
├── docs/                  # Documentation & web terminal (GitHub Pages)
│   ├── js/
│   │   ├── core.js            # PlayerSession, ChipWallet, save versioning
│   │   ├── hotel.js / hotel-ui.js
│   │   ├── room-amenities.js
│   │   ├── pool-complex.js
│   │   ├── resort-bridge.js / resort-completion.js
│   │   ├── casino-amenities.js
│   │   ├── world-cycle.js     # The single resort clock
│   │   └── ui/                # buildXRenderers(ctx) screen factories
│   │       ├── shell.js       # el, banner, chipLine, statusBanner, view stack
│   │       ├── slots-renderers.js / table-renderers.js
│   │       ├── sportsbook-renderers.js / racing-renderers.js
│   │       ├── cashier-renderers.js / meta-renderers.js
│   │       └── stakes-ui.js
│   └── rpg/               # Phaser overworld — 28 JSON-authored maps
│       ├── js/data/       # maps, npcs, dialogues, quests, easter_eggs, triggers
│       └── js/systems/    # MapLoader, TerminalHostOverlay, MenuOverlay, ...
└── tests/                 # pytest suite
```

## Three surfaces, one engine

| Surface | Entry | Role |
|---------|-------|------|
| Python CLI | `python3 -m mandalay_bay` | Authoritative rules |
| Web terminal | `docs/index.html` | Browser parity, ES modules under `docs/js/` |
| Pixel RPG | `docs/rpg/index.html` | Phaser overworld over the same modules |

### The delegation rule

**The RPG never reimplements a game screen.** Casino, hotel, pool, shopping,
sportsbook, racing, cashier, and every meta screen is written once in
`docs/js/ui/` as a `buildXRenderers(ctx)` factory that returns a view-name →
render-function map. The terminal spreads those maps into its `RENDERERS`
table; the RPG's `TerminalHostOverlay` builds the same `ctx` and mounts them
inside an encounter panel. A feature added to the terminal therefore appears in
the RPG with no RPG-side work.

```mermaid
flowchart LR
    LOGIC["docs/js/ — rules"] --> UI["docs/js/ui/ — buildXRenderers(ctx)"]
    UI --> APP["app.js (terminal)"]
    UI --> HOST["TerminalHostOverlay (RPG)"]
```

The exceptions are the four bespoke "battle screens" the RPG draws itself
because they read better in-world: blackjack, hold'em, roulette, and the House
of Blues rhythm minigame. They still route bet entry through the shared stake
picker. See the [Pixel RPG GDD](rpg/GDD.md) for the overworld side.

Anything genuinely new belongs in `docs/js/` first, with the RPG consuming it —
never the reverse.

## Data flow

```mermaid
flowchart TD
    main[main.py] --> session[PlayerSession]
    session --> wallet[ChipWallet]
    main --> hub[hub.py]
    hub --> activity[Activity.run]
    activity --> wallet
    activity --> stats[ActivityStats]

    blackjackAct[BlackjackActivity] --> runner[blackjack/runner.py]
    runner --> table[blackjack/table.py]
    runner --> wallet
```

## Key abstractions

### ChipWallet (`mandalay_bay/chips.py`)

Single source of truth for chip balance. Methods:

- `debit()` / `credit()` — immediate wager/payout
- `apply_delta()` — net change with ledger entry
- `reconcile()` — align with external balance (blackjack rail)
- `buy_in()` / `cash_out()` — Cashier operations

### PlayerSession (`mandalay_bay/session.py`)

Per-visit state: player name, wallet, display prefs, activity statistics.

### Activity (`mandalay_bay/activities/base.py`)

```python
class Activity(ABC):
    info: ActivityInfo  # id, name, floor, description, min_bet

    def run(self, session: PlayerSession, ui: TerminalUI) -> None: ...
    def can_enter(self, session: PlayerSession) -> bool: ...
```

Activities are registered in `activities/registry.py` and discovered by floor.

### TerminalUI (`mandalay_bay/display.py`)

Shared terminal rendering: banners, menus, prompts, chip formatting, color control.

## Activity registry

```python
ALL_ACTIVITIES = [
    BlackjackActivity(),
    SlotsActivity(),
    SportsbookActivity(),
]
```

Floors are defined by `ActivityInfo.floor`:

- Table Games
- Slot Machines
- Sports Book

## RNG layer

All games import from `blackjack/rng.py`:

- `SECURE_RANDOM` — `secrets.SystemRandom()` singleton
- `fisher_yates_shuffle()` — in-place shuffle for shoes

Slots and sports book use `SECURE_RANDOM` directly for outcome generation.

## Blackjack integration

The blackjack engine is decoupled from the casino:

| Mode | Entry | Wallet |
|------|-------|--------|
| Standalone | `blackjack/main.py` | Internal player bankroll |
| Casino | `blackjack/runner.py` | Synced via `ChipWallet` |

`run_casino_blackjack()` sets the human player's rail to wallet balance, applies `apply_delta()` after each hand, and `reconcile()` on exit.

## Extension points

See [Adding Activities](adding-activities.md) for plugging in new games.

## Testing

- Unit tests per module in `tests/`
- Integration tests for navigation in `tests/test_casino_navigation.py`
- Injectable deterministic RNG for blackjack tests only
