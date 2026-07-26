/**
 * Player appearance and the colour ramps the sprite sheets are repainted with.
 *
 * Every look is four choices — body, skin, hair, outfit, legwear — and each
 * choice is a ramp of hex stops running light to dark. `CharacterSprites.js`
 * maps a sheet's own colours onto these ramps by luminance, so a repaint keeps
 * the original art's shading and only moves the hue.
 *
 * Archetype still drives gameplay perks; appearance only drives the look.
 */
import { CHARACTER_SHEETS } from "../data/character-sheets.js";

/** Bodies the wardrobe offers, in sheet order. Others are NPC-only. */
export const BODIES = Object.entries(CHARACTER_SHEETS.sheets)
  .filter(([, sheet]) => sheet.player)
  .map(([id, sheet]) => ({ id, label: sheet.label }));

/** Every sheet, including the themed ones reserved for NPCs. */
export const SHEET_IDS = Object.keys(CHARACTER_SHEETS.sheets);

/**
 * Skin, hair and clothing ramps.
 *
 * The stops are lifted from the sprite pack's own palettes wherever possible so
 * a repainted character still sits in the same colour world as the art it came
 * from. `light` / `mid` / `shade` mirror the first, middle and last stop for
 * the CSS swatches in the wardrobe.
 */
const ramp = (id, label, stops) => ({
  id,
  label,
  ramp: stops,
  light: stops[0],
  mid: stops[Math.floor(stops.length / 2)],
  shade: stops[stops.length - 1],
});

export const SKIN_TONES = [
  ramp("porcelain", "Porcelain", ["#ffe6d8", "#f7cfbe", "#dcae97", "#a97b58", "#6d4a31"]),
  ramp("fair", "Fair", ["#fbd2bc", "#ebc1a8", "#c6a086", "#916443", "#5c432f"]),
  ramp("rosy", "Rosy", ["#fec7b6", "#f2b6a5", "#e58c7a", "#a94727", "#80341c"]),
  ramp("tan", "Tan", ["#ffd49b", "#e3ac7d", "#d59e61", "#b77f4f", "#793125"]),
  ramp("deep", "Deep", ["#ba8162", "#a56b4c", "#7f452d", "#682c24", "#3f1b16"]),
  ramp("ebony", "Ebony", ["#8d5f45", "#77492f", "#5b3520", "#402216", "#26120b"]),
];

export const HAIR_COLORS = [
  ramp("black", "Black", ["#828282", "#5e5e5e", "#444444", "#262626"]),
  ramp("chestnut", "Chestnut", ["#d28a55", "#a26133", "#884013", "#571f00"]),
  ramp("blonde", "Blonde", ["#ffe9a8", "#e8c878", "#b08a3a", "#6b4f16"]),
  ramp("auburn", "Auburn", ["#e39a6a", "#c05a2a", "#8a3312", "#4a1706"]),
  ramp("silver", "Silver", ["#c8c8c8", "#8b8b8b", "#606060", "#2d2d2d"]),
  ramp("crimson", "Crimson", ["#d68283", "#b44446", "#951f25", "#650008"]),
  ramp("pink", "Pink", ["#e88ebf", "#cf408f", "#b80d70", "#6e0043"]),
  ramp("teal", "Teal", ["#9fe3ea", "#4fb6c4", "#21707f", "#0d3a46"]),
  ramp("olive", "Olive", ["#d1d086", "#aeac4a", "#8f8a25", "#615a04"]),
];

export const OUTFIT_COLORS = [
  ramp("teal", "Teal", ["#8acad1", "#5f95b0", "#447086", "#24384f"]),
  ramp("gold", "Gold", ["#f6d982", "#d3a83c", "#9a7115", "#5a3f06"]),
  ramp("crimson", "Crimson", ["#ff6167", "#cc2d45", "#87172f", "#4d0e22"]),
  ramp("violet", "Violet", ["#d8a0ee", "#a765c8", "#713d92", "#401f56"]),
  ramp("green", "Green", ["#86d98f", "#46a75c", "#23713a", "#0e3c1e"]),
  ramp("navy", "Navy", ["#5461bd", "#414c9a", "#242e72", "#1b224f"]),
  ramp("slate", "Slate", ["#717584", "#4a4f5f", "#303238", "#1a1c22"]),
  ramp("white", "White", ["#ededed", "#c9c9c9", "#989898", "#626262"]),
];

