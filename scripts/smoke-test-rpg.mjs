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
const { ART_UNIT } = await import(join(rpgRoot, "js/systems/MapTiles.js"));
const { findPath, nearestReachable } = await import(join(rpgRoot, "js/systems/Pathfinder.js"));
const {
  artKeys, characterGrids, drawArtToCanvas, drawCharacterToCanvas,
  groundTextureKeys, groundTileKey, CHAR_METRICS, FOOT_DROP,
} = await import(join(rpgRoot, "js/systems/TextureFactory.js"));
const {
  HAIR_COLORS, OUTFIT_COLORS, SKIN_TONES, SPEAKER_PORTRAITS,
  defaultAppearance, resolvePalette, resolveSpeakerPortrait,
} = await import(join(rpgRoot, "js/systems/CharacterAppearance.js"));
const { DEALER_ROSTER } = await import(join(here, "..", "docs", "js", "dealers.js"));
const { PlayerSession, RPG_START_MAP, SAVE_VERSION, defaultRpgState,
  bootstrapSessionForRpg, hasCasinoProfileProgress, isCasinoOnlyProfile } = await import(
  join(here, "..", "docs", "js", "core.js"));

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
const BESPOKE = [
  "blackjack", "holdem", "roulette", "house_of_blues", "rhythm",
  "vegas_strip_drive",
];
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

/** Tiles the player can actually walk to from the map's spawn point. */
const reachedFrom = new Map();
for (const mapId of MAP_IDS) {
  const spawn = getMapDefinition(mapId).spawn;
  const seen = new Set();
  const queue = [[spawn.x, spawn.y]];
  while (queue.length) {
    const [x, y] = queue.pop();
    const key = `${x},${y}`;
    if (seen.has(key) || !walkable(mapId, x, y)) continue;
    seen.add(key);
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  reachedFrom.set(mapId, seen);
}
const connected = (mapId, x, y) => reachedFrom.get(mapId)?.has(`${x},${y}`) ?? false;
/** Standing next to a tile is enough to press E at it. */
const adjacentToWalk = (mapId, x, y, test) =>
  test(mapId, x, y) ||
  [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) => test(mapId, x + dx, y + dy));

/**
 * NPCs are allowed to occupy props — bar counters, kiosks, the cage window —
 * so what matters is that the player can stand next to them and press E.
 */
const reachable = (mapId, x, y) => adjacentToWalk(mapId, x, y, connected);

