# The Mandalay Bay — Documentation

Complete documentation for the digital **resort simulator** — Python CLI, browser terminal, and pixel RPG.

These Markdown guides are the Quarto source for the Posit Connect docs site. The GitHub Wiki (`wiki/`) mirrors the same topics for GitHub-native browsing.

## Resort

| Guide | Description |
|-------|-------------|
| [About](about.md) | Vision, design pillars, property zones, history |
| [Access Points](access-points.md) | Every playable surface and docs mirror |
| [Casino Offerings](casino-offerings.md) | Full floor catalog, stake tiers, amenities |
| [Resort Hotel](hotel.md) | Check-in, rooms, amenities, day/night cycle |
| [Strip Ride](strip-ride.md) | Limo / Uber / Lyft to Luxor, Excalibur, Bellagio, Circa (web) |
| [Resort Dining](dining.md) | Restaurant overlay, capacity minigame, encounters |
| [Pool Complex](pool-complex.md) | Wave pool, cabanas, Shark Reef, beach club |
| [MGM Rewards](mgm-rewards.md) | Tier progression, comps, phone |

## Player documentation

| Guide | Description |
|-------|-------------|
| [Getting Started](getting-started.md) | Installation, launch, first visit |
| [Player Guide](player-guide.md) | Full navigation, menus, dialog flows, UX |
| [Chip Economy](chip-economy.md) | Wallet, ledger, buy-ins, cash-outs |
| [Save Slots](saves.md) | Save library, load/create, CLI saves |
| [Blackjack](blackjack.md) | Table rules, controls, casino & standalone modes |
| [Table Games](table-games.md) | Texas Hold'em, roulette, craps |
| [Slot Machines](slots.md) | Machines, paytable, spin flow |
| [Lottery Counter](lottery.md) | Pick 3/4, Mega, scratchers |
| [Sports Book](sportsbook.md) | Scenario DBs, parlays/futures, prediction markets |
| [Trading Floor](trading-floor.md) | Futures & call/put options (NYSE, commodities, crypto) |
| [Arcade Alley](arcade.md) | CRT cabinet overlays — Frogger, Invaders, Breakout, rhythm |
| [Racing and Equestrian](racing.md) | Thoroughbred racing, dressage, show jumping |
| [Resort Dining](dining.md) | Aureole / Border Grill / Stripsteak capacity challenge |

## Developer documentation

| Guide | Description |
|-------|-------------|
| [Architecture](architecture.md) | Packages, data flow, activity system |
| [Adding Activities](adding-activities.md) | How to plug in new games |
| [Testing](testing.md) | Running tests, writing integration tests |
| [RNG and Fairness](rng.md) | CSPRNG guarantees |
| [Pixel RPG Simulator](pixel-rpg.md) | Overworld overview, encounters, systems |
| [Pixel RPG GDD](rpg/GDD.md) | Full design doc (Phases 1–6 complete) |

## Quick reference

```bash
python3 -m mandalay_bay              # Enter the resort
python3 -m mandalay_bay --help       # CLI flags
python3 -m blackjack                 # Standalone blackjack
python3 -m pytest -v                 # Run all tests
```

In-game help: select **Casino Guide** from the main lobby.

**Live surfaces:** [Web terminal](https://exios66.github.io/degen-llms/) · [Pixel RPG](https://exios66.github.io/degen-llms/rpg/) · [Wiki](https://github.com/Exios66/degen-llms/wiki) · [Posit docs](https://019f9a67-d5c9-226b-b6b1-a86d1655be69.share.connect.posit.cloud/)
