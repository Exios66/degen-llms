# degen-llms

**The Mandalay Bay** — a satirical choose-your-adventure resort simulator with a unified chip economy. Play blackjack, slots, and the sports book on the casino floor; check into the hotel; lounge at the 11-acre pool complex; climb MGM Rewards tiers; and explore the property as a pixel RPG. Available as a **Python CLI**, a **browser terminal** (GitHub Pages), and a **Phaser overworld**.

## Play now

| Surface | URL / command |
|---------|----------------|
| **Web terminal** | [exios66.github.io/degen-llms](https://exios66.github.io/degen-llms/) |
| **Pixel RPG** | [exios66.github.io/degen-llms/rpg](https://exios66.github.io/degen-llms/rpg/) |
| **CLI** | `python3 -m mandalay_bay` |

All three surfaces share the same save slots and chip wallet (CLI: `~/.mandalay_bay/saves/`; browser: `localStorage`).

## Quick start

Requires **Python 3.11+** (stdlib only at runtime).

```bash
git clone https://github.com/Exios66/degen-llms.git
cd degen-llms
python3 -m mandalay_bay                  # Save library → casino floor
python3 -m mandalay_bay --list-saves     # View save slots
python3 -m mandalay_bay --slot 1 --new-save --name "Ace"
python3 -m blackjack                     # Standalone blackjack (no resort hub)
```

Optional editable install and tests:

```bash
pip install -e ".[dev]"
python3 -m pytest -v                     # 180+ tests
```

## What you can do

### Casino floor

Five floors, eight activities, one chip wallet:

| Floor | Activities | Min bet |
|-------|------------|---------|
| **Table Games** | Blackjack, Texas Hold'em, Mandalay Roulette | 10 chips |
| **Slot Machines** | 14 machines incl. Megabucks & linked progressives | 1 chip |
| **Sports Book** | Moneyline, spread, prediction markets | 10 chips |
| **Racing Pavilion** | Mandalay Racing (thoroughbred sim) | 5 chips |
| **Equestrian Arena** | Dressage & show jumping | 10 chips |

Stake tiers run from penny slots through **401K Contribution** ($542–$6,500) and **High Roller / No Limit**. Progressive jackpots (Megabucks, Monte Carlo, Super Spin) persist in your save.

Beyond the gaming pits:

- **Casino Floor — shopping & bars** — The Shoppes at Mandalay Place sky bridge, three full-service bars, intoxication tracking
- **Cashier** — Buy chips, cash out to your off-strip bank account, view the floor ledger
- **Off-Strip Bank Account** — Park winnings outside the cage; fund trips from outside income
- **Staff Manifest** — Editable dealer roster with session overrides
- **High Limit salon & Foundation Room** — Chip- and tier-gated VIP venues (web)

### Resort hotel

Exit the casino floor to the **Mandalay Bay Hotel Experience**:

- **Clerk Carmen** at the front desk — locate reservations, settle overdue charges, upgrade rooms, review folios, checkout
- **Hallway mini-game** — three beats of directional choices to reach your door
- **In-room amenities** — TV (Shark Reef ch. 47, wave pool cam), sensor-enabled minibar, unlimited foreign calls, balcony decisions, 17 unlockable Vegas vignettes
- **Guest Directory** — leather-bound lobby guest book with persistent signatures
- **Real-time day/night cycle** — 2 hours real time = 1 in-game day; daily room/resort/parking charges; rotating check-in requirements (phone, desk, both, or whale net-positive)
- **MGM Rewards phone** — press **P** in the web app for tier status, comps, reservation locate, and textable staff contacts

Room types: Deluxe King → Panorama Suite → Chairman Penthouse. MGM Rewards tier comps can cover upgrades and room nights.

### Pool complex

The **11-acre pool expansion** includes wave pool timing, hot tubs, private cabanas, Shark Reef Aquarium species collection, topless beach club, and beach rave — with unlockable pool vignettes that chain into hotel room events.

### MGM Rewards

Lifetime wagered chips advance you through Sapphire → Pearl → Gold → Platinum → Noir → Chairman. Each tier unlocks narrative comps (welcome drink, slot free-play, buffet, room night, suite upgrade, penthouse fantasy) and perks that gate TV channels, phone calls, and VIP access.

### Pixel RPG (Phases 1–4)

Walk the resort in a **16-bit JRPG–style overworld** built with Phaser 3:

- **Eight maps** — casino lobby, hotel tower, pool, Shark Reef, House of Blues, ULTRA Arena, Foundation Room, staff corridor
- **Full activity encounters** — blackjack, holdem, roulette, slots, sportsbook, racing, dressage/jumper, hotel, pool mini-games, shops/bar, cashier
- **Quests & systems** — shark photo collection, Trainer Card (T), day/night tint, faction reputation, guest archetypes
- **Arcade polish** — procedural textures, Web Audio BGM/SFX, cabinet bezel, Konami + Easter eggs
- **Unified saves** — RPG position, quests, flags, and chip balance sync with the web terminal

See [`docs/rpg/GDD.md`](docs/rpg/GDD.md).

## Save system

- **5 save slots** with most-recent-first library ordering
- Interactive picker on launch, or direct CLI: `--slot N`, `--slot N --new-save`
- Ephemeral play: `--no-save`
- Auto-save on leave, after activities, and on Ctrl+C
- CLI storage: `~/.mandalay_bay/saves/` (override with `--save-dir` or `MANDALAY_BAY_SAVE_DIR`)
- Browser storage: `localStorage` per slot (`mandalay-bay-library`)

## Command-line options

```bash
python3 -m mandalay_bay --slot 2
python3 -m mandalay_bay --slot 3 --new-save --name "Ace" --chips 2500
python3 -m mandalay_bay --no-save --chips 5000
python3 -m mandalay_bay --save-dir ./backups --list-saves
python3 -m mandalay_bay --no-color --ascii --no-intro
python3 -m blackjack --quick --bots 3 --rounds 10
```

| Flag | Purpose |
|------|---------|
| `--slot` | Load save slot 1–5 directly |
| `--new-save` / `--new` | Create new save in `--slot` |
| `--no-save` | Ephemeral session (no persistence) |
| `--list-saves` | Print save library and exit |
| `--save-dir` | Custom save directory |
| `--chips` | Starting chips for new saves |
| `--name` | Default player name |
| `--no-color` / `--ascii` / `--no-intro` | Display options |

## Project structure

```
degen-llms/
├── mandalay_bay/          # Python source of truth — hub, hotel, pool, rewards, activities
├── blackjack/             # Decoupled blackjack engine (casino + standalone modes)
├── poker/                 # Texas Hold'em hand evaluation
├── docs/                  # Web terminal (GitHub Pages) + shared JS engine
│   ├── js/                # Browser parity modules (hotel, pool, slots, sportsbook, …)
│   └── rpg/               # Phaser overworld (maps, NPCs, encounter bridge)
├── tests/                 # pytest suite (180+ tests)
└── scripts/               # GitHub Pages deploy & asset tooling
```

Python is the authoritative game logic; the web app mirrors it in vanilla ES modules. The RPG delegates casino/hotel mechanics to the shared `docs/js/` engine.

## Documentation

Full docs in [`docs/`](docs/README.md):

| Guide | Description |
|-------|-------------|
| [Player Guide](docs/player-guide.md) | Every menu, dialog, hotel flow, and shortcut |
| [Getting Started](docs/getting-started.md) | Install, launch, CLI flags |
| [Save Slots](docs/saves.md) | Load, create, and manage saves |
| [Chip Economy](docs/chip-economy.md) | Wallet, ledger, buy-ins, cash-outs |
| [Blackjack](docs/blackjack.md) | Table rules, controls, casino & standalone modes |
| [Slot Machines](docs/slots.md) | Machines, paytables, progressives |
| [Sports Book](docs/sportsbook.md) | Events, moneyline, spread, settlement |
| [Architecture](docs/architecture.md) | Packages, data flow, activity system |
| [Adding Activities](docs/adding-activities.md) | Plug in new games |
| [Testing](docs/testing.md) | Running and writing tests |
| [Pixel RPG GDD](docs/rpg/GDD.md) | Overworld design & expansion roadmap |

In-game help: **Casino Guide** from the main lobby.

## GitHub Pages deployment

The site source lives in [`docs/`](docs/) on **`main`**. GitHub Actions mirrors the entire `docs/` tree to the **`gh-pages`** branch (see [`.github/workflows/deploy-gh-pages.yml`](.github/workflows/deploy-gh-pages.yml)).

**Enable Pages (one-time):** Repository **Settings → Pages → Deploy from branch → `gh-pages` → `/docs`.**

Deployments trigger on pushes to `main` that touch `docs/**`, hourly drift checks, or manual workflow runs. Custom error screens (`404.html`, `maintenance.html`, `offline.html`) deploy with the site.

```bash
./scripts/sync-gh-pages.sh      # Manual sync
./scripts/deploy-gh-pages.sh    # Full deploy
```

## RNG & legitimacy

All random outcomes use OS-backed CSPRNG (`secrets.SystemRandom()` in Python, `crypto.getRandomValues()` in the browser). No outcome manipulation.

## License

MIT — see [LICENSE](LICENSE).
