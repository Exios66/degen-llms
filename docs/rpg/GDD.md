# The Mandalay Bay — Pixel RPG Game Design Document

**Status:** Phases 1–6 complete
**Audience:** developers extending the Pokémon-style pixel resort
**Play URL:** `/rpg/index.html` — live at <https://exios66.github.io/degen-llms/rpg/>

---

## 1. Vision

The Mandalay Bay is a digital resort with three faces: a Python CLI, a web
terminal, and this pixel RPG. All three share one chip wallet, one save
library, and one set of game rules. The RPG's job is to make the resort a
*place* — twenty-eight rooms you walk through, sixty people who have something
to say, and a clock that charges you rent whether or not you are winning.

The reference feel is Pokémon: a top-down overworld, a START menu that holds
your whole life, trainers who spot you from across the room, a collection dex,
and secrets that pay in flavor rather than money.

### The delegation rule

**The RPG does not reimplement game logic or game screens.** Every casino,
hotel, pool, and shopping flow lives once in `docs/js/` and is *mounted* by the
RPG inside an encounter panel. When the terminal gains a feature, the RPG gets
it for free.

The only screens the RPG draws itself are the ones that read better in-world:
blackjack, hold'em, roulette, and the House of Blues rhythm minigame. Those are
the battle screens.

---

## 2. Architecture

```mermaid
flowchart TB
  subgraph shared ["docs/js/ — single source of truth"]
    LOGIC["Rules: slots, hotel, pool, sportsbook, bank, rewards, world-cycle"]
    SHELL["ui/shell.js — el, banner, chipLine, statusBanner, view stack"]
    UIFAC["ui/*.js — buildSlotsRenderers, buildHotelRenderers, ..."]
  end
  subgraph term ["docs/index.html — web terminal"]
    APP["app.js — bootstrap + RENDERERS assembly"]
  end
  subgraph rpg ["docs/rpg/ — Phaser overworld"]
    OW["OverworldScene"]
    HOST["TerminalHostOverlay + ctx shim"]
    MENU["MenuOverlay — START menu"]
    DATA["js/data/*.json — maps, NPCs, dialogue, quests, eggs"]
  end
  UIFAC --> LOGIC
  UIFAC --> SHELL
  APP --> UIFAC
  HOST --> UIFAC
  DATA --> OW
  OW -->|encounter id| HOST
  OW -->|Esc / X| MENU
  MENU --> HOST
```

### Where things live

| Concern | File |
|---------|------|
| Boot, save picker, HUD wiring | `js/main.js`, `js/scenes/TitleScreen.js` |
| Overworld scene, movement, triggers | `js/scenes/GameScenes.js` |
| Tile vocabulary | `js/systems/MapTiles.js` |
| JSON → tile layers | `js/systems/MapLoader.js` |
| Map/NPC/door accessors + procedural fallback | `js/systems/MapData.js` |
| Procedural sprites and tiles | `js/systems/TextureFactory.js` |
| Dialogue graph | `js/systems/DialogueManager.js` |
| Encounter routing | `js/systems/EncounterBridge.js`, `js/systems/HostedEncounters.js` |
| Mounting terminal screens | `js/systems/TerminalHostOverlay.js` |
| START menu | `js/systems/MenuOverlay.js` |
| Quests, dex, bag, secrets | `js/systems/QuestManager.js`, `Dex.js`, `Inventory.js`, `EasterEggs.js` |
| Save bridge | `js/systems/SaveAdapter.js`, `docs/js/core.js` |
| Procedural audio | `js/systems/AudioManager.js` |

---

## 3. The world

Twenty-eight rooms, each a 30×30 tile grid, authored as declarative JSON in
`js/data/maps/`. `js/data/maps/index.json` lists them; `MapLoader.compileMap()`
turns each record into ground, collision, and decor layers at boot.

| Wing | Rooms |
|------|-------|
| Arrival | Las Vegas Blvd, Valet & Parking, Registration Lobby |
| Casino | Casino Floor North, Casino Floor South, Race & Sports Book, High Limit Salon, Foundation Room |
| Retail | The Shoppes at Mandalay Place, Sky Bridge, Convention Center |
| Bars | Betty's Bar, Skyfall Lounge |
| Hotel | Hotel Tower, Guest Corridor, Room 24-118, Delano Wing, Bathhouse & Spa |
| Pool | Mandalay Beach, Cabana Row, Beach Club, Moonlight Rave Stage |
| Attractions | Shark Reef Tunnel, Shark Reef Exhibit, House of Blues, HOB Green Room, ULTRA Arena |
| Back of house | Staff Corridor |

