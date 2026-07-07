/** Tile type constants for the Phase 1 resort map. */
export const TILE = {
  VOID: 0,
  LOBBY: 1,
  CARPET: 2,
  FELT: 3,
  PLANT: 4,
  WATER: 5,
  WALL: 6,
  BAR: 7,
};

export const TILE_SIZE = 16;
export const MAP_WIDTH = 30;
export const MAP_HEIGHT = 30;

/** Collision tiles — player cannot walk here. */
export const COLLISION = new Set([
  TILE.VOID,
  TILE.PLANT,
  TILE.WALL,
  TILE.WATER,
  TILE.BAR,
]);

/** @typedef {'blackjack' | 'holdem' | 'roulette'} PitZone */

/**
 * @typedef {Object} NpcDef
 * @property {string} id
 * @property {string} name
 * @property {number} x
 * @property {number} y
 * @property {string} sprite
 * @property {string} dialogueId
 * @property {string} [encounter]
 * @property {string} [direction]
 * @property {PitZone} [zone] — pit NPCs resolve on-duty dealer dynamically
 */

/** Phase 2 NPC placements — pit zones + venue staff. */
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
    zone: "blackjack",
    encounter: "blackjack",
    direction: "down",
  },
  {
    id: "pit_holdem",
    name: "Hold'em Pit",
    x: 11,
    y: 10,
    sprite: "npc_teal",
    dialogueId: "pit_holdem_greet",
    zone: "holdem",
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
    direction: "down",
  },
  {
    id: "barkeep_betty",
    name: "Barkeep Betty",
    x: 5,
    y: 22,
    sprite: "npc_orange",
    dialogueId: "barkeep_betty_greet",
    direction: "right",
  },
  {
    id: "pavilion_paula",
    name: "Pavilion Paula",
    x: 24,
    y: 9,
    sprite: "npc_pink",
    dialogueId: "pavilion_paula_greet",
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
  },
  {
    id: "arena_alex",
    name: "Arena Alex",
    x: 6,
    y: 9,
    sprite: "npc_teal",
    dialogueId: "arena_alex_greet",
    direction: "right",
  },
];

/**
 * Build the 30×30 resort map.
 * Layout: south lobby entrance, north casino floor with blackjack pit.
 */
export function buildMapLayers() {
  const ground = [];
  const collision = [];
  const decor = [];

  for (let y = 0; y < MAP_HEIGHT; y++) {
    const gRow = [];
    const cRow = [];
    const dRow = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      let tile = TILE.VOID;
      let decorTile = 0;

      const inBounds = x >= 1 && x <= 28 && y >= 1 && y <= 28;
      if (inBounds) {
        if (y >= 20) {
          tile = TILE.LOBBY;
        } else if (y >= 8 && y <= 19 && x >= 4 && x <= 25) {
          tile = TILE.CARPET;
        } else if (y >= 6 && y <= 14 && x >= 10 && x <= 20) {
          tile = TILE.FELT;
        } else if (y >= 2 && y <= 5) {
          tile = TILE.WALL;
        } else {
          tile = TILE.LOBBY;
        }
      }

      if (x === 0 || x === 29 || y === 0 || y === 29) tile = TILE.WALL;

      // Lobby bar — west counter
      if (y >= 21 && y <= 23 && x >= 3 && x <= 6) {
        decorTile = TILE.BAR;
      }

      // Pavilion kiosk decor — northeast carpet
      if (y >= 8 && y <= 10 && x >= 23 && x <= 26) {
        decorTile = TILE.BAR;
      }

      // Equestrian Arena kiosk decor — northwest carpet
      if (y >= 8 && y <= 10 && x >= 4 && x <= 7) {
        decorTile = TILE.BAR;
      }

      if (tile === TILE.CARPET || tile === TILE.LOBBY) {
        if ((x + y) % 11 === 0 && x > 2 && x < 27 && y > 15 && y < 27) {
          decorTile = TILE.PLANT;
        }
      }

      if (y === 7 && x >= 12 && x <= 18) decorTile = TILE.PLANT;

      gRow.push(tile);
      cRow.push(COLLISION.has(tile) || COLLISION.has(decorTile) ? 1 : 0);
      dRow.push(decorTile);
    }
    ground.push(gRow);
    collision.push(cRow);
    decor.push(dRow);
  }

  return { ground, collision, decor };
}

export const SPAWN_DEFAULT = { x: 15, y: 26 };

