# degen-llms

**The Mandalay Bay** — a satirical choose-your-adventure resort simulator with a unified chip economy. Play blackjack, slots, and the sports book on the casino floor; check into the hotel; lounge at the 11-acre pool complex; climb MGM Rewards tiers; and explore the property as a pixel RPG. Available as a **Python CLI**, a **browser terminal** (GitHub Pages), and a **Phaser overworld**.

## Play now

| Surface | URL / command |
|---------|----------------|
| **Web terminal** | [Web-Terminal-Access](https://exios66.github.io/degen-llms/) |
| **Pixel RPG** | [The-Pixel-RPG](https://exios66.github.io/degen-llms/rpg/) |
| **CLI** | `python3 -m mandalay_bay` |
| **Quarto docs (Posit Connect Cloud)** | [Posit-Cloud](https://019f9a67-d5c9-226b-b6b1-a86d1655be69.share.connect.posit.cloud/) |

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
python3 -m pytest -v                     # 200+ tests
```

## What you can do

### Casino floor

Seven floors, eleven activities, one chip wallet:

| Floor | Activities | Min bet |
|-------|------------|---------|
| **Table Games** | Blackjack, Texas Hold'em, Mandalay Roulette, Craps | 10 chips |
| **Slot Machines** | 14 machines incl. Megabucks & linked progressives | 1 chip |
| **Lottery Counter** | Pick 3/4, Mega/Powerball, premium scratchers | Varies (stake-scaled) |
| **Sports Book** | Scenario board, parlays/futures + prediction markets | 10 chips |
| **Trading Floor** | Futures & call/put options (NYSE, commodities, crypto) | 25 chips |
| **Racing Pavilion** | Mandalay Racing (thoroughbred sim) | 5 chips |
| **Equestrian Arena** | Dressage & show jumping | 10 chips |

Stake tiers run from penny slots through **401K Contribution** ($542–$6,500) and **High Roller / No Limit**. Progressive jackpots (Megabucks, Monte Carlo, Super Spin) persist in your save.

Beyond the gaming pits:

- **Casino Floor — shopping & bars** — The Shoppes at Mandalay Place sky bridge, three full-service bars, intoxication tracking
- **Resort dining** — Aureole, Border Grill, Stripsteak capacity overlay with drink-scaled encounters
- **Cashier** — Buy chips, cash out to your off-strip bank account, view the floor ledger
- **Off-Strip Bank Account** — Park winnings outside the cage; fund trips from outside income
- **Staff Manifest** — Editable dealer roster with session overrides
- **High Limit salon & Foundation Room** — Chip- and tier-gated VIP venues (web)

### Resort hotel

Exit the casino floor to the **Mandalay Bay Hotel Experience**:

- **Clerk Carmen** at the front desk — locate reservations, settle overdue charges, upgrade rooms, review folios, checkout, resort dining
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

### Pixel RPG

Walk the resort in a **Pokémon-style pixel overworld** built with Phaser 3:

- **32 rooms, 73 NPCs** — a walkable Las Vegas Blvd Strip (Mandalay → Luxor → Excalibur), valet, registration, two casino floors, the book, High Limit Salon, Foundation Room, the Shoppes and sky bridge, two bars, the hotel tower and your own room, Delano, the spa, four pool zones, Shark Reef, House of Blues, ULTRA Arena, and the back of house
- **Terminal parity, not a rewrite** — hotel, pool, shops, slots, sportsbook, racing, and cashier are the terminal's own screens mounted inside an encounter panel, so the two surfaces cannot drift
- **Pokémon systems** — START menu, line-of-sight challengers, a quest board, a three-part dex, a bag, twelve cosmetic secrets, and NPCs who move with the clock
- **One clock, one wallet** — daily resort charges, rotating reservation requirements, and eviction all reach the overworld
- **Legible floors** — gold walkways connect every door, dark trim separates each zone, and floating signs name the room you're standing in
- **Your guest, your sprite** — a character creator for archetype, skin tone, hair, and outfit, reopenable as the Trainer Card's wardrobe
- **Plays on a phone** — full-bleed handheld framing, a thumb pad, tap a tile to walk, tap anywhere to advance dialogue
- **Hand-authored sprites** — characters are pixel grids with proper faces and a three-frame stride, drawn at 2× on a 16-pixel art grid that lights from the top left
- **Arcade polish** — DS-scale textures, Web Audio BGM/SFX, cabinet bezel, room placards, Konami code
- **Unified saves** — position, quests, flags, and chips ride the same slot as the terminal and the CLI

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
├── mandalay_bay/              # Python source of truth — hub, resort systems, CLI activities
│   ├── activities/            # Blackjack, Hold'em, roulette, slots, sportsbook, racing, equestrian, craps, lottery
│   ├── craps.py / lottery.py / prediction_markets.py
│   ├── hotel*.py / pool*.py / rewards*.py / casino_amenities*.py
│   ├── hub.py / session.py / chips.py / saves.py
│   └── data/                  # Sports catalog, staff manifest, guest directory, horse names
├── blackjack/                 # Decoupled blackjack engine (casino + standalone modes)
├── poker/                     # Texas Hold'em table engine (`holdem.py`) + hand evaluation
├── docs/                      # Web terminal (GitHub Pages) + shared JS engine
│   ├── js/                    # Browser parity modules (core, hotel, pool, sportsbook, craps, lottery, …)
│   │   ├── blackjack/ / holdem/
│   │   └── app.js             # Casino floor UI
│   ├── css/                   # Terminal styling
│   ├── *.md                   # Player & developer guides (mirrored in Quarto)
│   └── rpg/                   # Phaser overworld (maps, NPCs, encounter overlays)
├── tests/                     # pytest suite (200+ tests)
├── scripts/                   # GitHub Pages deploy, Posit Connect publish, asset tooling
├── .github/workflows/         # gh-pages deploy (workflow_dispatch only)
├── index.qmd / play.qmd       # Quarto documentation manuscript
├── _quarto.yml / _publish.yml # Quarto site + Posit Connect Cloud publish target
└── CONTRIBUTING-POSIT.md      # Connect Cloud deploy notes
```

Python is the authoritative game logic; the web app mirrors it in vanilla ES modules. The RPG delegates casino/hotel mechanics to the shared `docs/js/` engine. The Quarto site (`index.qmd`, guides) publishes separately to Posit Connect Cloud.

## Documentation

Full docs in [`docs/`](docs/README.md) and on the **[GitHub Wiki](https://github.com/Exios66/degen-llms/wiki)** (source in [`wiki/`](wiki/); publish with `/sync-github-wiki` or `bash scripts/sync-github-wiki.sh`):

| Guide | Description |
|-------|-------------|
| [About](docs/about.md) | Vision, design pillars, history |
| [Casino Offerings](docs/casino-offerings.md) | Full floor catalog and amenities |
| [Player Guide](docs/player-guide.md) | Every menu, dialog, hotel flow, and shortcut |
| [Getting Started](docs/getting-started.md) | Install, launch, CLI flags |
| [Save Slots](docs/saves.md) | Load, create, and manage saves |
| [Chip Economy](docs/chip-economy.md) | Wallet, ledger, buy-ins, cash-outs |
| [Blackjack](docs/blackjack.md) | Table rules, controls, casino & standalone modes |
| [Table Games](docs/table-games.md) | Hold'em, roulette, craps |
| [Slot Machines](docs/slots.md) | Machines, paytables, progressives |
| [Lottery](docs/lottery.md) | Pick 3/4, Mega/Powerball, premium scratchers |
| [Sports Book](docs/sportsbook.md) | Scenario board, parlays, prediction markets |
| [Trading Floor](docs/trading-floor.md) | Futures & options (NYSE, commodities, crypto) |
| [Racing](docs/racing.md) | Thoroughbred + equestrian |
| [Hotel](docs/hotel.md) / [Pool](docs/pool-complex.md) / [Rewards](docs/mgm-rewards.md) | Resort off the floor |
| [Architecture](docs/architecture.md) | Packages, data flow, activity system |
| [Adding Activities](docs/adding-activities.md) | Plug in new games |
| [Testing](docs/testing.md) | Running and writing tests |
| [RNG](docs/rng.md) | CSPRNG guarantees |
| [Pixel RPG](docs/pixel-rpg.md) / [GDD](docs/rpg/GDD.md) | Overworld design (Phases 1–6) |

In-game help: **Casino Guide** from the main lobby.

## GitHub Pages deployment

The interactive web terminal + RPG source lives in [`docs/`](docs/) on **`main`**. That tree is mirrored to the **`gh-pages`** branch `/docs` folder for the live site.

**Enable Pages (one-time):** Repository **Settings → Pages → Deploy from branch → `gh-pages` → `/docs`.**

Automatic push/schedule deploy is **disabled** (Actions billing limits). Publish manually with the preferred skill wrapper, or optionally run the workflow from the Actions tab (`workflow_dispatch` only):

```bash
bash .cursor/skills/gh-pages-deploy-loop/scripts/run-manual.sh   # Preferred
# or: gh workflow run deploy-gh-pages.yml
# legacy: SYNC_TRIGGER=manual_run ./scripts/sync-gh-pages.sh
```

Custom error screens (`404.html`, `maintenance.html`, `offline.html`) deploy with the site. See [`.cursor/skills/gh-pages-deploy-loop/SKILL.md`](.cursor/skills/gh-pages-deploy-loop/SKILL.md).

## Posit Connect Cloud (documentation site)

A Quarto documentation website (overview manuscript + player/developer guides) publishes to the **JackJBurleson** Posit Connect Cloud account as its **own** content instance — it does **not** overwrite the PSYCH 755 manuscript.

```bash
# Requires Quarto ≥ 1.10, jupyter, pandas, matplotlib
export PYTHONPATH="$PWD"
quarto render
python scripts/publish_posit_degen_llms.py   # creates or updates Connect Cloud content
```

See [`CONTRIBUTING-POSIT.md`](CONTRIBUTING-POSIT.md) and [`.cursor/skills/posit-connect-publish/SKILL.md`](.cursor/skills/posit-connect-publish/SKILL.md).
## RNG & legitimacy

All random outcomes use OS-backed CSPRNG (`secrets.SystemRandom()` in Python, `crypto.getRandomValues()` in the browser). No outcome manipulation.

## GitHub profile badge

Copy into a profile README under **Highlighted Projects** (same style as other for-the-badge project links):

```markdown
[![The Mandalay Bay](https://img.shields.io/badge/The%20Mandalay%20Bay-8A2BE2?style=for-the-badge&labelColor=333&logo=readme&logoColor=white)](https://github.com/Exios66/degen-llms)
```

Preview:

[![The Mandalay Bay](https://img.shields.io/badge/The%20Mandalay%20Bay-8A2BE2?style=for-the-badge&labelColor=333&logo=readme&logoColor=white)](https://github.com/Exios66/degen-llms)

## License

MIT — see [LICENSE](LICENSE).