export const LEG_COLORS = [
  ramp("denim", "Denim", ["#636280", "#53556a", "#373746", "#201d2e"]),
  ramp("indigo", "Indigo", ["#5461bd", "#414c9a", "#242e72", "#1b224f"]),
  ramp("charcoal", "Charcoal", ["#70778d", "#555a6a", "#404553", "#2c2d37"]),
  ramp("khaki", "Khaki", ["#d9c79a", "#ac9666", "#776439", "#43371a"]),
  ramp("wine", "Wine", ["#bd5954", "#9a4441", "#722624", "#4f1d1b"]),
  ramp("black", "Black", ["#4a4f5f", "#303238", "#1c1e24", "#0d0e12"]),
];

const REGIONS = [
  { key: "body", options: BODIES },
  { key: "skin", options: SKIN_TONES },
  { key: "hair", options: HAIR_COLORS },
  { key: "outfit", options: OUTFIT_COLORS },
  { key: "legs", options: LEG_COLORS },
];

const byId = (options, id, fallback) =>
  options.find((o) => o.id === id) ?? options.find((o) => o.id === fallback) ?? options[0];

const ARCHETYPE_DEFAULTS = {
  weekend_warrior: { body: "jennifer", skin: "fair", hair: "teal", outfit: "teal", legs: "denim" },
  high_roller: { body: "steve", skin: "deep", hair: "black", outfit: "gold", legs: "charcoal" },
  convention_goer: { body: "pink", skin: "porcelain", hair: "pink", outfit: "violet", legs: "indigo" },
  local: { body: "gold", skin: "tan", hair: "chestnut", outfit: "green", legs: "khaki" },
};

export function defaultAppearance(archetype = "weekend_warrior") {
  return { ...(ARCHETYPE_DEFAULTS[archetype] ?? ARCHETYPE_DEFAULTS.weekend_warrior) };
}

/**
 * Fill in any missing choice, including for saves written before a region
 * existed, so an older slot loads as a complete character rather than a blank.
 */
export function normalizeAppearance(rpg) {
  const archetype = rpg?.archetype || rpg?.playerSprite || "weekend_warrior";
  const defaults = defaultAppearance(archetype);
  const appearance = rpg?.appearance ?? {};
  const out = {};
  for (const { key, options } of REGIONS) {
    out[key] = byId(options, appearance[key], defaults[key]).id;
  }
  return out;
}

/** Stable texture / animation prefix for a look. */
export function appearanceTextureBase(appearance) {
  const a = normalizeAppearance({ appearance });
  return `pc_${a.body}_${a.skin}_${a.hair}_${a.outfit}_${a.legs}`;
}

/** Turn a look into the hex ramps `CharacterSprites` recolours with. */
export function resolvePalette(appearance) {
  const a = normalizeAppearance({ appearance });
  return {
    sheet: a.body,
    skin: byId(SKIN_TONES, a.skin).ramp,
    hair: byId(HAIR_COLORS, a.hair).ramp,
    outfit: byId(OUTFIT_COLORS, a.outfit).ramp,
    legs: byId(LEG_COLORS, a.legs).ramp,
  };
}

/**
 * The seven dealers get a sheet each, unrepainted. They are the pack's most
 * characterful art and players meet them face to face at the tables.
 */
export const DEALER_SHEETS = {
  steve_harvey: "steve",
  meryl_screech: "meryl",
  judi_bench: "judi",
  jennifer_lawless: "jennifer",
  sofia_volume: "sofia",
  octavia_spectacular: "octavia",
  nicole_widechart: "nicole",
};

/** Legacy palette keys still present in npcs.json and the dealer roster. */
const LEGACY_SHEET = {
  npc_gold: "gold",
  npc_green: "green",
  npc_pink: "pink",
  npc_teal: "teal",
  npc_red: "red",
  npc_orange: "orange",
  npc_silver: "silver",
  dealer_steve: "steve",
  dealer_meryl: "meryl",
  dealer_judi: "judi",
  dealer_jennifer: "jennifer",
  dealer_sofia: "sofia",
  dealer_octavia: "octavia",
  dealer_nicole: "nicole",
};

/**
 * Bodies a background guest may be built from.
 *
 * The themed sheets are held back: a peaked cap, a lab coat, a swim ring and a
 * green visitor read as specific people, and scattering them at random turns
 * the resort into a costume party. They are placed deliberately instead.
 */
const CROWD_BODIES = ["jennifer", "judi", "meryl", "sofia", "steve", "gold", "pink", "red", "silver"];

/** Sheets that only suit certain rooms, keyed by a hint in the NPC's id. */
const TYPECAST = [
  { match: /security|guard|bouncer|badge|bag_check|conductor|platform/, sheet: "orange" },
  { match: /lifeguard|cabana|beach|tube|hot_tub|river|reef|spa/, sheet: "teal" },
  { match: /docent|slot_tech|count_room|tech/, sheet: "octavia" },
];

