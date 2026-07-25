#!/usr/bin/env node
/**
 * Referential-integrity check for the pixel RPG's world data.
 *
 * Loads every map, NPC, dialogue node, quest, trigger, and easter egg and
 * asserts they point at things that exist: dialogue ids resolve, encounters
 * route, warp targets land on walkable tiles, NPCs stand on walkable tiles,
 * and every spawn point is reachable. Run with: node scripts/smoke-test-rpg.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const rpgRoot = join(here, "..", "docs", "rpg");

const {
  COLLISION, MAP_HEIGHT, MAP_WIDTH, DEFAULT_MAP_ID,
  buildMapLayersForId, doorsForMap, getMapDefinition, getNpcsForMap,
  installWorld, resolveNpcPosition,
} = await import(join(rpgRoot, "js/systems/MapData.js"));
const { HOSTED_ENCOUNTERS, TABLE_STAKE_ACTIVITIES } = await import(
  join(rpgRoot, "js/systems/HostedEncounters.js"));
const { RPG_ITEMS } = await import(join(rpgRoot, "js/systems/Inventory.js"));
const { DEX_REGISTRY } = await import(join(rpgRoot, "js/systems/Dex.js"));
const { DEALER_ROSTER } = await import(join(here, "..", "docs", "js", "dealers.js"));

const readJson = (rel) => JSON.parse(readFileSync(join(rpgRoot, rel), "utf8"));
const dialogues = readJson("js/data/dialogues.json");
const triggers = readJson("js/data/triggers.json");
const quests = readJson("js/data/quests.json");
const eggs = readJson("js/data/easter_eggs.json");

// MapLoader.loadWorld() fetches over HTTP for the browser; off the wire we read
// the same records straight off disk and install them the same way main.js does.
const mapIndex = readJson("js/data/maps/index.json");
const world = {
  maps: Object.fromEntries(
    mapIndex.maps.map((id) => [id, readJson(`js/data/maps/${id}.json`)]),
  ),
  npcs: readJson("js/data/npcs.json"),
};
const MAP_IDS = installWorld(world);
const doors = MAP_IDS.flatMap((mapId) =>
  doorsForMap(mapId).map((d) => ({ ...d, mapId })));

/** Bespoke pixel overlays, mirrored from EncounterBridge's alias table. */
const BESPOKE = ["blackjack", "holdem", "roulette", "house_of_blues", "rhythm"];
const ENCOUNTER_IDS = new Set([
  ...BESPOKE, ...Object.keys(HOSTED_ENCOUNTERS), ...Object.keys(TABLE_STAKE_ACTIVITIES),
]);

const failures = [];
const fail = (msg) => failures.push(msg);
let checks = 0;
const check = (ok, msg) => { checks += 1; if (!ok) fail(msg); };

// Layers are expensive to build; do it once per map.
const layers = new Map();
for (const mapId of MAP_IDS) {
  layers.set(mapId, buildMapLayersForId(mapId));
}
const knownMap = (mapId) => MAP_IDS.includes(mapId);

const inBounds = (x, y) => x >= 0 && y >= 0 && x < MAP_WIDTH && y < MAP_HEIGHT;
const walkable = (mapId, x, y) => {
  const layer = layers.get(mapId);
  if (!layer || !inBounds(x, y)) return false;
  return layer.collision[y][x] === 0;
};

/**
 * NPCs are allowed to occupy props — bar counters, kiosks, the cage window —
 * so what matters is that the player can stand next to them and press E.
 */
const reachable = (mapId, x, y) =>
  walkable(mapId, x, y) ||
  [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) => walkable(mapId, x + dx, y + dy));

// ── Maps ──────────────────────────────────────────────────────────────────
check(knownMap(DEFAULT_MAP_ID), `default map "${DEFAULT_MAP_ID}" is not in the index`);
for (const mapId of MAP_IDS) {
  const def = getMapDefinition(mapId);
  check(typeof def.label === "string" && def.label.length > 0, `${mapId}: missing label`);
  const { ground, collision } = layers.get(mapId);
  check(ground.length === MAP_HEIGHT && ground[0].length === MAP_WIDTH,
    `${mapId}: layer is not ${MAP_WIDTH}x${MAP_HEIGHT}`);
  check(collision.flat().some((c) => c === 0), `${mapId}: has no walkable tiles`);
  check(walkable(mapId, def.spawn.x, def.spawn.y),
    `${mapId}: spawn (${def.spawn.x},${def.spawn.y}) is not walkable`);
  for (const row of ground) {
    for (const tile of row) {
      if (tile === undefined) fail(`${mapId}: undefined tile in ground layer`);
    }
  }
  check(COLLISION instanceof Set, "COLLISION should be a Set");
}

