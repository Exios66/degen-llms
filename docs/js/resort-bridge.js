/** Cross-resort requirement checks — room, pool, shopping, rewards tier. */

import { ensureAmenities } from "./casino-amenities.js";
import { ensurePoolComplex } from "./pool-complex.js";
import { ensureHotel } from "./hotel.js";
import { tierForWagered } from "./rewards.js";
import { tierIndex } from "./rewards-perks.js";

function hasAll(haystack, needles) {
  return needles.every((n) => haystack.includes(n));
}

/** @param {import("./core.js").PlayerSession} session */
export function getSessionTierIndex(session) {
  const wagered = session.rewards?.lifetimeWagered ?? 0;
  return tierIndex(tierForWagered(wagered).id);
}

/** @param {import("./core.js").PlayerSession} session */
export function getPurchasedItemIds(session) {
  return ensureAmenities(session).purchasedItems ?? [];
}

/** @param {import("./core.js").PlayerSession} session */
export function getPoolUnlockedEvents(session) {
  return ensurePoolComplex(session).unlockedEvents ?? [];
}

/** @param {import("./core.js").PlayerSession} session */
export function getPoolVisitedZones(session) {
  return ensurePoolComplex(session).visitedZones ?? [];
}

/**
 * Evaluate shared resort requirements used by room and pool events.
 * @param {import("./core.js").PlayerSession} session
 * @param {object} req
 * @param {object} [ctx]
 * @param {object} [ctx.hotel]
 * @param {object} [ctx.roomAmenities]
 */
export function resortRequirementsMet(session, req, ctx = {}) {
  if (!req) return true;
  const hotel = ctx.hotel ?? ensureHotel(session);
  const ra = ctx.roomAmenities ?? hotel.roomAmenities ?? {};
  const pc = ensurePoolComplex(session);
  const amenities = ensureAmenities(session);

  if (req.poolZones && !hasAll(pc.visitedZones ?? [], req.poolZones)) return false;
  if (req.poolEvents && !hasAll(pc.unlockedEvents ?? [], req.poolEvents)) return false;
  if (req.roomEvents && !hasAll(ra.unlockedEvents ?? [], req.roomEvents)) return false;
  if (req.shoppingItems && !hasAll(amenities.purchasedItems ?? [], req.shoppingItems)) return false;
  if (req.minTierIndex != null && getSessionTierIndex(session) < req.minTierIndex) return false;
  if (req.roomTypes && !req.roomTypes.includes(hotel.roomType)) return false;
  return true;
}

/** Cryptic hint text for locked room events (no exact recipes). */
export const EVENT_HINTS = {
  shark_whisperer: "Something about sharks and snacks…",
  midnight_ocean: "Tokyo at 3 AM meets the reef cam…",
  champagne_sunset: "Wave pool on TV, something bubbly in hand…",
  pool_party_vip: "Concierge, champagne, and maybe the pool deck…",
  what_happens: "Vodka, voicemail, and the Strip below…",
  high_roller_crawl: "Suite neighbors and something sparkling…",
  hangover_brunch: "Survive the night first…",
  buckingham_moment: "Dial a number you shouldn't have…",
  steve_harvey_hotline: "Steve on TV, Pete on the phone, net-positive on the floor…",
  fight_night_suite: "Arena replay, off-strip picks, suite view…",
  foundation_after_dark: "Noir status, penthouse, velvet rope…",
  sky_bridge_haul: "Mandalay Place shopping, balcony, spa recovery…",
  eleven_acres_hangover: "Conquer the pool complex, then brunch…",
  chapel_wrong_turn: "Wrong number, wedding bells…",
  convention_survival: "Keynote TV, energy drink, privacy sign…",
  butler_turn_down: "Penthouse only — let the butler in…",
  telescope_strip: "Penthouse balcony — point at the sportsbook…",
};

export function hintForEvent(eventId) {
  return EVENT_HINTS[eventId] ?? "Keep exploring the resort…";
}