const hash = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/**
 * Build a distinct look for a background NPC.
 *
 * npcs.json only ever assigned one of seven palette keys, so 75 guests shared
 * seven faces. The legacy key still picks the outfit colour — it is what the
 * written world describes — while the id seeds the body, skin, hair and
 * legwear, which is enough to make every guest recognisably their own person.
 */
export function resolveNpcLook(npcKey, npcId = "") {
  const legacy = LEGACY_SHEET[npcKey];
  const seed = hash(npcId || npcKey || "npc");
  const typecast = TYPECAST.find((t) => t.match.test(npcId));
  const sheet = typecast?.sheet
    ?? (npcId ? CROWD_BODIES[seed % CROWD_BODIES.length] : legacy)
    ?? "gold";

  const pick = (options, shift) => options[(seed >>> shift) % options.length];
  const outfitIdx = legacy
    ? Math.max(0, OUTFIT_COLORS.findIndex((o) => o.id === outfitForLegacy(legacy)))
    : (seed >>> 3) % OUTFIT_COLORS.length;

  return {
    sheet,
    skin: pick(SKIN_TONES, 7).ramp,
    hair: pick(HAIR_COLORS, 11).ramp,
    outfit: OUTFIT_COLORS[outfitIdx].ramp,
    legs: pick(LEG_COLORS, 17).ramp,
  };
}

/** The outfit colour each legacy palette key stood for. */
function outfitForLegacy(sheetId) {
  return {
    gold: "gold",
    green: "green",
    pink: "violet",
    teal: "teal",
    red: "crimson",
    orange: "gold",
    silver: "slate",
    jennifer: "teal",
    judi: "crimson",
    meryl: "white",
    sofia: "white",
    steve: "crimson",
    octavia: "white",
    nicole: "slate",
  }[sheetId] ?? "slate";
}

/** A dealer's fixed sheet, drawn with the artist's own colours. */
export function resolveDealerLook(dealerId, fallbackKey = "npc_gold") {
  const sheet = DEALER_SHEETS[dealerId] ?? LEGACY_SHEET[fallbackKey] ?? "gold";
  return { sheet };
}

/** Dialogue speakers that are not overworld NPCs. */
export const SPEAKER_LOOKS = {
  "Steve Harvey": { sheet: "steve" },
  "Dealer Meryl Screech": { sheet: "meryl" },
  "Croupier Judi Bench": { sheet: "judi" },
  "Jennifer Lawless": { sheet: "jennifer" },
  "Sofia Volume": { sheet: "sofia" },
  "Octavia Spectacular": { sheet: "octavia" },
  "Nicole Widechart": { sheet: "nicole" },
};

/**
 * Overworld NPC names, indexed as the world loads, so a dialogue portrait can
 * be looked up from the speaker name alone and match the sprite on the floor.
 */
const speakerIndex = new Map();

export function indexSpeakerLooks(npcsByMap) {
  speakerIndex.clear();
  for (const npcs of Object.values(npcsByMap ?? {})) {
    for (const npc of npcs ?? []) {
      const look = resolveNpcLook(npc.sprite, npc.id);
      speakerIndex.set(npc.name, look);
      // Dialogue often uses just the first name ("Betty" for "Barkeep Betty").
      const short = String(npc.name ?? "").split(" ").pop();
      if (short && !speakerIndex.has(short)) speakerIndex.set(short, look);
      const first = String(npc.name ?? "").split(" ")[0];
      if (first && !speakerIndex.has(first)) speakerIndex.set(first, look);
    }
  }
  return speakerIndex.size;
}

export function resolveSpeakerLook(speaker) {
  const name = String(speaker ?? "").trim();
  return SPEAKER_LOOKS[name]
    ?? speakerIndex.get(name)
    ?? resolveNpcLook("npc_gold", name || "resort");
}

export function archetypeLabel(id) {
  const labels = {
    weekend_warrior: "Weekend Warrior",
    high_roller: "High Roller",
    convention_goer: "Convention Goer",
    local: "Local",
  };
  return labels[id] ?? id;
}

export const ARCHETYPES = [
  { id: "weekend_warrior", name: "Weekend Warrior", perk: "+10% first slot spin payout" },
  { id: "high_roller", name: "High Roller", perk: "High Limit access at 5,000 chips" },
  { id: "convention_goer", name: "Convention Goer", perk: "10% cashier buy-in bonus" },
  { id: "local", name: "Local", perk: "Back-hall shortcut unlocked" },
];
