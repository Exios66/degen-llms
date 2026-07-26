/**
 * Tile vocabulary shared by the map compiler, the texture factory, and the
 * overworld scene. Kept separate from MapData.js so the compiler can import it
 * without a cycle.
 */
export const TILE = {
  VOID: 0,
  LOBBY: 1,
  CARPET: 2,
  FELT: 3,
  PLANT: 4,
  WATER: 5,
  WALL: 6,
  BAR: 7,
  SLOT: 8,
  SCREEN: 9,
  VIP: 10,
  AQUA: 11,
  ROAD: 12,
  SAND: 13,
  STAGE: 14,
  SPA: 15,
  GLASS: 16,
  ROPE: 17,
  /** Bright gold walkway — the navigation spine between zones. */
  PATH: 18,
  /** Dark border trim that separates one floor type from the next. */
  TRIM: 19,
  /** Carved-ice floor, for the icebar. */
  ICE: 20,
};

export const TILE_SIZE = 32;
export const MAP_WIDTH = 30;
export const MAP_HEIGHT = 30;
/** Logical art grid unit — textures draw at TILE_SIZE as 2×16px DS cells. */
export const ART_UNIT = 16;

/** Tiles (and decor props) the player cannot walk through. */
export const COLLISION = new Set([
  TILE.VOID,
  TILE.PLANT,
  TILE.WALL,
  TILE.WATER,
  TILE.BAR,
  TILE.SLOT,
  TILE.SCREEN,
  TILE.GLASS,
  TILE.ROPE,
]);
