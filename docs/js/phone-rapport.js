/**
 * Rapport + dialogue context for MGM Connect phone threads.
 * Tracks relationship depth per contact and builds dynamic context.
 */

import { tierForWagered } from "./rewards.js";
import { tierIndex, getTierExperience } from "./rewards-perks.js";
import { getCasinoTimeMs } from "./core.js";
import { getStaffOverrides } from "./staff-manifest.js";
import { DEALER_ROSTER } from "./dealers.js";

export const RAPPORT_BANDS = [
  { id: "stranger", label: "Stranger", min: 0 },
  { id: "acquaintance", label: "Acquaintance", min: 15 },
  { id: "regular", label: "Regular", min: 35 },
  { id: "insider", label: "Insider", min: 60 },
  { id: "confidant", label: "Confidant", min: 85 },
];

/** @param {number} rapport */
export function rapportBand(rapport) {
  let band = RAPPORT_BANDS[0];
  for (const b of RAPPORT_BANDS) {
    if (rapport >= b.min) band = b;
  }
  return band;
}

/** @param {import("./core.js").PlayerSession} session */
function visits(session, activity) {
  return session.activityStats?.[activity]?.visits ?? 0;
}

/** @param {import("./core.js").PlayerSession} session */
function totalVisits(session) {
  return Object.values(session.activityStats ?? {}).reduce((sum, st) => sum + (st.visits ?? 0), 0);
}

/** @param {object} thread */
export function normalizeThread(thread) {
  if (typeof thread.rapport !== "number") thread.rapport = 0;
  if (typeof thread.textCount !== "number") thread.textCount = 0;
  if (!Array.isArray(thread.topicsSeen)) thread.topicsSeen = [];
  if (thread.dialogueState != null && typeof thread.dialogueState !== "object") {
    thread.dialogueState = null;
  }
  return thread;
}

/**
 * @param {import("./core.js").PlayerSession} session
 * @param {string} contactId
 */
export function getRapport(session, contactId) {
  const thread = session.rewards?.phoneBook?.threads?.[contactId];
  return normalizeThread(thread ?? {}).rapport ?? 0;
}

/**
 * @param {import("./core.js").PlayerSession} session
 * @param {string} contactId
 * @param {number} delta
 */
export function adjustRapport(session, contactId, delta) {
  const pb = session.rewards?.phoneBook;
  if (!pb?.threads?.[contactId]) return 0;
  const thread = normalizeThread(pb.threads[contactId]);
  thread.rapport = Math.max(0, Math.min(100, thread.rapport + delta));
  return thread.rapport;
}

/** @param {string} staffId @param {"dealers"|"npcs"} category */
export function getCustomPhoneContent(session, staffId, category = "npcs") {
  const overrides = getStaffOverrides(session)[category]?.[staffId] ?? {};
  return {
    intro: overrides.phoneIntro?.trim() || null,
    greeting: overrides.phoneGreeting?.trim() || null,
    texts: Array.isArray(overrides.phoneTexts) ? overrides.phoneTexts.filter((t) => t?.label && t?.reply) : [],
  };
}

/**
 * @param {import("./core.js").PlayerSession} session
 * @param {string} contactId
 */
export function buildDialogueContext(session, contactId) {
  const rewards = session.rewards ?? {};
  const tier = tierForWagered(rewards.lifetimeWagered ?? 0);
  const tierIdx = tierIndex(tier.id);
  const rapport = getRapport(session, contactId);
  const band = rapportBand(rapport);
  const playMs = getCasinoTimeMs(session);
  const playHours = Math.floor(playMs / (60 * 60 * 1000));
  const playMinutes = Math.floor(playMs / (60 * 1000));
  const thread = normalizeThread(session.rewards?.phoneBook?.threads?.[contactId] ?? {});
  const netSession = session.wallet?.netSession ?? 0;
  const lifetimeWagered = rewards.lifetimeWagered ?? 0;
  const category = DEALER_ROSTER.some((d) => d.id === contactId) ? "dealers" : "npcs";
  const custom = getCustomPhoneContent(session, contactId, category);

  return {
    session,
    contactId,
    playerName: session.playerName || "Guest",
    tier,
    tierIdx,
    tierExp: getTierExperience(tier.id),
    rapport,
    band,
    playMs,
    playHours,
    playMinutes,
    textCount: thread.textCount ?? 0,
    callCount: thread.callCount ?? 0,
    topicsSeen: new Set(thread.topicsSeen ?? []),
    totalVisits: totalVisits(session),
    slotsVisits: visits(session, "slots"),
    blackjackVisits: visits(session, "blackjack"),
    netSession,
    lifetimeWagered,
    isDownBad: netSession < -500,
    isUp: netSession > 500,
    custom,
    hasFlag: (flag) => Boolean(session.rpg?.flags?.[flag]),
  };
}

/** @param {ReturnType<typeof buildDialogueContext>} ctx */
export function meetsRequirements(req, ctx) {
  if (!req) return true;
  if (req.minRapport != null && ctx.rapport < req.minRapport) return false;
  if (req.minTierIdx != null && ctx.tierIdx < req.minTierIdx) return false;
  if (req.minPlayHours != null && ctx.playHours < req.minPlayHours) return false;
  if (req.minVisits != null && ctx.totalVisits < req.minVisits) return false;
  if (req.band && ctx.band.id !== req.band) {
    const needed = RAPPORT_BANDS.find((b) => b.id === req.band)?.min ?? 0;
    if (ctx.rapport < needed) return false;
  }
  if (req.flag && !ctx.hasFlag(req.flag)) return false;
  if (req.unlessFlag && ctx.hasFlag(req.unlessFlag)) return false;
  if (req.onceKey && ctx.topicsSeen.has(req.onceKey)) return false;
  return true;
}

/** @param {string|((ctx: object) => string)} value @param {object} ctx */
export function resolveLine(value, ctx) {
  if (typeof value === "function") return value(ctx);
  return value ?? "";
}
