/** Intoxication tracking and screen glitch/distortion effects for liquor, beer, and contraband. */

export const INTOXICATION_MAX = 100;

/** How long max-level visual distortion may last before settling to sober. */
export const INTOX_MAX_SETTLE_MS = 3 * 60 * 1000;

/** ~4–5 standard pours (potency 2) or equivalent liquor + smoke mix. */
export const INTOX_BUZZED_MIN_LEVEL = 10;
export const INTOX_BUZZED_MIN_DOSES = 4;

/** @typedef {"liquor" | "beer" | "contraband"} IntoxCategory */

/** @type {Record<string, { category: IntoxCategory, potency: number, label?: string }>} */
export const CONSUMABLE_POTENCY = {
  // Casino bar — liquor
  eyecandy_mandalay_mule: { category: "liquor", potency: 2 },
  eyecandy_sound_check: { category: "liquor", potency: 2 },
  eyecandy_neon_fizz: { category: "liquor", potency: 2 },
  eyecandy_top_shelf: { category: "liquor", potency: 3 },
  big_chill_frozen_marg: { category: "liquor", potency: 2 },
  big_chill_daquiri: { category: "liquor", potency: 2 },
  big_chill_refill: { category: "liquor", potency: 2 },
  big_chill_mojito: { category: "liquor", potency: 2 },
  rr_southern_lemonade: { category: "liquor", potency: 2 },
  rr_kentucky_cooler: { category: "liquor", potency: 2 },
  rr_dove_margarita: { category: "liquor", potency: 2 },
  // Casino bar — beer
  rr_craft_beer: { category: "beer", potency: 1 },
  // Minibar — liquor
  mini_vodka: { category: "liquor", potency: 3 },
  champagne_split: { category: "liquor", potency: 2 },
  // Minibar — contraband
  noir_herb_preroll: { category: "contraband", potency: 4, label: "Noir pre-roll" },
  foundation_edible: { category: "contraband", potency: 5, label: "Foundation Room edible" },
  // Pool complex — liquor
  pool_beach_club_bar: { category: "liquor", potency: 2, label: "Beach club cocktail" },
  pool_mango_freeze: { category: "liquor", potency: 2, label: "Mango wave freeze" },
  pool_cabana_spritz: { category: "liquor", potency: 2, label: "Cabana spritz" },
  pool_shark_bite: { category: "liquor", potency: 3, label: "Shark bite shot" },
  betty_comp_marg: { category: "liquor", potency: 2, label: "Betty's margarita" },
  betty_rail_whiskey: { category: "liquor", potency: 3, label: "Rail whiskey" },
  betty_long_island: { category: "liquor", potency: 3, label: "Long island" },
  betty_shot_special: { category: "liquor", potency: 2, label: "Betty's shot" },
  skyfall_sunset: { category: "liquor", potency: 2, label: "Skyfall sunset" },
  skyfall_highball: { category: "liquor", potency: 2, label: "Penthouse highball" },
  skyfall_zero_gravity: { category: "liquor", potency: 2, label: "Zero gravity" },
  skyfall_champagne: { category: "liquor", potency: 2, label: "Moët glass" },
  foundation_old_fashioned: { category: "liquor", potency: 3, label: "Noir old fashioned" },
  foundation_champagne: { category: "liquor", potency: 2, label: "Krug glass" },
  foundation_zero_proof: { category: "liquor", potency: 0, label: "Velvet zero-proof" },
  pool_cabana_bottle: { category: "liquor", potency: 3, label: "Cabana champagne" },
  // RPG / comps
  welcome_cocktail: { category: "liquor", potency: 2, label: "Welcome cocktail" },
};

/** Virtual ids for pool services (not in item catalogs). */
export const POOL_CONSUMABLE_IDS = {
  bar: "pool_beach_club_bar",
  bottle: "pool_cabana_bottle",
};

/** @type {ReturnType<typeof setTimeout> | null} */
let settleTimerId = null;
/** @type {object | null} */
let settleSessionRef = null;

export function defaultIntoxicationState(overrides = {}) {
  return {
    level: overrides.level ?? 0,
    totalDoses: overrides.totalDoses ?? 0,
    lastConsumedAt: overrides.lastConsumedAt ?? null,
    history: [...(overrides.history ?? [])],
  };
}

export function ensureIntoxication(session) {
  if (!session.intoxication) {
    session.intoxication = defaultIntoxicationState();
  }
  const defaults = defaultIntoxicationState();
  for (const key of Object.keys(defaults)) {
    if (session.intoxication[key] === undefined) {
      session.intoxication[key] = defaults[key];
    }
  }
  if (!Array.isArray(session.intoxication.history)) {
    session.intoxication.history = [];
  }
  return session.intoxication;
}

