# degen-llms

**The Mandalay Bay** — a choose-your-adventure digital casino with unified chip economy, save slots, blackjack, slots, and sports book. Available as a **CLI**, **web app** (GitHub Pages), or standalone blackjack.

## Quick start

Requires **Python 3.11+** (stdlib only at runtime).

```bash
python3 -m mandalay_bay                  # Save library → casino floor
python3 -m mandalay_bay --list-saves     # View save slots
python3 -m mandalay_bay --slot 1 --new-save --name "Ace"
python3 -m blackjack                     # Standalone blackjack
python3 -m pytest -v
```

## Play in your browser (GitHub Pages)

**https://exios66.github.io/degen-llms/**

### Pixel RPG mode (Phase 1)

Explore the resort in a **16-bit JRPG–style overworld** — walk the lobby, talk to NPCs, and sit at the blackjack table:

**https://exios66.github.io/degen-llms/rpg/**

Shares the same save slots and chip wallet as the terminal web app. See [`docs/rpg/GDD.md`](docs/rpg/GDD.md) for the full design doc and expansion roadmap.

The web app in [`docs/`](docs/) mirrors the terminal experience. Session progress saves per slot in your browser via `localStorage`.

The site source lives in [`docs/`](docs/) on **`main`**. GitHub Pages publishes it via GitHub Actions (see [`.github/workflows/deploy-gh-pages.yml`](.github/workflows/deploy-gh-pages.yml)).

**Enable Pages (one-time):** Repository **Settings → Pages → Build and deployment → Source: GitHub Actions → Save.** The workflow uses the `github-pages` environment automatically.

**Automatic deploy:** pushes to `main` that change `docs/**` upload `docs/` and run `actions/deploy-pages`.

**Manual fallback** (legacy branch mirror to `gh-pages`):

```bash
./scripts/deploy-gh-pages.sh
```

Use the script only if you keep Pages configured for **Deploy from branch → `gh-pages` → `/docs`** instead of GitHub Actions.

Custom error screens live in `docs/` (`404.html`, `maintenance.html`, `offline.html`) and deploy with the site.

## Documentation

Full docs in [`docs/`](docs/README.md):

| Guide | Description |
|-------|-------------|
| [Player Guide](docs/player-guide.md) | Every menu, dialog, and shortcut |
| [Save Slots](docs/saves.md) | Load, create, and manage saves |
| [Getting Started](docs/getting-started.md) | Install, launch, CLI flags |
| [Chip Economy](docs/chip-economy.md) | Wallet & ledger |
| [Architecture](docs/architecture.md) | Developer overview |

In-game help: **Casino Guide** (lobby option 7).

## Save system

- **5 save slots** with most-recent-first library ordering
- Interactive picker on launch, or direct CLI: `--slot N`, `--slot N --new-save`
- Ephemeral play: `--no-save`
- Auto-save on leave, after activities, and on Ctrl+C
- CLI storage: `~/.mandalay_bay/saves/` (override with `--save-dir` or `MANDALAY_BAY_SAVE_DIR`)
- Browser storage: `localStorage` per slot

## The casino floor

| Floor | Activity | Min bet |
|-------|----------|---------|
| Table Games | Blackjack (solo or AI table) | 10 chips |
| Slot Machines | Mandalay Bay slots (14 machines incl. Megabucks) | 1 chip |
| Sports Book | Moneyline & spread | 10 chips |

Lobby: **Cashier**, **Player Stats**, **Save Game**, **Casino Guide**, **Leave Casino**.

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

## RNG & legitimacy

All random outcomes use OS-backed CSPRNG (`secrets.SystemRandom()` in Python, `crypto.getRandomValues()` in the browser). No outcome manipulation.

## License

MIT — see [LICENSE](LICENSE).