// ── Doors ─────────────────────────────────────────────────────────────────
for (const door of doors) {
  const at = `door ${door.mapId}(${door.x},${door.y})`;
  check(knownMap(door.mapId), `${at}: unknown source map`);
  check(knownMap(door.targetMap), `${at}: unknown target map "${door.targetMap}"`);
  if (!knownMap(door.targetMap)) continue;
  check(walkable(door.mapId, door.x, door.y), `${at}: door tile is not walkable`);
  check(walkable(door.targetMap, door.targetX, door.targetY),
    `${at}: lands on a blocked tile in ${door.targetMap} (${door.targetX},${door.targetY})`);
  if (door.venueGate) {
    check(["high_limit_salon", "foundation_room"].includes(door.venueGate),
      `${at}: unknown venue gate "${door.venueGate}"`);
  }
}

// Every non-hub map needs a way back out.
for (const mapId of MAP_IDS) {
  const exits = doors.filter((d) => d.mapId === mapId);
  const entries = doors.filter((d) => d.targetMap === mapId);
  check(exits.length > 0, `${mapId}: has no exit door`);
  check(entries.length > 0, `${mapId}: is unreachable — no door targets it`);
}

// ── Triggers ──────────────────────────────────────────────────────────────
const triggerIds = new Set();
for (const t of triggers) {
  check(!triggerIds.has(t.id), `trigger ${t.id}: duplicate id`);
  triggerIds.add(t.id);
  check(!t.mapId || knownMap(t.mapId), `trigger ${t.id}: unknown map "${t.mapId}"`);
  if (t.type === "warp") {
    check(knownMap(t.targetMap), `trigger ${t.id}: unknown warp target "${t.targetMap}"`);
    if (knownMap(t.targetMap)) {
      check(walkable(t.targetMap, t.targetX ?? 15, t.targetY ?? 26),
        `trigger ${t.id}: warp lands on a blocked tile`);
    }
  } else {
    check(t.type === "zone_message", `trigger ${t.id}: unknown type "${t.type}"`);
    check(Boolean(t.message), `trigger ${t.id}: zone_message with no message`);
  }
}

// ── NPCs ──────────────────────────────────────────────────────────────────
const dealerIds = new Set(DEALER_ROSTER.map((d) => d.id));
const npcIds = new Set();
for (const mapId of MAP_IDS) {
  const npcs = getNpcsForMap(mapId);
  check(npcs.length > 0, `${mapId}: has no NPCs`);
  for (const npc of npcs) {
    const at = `npc ${npc.id} (${mapId})`;
    check(!npcIds.has(npc.id), `${at}: duplicate npc id`);
    npcIds.add(npc.id);
    check(Boolean(npc.name), `${at}: missing name`);
    check(reachable(mapId, npc.x, npc.y),
      `${at}: nothing walkable next to (${npc.x},${npc.y}) — player can never reach them`);

    // Zone NPCs borrow the rotating dealer's dialogue, so they are exempt.
    if (!npc.zone) {
      check(dialogues[npc.dialogueId] != null, `${at}: unknown dialogueId "${npc.dialogueId}"`);
    }
    if (npc.challengeDialogueId && !npc.zone) {
      check(dialogues[npc.challengeDialogueId] != null,
        `${at}: unknown challengeDialogueId "${npc.challengeDialogueId}"`);
    }
    if (npc.encounter) {
      check(ENCOUNTER_IDS.has(npc.encounter), `${at}: unroutable encounter "${npc.encounter}"`);
    }
    if (npc.zone) {
      check(["blackjack", "holdem", "roulette"].includes(npc.zone), `${at}: unknown pit zone`);
    }
    if (npc.sight) {
      check(["up", "down", "left", "right"].includes(npc.sight.dir ?? npc.direction ?? "down"),
        `${at}: bad sight direction`);
      check((npc.sight.range ?? 4) > 0, `${at}: sight range must be positive`);
    }
    for (let phase = 0; phase < 4; phase += 1) {
      const pos = resolveNpcPosition(npc, 720, phase);
      check(reachable(mapId, pos.x, pos.y),
        `${at}: phase ${phase} position (${pos.x},${pos.y}) is unreachable`);
    }
  }
}
check(dealerIds.size > 0, "dealers.js exported no dealers");