function potencyFor(itemId) {
  return CONSUMABLE_POTENCY[itemId] ?? null;
}

function computeLevelFromSessionHistory(session) {
  let level = 0;
  for (const drinkId of session.amenities?.barOrders ?? []) {
    level += potencyFor(drinkId)?.potency ?? 0;
  }
  for (const itemId of session.hotel?.roomAmenities?.minibarPurchases ?? []) {
    level += potencyFor(itemId)?.potency ?? 0;
  }
  if (session.rpg?.flags?.redeemed_welcome_drink) {
    level += potencyFor("welcome_cocktail")?.potency ?? 0;
  }
  return Math.min(INTOXICATION_MAX, level);
}

function parseConsumedAt(iso) {
  if (!iso) return NaN;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : NaN;
}

function notifyIntoxChange(session) {
  if (typeof window === "undefined") return;
  import("./phone-contacts.js").then((mod) => {
    mod.onIntoxicationChange?.(session);
  }).catch(() => {});
}

function clearSettleTimer() {
  if (settleTimerId != null) {
    clearTimeout(settleTimerId);
    settleTimerId = null;
  }
  settleSessionRef = null;
}

/**
 * Reset intoxication to sober and clear screen distortions.
 * @param {object} session
 * @param {{ silent?: boolean }} [opts]
 * @returns {boolean} true if a reset occurred
 */
export function settleIntoxication(session, opts = {}) {
  const state = ensureIntoxication(session);
  const wasActive = state.level > 0;
  clearSettleTimer();
  state.level = 0;
  applyIntoxicationEffects(session, { skipSettleCheck: true });
  if (wasActive && !opts.silent) {
    notifyIntoxChange(session);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("mandalay:intoxication-settled", {
        detail: { session },
      }));
    }
  }
  return wasActive;
}

/**
 * If the guest has been at max intoxication long enough, settle to sober.
 * @param {object} session
 * @param {{ now?: number }} [opts]
 * @returns {boolean}
 */
export function maybeSettleMaxIntoxication(session, opts = {}) {
  const state = ensureIntoxication(session);
  if (state.level < INTOXICATION_MAX) {
    clearSettleTimer();
    return false;
  }
  const started = parseConsumedAt(state.lastConsumedAt);
  if (!Number.isFinite(started)) {
    // Maxed without a timestamp — start the settle clock from now.
    state.lastConsumedAt = new Date((opts.now ?? Date.now())).toISOString();
    scheduleMaxSettle(session);
    return false;
  }
  const now = opts.now ?? Date.now();
  if (now - started >= INTOX_MAX_SETTLE_MS) {
    return settleIntoxication(session);
  }
  scheduleMaxSettle(session, { now });
  return false;
}

/**
 * Schedule a browser timeout to settle max intoxication when the window elapses.
 * @param {object} session
 * @param {{ now?: number }} [opts]
 */
export function scheduleMaxSettle(session, opts = {}) {
  clearSettleTimer();
  if (typeof window === "undefined") return;
  const state = ensureIntoxication(session);
  if (state.level < INTOXICATION_MAX) return;
  const started = parseConsumedAt(state.lastConsumedAt);
  const now = opts.now ?? Date.now();
  const remaining = Number.isFinite(started)
    ? INTOX_MAX_SETTLE_MS - (now - started)
    : INTOX_MAX_SETTLE_MS;
  if (remaining <= 0) {
    settleIntoxication(session);
    return;
  }
  settleSessionRef = session;
  settleTimerId = setTimeout(() => {
    settleTimerId = null;
    const target = settleSessionRef;
    settleSessionRef = null;
    if (target) settleIntoxication(target);
  }, remaining);
}

export function attachIntoxicationToSession(session, data = {}) {
  const raw = data.intoxication ?? {};
  if (raw.level != null || raw.totalDoses != null) {
    session.intoxication = defaultIntoxicationState({
      level: raw.level ?? 0,
      totalDoses: raw.totalDoses ?? raw.total_doses ?? 0,
      lastConsumedAt: raw.lastConsumedAt ?? raw.last_consumed_at ?? null,
      history: raw.history ?? [],
    });
  } else {
    session.intoxication = defaultIntoxicationState({
      level: computeLevelFromSessionHistory(session),
      totalDoses: 0,
    });
  }
  maybeSettleMaxIntoxication(session);
  return session.intoxication;
}

/**
 * Record a consumed intoxicant and refresh screen effects.
 * @param {import("./core.js").PlayerSession} session
 * @param {string} itemId
 * @param {{ source?: string }} [meta]
 * @returns {{ ok: boolean, level: number, added: number }}
 */
