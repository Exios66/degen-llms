import { secureRandomInt, fisherYatesShuffle } from "./core.js";
import { assignHorseSprites } from "./horse-sprites.js";

/** Built-in roster — overridden by custom CSV list when configured. */
export const DEFAULT_HORSE_NAMES = [
  "Midnight Runner", "Desert Wind", "Golden Mane", "Silver Streak",
  "Lucky Charm", "Thunder Bolt", "Royal Flush", "Neon Star",
  "Sugar Cube", "Starlight Trot", "Cotton Candy", "Moonbeam Dash",
  "Bubblegum Blaze", "Peppermint Pace", "Marshmallow Mane", "Cherry Blossom",
  "Sakura Sprint", "Mochi Mover", "Dango Dash", "Kawaii King",
  "Princess Pony", "Sparkle Hoof", "Glitter Gallop", "Rainbow Rider",
  "Cloud Chaser", "Sunbeam Stride", "Velvet Victory", "Honey Hopper",
  "Biscuit Bolt", "Cinnamon Canter", "Maple Majesty", "Strawberry Sprint",
  "Blueberry Bolt", "Lavender Lope", "Rose Petal Run", "Daisy Dancer",
  "Panda Pace", "Bunny Bolt", "Corgi Champion", "Shiba Speed",
  "Snowflake Storm", "Aurora Ace", "Comet Cruiser", "Galaxy Gallop",
  "Pixel Pony", "Retro Runner", "Vegas Velocity", "Mandalay Magic",
  "Bay Breeze", "Sunset Streak", "Turf Titan", "Pavilion Prince",
  "Derby Dreamer", "Homestretch Hero",
];

const TRACKS = ["Mandalay Turf", "Bay Downs", "Sunset Mile", "Neon Park"];

const CSV_PATH = "data/horse_names.csv";

let cachedDefaultCsvNames = null;

function payoutWin(amount, odds) {
  if (odds > 0) return amount + Math.floor((amount * odds) / 100);
  return amount + Math.floor((amount * 100) / Math.abs(odds));
}

/**
 * Parse a CSV or plain-text horse name list.
 * Accepts one name per line, or comma-separated rows (uses first column).
 */
export function parseHorseNamesCSV(text) {
  const names = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const lower = line.toLowerCase();
    if (lower === "name" || lower.startsWith("name,")) continue;
    const cell = line.includes(",") ? line.split(",")[0].trim() : line;
    if (cell.length >= 2 && cell.length <= 48) names.push(cell);
  }
  return [...new Set(names)];
}

export function getHorseNamePool(session) {
  if (session?.horseRacingCustomNames?.length) {
    return session.horseRacingCustomNames;
  }
  if (cachedDefaultCsvNames?.length) {
    return cachedDefaultCsvNames;
  }
  return DEFAULT_HORSE_NAMES;
}

/** Load bundled horse_names.csv into memory (best-effort). */
export async function loadBundledHorseNames() {
  try {
    const res = await fetch(CSV_PATH);
    if (!res.ok) return DEFAULT_HORSE_NAMES;
    const text = await res.text();
    const parsed = parseHorseNamesCSV(text);
    if (parsed.length >= 6) {
      cachedDefaultCsvNames = parsed;
      return parsed;
    }
  } catch {
    /* offline or missing file — fall back to inline list */
  }
  return DEFAULT_HORSE_NAMES;
}

/**
 * Cycle through the name pool sequentially, wrapping when exhausted.
 * Returns names for the field and the next cycle offset.
 */
export function pickHorseNames(pool, count, startOffset = 0) {
  if (!pool.length) pool = DEFAULT_HORSE_NAMES;
  const names = [];
  let offset = startOffset;
  for (let i = 0; i < count; i++) {
    names.push(pool[offset % pool.length]);
    offset += 1;
  }
  return {
    names: fisherYatesShuffle(names),
    nextOffset: offset % pool.length,
  };
}

export function setCustomHorseNames(session, names) {
  const cleaned = names?.length ? parseHorseNamesCSV(names.join("\n")) : null;
  session.horseRacingCustomNames = cleaned?.length ? cleaned : null;
  session.horseRacingNameOffset = 0;
  return session.horseRacingCustomNames;
}

export function generateRace(session = null) {
  const pool = getHorseNamePool(session);
  const count = secureRandomInt(5, 6);
  const startOffset = session?.horseRacingNameOffset ?? 0;
  const spriteOffset = session?.horseRacingSpriteOffset ?? 0;
  const { names, nextOffset } = pickHorseNames(pool, count, startOffset);
  const spriteIds = assignHorseSprites(count, spriteOffset);

  if (session) {
    session.horseRacingNameOffset = nextOffset;
    session.horseRacingSpriteOffset = (spriteOffset + count) % 16;
  }

  const track = TRACKS[secureRandomInt(0, TRACKS.length - 1)];
  const horses = [];
  for (let i = 0; i < count; i++) {
    const strength = 0.4 + secureRandomInt(0, 600) / 1000;
    let odds;
    if (strength > 0.85) odds = [-150, -120, -110][secureRandomInt(0, 2)];
    else if (strength > 0.65) odds = [120, 150, 180][secureRandomInt(0, 2)];
    else odds = [250, 300, 400, 600][secureRandomInt(0, 3)];
    horses.push({
      number: i + 1,
      name: names[i],
      odds,
      strength,
      spriteId: spriteIds[i],
    });
  }
  return { track, horses, results: null, label: `${track} — ${count} runners` };
}

export function simulateRace(card) {
  const remaining = [...card.horses];
  const order = [];
  while (remaining.length) {
    const total = remaining.reduce((s, h) => s + h.strength, 0);
    const roll = secureRandomInt(0, Math.floor(total * 1000)) / 1000;
    let acc = 0;
    for (let i = 0; i < remaining.length; i++) {
      acc += remaining[i].strength;
      if (roll <= acc) {
        order.push(remaining[i].number);
        remaining.splice(i, 1);
        break;
      }
    }
  }
  card.results = order;
  return order;
}

export function settleTicket(slip, results) {
  const pos = results.indexOf(slip.horse) + 1;
  if (slip.betType === "win" && pos === 1) {
    const payout = payoutWin(slip.amount, slip.odds);
    return { won: true, payout, net: payout - slip.amount, reason: `Win — #${slip.horse} finished 1st` };
  }
  if (slip.betType === "place" && pos <= 2) {
    const payout = slip.amount * 2;
    return { won: true, payout, net: payout - slip.amount, reason: `Place — #${slip.horse} finished ${pos}` };
  }
  if (slip.betType === "show" && pos <= 3) {
    const payout = slip.amount * 2;
    return { won: true, payout, net: payout - slip.amount, reason: `Show — #${slip.horse} finished ${pos}` };
  }
  return { won: false, payout: 0, net: -slip.amount, reason: `#${slip.horse} finished ${pos}` };
}

export function fmtOdds(odds) {
  return odds > 0 ? `+${odds}` : String(odds);
}
