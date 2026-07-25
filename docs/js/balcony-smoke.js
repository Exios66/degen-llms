/**
 * Suite balcony POV smoke-break minigame — session ledger + access gates.
 * Web overlay: BalconySmokeOverlay.js
 */

import { ensureHotel, getRoomType } from "./hotel.js";
import { recordConsumption, getIntoxicationSummary } from "./intoxication-effects.js";
import { canAccessHotelRoom } from "./world-cycle.js";

/** Consumable recorded on each hit from the suite balcony. */
export const BALCONY_JOINT_ID = "balcony_suite_joint";

export const BALCONY_SMOKE_ROOM_TYPES = ["suite", "penthouse"];

export const BALCONY_HIT_MAX = 5;

export const BALCONY_VIBE_LINES = [
  "Luxor’s beam cuts the haze. You own this altitude for one more inhale.",
  "Traffic crawls like chips across a felt. You are above the action.",
  "Neon blooms. The Strip performs for anyone with a key this high.",
  "A warm wind lifts the ember. Somewhere below, someone loses a bet.",
  "Bellagio’s fountains stutter in the distance. You don’t hurry for anyone.",
  "The glass railing holds a reflection of a whale who finally sat still.",
  "City lights smear into gold. High roller stillness. Perfect.",
];

export function defaultBalconySmokeState(overrides = {}) {
  return {
    visits: overrides.visits ?? 0,
    lifetimeHits: overrides.lifetimeHits ?? 0,
    lastVisitAt: overrides.lastVisitAt ?? null,
    eggs: [...(overrides.eggs ?? [])],
  };
}

export function ensureBalconySmoke(session) {
  if (!session.balconySmoke) {
    session.balconySmoke = defaultBalconySmokeState();
  }
  const defaults = defaultBalconySmokeState();
  for (const key of Object.keys(defaults)) {
    if (session.balconySmoke[key] === undefined) {
      session.balconySmoke[key] = defaults[key];
    }
  }
  if (!Array.isArray(session.balconySmoke.eggs)) {
    session.balconySmoke.eggs = [];
  }
  return session.balconySmoke;
}

export function attachBalconySmokeToSession(session, data) {
  if (data?.balconySmoke) {
    session.balconySmoke = defaultBalconySmokeState(data.balconySmoke);
  }
}

/**
 * @param {import("./core.js").PlayerSession} session
 * @returns {{ ok: boolean, message?: string, roomLabel?: string }}
 */
export function canEnterBalconySmoke(session) {
  const hotel = ensureHotel(session);
  if (!canAccessHotelRoom(session) || !hotel.reachedRoom) {
    return { ok: false, message: "Reach your suite door first — then the balcony is yours." };
  }
  if (!BALCONY_SMOKE_ROOM_TYPES.includes(hotel.roomType)) {
    return {
      ok: false,
      message: "Strip POV smoke breaks are a suite and penthouse perk. Ask Carmen about an upgrade.",
    };
  }
  const room = getRoomType(hotel);
  return { ok: true, roomLabel: room.label };
}

export function startBalconyVisit(session) {
  const gate = canEnterBalconySmoke(session);
  if (!gate.ok) return { ok: false, message: gate.message };
  const ledger = ensureBalconySmoke(session);
  ledger.visits += 1;
  ledger.lastVisitAt = Date.now();
  return {
    ok: true,
    roomLabel: gate.roomLabel,
    visits: ledger.visits,
  };
}

/**
 * Take a hit — records intoxication and advances the sitting.
 * @returns {{ ok: boolean, message: string, hits: number, done: boolean, vibe: string, intoxLevel: number }}
 */
export function takeBalconyHit(session, sitting) {
  if (!sitting || sitting.closed) {
    return { ok: false, message: "Step back onto the balcony first.", hits: 0, done: true, vibe: "", intoxLevel: 0 };
  }
  if (sitting.hits >= BALCONY_HIT_MAX) {
    return {
      ok: false,
      message: "The joint is ash. Savor the view, then step inside.",
      hits: sitting.hits,
      done: true,
      vibe: pickVibe(sitting),
      intoxLevel: getIntoxicationSummary(session).level,
    };
  }

  const r = recordConsumption(session, BALCONY_JOINT_ID, { source: "balcony_smoke" });
  sitting.hits += 1;
  const ledger = ensureBalconySmoke(session);
  ledger.lifetimeHits += 1;

  if (sitting.hits >= 3 && !ledger.eggs.includes("high_roller_haze")) {
    ledger.eggs.push("high_roller_haze");
  }

  const vibe = pickVibe(sitting);
  const summary = getIntoxicationSummary(session);
  const done = sitting.hits >= BALCONY_HIT_MAX;
  const message = r.ok
    ? (done
      ? `Final hit. ${vibe}`
      : `Hit ${sitting.hits}/${BALCONY_HIT_MAX}. ${vibe}`)
    : "The ember catches — atmosphere only, but the Strip still performs.";

  return {
    ok: true,
    message,
    hits: sitting.hits,
    done,
    vibe,
    intoxLevel: summary.level,
  };
}

export function createBalconySitting(session) {
  const hotel = ensureHotel(session);
  return {
    roomType: hotel.roomType,
    roomNumber: hotel.roomNumber,
    floor: hotel.floor,
    hits: 0,
    closed: false,
    startedAt: Date.now(),
  };
}

export function closeBalconySitting(session, sitting) {
  if (!sitting || sitting.closed) {
    return { ok: true, message: "Back inside. The carpet smells like victory and HVAC." };
  }
  sitting.closed = true;
  const ledger = ensureBalconySmoke(session);
  const hits = sitting.hits;
  if (hits === 0) {
    return { ok: true, message: "You watched the Strip without lighting up. Discipline — or just pacing yourself." };
  }
  if (hits >= BALCONY_HIT_MAX) {
    return {
      ok: true,
      message: `Session complete — ${hits} hits from floor ${sitting.floor}. Lifetime balcony hits: ${ledger.lifetimeHits}.`,
    };
  }
  return {
    ok: true,
    message: `You step inside after ${hits} hit(s). The Strip keeps glittering without you.`,
  };
}

function pickVibe(sitting) {
  const idx = (sitting.hits + (sitting.roomNumber % 7)) % BALCONY_VIBE_LINES.length;
  return BALCONY_VIBE_LINES[idx];
}
