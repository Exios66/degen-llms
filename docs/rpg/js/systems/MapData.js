import { COLLISION, MAP_HEIGHT, MAP_WIDTH, TILE, TILE_SIZE } from "./MapTiles.js";
import { compileMap, finalizeLayers } from "./MapLoader.js";

export { COLLISION, MAP_HEIGHT, MAP_WIDTH, TILE, TILE_SIZE };

/** @typedef {'blackjack' | 'holdem' | 'roulette'} PitZone */

/**
 * @typedef {Object} NpcDef
 * @property {string} id
 * @property {string} name
 * @property {number} x
 * @property {number} y
 * @property {string} sprite
 * @property {string} dialogueId
 * @property {string} [challengeDialogueId] used when the NPC spots you first
 * @property {string} [encounter]
 * @property {string} [direction]
 * @property {PitZone} [zone]
 * @property {{ dir?: string, range?: number }} [sight] line-of-sight challenge cone
 * @property {Record<string, { x: number, y: number }>} [schedule] keyed by world-cycle phase
 */

function emptyLayers() {
  const ground = [];
  const collision = [];
  const decor = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    ground.push(Array(MAP_WIDTH).fill(TILE.VOID));
    collision.push(Array(MAP_WIDTH).fill(1));
    decor.push(Array(MAP_WIDTH).fill(0));
  }
  return { ground, collision, decor };
}

function finalize(ground, collision, decor) {
  return finalizeLayers(ground, collision, decor);
}

/** Phase 2+ NPC placements — pit zones + venue staff. */
export const NPCS = [
  {
    id: "chip_chandler",
    name: "Chip Chandler",
    x: 15,
    y: 24,
    sprite: "npc_gold",
    dialogueId: "chip_chandler_intro",
    direction: "down",
  },
  {
    id: "pit_blackjack",
    name: "Blackjack Pit",
    x: 15,
    y: 11,
    sprite: "npc_green",
    dialogueId: "pit_blackjack_greet",
    challengeDialogueId: "pit_blackjack_challenge",
    zone: "blackjack",
    encounter: "blackjack",
    direction: "down",
    sight: { dir: "down", range: 5 },
  },
  {
    id: "pit_holdem",
    name: "Hold'em Pit",
    x: 11,
    y: 10,
    sprite: "npc_teal",
    dialogueId: "pit_holdem_greet",
    zone: "holdem",
    encounter: "holdem",
    direction: "down",
  },
  {
    id: "pit_roulette",
    name: "Roulette Pit",
    x: 19,
    y: 10,
    sprite: "npc_red",
    dialogueId: "pit_roulette_greet",
    zone: "roulette",
    encounter: "roulette",
    direction: "down",
  },
  {
    id: "barkeep_betty",
    name: "Barkeep Betty",
    x: 5,
    y: 22,
    sprite: "npc_orange",
    dialogueId: "barkeep_betty_greet",
    encounter: "bar",
    direction: "right",
    schedule: { dawn: { x: 4, y: 24 } },
  },
  {
    id: "pavilion_paula",
    name: "Pavilion Paula",
    x: 24,
    y: 9,
    sprite: "npc_pink",
    dialogueId: "pavilion_paula_greet",
    encounter: "horse_racing",
    direction: "left",
  },
  {
    id: "tourist_tina",
    name: "Tourist Tina",
    x: 8,
    y: 18,
    sprite: "npc_silver",
    dialogueId: "tourist_tina",
    direction: "right",
    schedule: {
      dawn: { x: 15, y: 22 },
      midday: { x: 8, y: 18 },
      dusk: { x: 22, y: 16 },
      late: { x: 5, y: 21 },
    },
  },
  {
    id: "arena_alex",
    name: "Arena Alex",
    x: 6,
    y: 9,
    sprite: "npc_teal",
    dialogueId: "arena_alex_greet",
    encounter: "dressage",
    direction: "right",
  },
  {
    id: "spinster_sal",
    name: "Spinster Sal",
    x: 24,
    y: 14,
    sprite: "npc_pink",
    dialogueId: "spinster_sal_greet",
    challengeDialogueId: "spinster_sal_challenge",
    encounter: "slots_fortune",
    direction: "left",
    sight: { dir: "left", range: 4 },
    schedule: { dawn: { x: 24, y: 17 } },
  },
  {
    id: "bookie_blake",
    name: "Bookie Blake",
    x: 5,
    y: 14,
    sprite: "npc_silver",
    dialogueId: "bookie_blake_greet",
    challengeDialogueId: "bookie_blake_challenge",
    encounter: "sportsbook",
    direction: "right",
    sight: { dir: "right", range: 4 },
    schedule: { late: { x: 5, y: 17 } },
  },
  {
    id: "cashier_carmen",
    name: "Cashier Carmen",
    x: 20,
    y: 24,
    sprite: "npc_gold",
    dialogueId: "cashier_carmen_greet",
    encounter: "cashier",
    direction: "down",
  },
  {
    id: "security_sam",
    name: "Security Sam",
    x: 15,
    y: 4,
    sprite: "npc_red",
    dialogueId: "security_sam_greet",
    direction: "down",
    schedule: {
      dawn: { x: 15, y: 4 },
      midday: { x: 20, y: 8 },
      dusk: { x: 15, y: 6 },
      late: { x: 10, y: 8 },
    },
  },
  {
    id: "high_limit_host",
    name: "High Limit Host",
    x: 15,
    y: 5,
    sprite: "npc_gold",
    dialogueId: "high_limit_host_greet",
    encounter: "high_limit_salon",
    direction: "down",
  },
  {
    id: "shop_clerk",
    name: "Shop Clerk",
    x: 10,
    y: 22,
    sprite: "npc_pink",
    dialogueId: "shop_clerk_greet",
    encounter: "amenities",
    direction: "down",
  },
  {
    id: "lobby_statue",
    name: "Golden Statue",
    x: 15,
    y: 20,
    sprite: "npc_gold",
    dialogueId: "lobby_statue",
    direction: "down",
  },
];

