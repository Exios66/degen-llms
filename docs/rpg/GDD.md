# The Mandalay Bay — Pixel RPG Game Design Document

**Version:** Phase 1 (complete)  
**Audience:** Future developers expanding the Epic Furious–style pixel RPG  
**Play URL:** `/rpg/index.html` (GitHub Pages: `https://exios66.github.io/degen-llms/rpg/`)

---

## 1. Vision

Transform **The Mandalay Bay** from a menu-driven terminal casino into a **16-bit JRPG / Pokémon-style explorable resort** inspired by [Operation Epic Furious](https://www.epicfurious.com/):

- Top-down overworld navigation
- NPC dialogue trees with branching choices
- Casino activities as **encounters** (blackjack first; slots and sportsbook later)
- Unified chip economy and save library shared with CLI and terminal web modes
- Dense environmental storytelling, Easter eggs, and Mandalay Bay–themed zones

Phase 1 proves the loop: **walk → talk → play blackjack → earn chips → save position**.

---

## 2. Phase 1 Deliverables (Implemented)

| Feature | Status | Location |
|---------|--------|----------|
| Phaser 3 overworld (30×30 tiles) | ✅ | `js/scenes/GameScenes.js` |
| Procedural pixel textures | ✅ | `js/systems/TextureFactory.js` |
| Player movement (WASD / arrows, Shift run) | ✅ | `OverworldScene.update()` |
| NPC interaction (face + E/Enter/Space) | ✅ | `OverworldScene._tryInteract()` |
| JSON dialogue system | ✅ | `js/systems/DialogueManager.js`, `js/data/dialogues.json` |
| Blackjack encounter (shared engine) | ✅ | `js/systems/EncounterBridge.js` |
| Save library + RPG state (v2) | ✅ | `docs/js/core.js`, `js/systems/SaveAdapter.js` |
| Chip HUD | ✅ | `js/scenes/TitleScreen.js` → `renderHud()` |
| Title / save picker | ✅ | `js/scenes/TitleScreen.js` |
| 3 NPCs (Chip Chandler, Dealer Dana, Tourist Tina) | ✅ | `js/systems/MapData.js` |

### Phase 1 map layout

```
North (y=0)
┌────────────────────────────────┐
│  WALL / future expansion       │  y 2–5
├────────────────────────────────┤
│     CASINO CARPET + FELT       │  y 6–19
│       (blackjack pit)          │  felt y 6–14, x 10–20
│         Dealer Dana            │
├────────────────────────────────┤
│     LOBBY (gold marble)        │  y 20–28
│  Chip Chandler · Tourist Tina  │
│         ENTRANCE (y=28)        │
└────────────────────────────────┘
South
```

### Phase 1 controls

| Input | Action |
|-------|--------|
| Arrow keys / WASD | Move |
| Shift | Run |
| E / Enter / Space | Talk / advance dialogue |
| Mouse | Dialogue choices, blackjack buttons |

---

## 3. Architecture

```
docs/
├── js/                          # Shared casino engine (CLI parity)
│   ├── core.js                  # PlayerSession, ChipWallet, saves (v2 + rpg)
│   └── blackjack/               # Full blackjack rules engine
└── rpg/
    ├── index.html               # RPG entry point
    ├── css/rpg.css
    ├── GDD.md                   # This document
    └── js/
        ├── main.js              # Bootstrap: title → Phaser → overlays
        ├── data/
        │   └── dialogues.json   # All NPC dialogue trees
        ├── scenes/
        │   ├── GameScenes.js    # OverworldScene (Phaser)
        │   └── TitleScreen.js   # DOM save picker + HUD
        └── systems/
            ├── MapData.js       # Tile map + NPC defs (Phase 1: code-generated)
            ├── TextureFactory.js
            ├── DialogueManager.js
            ├── SaveAdapter.js
            └── EncounterBridge.js  # Activity overlays (blackjack DOM UI)
```

### Design pattern: Hybrid Phaser + DOM

- **Phaser** renders the overworld (tiles, sprites, camera).
- **DOM overlays** handle dialogue and blackjack UI — reuses the proven `BlackjackGame` class without rewriting card UI in Phaser.
- **Future activities** (slots, sportsbook) should follow the same pattern: add `SlotsOverlay` / `SportsbookOverlay` in `EncounterBridge.js`.

### Encounter flow

```
OverworldScene._tryInteract()
  → DialogueManager.start(dialogueId)
  → choice with "encounter": "blackjack"
  → EncounterBridge.start("blackjack")
  → BlackjackOverlay.open()  [DOM]
  → session.wallet synced via BlackjackGame walletSync
  → SaveAdapter.persist()
  → OverworldScene resumes
```

### Save schema v2

Terminal and RPG modes share `localStorage` key `mandalay-bay-library`. RPG adds optional `rpg` object:

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
    "quests": {},
    "flags": {
      "met_chip_chandler": true,
      "tutorial_complete": true,
      "played_blackjack": true
    },
    "playTimeMinutes": 0
  }
}
```

**Rules for future saves changes:**

1. Bump `SAVE_VERSION` in `core.js`.
2. Migrate in `PlayerSession.fromJSON()` — never break v1 saves.
3. Document new fields in this file and `docs/saves.md`.

---

## 4. Phase 2 — Full Floor Content

**Goal:** Replace menu-only web app activities with RPG encounters; expand the map.

### 2.1 Map expansion

| Zone | Tile theme | Priority |
|------|------------|----------|
| Slot aisle (east carpet) | `TILE.CARPET` + machine decor | High |
| Sports book (west carpet) | `TILE.CARPET` + screen tiles | High |
| Cashier / lobby desk | `TILE.LOBBY` | Medium |
| High Limit salon | Locked door + chip gate (10,000) | Medium |

**Implementation steps:**

1. Add zones to `buildMapLayers()` or migrate to **Tiled** JSON export.
2. Add `triggers.json` for zone entry messages (see §7).
3. Place NPCs in `MapData.js` → later `npcs.json`.

### 2.2 New encounters

| Activity | Encounter ID | Engine reuse |
|----------|--------------|--------------|
| Mandalay Fortune slots | `slots_fortune` | `docs/js/slots.js` |
| High Roller slots | `slots_high_roller` | `docs/js/slots.js` |
| Sports book | `sportsbook` | `docs/js/sportsbook.js` |

**Checklist per activity:**

- [ ] Create `XOverlay` class in `EncounterBridge.js` (copy `BlackjackOverlay` structure)
- [ ] Add `EncounterBridge.start()` case
- [ ] Add NPC dialogue branch with `"encounter": "..."`
- [ ] Call `session.recordVisit()` / `session.recordResult()`
- [ ] Sync wallet through existing engine callbacks
- [ ] Add pytest parity tests if Python activity logic changes

### 2.3 NPC roster (Phase 2)

| NPC | Zone | Encounter |
|-----|------|-----------|
| Spinster Sal | Slot aisle | `slots_fortune` |
| Bookie Blake | Sports book | `sportsbook` |
| Cashier Carmen | Lobby desk | shop UI (buy-in only, no game) |
| Security Sam | Roaming patrol | comedic escort from STAFF ONLY tiles |

### 2.4 Dialogue authoring workflow

1. Add nodes to `js/data/dialogues.json`.
2. Reference by `dialogueId` on NPC in `MapData.js`.
3. Use flags for return visits: `requiresFlag`, `unlessFlag`, `setFlag`.
4. For conditional entry dialogue, branch in `OverworldScene._tryInteract()` (see `dealer_dana_return` pattern).

**Dialogue node schema:**

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

---

## 5. Phase 3 — Resort Expansion

**Goal:** Mandalay Bay signature venues as explorable zones.

### 5.1 New maps (multi-scene)

| Map ID | Real-world reference | Gameplay |
|--------|---------------------|----------|
| `mandalay_beach` | 11-acre pool complex | Timing mini-game (ring toss / surf) |
| `shark_reef` | Aquarium | Collection quest (photograph 5 species) |
| `house_of_blues` | Music venue | Rhythm-tap mini-game or cutscene |
| `ultra_arena` | Michelob ULTRA Arena | Scheduled event cutscenes |
| `foundation_room` | VIP lounge | Chip-gated lounge, whale NPCs |

**Implementation:**

1. Create one Phaser scene per map OR one `OverworldScene` with `mapId` swap.
2. Add door triggers: `{ "x": 15, "y": 6, "targetMap": "mandalay_beach", "targetX": 10, "targetY": 20 }`.
3. Persist `rpg.mapId`, `rpg.x`, `rpg.y` on transition.
4. Crossfade BGM per map (see §6).

### 5.2 Quest system (minimal)

Store in `rpg.quests`:

```json
{
  "shark_photos": { "stage": 2, "target": 5 },
  "dana_lucky_hand": { "stage": "complete" }
}
```

Add `QuestManager.js`:

- `QuestManager.advance("shark_photos")`
- Dialogue conditions: `"requiresQuestStage": { "id": "shark_photos", "min": 1 }`
- Trainer Card UI (Phase 3+) listing badges

### 5.3 Day / night cycle

- `rpg.worldTime` (minutes 0–1439)
- Tint overlay: warm day lobby, neon night casino
- NPC schedules: `"schedule": { "night": { "x": 12, "y": 14 } }`

---

## 6. Phase 4 — Polish & Epic Furious Parity

### 6.1 Art pipeline

**Current (Phase 1):** Procedural textures in `TextureFactory.js`.

**Target:**

| Asset | Tool | Size |
|-------|------|------|
| Tilesets | Aseprite + Tiled | 16×16 or 32×32 |
| Characters | Aseprite | 16×32, 4-dir walk cycles |
| UI | 9-slice pixel borders | — |

**Migration steps:**

1. Export Tiled map → `assets/maps/main_resort.json`.
2. Load in Phaser: `this.load.tilemapTiledJSON('map', 'assets/maps/main_resort.json')`.
3. Replace `buildMapLayers()` with tilemap layers: `ground`, `collision`, `decor`.
4. Keep `TextureFactory` as fallback for dev builds.

### 6.2 Audio

| Track | Zone |
|-------|------|
| `title_theme.ogg` | Save picker |
| `lobby.ogg` | South lobby |
| `casino_floor.ogg` | Carpet areas |
| `blackjack.ogg` | Encounter |
| `victory.ogg` | Win fanfare |
| `secret.ogg` | Easter egg room |

Use Phaser sound manager; respect browser autoplay (start audio after user gesture on title screen).

### 6.3 Juice

- Encounter transition: swirl or wipe (`cameras.main.fade` / custom shader)
- Screen shake on blackjack natural 21
- Slot reel stop frames
- Footstep SFX by tile type (`TILE.LOBBY` vs `TILE.CARPET`)

### 6.4 Arcade cabinet mode

- CSS bezel frame around `#game-shell`
- Attract screen on title idle timeout
- “Insert coin” animation → save picker