// ── Dialogue graph ────────────────────────────────────────────────────────
for (const [id, node] of Object.entries(dialogues)) {
  const at = `dialogue ${id}`;
  check(typeof node.text === "string" && node.text.length > 0, `${at}: empty text`);
  for (const key of ["next", "elseNext"]) {
    if (node[key]) {
      check(dialogues[node[key]] != null, `${at}: ${key} points at missing node "${node[key]}"`);
    }
  }
  if (node.encounter) {
    check(ENCOUNTER_IDS.has(node.encounter), `${at}: unroutable encounter "${node.encounter}"`);
  }
  if (node.giveItem) {
    check(RPG_ITEMS[node.giveItem] != null, `${at}: unknown item "${node.giveItem}"`);
  }
  if (node.requiresQuestStage) {
    check(quests[node.requiresQuestStage.id] != null,
      `${at}: gate references unknown quest "${node.requiresQuestStage.id}"`);
  }
  for (const choice of node.choices ?? []) {
    const cat = `${at} choice "${choice.label}"`;
    check(Boolean(choice.label), `${at}: choice with no label`);
    if (choice.next) {
      check(dialogues[choice.next] != null, `${cat}: next points at missing node "${choice.next}"`);
    }
    if (choice.encounter) {
      check(ENCOUNTER_IDS.has(choice.encounter), `${cat}: unroutable encounter "${choice.encounter}"`);
    }
    if (choice.giveItem) {
      check(RPG_ITEMS[choice.giveItem] != null, `${cat}: unknown item "${choice.giveItem}"`);
    }
    if (choice.requiresQuestStage) {
      check(quests[choice.requiresQuestStage.id] != null,
        `${cat}: gate references unknown quest "${choice.requiresQuestStage.id}"`);
    }
  }
}

// ── Quests ────────────────────────────────────────────────────────────────
for (const [id, def] of Object.entries(quests)) {
  const at = `quest ${id}`;
  check(Boolean(def.label), `${at}: missing label`);
  check(Number.isInteger(def.target) && def.target > 0, `${at}: target must be a positive integer`);
  check(Boolean(def.hint), `${at}: missing hint`);
  if (def.rewardItem) {
    check(RPG_ITEMS[def.rewardItem] != null, `${at}: unknown rewardItem "${def.rewardItem}"`);
  }
  if (def.giver) {
    check(npcIds.has(def.giver), `${at}: giver "${def.giver}" is not an NPC anywhere`);
  }
}

// Every quest a dialogue can start must exist, and vice versa: quests that are
// neither autoStart nor offered by dialogue are unreachable.
const startedByDialogue = new Set();
for (const node of Object.values(dialogues)) {
  if (node.startQuest) startedByDialogue.add(node.startQuest);
  for (const choice of node.choices ?? []) {
    if (choice.startQuest) startedByDialogue.add(choice.startQuest);
  }
}
for (const id of startedByDialogue) {
  check(quests[id] != null, `dialogue starts unknown quest "${id}"`);
}
for (const [id, def] of Object.entries(quests)) {
  check(def.autoStart === true || startedByDialogue.has(id),
    `quest ${id}: no dialogue offers it and it does not autoStart`);
}

// ── Easter eggs ───────────────────────────────────────────────────────────
const eggFlags = new Set();
for (const [id, egg] of Object.entries(eggs)) {
  const at = `egg ${id}`;
  check(Boolean(egg.label), `${at}: missing label`);
  check(Boolean(egg.hint), `${at}: missing hint`);
  check(Boolean(egg.reveal), `${at}: missing reveal`);
  const flag = egg.flag ?? id;
  check(!eggFlags.has(flag), `${at}: flag "${flag}" is claimed by another egg`);
  eggFlags.add(flag);
}

// ── Dex ───────────────────────────────────────────────────────────────────
for (const [collection, entries] of Object.entries(DEX_REGISTRY)) {
  check(entries.length > 0, `dex ${collection}: empty collection`);
  const ids = new Set();
  for (const entry of entries) {
    check(Boolean(entry.id && entry.label), `dex ${collection}: entry missing id/label`);
    check(!ids.has(entry.id), `dex ${collection}: duplicate entry "${entry.id}"`);
    ids.add(entry.id);
  }
}

// ── Hosted encounters ─────────────────────────────────────────────────────
for (const [id, spec] of Object.entries(HOSTED_ENCOUNTERS)) {
  check(Boolean(spec.view), `hosted ${id}: missing view`);
  check(Boolean(spec.title), `hosted ${id}: missing title`);
}

if (failures.length) {
  console.error(`\nsmoke-test-rpg: ${failures.length} problem(s) in ${checks} checks\n`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`smoke-test-rpg: ${checks} checks passed across ` +
  `${MAP_IDS.length} maps, ${npcIds.size} NPCs, ` +
  `${Object.keys(dialogues).length} dialogue nodes, ${Object.keys(quests).length} quests, ` +
  `${Object.keys(eggs).length} easter eggs.`);