/**
 * Build the 30×30 main resort map with slot aisle, sports book, high limit.
 */
export function buildMapLayers() {
  const { ground, collision, decor } = emptyLayers();

  for (let y = 1; y < MAP_HEIGHT - 1; y++) {
    for (let x = 1; x < MAP_WIDTH - 1; x++) {
      let tile = TILE.LOBBY;
      let decorTile = 0;

      if (y >= 20) {
        tile = TILE.LOBBY;
      } else if (y >= 8 && y <= 19 && x >= 4 && x <= 25) {
        tile = TILE.CARPET;
      } else if (y >= 6 && y <= 14 && x >= 10 && x <= 20) {
        tile = TILE.FELT;
      } else if (y >= 2 && y <= 5) {
        tile = TILE.WALL;
      }

      // High Limit salon corridor (north)
      if (y >= 2 && y <= 5 && x >= 13 && x <= 17) {
        tile = TILE.VIP;
      }

      // Slot aisle east
      if (y >= 12 && y <= 17 && x >= 22 && x <= 26) {
        tile = TILE.CARPET;
        if (x === 26 || x === 22) decorTile = TILE.SLOT;
      }

      // Sports book west
      if (y >= 12 && y <= 17 && x >= 3 && x <= 7) {
        tile = TILE.CARPET;
        if (x === 3 || x === 7) decorTile = TILE.SCREEN;
      }

      // Lobby bar
      if (y >= 21 && y <= 23 && x >= 3 && x <= 6) decorTile = TILE.BAR;
      // Pavilion / arena kiosks
      if (y >= 8 && y <= 10 && x >= 23 && x <= 26) decorTile = TILE.BAR;
      if (y >= 8 && y <= 10 && x >= 4 && x <= 7) decorTile = TILE.BAR;
      // Cashier desk
      if (y === 23 && x >= 19 && x <= 21) decorTile = TILE.BAR;

      if (tile === TILE.CARPET || tile === TILE.LOBBY) {
        if ((x + y) % 11 === 0 && x > 2 && x < 27 && y > 15 && y < 27) {
          decorTile = TILE.PLANT;
        }
      }
      if (y === 7 && x >= 12 && x <= 18) decorTile = TILE.PLANT;

      // STAFF ONLY north wall secret (walkable if flag — collision cleared in scene)
      if (y === 1 && x >= 14 && x <= 16) {
        tile = TILE.WALL;
        decorTile = 0;
      }

      ground[y][x] = tile;
      decor[y][x] = decorTile;
    }
  }

  return finalize(ground, collision, decor);
}