### Map record schema

```jsonc
{
  "id": "betty_bar",
  "label": "Betty's Bar",
  "bgm": "lobby",                       // AudioManager track id
  "spawn": { "x": 15, "y": 26 },        // per-map, not a global default
  "base": "WALL",                       // fill before anything else
  "rects":   [{ "tile": "CARPET", "x": 4, "y": 4, "w": 22, "h": 22 }],
  "decor":   [{ "tile": "BAR", "x": 8, "y": 8, "w": 14, "h": 1 },
              { "tile": "PLANT", "points": [[5, 5], [24, 5]] }],
  "scatter": [{ "tile": "PLANT", "mod": 11, "on": ["LOBBY"],
                "bounds": { "x": 3, "y": 21, "w": 24, "h": 5 } }],
  "clear":   [{ "tile": "CARPET", "x": 14, "y": 26, "w": 3, "h": 3 }],
  "doors":   [{ "x": 15, "y": 27, "to": "main_resort", "toX": 4, "toY": 23,
                "message": "Back to the casino floor." }]
}
```

Layers are applied in order: `base` → `rects` → `decor` → `scatter` → `clear`.
`clear` runs last so a doorway can always be punched through greenery.
`scatter` uses a deterministic hash, never a random number, so a saved position
can never end up inside new decor after an edit.

Door options: `requiresFlag`, `requiresChips` (+ `highRollerAlt`),
`venueGate` (`high_limit_salon` | `foundation_room`, checked against
`docs/js/venues.js`), and `requiresRoomKey` (checked against
`canAccessHotelRoom()`).

### Authoring

`scripts/_author_maps.py` holds the whole world as readable Python literals and
regenerates `js/data/maps/*.json` and `js/data/npcs.json`. Edit the script, run
it, then run the integrity checker. Hand-editing the JSON works too — the
script is a convenience, not a build step.

