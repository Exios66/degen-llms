import { COLLISION, MAP_HEIGHT, MAP_WIDTH, TILE } from "./MapTiles.js";

/**
 * Compiles the declarative map records in `js/data/maps/*.json` into the tile
 * layers the overworld scene draws.
 *
 * Maps are authored as a stack of shapes rather than 30×30 grids of digits:
 * a base fill, ground rectangles applied in order, decor props, scatter rules
 * for greenery, and explicit clears that keep doorways open. That keeps a room
 * readable as a dozen lines of JSON instead of nine hundred numbers.
 */

/** @typedef {{ ground: number[][], collision: number[][], decor: number[][] }} MapLayers */

function tileId(name, fallback = TILE.VOID) {
  if (typeof name === "number") return name;
  const id = TILE[String(name).toUpperCase()];
  return id === undefined ? fallback : id;
}

function blankLayers(base) {
  const ground = [];
  const collision = [];
  const decor = [];
  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    ground.push(Array(MAP_WIDTH).fill(base));
    collision.push(Array(MAP_WIDTH).fill(1));
    decor.push(Array(MAP_WIDTH).fill(0));
  }
  return { ground, collision, decor };
}

function forEachCell(shape, fn) {
  if (Array.isArray(shape.points)) {
    for (const [x, y] of shape.points) fn(x, y);
    return;
  }
  const w = shape.w ?? 1;
  const h = shape.h ?? 1;
  for (let dy = 0; dy < h; dy += 1) {
    for (let dx = 0; dx < w; dx += 1) fn((shape.x ?? 0) + dx, (shape.y ?? 0) + dy);
  }
}

const inBounds = (x, y) => x >= 0 && y >= 0 && x < MAP_WIDTH && y < MAP_HEIGHT;

/**
 * @param {object} def a record from js/data/maps/
 * @returns {MapLayers}
 */
export function compileMap(def) {
  const base = tileId(def.base ?? "VOID");
  const { ground, collision, decor } = blankLayers(base);

  for (const rect of def.rects ?? []) {
    const tile = tileId(rect.tile);
    forEachCell(rect, (x, y) => {
      if (inBounds(x, y)) ground[y][x] = tile;
    });
  }

  for (const prop of def.decor ?? []) {
    const tile = tileId(prop.tile);
    forEachCell(prop, (x, y) => {
      if (inBounds(x, y)) decor[y][x] = tile;
    });
  }

  // Scatter sprinkles a prop across one floor type. The hash is deterministic
  // so saved positions never land inside new greenery, and it mixes x and y
  // unevenly so props don't line up into diagonal walls.
  for (const rule of def.scatter ?? []) {
    const tile = tileId(rule.tile);
    const mod = Math.max(2, rule.mod ?? 9);
    const on = new Set((rule.on ?? []).map((n) => tileId(n)));
    const bounds = rule.bounds ?? { x: 1, y: 1, w: MAP_WIDTH - 2, h: MAP_HEIGHT - 2 };
    forEachCell(bounds, (x, y) => {
      if (!inBounds(x, y) || decor[y][x] !== 0) return;
      if (on.size && !on.has(ground[y][x])) return;
      if ((x * 7 + y * 23 + x * y) % mod === 0) decor[y][x] = tile;
    });
  }

  // Clears run last so a doorway can always be punched through decor.
  for (const shape of def.clear ?? []) {
    forEachCell(shape, (x, y) => {
      if (!inBounds(x, y)) return;
      decor[y][x] = 0;
      if (shape.tile) ground[y][x] = tileId(shape.tile);
    });
  }

  return finalizeLayers(ground, collision, decor, def);
}

/**
 * Derive collision from ground + decor, then seal the outer ring. Door tiles
 * are re-opened afterwards so a warp on the last walkable row still works.
 */
export function finalizeLayers(ground, collision, decor, def = {}) {
  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      const tile = ground[y][x];
      const prop = decor[y][x];
      collision[y][x] = (COLLISION.has(tile) || (prop !== 0 && COLLISION.has(prop))) ? 1 : 0;
    }
  }
  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      if (x === 0 || y === 0 || x === MAP_WIDTH - 1 || y === MAP_HEIGHT - 1) {
        ground[y][x] = TILE.WALL;
        collision[y][x] = 1;
      }
    }
  }
  for (const door of def.doors ?? []) {
    if (inBounds(door.x, door.y) && door.x > 0 && door.y > 0
        && door.x < MAP_WIDTH - 1 && door.y < MAP_HEIGHT - 1) {
      collision[door.y][door.x] = 0;
      decor[door.y][door.x] = 0;
    }
  }
  return { ground, collision, decor };
}

/**
 * Fetch the authored world. Returns null when the data is unavailable so the
 * caller can fall back to the procedural builders in MapData.js.
 * @param {string} [root] path prefix, relative to docs/rpg/
 * @returns {Promise<{ maps: Record<string, object>, npcs: Record<string, object[]> } | null>}
 */
export async function loadWorld(root = "js/data") {
  try {
    const index = await fetchJson(`${root}/maps/index.json`);
    if (!Array.isArray(index?.maps) || !index.maps.length) return null;
    const records = await Promise.all(
      index.maps.map((id) => fetchJson(`${root}/maps/${id}.json`)),
    );
    const maps = {};
    for (const record of records) {
      if (record?.id) maps[record.id] = record;
    }
    if (!Object.keys(maps).length) return null;
    const npcs = (await fetchJson(`${root}/npcs.json`)) ?? {};
    return { maps, npcs };
  } catch (err) {
    console.warn("MapLoader: falling back to procedural maps", err);
    return null;
  }
}

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}