export const SPAWN_DEFAULT = { x: 15, y: 26 };

/** Fallback door warps, used only when js/data/maps/ cannot be fetched. */
const FALLBACK_DOORS = [
  { mapId: "main_resort", x: 26, y: 21, targetMap: "hotel_tower", targetX: 15, targetY: 26, message: "Gold elevator to the hotel tower." },
  { mapId: "main_resort", x: 3, y: 21, targetMap: "mandalay_beach", targetX: 15, targetY: 26, message: "Exit to the 11-acre pool complex." },
  { mapId: "main_resort", x: 15, y: 2, targetMap: "high_limit_salon", targetX: 15, targetY: 26, message: "High Limit Salon — velvet rope.", venueGate: "high_limit_salon" },
  { mapId: "high_limit_salon", x: 15, y: 28, targetMap: "main_resort", targetX: 15, targetY: 6, message: "Back to the main floor." },
  { mapId: "high_limit_salon", x: 15, y: 2, targetMap: "foundation_room", targetX: 15, targetY: 26, message: "Foundation Room — Noir members only.", venueGate: "foundation_room" },
  { mapId: "main_resort", x: 1, y: 15, targetMap: "house_of_blues", targetX: 15, targetY: 26, message: "House of Blues stage door." },
  { mapId: "main_resort", x: 28, y: 15, targetMap: "ultra_arena", targetX: 15, targetY: 26, message: "Michelob ULTRA Arena." },
  { mapId: "hotel_tower", x: 15, y: 28, targetMap: "main_resort", targetX: 26, targetY: 22, message: "Elevator down to casino lobby." },
  { mapId: "mandalay_beach", x: 15, y: 28, targetMap: "main_resort", targetX: 3, targetY: 22, message: "Back to the casino lobby." },
  { mapId: "mandalay_beach", x: 8, y: 8, targetMap: "shark_reef", targetX: 15, targetY: 26, message: "Shark Reef Aquarium entrance." },
  { mapId: "shark_reef", x: 15, y: 28, targetMap: "mandalay_beach", targetX: 8, targetY: 9, message: "Back to the pool deck." },
  { mapId: "house_of_blues", x: 15, y: 28, targetMap: "main_resort", targetX: 2, targetY: 15, message: "Back to the casino." },
  { mapId: "ultra_arena", x: 15, y: 28, targetMap: "main_resort", targetX: 27, targetY: 15, message: "Back to the casino." },
  { mapId: "foundation_room", x: 15, y: 28, targetMap: "high_limit_salon", targetX: 15, targetY: 4, message: "Back to the high limit salon." },
  { mapId: "staff_corridor", x: 15, y: 28, targetMap: "main_resort", targetX: 15, targetY: 2, message: "Slip back onto the floor." },
  { mapId: "main_resort", x: 15, y: 1, targetMap: "staff_corridor", targetX: 15, targetY: 26, message: "STAFF ONLY — you found the back room.", requiresFlag: "hint_north_wall" },
];

