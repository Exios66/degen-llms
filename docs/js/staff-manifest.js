import { DEALER_ROSTER } from "./dealers.js";

/** @typedef {{ name?: string, tagline?: string, context?: string }} StaffOverride */

const BASE_MANIFEST = {
  npcs: [
    {
      id: "chip_chandler",
      name: "Chip Chandler",
      role: "floor_host",
      context: "Lobby host who knows every pit rotation and where the action is tonight.",
    },
    {
      id: "barkeep_betty",
      name: "Barkeep Betty",
      role: "bartender",
      context: "Runs Betty's Bar — comp drinks for tier members, gossip for everyone else.",
    },
    {
      id: "pavilion_paula",
      name: "Pavilion Paula",
      role: "racing_host",
      context: "Racing pavilion greeter; knows the ponies and the paddock mood.",
    },
    {
      id: "tourist_tina",
      name: "Tourist Tina",
      role: "guest",
      context: "First-timer on the floor, always asking who's dealing and where to eat.",
    },
  ],
};

export function getStaffOverrides(session) {
  const overrides = session?.staffOverrides;
  if (!overrides) return { dealers: {}, npcs: {} };
  return {
    dealers: { ...(overrides.dealers ?? {}) },
    npcs: { ...(overrides.npcs ?? {}) },
  };
}

export function setStaffOverrides(session, overrides) {
  if (!overrides || (!Object.keys(overrides.dealers ?? {}).length && !Object.keys(overrides.npcs ?? {}).length)) {
    session.staffOverrides = null;
    return;
  }
  session.staffOverrides = {
    dealers: { ...(overrides.dealers ?? {}) },
    npcs: { ...(overrides.npcs ?? {}) },
  };
}

export function updateStaffOverride(session, category, staffId, fields) {
  const current = getStaffOverrides(session);
  const bucket = { ...(current[category] ?? {}) };
  const merged = { ...(bucket[staffId] ?? {}) };
  for (const [key, value] of Object.entries(fields)) {
    const cleaned = String(value ?? "").trim();
    if (cleaned) merged[key] = cleaned;
    else delete merged[key];
  }
  if (Object.keys(merged).length) bucket[staffId] = merged;
  else delete bucket[staffId];
  current[category] = bucket;
  setStaffOverrides(session, current);
}

export function clearStaffOverride(session, category, staffId) {
  const current = getStaffOverrides(session);
  const bucket = { ...(current[category] ?? {}) };
  delete bucket[staffId];
  current[category] = bucket;
  setStaffOverrides(session, current);
}

export function resolveDealer(session, dealer) {
  const override = getStaffOverrides(session).dealers[dealer.id];
  if (!override) return dealer;
  return {
    ...dealer,
    name: override.name ?? dealer.name,
    tagline: override.tagline ?? dealer.tagline,
  };
}

export function resolveNpc(session, npcId, { fallbackName = "", fallbackContext = "" } = {}) {
  const base = BASE_MANIFEST.npcs.find((npc) => npc.id === npcId);
  const overrides = getStaffOverrides(session).npcs[npcId] ?? {};
  return {
    id: npcId,
    name: overrides.name ?? base?.name ?? fallbackName,
    context: overrides.context ?? base?.context ?? fallbackContext,
    role: base?.role ?? "staff",
  };
}

export function editableStaffEntries(session = null) {
  const overrides = session ? getStaffOverrides(session) : { dealers: {}, npcs: {} };
  const entries = [];
  for (const dealer of DEALER_ROSTER) {
    const resolved = session ? resolveDealer(session, dealer) : dealer;
    entries.push({
      category: "dealers",
      id: dealer.id,
      name: resolved.name,
      tagline: resolved.tagline,
      context: overrides.dealers[dealer.id]?.context ?? dealer.tagline,
      games: [...dealer.games],
      customized: Boolean(overrides.dealers[dealer.id]),
    });
  }
  for (const npc of BASE_MANIFEST.npcs) {
    const resolved = resolveNpc(session, npc.id, { fallbackName: npc.name, fallbackContext: npc.context });
    entries.push({
      category: "npcs",
      id: npc.id,
      name: resolved.name,
      context: resolved.context,
      role: npc.role,
      customized: Boolean(overrides.npcs[npc.id]),
    });
  }
  return entries;
}

export function attachStaffOverridesToSession(session, data) {
  session.staffOverrides = data?.staffOverrides ?? null;
  return session.staffOverrides;
}

export { BASE_MANIFEST };
