# Pixel RPG Simulator

Walk **The Mandalay Bay** in a **16-bit JRPG–style overworld** built with Phaser 3. Inspired by [Operation Epic Furious](https://www.epicfurious.com/).

**Play URL:** https://exios66.github.io/degen-llms/rpg/

---

## Vision

Transform the menu-driven terminal casino into an explorable resort:

- Top-down overworld navigation
- NPC dialogue trees with branching choices
- Casino activities as **encounters** (DOM overlays, not scene redirects)
- Unified chip economy and save library shared with CLI and web terminal
- Dense environmental storytelling, Easter eggs, and Mandalay Bay–themed zones

**Core loop:** walk → talk → play → earn chips → save position.

---

## Access

| Method | URL |
|--------|-----|
| Direct | https://exios66.github.io/degen-llms/rpg/ |
| From terminal | Link in web hub menu |

Saves use the same `localStorage` key (`mandalay-bay-library`) as the web terminal. RPG adds an `rpg` object to each save slot.

---

## Player archetypes

Choose on the title screen:

| Archetype | Flavor |
|-----------|--------|
| `weekend_warrior` | Default tourist |
| `high_roller` | Whale energy |
| `convention_goer` | Badge and lanyard |
| `local` | Knows the shortcuts |

---

## Controls

| Input | Action |
|-------|--------|
| Arrow keys / WASD | Move |
| Shift | Run |
| E / Enter / Space | Talk / advance dialogue |
| Mouse | Dialogue choices, game buttons |
| **T** | Trainer Card (quests + reputation) |
| **P** | MGM Rewards phone |

---

## Maps (Phases 1–4)

Eight explorable maps:

| Map ID | Zone | Highlights |
|--------|------|------------|
| `main_resort` | Casino lobby & carpet | Blackjack, hold'em, roulette, craps pits; slot aisle; sports book |
| `hotel_tower` | Hotel | Clerk Carmen, hallway, room encounter |
| `mandalay_beach` | Pool complex | Wave pool, cabanas, beach rave |
| `shark_reef` | Aquarium | Shark photo collection quest |
| `house_of_blues` | Music venue | Rhythm stage encounter |
| `ultra_arena` | Boxing/events | Scheduled event cutscenes |
| `foundation_room` | VIP lounge | Chip- and tier-gated whale NPCs |
| `staff_corridor` | Back of house | Staff-only tiles, Easter eggs |

### Navigation from main resort

| Direction | Destination |
|-----------|-------------|
| East lobby | Hotel Tower |
| West lobby | Mandalay Beach → Shark Reef warp |
| East carpet | Slot aisle (Spinster Sal) |
| West carpet | Sports book (Bookie Blake) |
| North | High Limit / Foundation Room (chip gate) |
| Far west / east doors | House of Blues / ULTRA Arena |

---

## Activity encounters

Every major casino/resort activity launches as an in-RPG **DOM overlay** — no terminal redirect.

| Encounter | Engine | NPC / trigger |
|-----------|--------|---------------|
| `blackjack` | `docs/js/blackjack/` | Dealer Dana, pit NPCs |
| `holdem` | `docs/js/holdem/` | Hold'em pit |
| `roulette` | `docs/js/roulette.js` | Roulette wheel zone |
| `craps` | `docs/js/craps.js` | Craps table |
| `slots_fortune` / `slots_high_roller` | `docs/js/slots.js` | Spinster Sal |
| `sportsbook` | `docs/js/sportsbook.js` | Bookie Blake |
| `lottery` | `docs/js/lottery.js` | Lottery counter |
| `horse_racing` | `docs/js/horse_racing.js` | Racing pavilion |
| `dressage` / `jumper` | `docs/js/equestrian.js` | Equestrian arena |
| `hotel` | `docs/js/hotel.js` | Clerk Carmen |
| `pool` | `docs/js/pool-complex.js` | Beach NPCs |
| `amenities` | `docs/js/casino-amenities.js` | Shops & bars |
| Cashier | Buy-in UI only | Lobby desk |

### Encounter flow

```
OverworldScene._tryInteract()
  → DialogueManager.start(dialogueId)
  → choice with "encounter": "blackjack"
  → EncounterBridge.start("blackjack")
  → BlackjackOverlay.open()  [DOM]
  → session.wallet synced via engine callbacks
  → SaveAdapter.persist()
  → OverworldScene resumes
```

---

## Architecture

### Hybrid Phaser + DOM

- **Phaser** renders the overworld (tiles, sprites, camera, day/night tint)
- **DOM overlays** handle dialogue and game UIs — reuses proven engine classes without rewriting card/slot UI in Phaser
- New activities follow the same pattern: add `XOverlay` in `js/systems/overlays/`, route in `EncounterBridge.js`

### File layout

```
docs/rpg/
├── index.html               # RPG entry point
├── css/rpg.css
├── GDD.md                   # Full design document (repo)
└── js/
    ├── main.js              # Bootstrap: title → Phaser → overlays
    ├── data/
    │   └── dialogues.json   # All NPC dialogue trees
    ├── scenes/
    │   ├── GameScenes.js    # OverworldScene (Phaser)
    │   └── TitleScreen.js   # DOM save picker + HUD
    └── systems/
        ├── MapData.js       # Tile maps + NPC defs
        ├── TextureFactory.js # Procedural pixel textures
        ├── DialogueManager.js
        ├── SaveAdapter.js
        ├── EncounterBridge.js
        └── overlays/        # Per-activity DOM UIs
            ├── BlackjackOverlay.js
            ├── HoldemOverlay.js
            ├── RouletteOverlay.js
            ├── CrapsOverlay.js
            ├── SlotsOverlay.js
            ├── SportsbookOverlay.js
            ├── LotteryOverlay.js
            ├── HorseRacingOverlay.js
            ├── EquestrianOverlay.js
            ├── HotelOverlay.js
            ├── PoolOverlay.js
            └── AmenitiesOverlay.js
```

Shared casino engine lives in `docs/js/` (imported by overlays).

---

## NPC roster

| NPC | Zone | Encounter / role |
|-----|------|------------------|
| Chip Chandler | Lobby | Tutorial dialogue |
| Dealer Dana | Casino carpet | Blackjack |
| Tourist Tina | Lobby | Flavor / tips |
| Spinster Sal | Slot aisle | Slots |
| Bookie Blake | Sports book | Sports + predictions |
| Cashier Carmen | Lobby desk | Buy-in |
| Clerk Carmen | Hotel tower | Hotel encounter |
| Security Sam | Roaming | Comedic escort from staff-only tiles |
| Pit dealers | Casino carpet | Hold'em, roulette, craps |

Dealer roster rotates via `docs/js/dealers.js` (mirrors `mandalay_bay/dealers.py`).

---

## Dialogue system

Dialogue trees live in `js/data/dialogues.json`.

### Node schema

```json
{
  "node_id": {
    "speaker": "NPC Name",
    "text": "Line of dialogue.",
    "next": "optional_next_node_id",
    "setFlag": "optional_flag_to_set",
    "encounter": "optional_encounter_id",
    "choices": [
      {
        "label": "Player choice text",
        "next": "node_id",
        "encounter": "blackjack",
        "setFlag": "flag",
        "requiresFlag": "only_if_set",
        "unlessFlag": "hide_if_set"
      }
    ]
  }
}
```

### Authoring workflow

1. Add nodes to `dialogues.json`
2. Reference by `dialogueId` on NPC in `MapData.js`
3. Use flags for return visits: `requiresFlag`, `unlessFlag`, `setFlag`

---

## Quest system

Quests stored in `rpg.quests`:

```json
{
  "shark_photos": { "stage": 2, "target": 5 },
  "dana_lucky_hand": { "stage": "complete" }
}
```

View progress on the **Trainer Card** (press **T**):

- Shark photo collection
- Faction reputation (whales, staff, tourists)
- Play time and world time

---

## Day / night cycle

- `rpg.worldTime` — minutes 0–1439
- Warm day lobby tint, neon night casino tint
- Synced with resort world cycle (2 hours real time = 1 in-game day)

---

## Save schema (RPG fields)

```json
{
  "version": 2,
  "playerName": "Guest",
  "wallet": { "balance": 1000, "transactions": [] },
  "activityStats": {},
  "rpg": {
    "mapId": "main_resort",
    "x": 15,
    "y": 26,
    "playerSprite": "weekend_warrior",
    "archetype": "weekend_warrior",
    "quests": {},
    "flags": {
      "met_chip_chandler": true,
      "tutorial_complete": true,
      "played_blackjack": true
    },
    "playTimeMinutes": 0,
    "worldTime": 720,
    "reputation": { "whales": 0, "staff": 0, "tourists": 0 }
  }
}
```

**Rules for save changes:**

1. Bump `SAVE_VERSION` in `docs/js/core.js`
2. Migrate in `PlayerSession.fromJSON()` — never break older saves
3. Document new fields here and in [[Save-Slots]]

---

## Audio & polish

| Feature | Detail |
|---------|--------|
| **BGM** | Zone-specific tracks via Web Audio (lobby, casino floor, encounters) |
| **SFX** | Footsteps by tile type, blackjack natural 21 shake, slot reel stops |
| **Cabinet bezel** | CSS arcade frame around `#game-shell` |
| **Konami code** | Secret room Easter egg |
| **Procedural textures** | `TextureFactory.js` generates pixel art at runtime |

### Art pipeline (future)

Migration target: Aseprite tilesets + Tiled JSON maps replacing code-generated `buildMapLayers()`.

---

## Phase roadmap

| Phase | Status | Deliverables |
|-------|--------|--------------|
| **1** | ✅ Complete | Overworld, 3 NPCs, blackjack encounter, saves |
| **2** | ✅ Complete | Slot aisle, sports book, expanded NPCs, all table games |
| **3** | ✅ Complete | Hotel, pool, Shark Reef, quests, day/night |
| **4** | ✅ Complete | House of Blues, ULTRA Arena, Foundation Room, audio, polish |

---

## Developer notes

To add a new RPG encounter:

1. Create `XOverlay.js` under `js/systems/overlays/` (copy blackjack pattern)
2. Add routing in `EncounterBridge.js`
3. Add NPC dialogue branch with `"encounter": "your_id"`
4. Reuse engine from `docs/js/` — do not duplicate game logic in Phaser scenes
5. Call `session.recordVisit()` / `session.recordResult()` and `SaveAdapter.persist()`

See [[Developer-Guide]] and the full GDD at `docs/rpg/GDD.md` in the repository.