/** Fallback NPC placements, used only when js/data/npcs.json is unavailable. */
const FALLBACK_NPCS = {
  main_resort: NPCS,
  hotel_tower: [
    {
      id: "clerk_carmen",
      name: "Clerk Carmen",
      x: 15,
      y: 24,
      sprite: "npc_pink",
      dialogueId: "clerk_carmen_greet",
      encounter: "hotel",
      direction: "down",
    },
    {
      id: "hotel_room_door",
      name: "Your Room",
      x: 15,
      y: 8,
      sprite: "npc_gold",
      dialogueId: "hotel_room_door",
      encounter: "hotel",
      direction: "down",
    },
  ],
  mandalay_beach: [
    {
      id: "lifeguard_lou",
      name: "Lifeguard Lou",
      x: 15,
      y: 20,
      sprite: "npc_teal",
      dialogueId: "lifeguard_lou_greet",
      challengeDialogueId: "lifeguard_lou_challenge",
      encounter: "pool_wave",
      direction: "down",
      sight: { dir: "down", range: 4 },
      schedule: { late: { x: 22, y: 20 } },
    },
    {
      id: "shark_reef_guide",
      name: "Reef Guide",
      x: 8,
      y: 12,
      sprite: "npc_green",
      dialogueId: "shark_reef_guide_greet",
      direction: "right",
    },
    {
      id: "beach_dj",
      name: "Beach DJ",
      x: 22,
      y: 10,
      sprite: "npc_orange",
      dialogueId: "beach_dj_greet",
      encounter: "pool_rave",
      direction: "left",
    },
  ],
  shark_reef: [
    {
      id: "reef_docent",
      name: "Reef Docent",
      x: 15,
      y: 20,
      sprite: "npc_green",
      dialogueId: "reef_docent_greet",
      encounter: "pool_reef",
      direction: "down",
    },
    {
      id: "photo_kiosk",
      name: "Photo Kiosk",
      x: 10,
      y: 12,
      sprite: "npc_teal",
      dialogueId: "photo_kiosk",
      encounter: "pool_reef",
      direction: "down",
    },
  ],
  house_of_blues: [
    {
      id: "hob_stage",
      name: "Stage Manager",
      x: 15,
      y: 12,
      sprite: "npc_orange",
      dialogueId: "hob_stage_greet",
      encounter: "house_of_blues",
      direction: "down",
    },
  ],
  ultra_arena: [
    {
      id: "arena_usher",
      name: "Arena Usher",
      x: 15,
      y: 18,
      sprite: "npc_silver",
      dialogueId: "arena_usher_greet",
      direction: "down",
    },
  ],
  foundation_room: [
    {
      id: "whale_whitney",
      name: "Whale Whitney",
      x: 12,
      y: 14,
      sprite: "npc_gold",
      dialogueId: "whale_whitney_greet",
      direction: "right",
    },
    {
      id: "whale_warren",
      name: "Whale Warren",
      x: 18,
      y: 14,
      sprite: "npc_gold",
      dialogueId: "whale_warren_greet",
      challengeDialogueId: "whale_warren_challenge",
      encounter: "slots_high_roller",
      direction: "left",
      sight: { dir: "left", range: 5 },
    },
  ],
  high_limit_salon: [
    {
      id: "salon_pit_boss",
      name: "Salon Pit Boss",
      x: 15,
      y: 20,
      sprite: "npc_gold",
      dialogueId: "salon_pit_boss_greet",
      encounter: "high_limit_salon",
      direction: "down",
    },
    {
      id: "salon_dealer",
      name: "Salon Dealer",
      x: 15,
      y: 12,
      sprite: "npc_green",
      dialogueId: "salon_dealer_greet",
      challengeDialogueId: "salon_dealer_challenge",
      zone: "blackjack",
      encounter: "blackjack",
      direction: "down",
      sight: { dir: "down", range: 6 },
    },
    {
      id: "salon_cage",
      name: "Salon Cage",
      x: 9,
      y: 22,
      sprite: "npc_silver",
      dialogueId: "salon_cage_greet",
      encounter: "cashier",
      direction: "right",
    },
  ],
  staff_corridor: [
    {
      id: "janitor_joe",
      name: "Janitor Joe",
      x: 15,
      y: 15,
      sprite: "npc_silver",
      dialogueId: "janitor_joe_greet",
      direction: "down",
    },
  ],
};