---

## 7. Content Systems Reference

### 7.1 NPC definition

```javascript
{
  id: "dealer_dana",
  name: "Dealer Dana",
  x: 15, y: 12,
  sprite: "npc_green",      // texture key from TextureFactory or atlas
  dialogueId: "dealer_dana_greet",
  encounter: "blackjack",     // optional shortcut if no dialogue
  direction: "down",
  schedule: null,             // Phase 3+
}
```

### 7.2 Trigger definition (Phase 2+)

Create `js/data/triggers.json`:

```json
[
  {
    "id": "lobby_to_casino",
    "x": 15, "y": 19,
    "width": 3, "height": 1,
    "type": "zone_message",
    "message": "The carpet hums with slots and cheers."
  },
  {
    "id": "staff_door",
    "x": 2, "y": 10,
    "type": "warp",
    "targetMap": "staff_corridor",
    "requiresFlag": "hint_north_wall"
  }
]
```

### 7.3 Easter egg tiers (backlog)

| Tier | Example | Flag |
|------|---------|------|
| Easy | First slot spin cherry bonus dialogue | `easter_cherry` |
| Medium | Konami code on lobby statue → retro palette | `konami_mode` |
| Hard | STAFF ONLY corridor behind north wall | `found_back_room` |
| ARG | Weekly sportsbook “lock of the week” | external |

