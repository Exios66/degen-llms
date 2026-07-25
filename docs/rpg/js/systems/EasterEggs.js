/**
 * Easter egg registry. Eggs are cosmetic by design (see docs/rpg/GDD.md):
 * finding one records a flag, plays a chime, and fills a Secrets slot in the
 * START menu — never chips.
 *
 * The registry is loaded from js/data/easter_eggs.json at boot; the constant
 * below is the fallback so the menu still works offline.
 */
export let EGG_REGISTRY = {
  easter_cherry: { label: "Cherry on top", hint: "Somewhere a machine still pays in fruit.", reveal: "", flag: "easter_cherry" },
  konami_mode: { label: "Retro palette", hint: "Up up down down…", reveal: "", flag: "konami_mode" },
  found_back_room: { label: "Back of house", hint: "A wall that isn't quite a wall.", reveal: "", flag: "found_back_room" },
  easter_plant_whisper: { label: "The talking plant", hint: "Stand still near the greenery.", reveal: "", flag: "easter_plant_whisper" },
};

/** @param {Record<string, object>} registry */
export function loadEggRegistry(registry) {
  if (registry && typeof registry === "object" && Object.keys(registry).length) {
    EGG_REGISTRY = registry;
  }
  return EGG_REGISTRY;
}

function eggState(session) {
  const rpg = session.ensureRpgState();
  if (!rpg.eggs || typeof rpg.eggs !== "object") rpg.eggs = {};
  return rpg.eggs;
}

/**
 * Mark an egg found. Also accepts legacy flag names so eggs discovered before
 * the registry existed still count.
 * @returns {{ id: string, label: string, reveal: string } | null} the egg when newly found
 */
export function discoverEgg(session, eggId) {
  const egg = EGG_REGISTRY[eggId];
  if (!egg) return null;
  const eggs = eggState(session);
  if (eggs[eggId]) return null;
  eggs[eggId] = { at: new Date().toISOString() };
  session.ensureRpgState().flags[egg.flag ?? eggId] = true;
  return { id: eggId, label: egg.label, reveal: egg.reveal };
}

/** Fold pre-registry flags into rpg.eggs so counts stay honest across saves. */
export function syncEggsFromFlags(session) {
  const rpg = session.ensureRpgState();
  const eggs = eggState(session);
  for (const [id, egg] of Object.entries(EGG_REGISTRY)) {
    const flag = egg.flag ?? id;
    if (rpg.flags?.[flag] && !eggs[id]) {
      eggs[id] = { at: null };
    }
  }
  return eggs;
}

export function foundEggs(session) {
  return Object.keys(syncEggsFromFlags(session));
}

export function eggForFlag(flag) {
  const found = Object.entries(EGG_REGISTRY).find(([id, egg]) => (egg.flag ?? id) === flag);
  return found ? { id: found[0], ...found[1] } : null;
}