function buildCorridorMap(floorTile, centerDecor = 0) {
  const { ground, collision, decor } = emptyLayers();
  for (let y = 1; y < MAP_HEIGHT - 1; y++) {
    for (let x = 1; x < MAP_WIDTH - 1; x++) {
      const inHall = x >= 10 && x <= 20 && y >= 4 && y <= 27;
      ground[y][x] = inHall ? floorTile : TILE.WALL;
      if (inHall && centerDecor && y === 10 && x >= 13 && x <= 17) {
        decor[y][x] = centerDecor;
      }
    }
  }
  return finalize(ground, collision, decor);
}

export function buildHotelTowerLayers() {
  const { ground, collision, decor } = emptyLayers();
  for (let y = 1; y < MAP_HEIGHT - 1; y++) {
    for (let x = 1; x < MAP_WIDTH - 1; x++) {
      let tile = TILE.VOID;
      let decorTile = 0;
      const inHall = x >= 12 && x <= 18 && y >= 6 && y <= 27;
      if (inHall) tile = TILE.LOBBY;
      if (y >= 24 && x >= 10 && x <= 20) tile = TILE.LOBBY;
      if (y === 7 && x >= 13 && x <= 17) decorTile = TILE.PLANT;
      ground[y][x] = tile;
      decor[y][x] = decorTile;
    }
  }
  return finalize(ground, collision, decor);
}

export function buildMandalayBeachLayers() {
  const { ground, collision, decor } = emptyLayers();
  for (let y = 1; y < MAP_HEIGHT - 1; y++) {
    for (let x = 1; x < MAP_WIDTH - 1; x++) {
      let tile = TILE.VOID;
      let decorTile = 0;
      if (x >= 2 && x <= 27 && y >= 2 && y <= 27) {
        if (x >= 10 && x <= 20 && y >= 10 && y <= 20) tile = TILE.WATER;
        else tile = TILE.LOBBY;
      }
      if (tile === TILE.LOBBY && (x + y) % 9 === 0) decorTile = TILE.PLANT;
      ground[y][x] = tile;
      decor[y][x] = decorTile;
    }
  }
  return finalize(ground, collision, decor);
}

export function buildSharkReefLayers() {
  const { ground, collision, decor } = emptyLayers();
  for (let y = 1; y < MAP_HEIGHT - 1; y++) {
    for (let x = 1; x < MAP_WIDTH - 1; x++) {
      let tile = TILE.AQUA;
      let decorTile = 0;
      if (x >= 8 && x <= 22 && y >= 8 && y <= 20) tile = TILE.WATER;
      if ((x === 9 || x === 21) && y >= 9 && y <= 19) decorTile = TILE.PLANT;
      if (y >= 22) tile = TILE.LOBBY;
      ground[y][x] = tile;
      decor[y][x] = decorTile;
    }
  }
  return finalize(ground, collision, decor);
}

export function buildHouseOfBluesLayers() {
  return buildCorridorMap(TILE.CARPET, TILE.BAR);
}

export function buildUltraArenaLayers() {
  const { ground, collision, decor } = emptyLayers();
  for (let y = 1; y < MAP_HEIGHT - 1; y++) {
    for (let x = 1; x < MAP_WIDTH - 1; x++) {
      let tile = TILE.LOBBY;
      if (x >= 8 && x <= 22 && y >= 8 && y <= 20) tile = TILE.FELT;
      if (y === 10 && (x === 10 || x === 20)) decor[y][x] = TILE.SCREEN;
      ground[y][x] = tile;
    }
  }
  return finalize(ground, collision, decor);
}

export function buildFoundationRoomLayers() {
  const { ground, collision, decor } = emptyLayers();
  for (let y = 1; y < MAP_HEIGHT - 1; y++) {
    for (let x = 1; x < MAP_WIDTH - 1; x++) {
      let tile = TILE.VIP;
      if (x >= 10 && x <= 20 && y >= 10 && y <= 18) tile = TILE.FELT;
      if ((x + y) % 7 === 0) decor[y][x] = TILE.PLANT;
      ground[y][x] = tile;
    }
  }
  return finalize(ground, collision, decor);
}