export function recordConsumption(session, itemId, meta = {}) {
  const spec = potencyFor(itemId);
  if (!spec) return { ok: false, level: ensureIntoxication(session).level, added: 0 };

  const state = ensureIntoxication(session);
  const added = spec.potency;
  state.level = Math.min(INTOXICATION_MAX, state.level + added);
  state.totalDoses += 1;
  state.lastConsumedAt = new Date().toISOString();
  state.history.push({
    itemId,
    category: spec.category,
    potency: added,
    source: meta.source ?? "unknown",
    at: state.lastConsumedAt,
  });
  if (state.history.length > 40) state.history = state.history.slice(-40);

  applyIntoxicationEffects(session);
  notifyIntoxChange(session);
  return { ok: true, level: state.level, added };
}

export function getIntoxicationLevel(session) {
  maybeSettleMaxIntoxication(session);
  return ensureIntoxication(session).level;
}

/** @param {import("./core.js").PlayerSession} session */
export function getIntoxicationSummary(session) {
  maybeSettleMaxIntoxication(session);
  const state = ensureIntoxication(session);
  const categories = { liquor: 0, beer: 0, contraband: 0 };
  for (const entry of state.history ?? []) {
    if (categories[entry.category] != null) categories[entry.category] += 1;
  }
  const level = state.level;
  return {
    level,
    tier: getIntoxicationTier(level),
    totalDoses: state.totalDoses,
    categories,
    hasContraband: categories.contraband > 0,
    hasLiquor: categories.liquor > 0,
    hasBeer: categories.beer > 0,
  };
}

/**
 * Heightened intoxication — roughly 4–5 drinks or a liquor + smoke equivalent.
 * @param {import("./core.js").PlayerSession} session
 */
export function isHeightenedIntoxication(session) {
  const { level, totalDoses, categories } = getIntoxicationSummary(session);
  if (level >= 16) return true;
  if (totalDoses >= INTOX_BUZZED_MIN_DOSES && level >= INTOX_BUZZED_MIN_LEVEL) return true;
  if (totalDoses >= 3 && level >= 12 && categories.contraband > 0) return true;
  return false;
}

export function getIntoxicationTier(level) {
  if (level <= 0) return 0;
  if (level <= 15) return 1;
  if (level <= 30) return 2;
  if (level <= 50) return 3;
  if (level <= 75) return 4;
  return 5;
}

function getEffectRoots() {
  return [
    document.getElementById("app"),
    document.getElementById("game-shell"),
    document.body,
  ].filter(Boolean);
}

function ensureOverlay(root) {
  if (!root || root.querySelector(":scope > .intox-overlay")) return;
  const overlay = document.createElement("div");
  overlay.className = "intox-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <div class="intox-overlay__scanlines"></div>
    <div class="intox-overlay__rgb intox-overlay__rgb--r"></div>
    <div class="intox-overlay__rgb intox-overlay__rgb--g"></div>
    <div class="intox-overlay__rgb intox-overlay__rgb--b"></div>
    <div class="intox-overlay__noise"></div>
  `;
  root.appendChild(overlay);
}

/**
 * Apply CSS variables and tier classes based on current intoxication level.
 * @param {object} session
 * @param {{ skipSettleCheck?: boolean }} [opts]
 */
export function applyIntoxicationEffects(session, opts = {}) {
  if (typeof document === "undefined") return;

  if (!opts.skipSettleCheck) {
    maybeSettleMaxIntoxication(session);
  }

  const level = ensureIntoxication(session).level;
  const tier = getIntoxicationTier(level);
  const norm = level / INTOXICATION_MAX;

  const roots = getEffectRoots();
  for (const root of roots) ensureOverlay(root);

  document.documentElement.style.setProperty("--intox-level", String(level));
  document.documentElement.style.setProperty("--intox-norm", String(norm));
  document.documentElement.style.setProperty("--intox-blur", String(norm * 3.5));
  document.documentElement.style.setProperty("--intox-shake", String(norm * 4));
  document.documentElement.style.setProperty("--intox-rgb", String(norm * 6));
  document.documentElement.style.setProperty("--intox-scan", String(0.08 + norm * 0.35));
  document.documentElement.style.setProperty("--intox-hue", String(norm * 28));

  const targets = [document.documentElement, document.body, ...roots];
  for (const el of targets) {
    el.classList.toggle("intox-active", level > 0);
    for (let t = 0; t <= 5; t += 1) {
      el.classList.toggle(`intox-tier-${t}`, tier === t);
    }
  }

  if (level >= INTOXICATION_MAX) {
    scheduleMaxSettle(session);
  } else {
    clearSettleTimer();
  }
}

export function isConsumableItem(itemId) {
  return Boolean(potencyFor(itemId));
}