Track in a spreadsheet; each egg needs: trigger, dialogue, flag, reward (cosmetic only — **never** RNG advantage).

---

## 8. Character & Faction Design

### Starter archetypes (Phase 2 character select)

| ID | Name | Starter perk |
|----|------|--------------|
| `weekend_warrior` | Weekend Warrior | +10% first slot spin payout |
| `high_roller` | High Roller | High Limit access at 5,000 chips |
| `convention_goer` | Convention Goer | 10% cashier buy-in bonus |
| `local` | Local | Back-hall shortcut unlocked |

Store in `rpg.playerSprite` / `rpg.archetype`.

### Faction reputation (Phase 3)

`rpg.reputation`: `{ whales: 0, staff: 0, tourists: 0 }` — adjusted by dialogue choices.

---

## 9. Technical Guidelines

### 9.1 Adding a new encounter (step-by-step)

1. **Engine:** Confirm JS activity logic exists in `docs/js/`.
2. **Overlay:** Create `MyActivityOverlay` in `EncounterBridge.js`.
3. **Bridge:** Add `case "my_activity":` in `EncounterBridge.start()`.
4. **Content:** Add dialogue choice with `"encounter": "my_activity"`.
5. **NPC:** Optional — link `encounter` on NPC def for non-dialogue bump.
6. **Persist:** Ensure wallet sync + `saveAdapter.persist()` on close.
7. **Stats:** `session.recordVisit()` / `session.recordResult()`.
8. **Docs:** Update this file and `docs/player-guide.md`.

