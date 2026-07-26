# Docs / wiki parity — reference

## Topic parity map

| Wiki page | Repo / Quarto page |
|-----------|-------------------|
| `Home.md` | `README.md`, `index.qmd`, `docs/README.md` |
| `About-The-Mandalay-Bay.md` | `docs/about.md` |
| `Access-Points.md` | `docs/access-points.md` |
| `Casino-Offerings.md` | `docs/casino-offerings.md` |
| `Getting-Started.md` | `docs/getting-started.md` |
| `Player-Guide.md` | `docs/player-guide.md` |
| `Chip-Economy.md` | `docs/chip-economy.md` |
| `Save-Slots.md` | `docs/saves.md` |
| `Blackjack.md` | `docs/blackjack.md` |
| `Table-Games.md` | `docs/table-games.md` |
| `Slot-Machines.md` | `docs/slots.md` |
| `Lottery-Counter.md` | `docs/lottery.md` |
| `Sports-Book-and-Prediction-Markets.md` | `docs/sportsbook.md` |
| `Trading-Floor.md` | `docs/trading-floor.md` |
| `Racing-and-Equestrian.md` | `docs/racing.md` |
| `Resort-Hotel.md` | `docs/hotel.md` |
| `Pool-Complex.md` | `docs/pool-complex.md` |
| `MGM-Rewards.md` | `docs/mgm-rewards.md` |
| `Pixel-RPG-Simulator.md` | `docs/pixel-rpg.md` + `docs/rpg/GDD.md` + `rpg.qmd` |
| `Architecture.md` | `docs/architecture.md` |
| `Developer-Guide.md` | `docs/adding-activities.md` + `docs/testing.md` + deploy sections |
| `RNG-and-Fairness.md` | `docs/rng.md` |
| `Screenshots-Gallery.md` | Wiki-only (images under `wiki/images/`) |
| `_Sidebar.md` / `_Footer.md` | Wiki chrome — keep in sync with topic set |

## Floor catalog (canonical)

Authoritative source: `mandalay_bay/activities/registry.py` (`FLOOR_ORDER`, `ALL_ACTIVITIES`).

Seven floors, eleven activities, one chip wallet:

| Floor | Activities | Min bet |
|-------|------------|---------|
| Table Games | Blackjack, Texas Hold'em, Mandalay Roulette, Craps | 10 |
| Slot Machines | 14 machines incl. Megabucks & linked progressives | 1 |
| Lottery Counter | Pick 3, Pick 4, Mega draw, scratchers | Varies |
| Sports Book | Scenario board, parlays/futures + prediction markets | 10 |
| Trading Floor | Futures & call/put options (NYSE, commodities, crypto) | 25 |
| Racing Pavilion | Mandalay Racing (thoroughbred) | 5 |
| Equestrian Arena | Dressage, show jumping | 10 |

## Deploy truths

| Channel | Truth |
|---------|-------|
| GitHub Pages | `main/docs/` → `gh-pages` branch `/docs`; Pages setting **Deploy from branch**; push/schedule **disabled**; prefer `gh-pages-deploy-loop` |
| GitHub Wiki | `wiki/` → `.wiki.git` via `sync-github-wiki` (manual, no Actions) |
| Posit Connect | Quarto `_site/` → content id in `_publish.yml`; never PSYCH 755 |

## Stale phrases to reject

These should not appear as *current* guidance (About may keep historical “Phase 1” in a numbered history list):

| Phrase / claim | Replace with |
|----------------|--------------|
| digital casino CLI (as sole identity) | digital resort simulator (CLI + web + RPG) |
| Five floors, eight activities / Six floors, ten activities | Seven floors, eleven activities (incl. Trading Floor) |
| Phase 1 pixel RPG (as current GDD label) | Phases 1–6 complete / overworld design |
| 16-bit JRPG–style | Pokémon-style pixel overworld |
| EnvironmentTextures / assets/tiles live path | TextureFactory.js procedural boot path |
| Ongoing — Craps, lottery… | Phase 5 shipped; Ongoing = unshipped polish only |
| Source: GitHub Actions (Pages) | Deploy from branch → `gh-pages` → `/docs` |
| hourly / 12-hour Pages cron as live | Disabled; manual + optional `workflow_dispatch` |
| Prefer sync-gh-pages for new work | Prefer `gh-pages-deploy-loop` |
| 180+ tests | 200+ (or live count) |

## Quarto wiring checklist (new `docs/*.md`)

1. Add file under `docs/`.
2. Append path to `project.render` in `_quarto.yml`.
3. Add navbar menu entry (Resort / Player Guides / Developer).
4. Add sidebar section entry.
5. Link from `docs/README.md`.
6. Add or update matching `wiki/*.md` + `_Sidebar.md` if new topic.
7. Mention in root `README.md` docs table when user-facing.