`MapData.js` keeps the original procedural builders as a fallback: if
`MapLoader.loadWorld()` cannot fetch the JSON (file:// origin, bad deploy), the
RPG still boots into a nine-map procedural world rather than a black screen.

---

## 4. Pokémon-style systems

**START menu** (`Esc`, `X`, or `Enter` on empty ground) — Trainer Card, Quests,
Dex, Bag, Secrets, Rewards Phone, Off-Strip Bank, Player Stats, Staff Manifest,
Guest Book, Resort Completion, Options, Save, Exit to Terminal. Every entry
past the first five mounts a shared terminal screen.

**Line-of-sight challengers** — an NPC with `sight: { dir, range }` notices you
entering its cone, walks over, plays its `challengeDialogueId`, and drops
straight into its encounter. Each NPC challenges once, tracked by a
`challenged_<id>` flag.

**Quests** — `js/data/quests.json`. A quest is `{ label, hint, target, giver,
giverName, category, reward, rewardItem }`. Progress is *derived*, not
incremented: `QuestManager.syncDerived()` reads reef photos, bar orders, dex
counts, purchases, unlocked vignettes, egg count, and resort completion from
shared session state, so quest progress can never disagree with the systems
that produced it. Work done before a quest is accepted still counts — the
derived value is banked and applied on accept.

**Dex** — three collections in `js/systems/Dex.js`: Shark Reef species, slot
machines played, and staff met. Dealers are remapped through the staff manifest
so a renamed dealer still reads correctly.

**Bag** — story items from quests and dialogue, plus mall purchases and minibar
tabs pulled from `session.amenities`.

**Secrets** — `js/data/easter_eggs.json`, twelve entries. Discovered by dialogue
choices, zone triggers, or the Konami code. **Cosmetic only** — an egg never
pays chips. This is a hard design rule.

**Schedules** — NPCs carry a `schedule` keyed by world-cycle phase
(`dawn`/`midday`/`dusk`/`late`). They tween to their new spot when the phase
turns rather than teleporting.

---

## 5. Time and money

`docs/js/world-cycle.js` is the single clock. Two real hours are one in-game
day, split into four phases. `OverworldScene._tickWorldCycle()` runs every four
seconds and is the only thing that advances the world:

- mirrors `rpg.worldTime` for older saves and the HUD readout
- re-tints the screen when the phase turns (`PHASE_WASH`)
- walks NPCs to their scheduled positions
- announces the day and today's reservation requirement
- surfaces daily resort charges when a rollover posts
- warns when the room is evicted, and blocks the Room 24-118 door until the
  folio is settled

The RPG player therefore feels the same pressure as the terminal player: rent
is due whether or not the night went well.

---

## 6. Save format

`SAVE_VERSION` is **8** (`docs/js/core.js`). The `rpg` blob:

| Key | Meaning |
|-----|---------|
| `mapId`, `x`, `y` | position; new games start on `strip_sidewalk` |
| `archetype`, `playerSprite` | guest type and overworld sprite |
| `flags` | dialogue and world flags |
| `quests` | `{ id: { stage, target } }`, `stage: "complete"` when done |
| `inventory` | story item ids |
| `dex` | `{ reef: [], slots: [], staff: [] }` |
| `eggs` | `{ eggId: { at } }` |
| `mapVisits` | `{ mapId: count }` |
| `options` | `{ muted, textSpeed, footsteps }` |
| `reputation` | `{ whales, staff, tourists }` |
| `worldTime` | mirror of the world-cycle clock, kept for v7 readers |

`migrateRpgState()` folds a v7 save forward: existing keys are never renamed,
the new buckets are added empty, and a v7 save keeps the map it was saved on
instead of being moved to the new arrival map. The pre-Phase-1 `rpgData` blob
is folded into `rpg.flags` and no longer written.

On the Python side, `mandalay_bay/saves.py` reads `version` tolerantly and
carries `WEB_ONLY_SAVE_KEYS` (including `rpg`) through a CLI load/save round
trip untouched, so playing in the terminal never erases pixel progress.

---

## 7. Tests

| Check | Command |
|-------|---------|
| World data integrity | `node scripts/smoke-test-rpg.mjs` |
| Browser walk + e2e journey | `python3 scripts/smoke-test-web.py` |
| Screenshots for review | `python3 scripts/rpg-screenshot.py` |
| Python rules | `python3 -m pytest` |

`smoke-test-rpg.mjs` installs the authored world exactly the way `main.js` does
and then asserts referential integrity across roughly 2,200 checks: every map
compiles to a connected walkable region, every door lands somewhere you can
actually stand, every NPC is reachable in all four day phases, every
`dialogueId` / `encounter` / `giveItem` / `requiresQuestStage` resolves, every
egg flag is set by something in the world, and a v7 save migrates cleanly.

It also walks the other direction: every routable encounter must be *offered* by
an NPC or a dialogue branch. That rule is what catches the failure mode this
architecture invites — the terminal grows a screen, the RPG dutifully hosts it,
and nobody in the world ever hands it to the player. Only `stats` and
`staff_manifest` are exempt, because they are pages of the START menu.

`smoke-test-web.py` opens every terminal view, every RPG encounter, every menu
page, and then runs one continuous journey: boot a save slot, walk, get spotted
by a challenger, open the START menu, check into the hotel, reload, and confirm
position and chips came back.

---

## 8. Extending

| To add… | Do this |
|---------|---------|
| A room | Add a record to `scripts/_author_maps.py`, regenerate, add doors both ways, run the checker |
| An NPC | Add to the `NPCS` table in the same script plus a `*_greet` node in `dialogues.json` |
| A dialogue branch | Edit `js/data/dialogues.json`; gates are `requiresFlag`, `unlessFlag`, `requiresQuestStage` with `elseNext` |
| A quest | Add to `js/data/quests.json`, derive its progress in `QuestManager.syncDerived()`, and offer it from a dialogue node with `startQuest` |
| An easter egg | Add to `js/data/easter_eggs.json` and set its flag from a dialogue choice or a zone trigger. Cosmetic only |
| A casino screen | Build it in `docs/js/ui/` as `buildXRenderers(ctx)`, add an entry to `HostedEncounters.js`, then give somebody in the world a line that opens it. Do not write it twice |
| A tile type | Add to `MapTiles.js`, draw it in `TextureFactory.js`, and decide whether it belongs in `COLLISION` |

### Controls

| Input | Action |
|-------|--------|
| WASD / arrows | Walk |
| Shift | Run (faster with the comped golf cart at Platinum+) |
| E / Enter / Space | Talk, advance dialogue |
| Esc / X | START menu |
| T | Trainer Card |
| P | Rewards phone |
| ↑↑↓↓←→←→BA | Retro palette |