### 9.2 RNG / fairness

All gambling outcomes **must** use `crypto.getRandomValues` (via `secureRandomInt` / `fisherYatesShuffle` in `core.js`). Easter eggs may unlock content but **must not** alter odds.

### 9.3 Python CLI parity

The Python `mandalay_bay` package remains the rules reference. When changing paytables or blackjack rules:

1. Update Python first.
2. Port to `docs/js/`.
3. Run `python3 -m pytest -v`.

RPG mode does not use Python at runtime — browser only.

### 9.4 Local development

```bash
# Serve docs (required for ES modules + fetch)
cd docs && python3 -m http.server 8080

# Terminal casino
open http://localhost:8080/index.html

# Pixel RPG
open http://localhost:8080/rpg/index.html
```

### 9.5 Deploy

RPG lives under `docs/rpg/` and deploys with GitHub Pages:

```bash
./scripts/deploy-gh-pages.sh
```

### 9.6 Testing checklist (manual Phase 1)

- [ ] Create save slot → enter overworld at lobby
- [ ] Talk to Chip Chandler → tutorial flags set
- [ ] Walk north → face Dealer Dana → play blackjack hand
- [ ] Win/lose updates chip HUD and save file
- [ ] Reload page → position and chips restored
- [ ] Guest mode works without persisting
- [ ] Terminal mode (`../index.html`) still loads same save slots

---

## 10. Phase Summary Roadmap

| Phase | Focus | Exit criteria |
|-------|-------|---------------|
| **1** ✅ | Lobby → blackjack vertical slice | Walk, talk, play, save |
| **2** | Slots + sportsbook + expanded floor | All 3 casino games as encounters |
| **3** | Beach, aquarium, quests | Second map + collection quest |
| **4** | Art, audio, juice, Easter eggs | Tiled maps, 8+ tracks, 30 secrets |
| **5** | Live ops | Seasonal events, weekly sportsbook |

---

## 11. File Ownership Quick Reference

| Task | Primary files |
|------|---------------|
| New map geometry | `MapData.js` → Tiled JSON |
| New NPC | `MapData.js`, `dialogues.json` |
| New dialogue | `dialogues.json` |
| New mini-game | `EncounterBridge.js`, `docs/js/*.js` |
| Save format | `docs/js/core.js`, `SaveAdapter.js` |
| HUD / title | `TitleScreen.js`, `rpg.css` |
| Overworld behavior | `GameScenes.js` |
| Pixel textures | `TextureFactory.js` → sprite atlases |

---

## 12. Legal & Branding

- Use **“The Mandalay Bay”** as fictional resort branding (existing project convention).
- Do **not** use MGM/Mandalay Bay official logos or trademarked marketing assets without license.
- Easter eggs and satire should target **Vegas/resort tropes**, not real individuals (Epic Furious is political satire; this project is resort adventure).

---

## 13. Contact & Handoff

When picking up this project:

1. Play Phase 1 end-to-end locally.
2. Read `docs/architecture.md` for casino engine design.
3. Read `docs/adding-activities.md` for Python activity plugin pattern.
4. Implement Phase 2 encounters using §9.1 — **do not** rewrite blackjack logic in Phaser.

**Phase 1 is intentionally small.** The architecture separates **world** (Phaser), **story** (JSON dialogue), and **games** (shared JS engine). Expand each layer independently without breaking save compatibility.
