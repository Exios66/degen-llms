# Pixel RPG Simulator

Walk **The Mandalay Bay** in a **Pokémon-style pixel overworld** built with Phaser 3. Inspired by [Operation Epic Furious](https://www.epicfurious.com/).

**Play URL:** https://exios66.github.io/degen-llms/rpg/

For the full design document (Phases 1–6, art pipeline, maps, quests), see [Pixel RPG GDD](rpg/GDD.md).

## Vision

Transform the menu-driven terminal casino into an explorable resort:

- Top-down overworld navigation
- NPC dialogue trees with branching choices
- Casino activities as **encounters** (DOM overlays, not scene redirects)
- Unified chip economy and save library shared with CLI and web terminal
- Dense environmental storytelling, Easter eggs, and Mandalay Bay–themed zones

**Core loop:** walk → talk → play → earn chips → save position.

## Access

| Method | URL |
|--------|-----|
| Direct | https://exios66.github.io/degen-llms/rpg/ |
| From terminal | Link in web hub menu |

Saves use the same `localStorage` key (`mandalay-bay-library`) as the web terminal. RPG adds an `rpg` object to each save slot.

## Your guest

The title screen's character creator picks an archetype and then the sprite you actually walk around as — skin tone, hair color, and outfit, with a live preview. The Trainer Card's wardrobe reopens the same creator mid-game.

| Archetype | Flavor | Perk |
|-----------|--------|------|
| `weekend_warrior` | Default tourist | +10% first slot spin payout |
| `high_roller` | Whale energy | High Limit access at 5,000 chips |
| `convention_goer` | Badge and lanyard | 10% cashier buy-in bonus |
| `local` | Knows the shortcuts | Back-hall shortcut unlocked |

## Controls

| Input | Action |
|-------|--------|
| Arrow keys / WASD | Move |
| Tap / click a tile | Walk there — the resort is playable on a phone |
| Shift | Run |
| E / Enter / Space | Talk / advance dialogue |
| Mouse | Dialogue choices, game buttons |
| **T** | Trainer Card (quests, reputation, wardrobe) |
| **P** | MGM Rewards phone |

### On a phone

The canvas fills the screen and a thumb pad mounts in the bottom corners: a d-pad on the left, **B** to run, **A** to talk, **☰** for the START menu. Tap a tile to walk (`Pathfinder.js`), tap a person to talk, and tap anywhere to advance dialogue.

## The property

Twenty-eight rooms across eight wings, authored as declarative JSON in `docs/rpg/js/data/maps/` and compiled into tile layers at boot by `MapLoader`.

| Wing | Rooms |
|------|-------|
| Arrival | Las Vegas Blvd, Valet & Parking, Registration Lobby |
| Casino | Casino Floor North, Casino Floor South, Race & Sports Book, High Limit Salon, Foundation Room |
| Retail | The Shoppes at Mandalay Place, Sky Bridge, Convention Center |
| Bars | Betty's Bar, Skyfall Lounge |
| Hotel | Tower Elevator Lobby, Guest Floor Corridor, Your Room, Delano Wing, Bathhouse Spa |
| Pool | Mandalay Beach, Cabanas & Hot Tubs, Moorea Beach Club, Moonlight Rave Stage |
| Attractions | Shark Reef Tunnel, Shark Reef Exhibit Hall, House of Blues, HOB Green Room, ULTRA Arena Concourse |
| Back of house | Back of House |

Three doors are gated: High Limit Salon (chips + stake tier), Foundation Room (Noir+), and your room (unpaid folio lockout).

## Activity encounters

**The RPG does not reimplement game screens.** Hotel, pool, shops, bars, slots, sportsbook, prediction markets, craps, lottery, racing, equestrian, cashier, bank, and meta screens are written once in `docs/js/ui/` as `buildXRenderers(ctx)` factories. The RPG's `TerminalHostOverlay` mounts the identical functions inside an encounter panel.

The four exceptions are bespoke pixel battle screens: blackjack, hold'em, roulette, and the House of Blues rhythm minigame.

| Encounter | Where it lives | Reached from |
|-----------|----------------|--------------|
| `blackjack`, `holdem`, `roulette` | Bespoke pixel overlays | Casino floor pits |
| `rhythm` | Bespoke pixel overlay | House of Blues stage |
| `craps`, `lottery` | Hosted from `docs/js/ui/` | Stickman Stan, Lottery Lena |
| `slots`, `sportsbook`, `predictions` | Hosted | Slot aisle, Bookie Blake |
| `horse_racing`, `dressage`, `jumper`, `horse_stables` | Hosted | Racing pavilion |
| `hotel*`, `pool*`, `shops`, `bar` | Hosted | Tower, pool deck, Shoppes |
| `cashier`, `bank`, `stats`, `staff_manifest` | Hosted | Cage, back of house, START menu |

## Pokémon-style systems

| System | Detail |
|--------|--------|
| **START menu** | Esc or X — Trainer Card, Quests, Dex, Bag, Secrets, Phone, Bank, Stats, Staff, Guest Book, Completion, Options, Save |
| **Challengers** | NPCs with a `sight` cone spot you, walk over, and open with their encounter — once each |
| **Quests** | Ten in `js/data/quests.json`, progress derived from shared session state |
| **Dex** | Shark Reef species, slot machines played, staff met |
| **Bag** | Quest items, mall purchases, minibar tabs |
| **Secrets** | Twelve easter eggs, cosmetic only — an egg never pays chips |
| **Schedules** | NPCs move between positions as the world clock turns |

## Art pipeline (live boot path)

Tiles, props, and characters are drawn at boot by **`TextureFactory.js`** — there is no vendored `assets/tiles/` loader on the live path. Guest sprites are **32×44 tuxedo-style** pixel grids with a three-frame stride; the wardrobe recolors skin, hair, and outfit. Staff may use optional PNG sheets when present.

See [Pixel RPG GDD](rpg/GDD.md) for contact shadows, fringe bands, lighting, audio, and expansion notes.

## Unified saves

Position, quests, flags, and chips ride the same slot as the terminal and the CLI. See [Save Slots](saves.md).
