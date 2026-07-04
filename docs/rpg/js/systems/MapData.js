/** Tile type constants for the Phase 1 resort map. */
export const TILE = {
  VOID: 0,
  LOBBY: 1,
  CARPET: 2,
  FELT: 3,
  PLANT: 4,
  WATER: 5,
  WALL: 6,
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
]);

/** @typedef {{ id: string, name: string, x: number, y: number, sprite: string, dialogueId: string, encounter?: string, direction?: string }} NpcDef */

/** Phase 1 NPC placements. */
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
    id: "dealer_dana",
    name: "Dealer Dana",
    x: 15,
    y: 12,
    sprite: "npc_green",
    dialogueId: "dealer_dana_greet",
    encounter: "blackjack",
    direction: "down",
  },
  {
    id: "tourist_tina",
    name: "Tourist Tina",
    x: 8,
    y: 18,
    sprite: "npc_pink",
    dialogueId: "tourist_tina",
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