/** Door warps between resort maps (Phase 3). */
export const DOOR_TRIGGERS = [
  { mapId: "main_resort", x: 26, y: 21, targetMap: "hotel_tower", targetX: 15, targetY: 26, message: "Gold elevator to the hotel tower." },
  { mapId: "main_resort", x: 3, y: 21, targetMap: "mandalay_beach", targetX: 15, targetY: 26, message: "Exit to the 11-acre pool complex." },
  { mapId: "hotel_tower", x: 15, y: 28, targetMap: "main_resort", targetX: 26, targetY: 22, message: "Elevator down to casino lobby." },
  { mapId: "mandalay_beach", x: 15, y: 28, targetMap: "main_resort", targetX: 3, targetY: 22, message: "Back to the casino lobby." },
];

/** NPCs per map — merged with main NPCS for main_resort. */
export const MAP_NPCS = {
  main_resort: NPCS,
  hotel_tower: [
    {
      id: "clerk_carmen",
      name: "Clerk Carmen",
      x: 15,
      y: 24,
      sprite: "npc_pink",
      dialogueId: "clerk_carmen_greet",
      direction: "down",
    },
    {
      id: "hotel_room_door",
      name: "Your Room",
      x: 15,
      y: 8,
      sprite: "npc_gold",
      dialogueId: "hotel_room_door",
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
      direction: "down",
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
      direction: "left",
    },
  ],
};

export function getNpcsForMap(mapId) {
  return MAP_NPCS[mapId] ?? MAP_NPCS.main_resort;
}

/** Build hotel tower — hallway beats as walkable corridor. */
export function buildHotelTowerLayers() {
  const ground = [];
  const collision = [];
  const decor = [];
  const w = MAP_WIDTH;
  const h = MAP_HEIGHT;

  for (let y = 0; y < h; y++) {
    const gRow = [];
    const cRow = [];
    const dRow = [];
    for (let x = 0; x < w; x++) {
      let tile = TILE.VOID;
      let decorTile = 0;
      const inHall = x >= 12 && x <= 18 && y >= 6 && y <= 27;
      if (inHall) tile = TILE.LOBBY;
      if (y >= 24 && x >= 10 && x <= 20) tile = TILE.LOBBY;
      if (x === 0 || x === w - 1 || y === 0 || y === h - 1) tile = TILE.WALL;
      if (y === 7 && x >= 13 && x <= 17) decorTile = TILE.PLANT;
      gRow.push(tile);
      cRow.push(COLLISION.has(tile) || COLLISION.has(decorTile) ? 1 : 0);
      dRow.push(decorTile);
    }
    ground.push(gRow);
    collision.push(cRow);
    decor.push(dRow);
  }
  return { ground, collision, decor };
}

/** Build mandalay_beach — wave pool water center, deck surrounds. */
export function buildMandalayBeachLayers() {
  const ground = [];
  const collision = [];
  const decor = [];
  const w = MAP_WIDTH;
  const h = MAP_HEIGHT;

  for (let y = 0; y < h; y++) {
    const gRow = [];
    const cRow = [];
    const dRow = [];
    for (let x = 0; x < w; x++) {
      let tile = TILE.VOID;
      let decorTile = 0;
      const inBounds = x >= 2 && x <= 27 && y >= 2 && y <= 27;
      if (inBounds) {
        if (x >= 10 && x <= 20 && y >= 10 && y <= 20) tile = TILE.WATER;
        else tile = TILE.LOBBY;
      }
      if (x === 0 || x === w - 1 || y === 0 || y === h - 1) tile = TILE.WALL;
      if (tile === TILE.LOBBY && (x + y) % 9 === 0) decorTile = TILE.PLANT;
      gRow.push(tile);
      cRow.push(COLLISION.has(tile) || COLLISION.has(decorTile) ? 1 : 0);
      dRow.push(decorTile);
    }
    ground.push(gRow);
    collision.push(cRow);
    decor.push(dRow);
  }
  return { ground, collision, decor };
}

export const MAP_REGISTRY = {
  main_resort: { build: buildMapLayers, spawn: { x: 15, y: 26 }, label: "Casino Lobby" },
  hotel_tower: { build: buildHotelTowerLayers, spawn: { x: 15, y: 26 }, label: "Hotel Tower" },
  mandalay_beach: { build: buildMandalayBeachLayers, spawn: { x: 15, y: 26 }, label: "Pool Complex" },
};

export function getMapDefinition(mapId) {
  return MAP_REGISTRY[mapId] ?? MAP_REGISTRY.main_resort;
}

export function buildMapLayersForId(mapId) {
  return getMapDefinition(mapId).build();
}