export function buildStaffCorridorLayers() {
  return buildCorridorMap(TILE.CARPET, TILE.BAR);
}

export function buildHighLimitSalonLayers() {
  const { ground, collision, decor } = emptyLayers();
  for (let y = 1; y < MAP_HEIGHT - 1; y++) {
    for (let x = 1; x < MAP_WIDTH - 1; x++) {
      let tile = TILE.WALL;
      let decorTile = 0;
      if (x >= 6 && x <= 23 && y >= 3 && y <= 27) tile = TILE.VIP;
      if (x >= 9 && x <= 20 && y >= 8 && y <= 18) tile = TILE.FELT;
      if (tile === TILE.VIP && (x === 7 || x === 22) && y >= 10 && y <= 20) decorTile = TILE.SLOT;
      if (y === 5 && x >= 13 && x <= 17) tile = TILE.VIP;
      ground[y][x] = tile;
      decor[y][x] = decorTile;
    }
  }
  // Keep the north and south thresholds walkable so the warps are reachable.
  for (const y of [1, 2, 28]) {
    for (let x = 14; x <= 16; x++) ground[y][x] = TILE.VIP;
  }
  return finalize(ground, collision, decor);
}

/** Procedural fallback builders, kept as the generator of last resort. */
const FALLBACK_REGISTRY = {
  main_resort: { build: buildMapLayers, spawn: { x: 15, y: 26 }, label: "Casino Lobby" },
  hotel_tower: { build: buildHotelTowerLayers, spawn: { x: 15, y: 26 }, label: "Hotel Tower" },
  mandalay_beach: { build: buildMandalayBeachLayers, spawn: { x: 15, y: 26 }, label: "Pool Complex" },
  shark_reef: { build: buildSharkReefLayers, spawn: { x: 15, y: 26 }, label: "Shark Reef" },
  house_of_blues: { build: buildHouseOfBluesLayers, spawn: { x: 15, y: 26 }, label: "House of Blues" },
  ultra_arena: { build: buildUltraArenaLayers, spawn: { x: 15, y: 26 }, label: "ULTRA Arena" },
  foundation_room: { build: buildFoundationRoomLayers, spawn: { x: 15, y: 26 }, label: "Foundation Room" },
  staff_corridor: { build: buildStaffCorridorLayers, spawn: { x: 15, y: 26 }, label: "Staff Corridor" },
  high_limit_salon: { build: buildHighLimitSalonLayers, spawn: { x: 15, y: 26 }, label: "High Limit Salon" },
};

// ── Authored world ─────────────────────────────────────────────────────────
//
// `installWorld()` swaps in the records fetched from js/data/maps/ and
// js/data/npcs.json. Until then — and if the fetch fails — every accessor
// answers from the procedural fallbacks above, so the RPG always boots.

/** @type {Record<string, object>} */
let authoredMaps = {};
/** @type {Record<string, object[]>} */
let authoredNpcs = {};
const layerCache = new Map();

/**
 * @param {{ maps: Record<string, object>, npcs: Record<string, object[]> } | null} world
 */
export function installWorld(world) {
  authoredMaps = world?.maps ?? {};
  authoredNpcs = world?.npcs ?? {};
  layerCache.clear();
  return mapIds();
}

/** True once authored map data has been installed. */
export function hasAuthoredWorld() {
  return Object.keys(authoredMaps).length > 0;
}

export function mapIds() {
  return hasAuthoredWorld() ? Object.keys(authoredMaps) : Object.keys(FALLBACK_REGISTRY);
}

/** The map every save falls back to when its recorded map no longer exists. */
export const DEFAULT_MAP_ID = "main_resort";

/**
 * @returns {{ id: string, label: string, spawn: { x: number, y: number },
 *             bgm?: string, doors: object[] }}
 */
