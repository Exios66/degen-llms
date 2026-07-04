export const LOCATIONS = {
  convention_center: {
    id: "convention_center",
    name: "Convention Center",
    connections: ["main_lobby"],
    position: { x: 480, y: 55 },
    color: 0x5c6bc0,
  },
  delano_tower: {
    id: "delano_tower",
    name: "Delano Tower",
    connections: ["main_lobby"],
    position: { x: 260, y: 145 },
    color: 0x78909c,
  },
  main_lobby: {
    id: "main_lobby",
    name: "Main Lobby / Registration",
    connections: ["convention_center", "delano_tower", "casino_floor", "mandalay_beach", "shark_reef"],
    position: { x: 480, y: 145 },
    color: 0x26a69a,
  },
  casino_floor: {
    id: "casino_floor",
    name: "Casino Floor",
    connections: ["main_lobby", "sports_book"],
    position: { x: 260, y: 265 },
    color: 0xc62828,
  },
  mandalay_beach: {
    id: "mandalay_beach",
    name: "Mandalay Beach",
    connections: ["main_lobby", "lazy_river"],
    position: { x: 480, y: 265 },
    color: 0x0288d1,
  },
  shark_reef: {
    id: "shark_reef",
    name: "Shark Reef",
    connections: ["main_lobby", "touch_pool"],
    position: { x: 700, y: 265 },
    color: 0x00838f,
  },
  sports_book: {
    id: "sports_book",
    name: "Sports Book",
    connections: ["casino_floor", "high_limit_salon"],
    position: { x: 260, y: 385 },
    color: 0x6a1b9a,
  },
  lazy_river: {
    id: "lazy_river",
    name: "Lazy River",
    connections: ["mandalay_beach"],
    position: { x: 480, y: 385 },
    color: 0x039be5,
  },
  touch_pool: {
    id: "touch_pool",
    name: "Touch Pool",
    connections: ["shark_reef"],
    position: { x: 700, y: 385 },
    color: 0x00acc1,
  },
  high_limit_salon: {
    id: "high_limit_salon",
    name: "High Limit Salon",
    connections: ["sports_book", "ultra_arena"],
    position: { x: 260, y: 505 },
    color: 0x4a148c,
  },
  ultra_arena: {
    id: "ultra_arena",
    name: "Michelob ULTRA Arena",
    connections: ["high_limit_salon", "house_of_blues"],
    position: { x: 260, y: 585 },
    color: 0xf57c00,
  },
  house_of_blues: {
    id: "house_of_blues",
    name: "House of Blues",
    connections: ["ultra_arena"],
    position: { x: 480, y: 585 },
    color: 0x1565c0,
  },
};

export const DEFAULT_LOCATION = "main_lobby";

export function getLocation(id) {
  return LOCATIONS[id] ?? null;
}

export function canTravel(fromId, toId) {
  const from = getLocation(fromId);
  return from ? from.connections.includes(toId) : false;
}

export function getConnections(locationId) {
  const loc = getLocation(locationId);
  return loc ? loc.connections.map((id) => getLocation(id)).filter(Boolean) : [];
}

/** Unique edges for drawing connection lines (avoid duplicates). */
export function getEdges() {
  const seen = new Set();
  const edges = [];
  for (const loc of Object.values(LOCATIONS)) {
    for (const targetId of loc.connections) {
      const key = [loc.id, targetId].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      const target = getLocation(targetId);
      if (target) edges.push({ from: loc, to: target });
    }
  }
  return edges;
}
