import { MAP_HEIGHT, MAP_WIDTH } from "./MapTiles.js";

/**
 * Tile routing for tap-to-walk.
 *
 * The casino floor is full of pits, plants and slot banks, so walking straight
 * at a tapped point parks the player against the first prop in the way. These
 * helpers plan a four-way route across the collision grid instead — the same
 * grid the physics bodies collide with — and hand back tile waypoints for the
 * scene to walk one at a time.
 */

const STEPS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

const inBounds = (x, y) => x >= 0 && y >= 0 && x < MAP_WIDTH && y < MAP_HEIGHT;

/** @param {number[][]} grid a collision grid where 0 is walkable */
export function isWalkable(grid, x, y) {
  return inBounds(x, y) && grid?.[y]?.[x] === 0;
}

/**
 * Breadth-first route between two tiles.
 *
 * Four-way only: diagonal steps would cut corners through props that the
 * player's body still collides with.
 *
 * @returns {{x: number, y: number}[]} tiles to walk, excluding the start tile.
 *   Empty when the goal is unreachable or already underfoot.
 */
export function findPath(grid, start, goal) {
  if (!grid || !isWalkable(grid, goal.x, goal.y)) return [];
  if (start.x === goal.x && start.y === goal.y) return [];

  const key = (x, y) => y * MAP_WIDTH + x;
  const cameFrom = new Map([[key(start.x, start.y), -1]]);
  const queue = [start];
  let head = 0;

  while (head < queue.length) {
    const at = queue[head];
    head += 1;
    if (at.x === goal.x && at.y === goal.y) {
      const path = [];
      let cursor = at;
      while (cursor && !(cursor.x === start.x && cursor.y === start.y)) {
        path.push({ x: cursor.x, y: cursor.y });
        cursor = cameFrom.get(key(cursor.x, cursor.y));
      }
      return path.reverse();
    }
    for (const [dx, dy] of STEPS) {
      const nx = at.x + dx;
      const ny = at.y + dy;
      const id = key(nx, ny);
      // The start tile can be solid — the player may be standing on a door or
      // have been placed on a prop — but every step after it must be clear.
      if (cameFrom.has(id) || !isWalkable(grid, nx, ny)) continue;
      cameFrom.set(id, at);
      queue.push({ x: nx, y: ny });
    }
  }
  return [];
}

/**
 * Half-extents of the walking collision box, in tiles, plus a little margin.
 *
 * Kept slightly generous so a smoothed line never shaves a corner the physics
 * body would then catch on.
 */
const BODY_HALF = { x: 0.38, y: 0.24 };

/** Would the collision box fit with its centre at this point, in tile units? */
function boxIsClear(grid, x, y) {
  for (let ty = Math.floor(y - BODY_HALF.y); ty <= Math.floor(y + BODY_HALF.y); ty += 1) {
    for (let tx = Math.floor(x - BODY_HALF.x); tx <= Math.floor(x + BODY_HALF.x); tx += 1) {
      if (!isWalkable(grid, tx, ty)) return false;
    }
  }
  return true;
}

/** Can the player walk the straight line between two tile centres? */
function segmentIsClear(grid, a, b) {
  const span = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  const steps = Math.max(1, Math.ceil(span * 4));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    if (!boxIsClear(grid, a.x + (b.x - a.x) * t + 0.5, a.y + (b.y - a.y) * t + 0.5)) return false;
  }
  return true;
}

/**
 * Pull a four-way route straight.
 *
 * BFS can only step north/south/east/west, so a route across an open floor
 * comes back as a staircase and the player walks it as a series of one-tile
 * hops with a direction change at every step. Dropping every waypoint that can
 * be skipped in a straight line turns that into a couple of long diagonals.
 *
 * @param {{x: number, y: number}} start tile the player is standing on
 * @param {{x: number, y: number}[]} path route from findPath()
 */
export function smoothPath(grid, start, path) {
  if (path.length < 2) return path;
  const out = [];
  let anchor = start;
  let i = 0;
  while (i < path.length) {
    let furthest = i;
    for (let j = path.length - 1; j > i; j -= 1) {
      if (segmentIsClear(grid, anchor, path[j])) {
        furthest = j;
        break;
      }
    }
    out.push(path[furthest]);
    anchor = path[furthest];
    i = furthest + 1;
  }
  return out;
}

/**
 * The closest tile to `goal` the player can actually stand on and reach.
 *
 * Taps land on walls, counters and NPCs constantly; rather than ignore them,
 * walk to the nearest spot that touches what was tapped.
 *
 * @returns {{x: number, y: number} | null}
 */
export function nearestReachable(grid, start, goal, radius = 3) {
  if (isWalkable(grid, goal.x, goal.y)) return goal;
  let best = null;
  let bestScore = Infinity;
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const x = goal.x + dx;
      const y = goal.y + dy;
      if (!isWalkable(grid, x, y)) continue;
      // Prefer tiles beside the target, then tiles near the player.
      const score = (Math.abs(dx) + Math.abs(dy)) * 100
        + Math.abs(x - start.x) + Math.abs(y - start.y);
      if (score >= bestScore) continue;
      if (!findPath(grid, start, { x, y }).length && !(start.x === x && start.y === y)) continue;
      best = { x, y };
      bestScore = score;
    }
  }
  return best;
}