export function getMapDefinition(mapId) {
  const authored = authoredMaps[mapId] ?? authoredMaps[DEFAULT_MAP_ID];
  if (authored) {
    return {
      id: authored.id,
      label: authored.label ?? authored.id,
      spawn: authored.spawn ?? SPAWN_DEFAULT,
      bgm: authored.bgm,
      doors: authored.doors ?? [],
    };
  }
  const fallback = FALLBACK_REGISTRY[mapId] ?? FALLBACK_REGISTRY[DEFAULT_MAP_ID];
  return {
    id: mapId in FALLBACK_REGISTRY ? mapId : DEFAULT_MAP_ID,
    label: fallback.label,
    spawn: fallback.spawn,
    doors: FALLBACK_DOORS.filter((d) => d.mapId === mapId),
  };
}

export function buildMapLayersForId(mapId) {
  const id = getMapDefinition(mapId).id;
  if (!layerCache.has(id)) {
    const authored = authoredMaps[id];
    layerCache.set(id, authored
      ? compileMap(authored)
      : (FALLBACK_REGISTRY[id] ?? FALLBACK_REGISTRY[DEFAULT_MAP_ID]).build());
  }
  // Hand out a copy: the scene punches holes in the grid for unlocked shortcuts.
  const cached = layerCache.get(id);
  return {
    ground: cached.ground.map((row) => row.slice()),
    collision: cached.collision.map((row) => row.slice()),
    decor: cached.decor.map((row) => row.slice()),
  };
}

export function getNpcsForMap(mapId) {
  if (hasAuthoredWorld()) return authoredNpcs[mapId] ?? [];
  return FALLBACK_NPCS[mapId] ?? FALLBACK_NPCS[DEFAULT_MAP_ID];
}

/**
 * Every warp leaving a map, normalized to one shape whichever source it came
 * from. Authored doors use `to`/`toX`/`toY`; the fallbacks use the older
 * `targetMap`/`targetX`/`targetY`.
 * @returns {{ x: number, y: number, targetMap: string, targetX: number,
 *             targetY: number, message?: string, venueGate?: string,
 *             requiresFlag?: string, requiresChips?: number }[]}
 */
export function doorsForMap(mapId) {
  return getMapDefinition(mapId).doors.map((d) => ({
    ...d,
    targetMap: d.to ?? d.targetMap,
    targetX: d.toX ?? d.targetX,
    targetY: d.toY ?? d.targetY,
  }));
}

/** @returns {object | null} the door on `mapId` at this tile, if any */
export function doorAt(mapId, x, y) {
  return doorsForMap(mapId).find((d) => d.x === x && d.y === y) ?? null;
}

/** Day-phase ids from world-cycle.js, in order. */
export const PHASE_KEYS = ["dawn", "midday", "dusk", "late"];

/**
 * Resolve an NPC's position for the current world phase.
 *
 * Schedules may be keyed by world-cycle phase (`dawn`/`midday`/`dusk`/`late`)
 * or by the older `night` key, which still covers dusk and late night.
 *
 * @param {object} npc
 * @param {number} [worldTimeMinutes] legacy footstep clock, used when no phase is given
 * @param {number} [phaseId] world-cycle phase index (0-3)
 */
export function resolveNpcPosition(npc, worldTimeMinutes = 720, phaseId = null) {
  const schedule = npc.schedule;
  if (!schedule) return { x: npc.x, y: npc.y };

  const idx = phaseId != null
    ? phaseId
    : (worldTimeMinutes >= 1200 || worldTimeMinutes < 360 ? 3 : 1);
  const byPhase = schedule[PHASE_KEYS[idx]];
  if (byPhase) return { x: byPhase.x, y: byPhase.y };
  if (idx >= 2 && schedule.night) return { x: schedule.night.x, y: schedule.night.y };
  if (idx < 2 && schedule.day) return { x: schedule.day.x, y: schedule.day.y };
  return { x: npc.x, y: npc.y };
}
