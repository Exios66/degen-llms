# Architecture

Technical overview of the **degen-llms** codebase.

## Package overview

```
degen-llms/
├── mandalay_bay/              # Python source of truth — hub, resort systems, CLI activities
│   ├── activities/            # Blackjack, Hold'em, roulette, slots, sportsbook, racing, equestrian, craps, lottery
│   ├── craps.py / lottery.py / prediction_markets.py
│   ├── hotel*.py / pool*.py / rewards*.py / casino_amenities*.py
│   ├── hub.py / session.py / chips.py / saves.py
│   └── data/                  # Sports catalog, staff manifest, guest directory, horse names
├── blackjack/                 # Decoupled blackjack engine (casino + standalone modes)
├── poker/                     # Texas Hold'em table engine (holdem.py) + hand evaluation
├── docs/                      # Web terminal (GitHub Pages) + shared JS engine
│   ├── js/                    # Browser parity modules
│   │   ├── blackjack/ / holdem/
│   │   └── app.js             # Casino floor UI
│   ├── css/                   # Terminal styling
│   └── rpg/                   # Phaser overworld (maps, NPCs, encounter overlays)
├── tests/                     # pytest suite (200+ tests)
├── scripts/                   # GitHub Pages deploy, Posit Connect publish
├── index.qmd / play.qmd       # Quarto documentation manuscript
└── _quarto.yml / _publish.yml # Quarto site + Posit Connect Cloud
```

## Data flow

```
main.py → PlayerSession → ChipWallet
       → hub.py → Activity.run() → wallet + ActivityStats

BlackjackActivity → blackjack/runner.py → blackjack/table.py → wallet
HoldemActivity  → poker/holdem.py → wallet
SlotsActivity   → mandalay_bay/activities/slots.py → wallet
```

## Key abstractions

### ChipWallet (`mandalay_bay/chips.py`)

Single source of truth for chip balance:

- `debit()` / `credit()` — immediate wager/payout
- `apply_delta()` — net change with ledger entry
- `reconcile()` — align with external balance (blackjack rail)
- `buy_in()` / `cash_out()` — Cashier operations

### PlayerSession (`mandalay_bay/session.py`)

Per-visit state: player name, wallet, display prefs, activity statistics, hotel/pool/rewards state.

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

Current activities:

```python
ALL_ACTIVITIES = [
    BlackjackActivity(),
    HoldemActivity(),
    RouletteActivity(),
    CrapsActivity(),
    SlotsActivity(),
    LotteryActivity(),
    SportsbookActivity(),
    HorseRacingActivity(),
    DressageActivity(),
    JumperActivity(),
]
```

Floors (`FLOOR_ORDER`):

- Table Games
- Slot Machines
- Lottery Counter
- Sports Book
- Racing Pavilion
- Equestrian Arena

## Browser parity

Python is authoritative. Each game has a mirror in `docs/js/`:

| Python | JavaScript |
|--------|------------|
| `mandalay_bay/craps.py` | `docs/js/craps.js` |
| `mandalay_bay/lottery.py` | `docs/js/lottery.js` |
| `poker/holdem.py` | `docs/js/holdem/game.js` |
| `mandalay_bay/prediction_markets.py` | `docs/js/predictionMarkets.js` |
| `blackjack/` | `docs/js/blackjack/` |

The web terminal (`docs/js/app.js`) and RPG overlays import these modules directly.

## RPG integration

Phaser renders the overworld; DOM overlays handle game UIs. `EncounterBridge.js` maps encounter IDs to overlay classes. All overlays import from `docs/js/` — never duplicate logic in Phaser scenes.

See [[Pixel-RPG-Simulator#architecture]].

## RNG layer

All games import from `blackjack/rng.py`:

- `SECURE_RANDOM` — `secrets.SystemRandom()` singleton
- `fisher_yates_shuffle()` — in-place shuffle for shoes

Slots, sports, craps, lottery, and prediction markets use `SECURE_RANDOM` directly.

See [[RNG-and-Fairness]].

## Blackjack integration

| Mode | Entry | Wallet |
|------|-------|--------|
| Standalone | `blackjack/main.py` | Internal player bankroll |
| Casino | `blackjack/runner.py` | Synced via `ChipWallet` |

## Extension points

See [[Developer-Guide]] for plugging in new games.

## Testing

- Unit tests per module in `tests/` (200+ cases)
- Integration tests for navigation in `tests/test_casino_navigation.py`
- Injectable deterministic RNG for blackjack tests only

## Deployment surfaces

| Surface | Mechanism |
|---------|-----------|
| GitHub Pages | `docs/` → `gh-pages` via Actions or `scripts/sync-gh-pages.sh` |
| Posit Connect Cloud | `quarto render` + `scripts/publish_posit_degen_llms.py` |
| CLI | `python3 -m mandalay_bay` (no deploy) |