// ── Maps ──────────────────────────────────────────────────────────────────
check(knownMap(DEFAULT_MAP_ID), `default map "${DEFAULT_MAP_ID}" is not in the index`);
for (const mapId of MAP_IDS) {
  const def = getMapDefinition(mapId);
  check(typeof def.label === "string" && def.label.length > 0, `${mapId}: missing label`);
  check(typeof def.wing === "string" && def.wing !== "Unsorted",
    `${mapId}: missing wing — add it to WINGS in scripts/_author_maps.py`);
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
  check(connected(door.mapId, door.x, door.y),
    `${at}: door tile can't be walked to from the spawn point`);
  check(connected(door.targetMap, door.targetX, door.targetY),
    `${at}: lands somewhere unwalkable in ${door.targetMap} (${door.targetX},${door.targetY})`);
  // Landing on another door tile causes an enter/exit ping-pong on scene restart.
  const landDoor = doors.find((d) =>
    d.mapId === door.targetMap && d.x === door.targetX && d.y === door.targetY);
  check(!landDoor,
    `${at}: lands on a door tile in ${door.targetMap} (${door.targetX},${door.targetY}) — bounce-back loop`);
  if (door.venueGate) {
    check(["high_limit_salon", "foundation_room", "gentlemans_club"].includes(door.venueGate),
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
  // A trigger the player can never stand on never fires.
  if (t.mapId && knownMap(t.mapId)) {
    let standable = false;
    for (let dy = 0; dy < (t.height ?? 1); dy += 1) {
      for (let dx = 0; dx < (t.width ?? 1); dx += 1) {
        if (connected(t.mapId, t.x + dx, t.y + dy)) standable = true;
      }
    }
    check(standable, `trigger ${t.id}: every tile in its box is blocked`);
  }
}

// Eggs are only findable if something sets their flag: a dialogue node, a zone
// trigger, or one of the scene's hardcoded discoveries.
const SCENE_EGGS = ["found_back_room", "konami_mode", "easter_statue_pat"];
const flagSetters = new Set(SCENE_EGGS);
for (const t of triggers) if (t.setFlag) flagSetters.add(t.setFlag);
for (const node of Object.values(dialogues)) {
  if (node.setFlag) flagSetters.add(node.setFlag);
  for (const choice of node.choices ?? []) {
    if (choice.setFlag) flagSetters.add(choice.setFlag);
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

// ── Encounter reachability ────────────────────────────────────────────────
// A routable encounter that no NPC or dialogue branch leads to is dead content:
// the terminal grows a screen, the RPG hosts it, and nobody in the world ever
// offers it. These two are deliberate — they are pages of the START menu.
const MENU_ONLY_ENCOUNTERS = new Set(["stats", "staff_manifest"]);
{
  const offered = new Set();
  const walkDialogue = (nodeId, seen) => {
    const node = dialogues[nodeId];
    if (!node || seen.has(nodeId)) return;
    seen.add(nodeId);
    if (node.encounter) offered.add(node.encounter);
    for (const key of ["next", "elseNext"]) if (node[key]) walkDialogue(node[key], seen);
    for (const choice of node.choices ?? []) {
      if (choice.encounter) offered.add(choice.encounter);
      if (choice.next) walkDialogue(choice.next, seen);
    }
  };
  for (const mapId of MAP_IDS) {
    for (const npc of getNpcsForMap(mapId)) {
      if (npc.encounter) offered.add(npc.encounter);
      walkDialogue(npc.dialogueId, new Set());
      if (npc.challengeDialogueId) walkDialogue(npc.challengeDialogueId, new Set());
    }
  }
  for (const id of ENCOUNTER_IDS) {
    check(offered.has(id) || MENU_ONLY_ENCOUNTERS.has(id),
      `encounter "${id}": routable but no NPC or dialogue branch opens it`);
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
  check(flagSetters.has(flag), `${at}: nothing in the world sets flag "${flag}"`);
}
check(eggFlags.size >= quests.egg_hunt.target,
  `egg_hunt wants ${quests.egg_hunt.target} eggs but only ${eggFlags.size} exist`);

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

// ── Save migration ────────────────────────────────────────────────────────
// A v7 save predates the collection buckets and the 28-map world. It must load
// with its progress intact, keep its old map, and gain empty buckets.
{
  const v7 = {
    version: 7,
    playerName: "Legacy",
    wallet: { balance: 3300, transactions: [] },
    rpg: {
      mapId: "main_resort",
      x: 9,
      y: 12,
      archetype: "high_roller",
      flags: { tutorial_complete: true, easter_cherry: true },
      quests: { shark_photos: { progress: 3 } },
    },
    rpgData: { location: "main_lobby", flags: { hint_plants: true } },
  };
  const restored = PlayerSession.fromJSON(v7);
  check(restored.rpg.mapId === "main_resort", "v7 save moved off its saved map");
  check(restored.rpg.x === 9 && restored.rpg.y === 12, "v7 save lost its position");
  check(restored.rpg.flags.tutorial_complete === true, "v7 save lost its flags");
  check(restored.rpg.flags.hint_plants === true, "legacy rpgData flags were not folded in");
  check(restored.rpg.quests.shark_photos?.progress === 3, "v7 save lost quest progress");
  check(Array.isArray(restored.rpg.inventory), "v8 inventory bucket missing");
  for (const key of ["dex", "eggs", "mapVisits", "options"]) {
    check(restored.rpg[key] != null && typeof restored.rpg[key] === "object",
      `v8 ${key} bucket missing`);
  }
  check(restored.rpg.options.textSpeed === "normal", "v8 options defaults missing");

  const round = PlayerSession.fromJSON(restored.toJSON());
  check(round.toJSON().version === SAVE_VERSION, "round trip did not stamp the new version");
  check(round.toJSON().rpgData === undefined, "retired rpgData blob is still written");
  check(round.rpg.flags.easter_cherry === true, "round trip dropped a flag");

  const fresh = defaultRpgState();
  check(fresh.mapId === RPG_START_MAP, "new games should start at the arrival map");
  check(MAP_IDS.includes(fresh.mapId), `start map "${fresh.mapId}" is not in the world`);
  check(connected(fresh.mapId, fresh.x, fresh.y), "new-game spawn is not walkable");
}

// A web-terminal save with no RPG blob must keep casino progress and be
// adoptable into pixel mode without resetting the wallet.
{
  const terminalOnly = {
    version: SAVE_VERSION,
    playerName: "Floor Regular",
    slotId: 3,
    slotLabel: "Terminal Run",
    wallet: { balance: 8800, transactions: [] },
    activityStats: { blackjack: { visits: 2, handsOrBets: 14, netWinnings: 400 } },
    casinoTimeMs: 45 * 60 * 1000,
    rewards: { tier: "pearl", lifetimeWagered: 2500, notifications: [] },
    hotel: { foundReservation: true, reservationCode: "MB-9001" },
  };
  const loaded = PlayerSession.fromJSON(terminalOnly);
  check(loaded.rpg == null, "terminal save should not fabricate RPG state on load");
  check(isCasinoOnlyProfile(loaded), "terminal-only profile was not detected");
  check(hasCasinoProfileProgress(loaded), "casino profile progress missing");
  const { importedFromCasino, needsCharacterSetup } = bootstrapSessionForRpg(loaded);
  check(importedFromCasino, "terminal profile was not marked for RPG import");
  check(needsCharacterSetup, "terminal profile should still need character setup");
  check(loaded.wallet.balance === 8800, "wallet balance was reset during RPG bootstrap");
  check(loaded.hotel?.foundReservation === true, "hotel state was lost during RPG bootstrap");
  loaded.rpg.archetype = "high_roller";
  const saved = PlayerSession.fromJSON(loaded.toJSON());
  check(saved.rpg.archetype === "high_roller", "RPG progress did not round-trip into the shared slot");
  check(saved.wallet.balance === 8800, "wallet balance changed after RPG round-trip");
}

// ── Hosted encounters ─────────────────────────────────────────────────────
for (const [id, spec] of Object.entries(HOSTED_ENCOUNTERS)) {
  check(Boolean(spec.view), `hosted ${id}: missing view`);
  check(Boolean(spec.title), `hosted ${id}: missing title`);
}

// ── Tap-to-walk routing ───────────────────────────────────────────────────
// Touch players never press a direction, so every tap has to produce a route
// that only steps on walkable tiles — or an honest refusal.
for (const mapId of MAP_IDS) {
  const grid = layers.get(mapId).collision;
  const spawn = getMapDefinition(mapId).spawn;
  const reachedTiles = [...reachedFrom.get(mapId)].map((k) => {
    const [x, y] = k.split(",").map(Number);
    return { x, y };
  });
  // Farthest walkable tile from the spawn is the hardest route on the map.
  const far = reachedTiles.reduce((best, t) => {
    const d = Math.abs(t.x - spawn.x) + Math.abs(t.y - spawn.y);
    return d > best.d ? { t, d } : best;
  }, { t: spawn, d: -1 }).t;

  const path = findPath(grid, spawn, far);
  const at = `route ${mapId} (${spawn.x},${spawn.y})->(${far.x},${far.y})`;
  check(far === spawn || path.length > 0, `${at}: no route to the farthest walkable tile`);
  let prev = spawn;
  for (const step of path) {
    check(Math.abs(step.x - prev.x) + Math.abs(step.y - prev.y) === 1,
      `${at}: step (${step.x},${step.y}) is not adjacent to the one before it`);
    check(walkable(mapId, step.x, step.y),
      `${at}: routes over solid tile (${step.x},${step.y})`);
    prev = step;
  }
  if (path.length) {
    check(prev.x === far.x && prev.y === far.y, `${at}: route stops short of the target`);
  }

  // Tapping a wall should land you beside it rather than doing nothing.
  const wall = [];
  for (let y = 0; y < MAP_HEIGHT && wall.length < 1; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      if (walkable(mapId, x, y) || !adjacentToWalk(mapId, x, y, connected)) continue;
      wall.push({ x, y });
      break;
    }
  }
  for (const target of wall) {
    const spot = nearestReachable(grid, spawn, target);
    check(spot != null && walkable(mapId, spot.x, spot.y),
      `${mapId}: tapping solid tile (${target.x},${target.y}) found nowhere to stand`);
  }
}

// ── Art ───────────────────────────────────────────────────────────────────
// The drawers run at boot on the main thread, so a single bad palette lookup
// takes the whole overworld down. Draw every one of them here, off the wire.
{
  /** A 2D context that records rectangles instead of painting them. */
  const recorder = () => {
    const rects = [];
    const ctx = {
      imageSmoothingEnabled: true,
      fillStyle: "",
      clearRect() {},
      fillRect(x, y, w, h) { rects.push({ x, y, w, h, style: ctx.fillStyle }); },
    };
    return { width: 0, height: 0, getContext: () => ctx, rects };
  };

  const drawn = (label, draw) => {
    const canvas = recorder();
    try {
      draw(canvas);
    } catch (err) {
      fail(`art ${label}: threw ${err.message}`);
      return null;
    }
    check(canvas.rects.length >= 4, `art ${label}: drew almost nothing`);
    return canvas;
  };

  for (const key of artKeys()) {
    const canvas = drawn(`sprite ${key}`, (c) => drawArtToCanvas(c, key));
    if (!canvas || !key.startsWith("tile_")) continue;
    // A floor tile with a hole in it shows the void through the map.
    const cell = canvas.width / ART_UNIT;
    const covered = new Set();
    for (const r of canvas.rects) {
      if (r.style.startsWith("rgba")) continue;
      for (let y = r.y / cell; y < (r.y + r.h) / cell; y += 1) {
        for (let x = r.x / cell; x < (r.x + r.w) / cell; x += 1) covered.add(`${x},${y}`);
      }
    }
    check(covered.size === ART_UNIT * ART_UNIT,
      `art ${key}: ${ART_UNIT * ART_UNIT - covered.size} of ${ART_UNIT * ART_UNIT} pixels ` +
      "are transparent — ground tiles must be fully opaque");
  }
}

// ── Characters ────────────────────────────────────────────────────────────
// Procedural tuxedo grids at 32×44. A dropped character in a row shears the
// rest of the sprite, so every grid is checked for width and legend coverage.
{
  const grids = characterGrids();
  const legend = new Set([...grids.legend, "."]);
  const shape = (label, rows, expected) => {
    check(rows.length === expected,
      `art ${label}: ${rows.length} rows, expected ${expected}`);
    rows.forEach((row, index) => {
      check(row.length === grids.rowWidth,
        `art ${label} row ${index}: ${row.length} pixels, expected ${grids.rowWidth}`);
      const stray = [...row].find((ch) => !legend.has(ch));
      check(stray === undefined,
        `art ${label} row ${index}: "${stray}" is not in the palette legend`);
    });
  };
  for (const [dir, rows] of Object.entries(grids.body)) shape(`body ${dir}`, rows, grids.bodyRows);
  grids.legs.forEach((rows, frame) => shape(`legs #${frame}`, rows, grids.legRows));

  const base = defaultAppearance("weekend_warrior");
  check(base.outfit === "tuxedo", `default outfit is ${base.outfit}, expected tuxedo`);
  for (const archetype of ["weekend_warrior", "high_roller", "convention_goer", "local"]) {
    check(defaultAppearance(archetype).outfit === "tuxedo",
      `${archetype} default outfit is not tuxedo`);
  }
  check(OUTFIT_COLORS.some((o) => o.id === "tuxedo"), "OUTFIT_COLORS missing tuxedo");

  const samples = [
    ...["weekend_warrior", "high_roller", "convention_goer", "local"].map(defaultAppearance),
    ...SKIN_TONES.map((s) => ({ ...base, skin: s.id })),
    ...HAIR_COLORS.map((h) => ({ ...base, hair: h.id })),
    ...OUTFIT_COLORS.map((o) => ({ ...base, outfit: o.id })),
  ];

  /** A 2D context that records rectangles instead of painting them. */
  const recorder = () => {
    const rects = [];
    const ctx = {
      imageSmoothingEnabled: true,
      fillStyle: "",
      clearRect() {},
      fillRect(x, y, w, h) { rects.push({ x, y, w, h, style: ctx.fillStyle }); },
    };
    return { width: 0, height: 0, getContext: () => ctx, rects };
  };
  const drawn = (label, draw) => {
    const canvas = recorder();
    try {
      draw(canvas);
    } catch (err) {
      fail(`art ${label}: threw ${err.message}`);
      return null;
    }
    check(canvas.rects.length >= 4, `art ${label}: drew almost nothing`);
    return canvas;
  };

  for (const appearance of samples) {
    const palette = resolvePalette(appearance);
    const label = `${appearance.skin}/${appearance.hair}/${appearance.outfit}`;
    for (const dir of ["down", "up", "left", "right"]) {
      for (const frame of [0, 1, 2]) {
        drawn(`player ${label} ${dir}#${frame}`,
          (c) => drawCharacterToCanvas(c, palette, dir, frame));
      }
    }
  }
  for (const speaker of Object.keys(SPEAKER_PORTRAITS)) {
    drawn(`portrait ${speaker}`,
      (c) => drawCharacterToCanvas(c, resolveSpeakerPortrait(speaker)));
  }

  // Feet-origin sprites use FOOT_DROP 0; the collision box must still fit.
  check(FOOT_DROP === 0, `FOOT_DROP is ${FOOT_DROP}, expected 0 for feet-origin tuxedo sprites`);
  check(CHAR_METRICS.feet.y + CHAR_METRICS.feet.h <= CHAR_METRICS.height,
    "the collision box for the feet falls outside the frame");
}

// ── Casino door chain (feet tile reachability) ────────────────────────────
{
  const chain = [
    ["strip_sidewalk", 15, 2, "registration_lobby", 15, 26],
    ["strip_sidewalk", 15, 27, "strip_luxor", 15, 3],
    ["strip_luxor", 15, 27, "strip_excalibur", 15, 3],
    ["strip_luxor", 2, 9, "luxor_atrium", 26, 15],
    ["strip_excalibur", 2, 9, "excalibur_courtyard", 26, 15],
    ["registration_lobby", 15, 3, "main_resort", 15, 26],
    ["main_resort", 15, 27, "registration_lobby", 15, 4],
    ["registration_lobby", 15, 27, "strip_sidewalk", 15, 5],
  ];
  for (const [from, dx, dy, to, lx, ly] of chain) {
    const doors = doorsForMap(from);
    const door = doors.find((d) => d.x === dx && d.y === dy);
    check(Boolean(door), `${from}: missing door at (${dx},${dy})`);
    if (!door) continue;
    check(door.targetMap === to,
      `${from} (${dx},${dy}) targets ${door.targetMap}, expected ${to}`);
    check(door.targetX === lx && door.targetY === ly,
      `${from}→${to} lands at (${door.targetX},${door.targetY}), expected (${lx},${ly})`);
    check(walkable(from, dx, dy), `${from}: door (${dx},${dy}) is not walkable`);
    check(walkable(to, lx, ly), `${to}: landing (${lx},${ly}) is not walkable`);
  }
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
