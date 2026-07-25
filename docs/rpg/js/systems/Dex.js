import { MACHINES } from "../../../js/slots.js";
import { SHARK_SPECIES, ensurePoolComplex } from "../../../js/pool-complex.js";
import { DEALER_ROSTER } from "../../../js/dealers.js";
import { resolveNpc } from "../../../js/staff-manifest.js";

/**
 * Three collections the player fills by playing: reef species photographed,
 * slot machines played, and dealers/staff met. Entries live in `rpg.dex` so
 * they persist with the shared save.
 */
export const DEX_COLLECTIONS = ["reef", "slots", "staff"];

/** Resort NPCs that count toward the staff dex alongside the dealer roster. */
export const RESORT_STAFF_DEX = [
  { id: "chip_chandler", name: "Chip Chandler", role: "Casino host" },
  { id: "barkeep_betty", name: "Barkeep Betty", role: "Lobby bar" },
  { id: "cashier_carmen", name: "Cashier Carmen", role: "Cage" },
  { id: "clerk_carmen", name: "Clerk Carmen", role: "Front desk" },
  { id: "security_sam", name: "Security Sam", role: "Security" },
  { id: "lifeguard_lou", name: "Lifeguard Lou", role: "Pool complex" },
  { id: "reef_docent", name: "Reef Docent", role: "Shark Reef" },
  { id: "shop_clerk", name: "Shop Clerk", role: "Mandalay Place" },
  { id: "bookie_blake", name: "Bookie Blake", role: "Race & sports book" },
  { id: "pavilion_paula", name: "Pavilion Paula", role: "Racing pavilion" },
  { id: "arena_alex", name: "Arena Alex", role: "Equestrian arena" },
  { id: "janitor_joe", name: "Janitor Joe", role: "Back of house" },
  { id: "high_limit_host", name: "High Limit Host", role: "Salon" },
  { id: "beach_dj", name: "Beach DJ", role: "Beach club" },
];

function dexState(session) {
  const rpg = session.ensureRpgState();
  if (!rpg.dex) rpg.dex = {};
  for (const key of DEX_COLLECTIONS) {
    if (!Array.isArray(rpg.dex[key])) rpg.dex[key] = [];
  }
  return rpg.dex;
}

/** Record a dex sighting. Returns true when the entry is new. */
export function recordDex(session, collection, entryId) {
  if (!entryId || !DEX_COLLECTIONS.includes(collection)) return false;
  const dex = dexState(session);
  if (dex[collection].includes(entryId)) return false;
  dex[collection].push(entryId);
  return true;
}

export function hasDexEntry(session, collection, entryId) {
  return dexState(session)[collection]?.includes(entryId) ?? false;
}

/**
 * Pull sightings the player earned through shared game state (reef photos are
 * recorded by the pool complex, not by the RPG) so the dex never drifts.
 */
export function syncDexFromSession(session) {
  const dex = dexState(session);
  const pc = ensurePoolComplex(session);
  for (const speciesId of pc.sharkPhotos ?? []) {
    if (!dex.reef.includes(speciesId)) dex.reef.push(speciesId);
  }
  return dex;
}

/** @returns {{ id: string, label: string, sublabel: string, found: boolean }[]} */
export function dexEntries(session, collection) {
  const dex = syncDexFromSession(session);
  const found = new Set(dex[collection] ?? []);
  if (collection === "reef") {
    return Object.values(SHARK_SPECIES).map((s) => ({
      id: s.id,
      label: s.label,
      sublabel: `${s.points} pt${s.points === 1 ? "" : "s"}`,
      found: found.has(s.id),
    }));
  }
  if (collection === "slots") {
    return MACHINES.map((m) => ({
      id: m.id,
      label: m.name,
      sublabel: m.tagline ?? "",
      found: found.has(m.id),
    }));
  }
  const staff = [
    ...DEALER_ROSTER.map((d) => ({ id: d.id, name: d.name, role: d.tagline ?? "Dealer" })),
    ...RESORT_STAFF_DEX,
  ];
  return staff.map((person) => ({
    id: person.id,
    label: resolveNpc(session, person.id, { fallbackName: person.name }).name,
    sublabel: person.role,
    found: found.has(person.id),
  }));
}

export function dexProgress(session, collection) {
  const entries = dexEntries(session, collection);
  return { found: entries.filter((e) => e.found).length, total: entries.length };
}

export function dexSummary(session) {
  return DEX_COLLECTIONS.map((id) => ({ id, ...dexProgress(session, id) }));
}
