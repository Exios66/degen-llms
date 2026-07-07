import { TransactionKind, secureRandomInt } from "./core.js";
import { getTierExperience } from "./rewards-perks.js";

export const SAVE_VERSION_WITH_REWARDS = 3;

export const TIERS = [
  { id: "sapphire", label: "Sapphire", minWagered: 0, comp: null },
  { id: "pearl", label: "Pearl", minWagered: 500, comp: "slot_freeplay" },
  { id: "gold", label: "Gold", minWagered: 2000, comp: "buffet_comp" },
  { id: "platinum", label: "Platinum", minWagered: 5000, comp: "room_night" },
  { id: "noir", label: "Noir", minWagered: 10000, comp: "suite_upgrade" },
  { id: "chairman", label: "Chairman", minWagered: 25000, comp: "penthouse_fantasy" },
];

export const COMP_CATALOG = {
  welcome_drink: {
    id: "welcome_drink",
    title: "Welcome Cocktail",
    body: "Complimentary drink at Betty's Bar — enrollment perk.",
    redeemFlag: "redeemed_welcome_drink",
  },
  slot_freeplay: {
    id: "slot_freeplay",
    title: "$10 Slot Free-Play",
    body: "Pearl tier voucher — flavor credit for the slot aisle.",
    redeemFlag: "redeemed_slot_freeplay",
  },
  buffet_comp: {
    id: "buffet_comp",
    title: "Buffet Comp",
    body: "Gold tier — the line moves faster when you're comped.",
    redeemFlag: "redeemed_buffet_comp",
  },
  room_night: {
    id: "room_night",
    title: "Standard Room Night",
    body: "Platinum tier — one night on the house (narrative comp).",
    redeemFlag: "redeemed_room_night",
  },
  suite_upgrade: {
    id: "suite_upgrade",
    title: "Suite Upgrade",
    body: "Noir tier — VIP lounge access flag unlocked.",
    redeemFlag: "redeemed_suite_upgrade",
  },
  penthouse_fantasy: {
    id: "penthouse_fantasy",
    title: "Penthouse Fantasy Comp",
    body: "Chairman tier — the penthouse whispered your name.",
    redeemFlag: "redeemed_penthouse_fantasy",
  },
};

function nowIso() {
  return new Date().toISOString();
}

export function defaultRewardsState(overrides = {}) {
  const memberId = overrides.memberId ?? `MB-${secureRandomInt(100000, 999999)}`;
  const base = {
    memberId,
    tier: "sapphire",
    lifetimeWagered: 0,
    unlockedComps: ["welcome_drink"],
    redeemedComps: [],
    notifications: [],
    phoneBook: { threads: {}, easterEggs: [], introSent: [] },
    ...overrides,
  };
  if (!base.notifications.length) {
    base.notifications.push({
      id: "welcome_enroll",
      title: "Welcome to MGM Rewards",
      body: "Your Sapphire membership is active. Play to earn comps — check Betty's Bar for your welcome cocktail!",
      read: false,
      timestamp: nowIso(),
    });
  }
  return base;
}

export function tierForWagered(amount) {
  let current = TIERS[0];
  for (const tier of TIERS) {
    if (amount >= tier.minWagered) current = tier;
  }
  return current;
}

export function nextTier(currentTierId) {
  const idx = TIERS.findIndex((t) => t.id === currentTierId);
  return idx >= 0 && idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
}

export function totalWageredFromWallet(wallet) {
  if (!wallet?.transactions) return 0;
  return wallet.transactions
    .filter((t) => t.kind === TransactionKind.WAGER)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

/**
 * Track MGM Rewards tier progress and notifications for a PlayerSession.
 */
export class RewardsTracker {
  /**
   * @param {import("./core.js").PlayerSession} session
   * @param {{ onNotify?: (n: object) => void }} [hooks]
   */
  constructor(session, hooks = {}) {
    this.session = session;
    this.onNotify = hooks.onNotify ?? null;
  }

  ensureRewards() {
    const defaults = defaultRewardsState();
    if (!this.session.rewards) {
      this.session.rewards = defaults;
      return this.session.rewards;
    }
    const rewards = this.session.rewards;
    if (!rewards.memberId) rewards.memberId = defaults.memberId;
    if (!rewards.tier) rewards.tier = defaults.tier;
    if (typeof rewards.lifetimeWagered !== "number") rewards.lifetimeWagered = 0;
    if (!Array.isArray(rewards.unlockedComps)) rewards.unlockedComps = [...defaults.unlockedComps];
    if (!Array.isArray(rewards.redeemedComps)) rewards.redeemedComps = [];
    if (!Array.isArray(rewards.notifications)) rewards.notifications = [...defaults.notifications];
    if (!rewards.phoneBook) {
      rewards.phoneBook = { threads: {}, easterEggs: [], introSent: [] };
    }
    return rewards;
  }

  /** @returns {object[]} newly created notifications */
  syncFromWallet() {
    const rewards = this.ensureRewards();
    const total = totalWageredFromWallet(this.session.wallet);
    const prev = rewards.lifetimeWagered;
    if (total <= prev) return [];
    rewards.lifetimeWagered = total;
    return this._applyTierProgress(rewards, prev, total);
  }

  /** @returns {object[]} */
  _applyTierProgress(rewards, prevTotal, newTotal) {
    const created = [];
    const prevTier = tierForWagered(prevTotal);
    const newTier = tierForWagered(newTotal);
    if (newTier.id !== prevTier.id) {
      rewards.tier = newTier.id;
      if (newTier.comp && !rewards.unlockedComps.includes(newTier.comp)) {
        rewards.unlockedComps.push(newTier.comp);
      }
      const compLabel = newTier.comp ? COMP_CATALOG[newTier.comp]?.title : "exclusive offers";
      const exp = getTierExperience(newTier.id);
      const note = {
        id: `tier_${newTier.id}_${Date.now()}`,
        title: `${newTier.label} Tier Unlocked!`,
        body: `You've reached ${newTier.label} status. ${compLabel ? `New comp: ${compLabel}. ` : ""}${exp.tagline}${newTier.id === "gold" || newTier.id === "platinum" ? " Check Connect on your phone for new contacts!" : ""}`,
        read: false,
        timestamp: nowIso(),
      };
      rewards.notifications.unshift(note);
      created.push(note);
      this.onNotify?.(note);
    }
    return created;
  }

  unreadCount() {
    const rewards = this.ensureRewards();
    return rewards.notifications.filter((n) => !n.read).length;
  }

  markRead(notificationId) {
    const rewards = this.ensureRewards();
    const note = rewards.notifications.find((n) => n.id === notificationId);
    if (note) note.read = true;
  }

  markAllRead() {
    for (const n of this.ensureRewards().notifications) n.read = true;
  }

  redeemComp(compId) {
    const rewards = this.ensureRewards();
    if (!rewards.unlockedComps.includes(compId)) return false;
    if (rewards.redeemedComps.includes(compId)) return false;
    rewards.redeemedComps.push(compId);
    const meta = COMP_CATALOG[compId];
    if (meta?.redeemFlag && this.session.rpg) {
      this.session.rpg.flags = this.session.rpg.flags ?? {};
      this.session.rpg.flags[meta.redeemFlag] = true;
      if (compId === "welcome_drink") {
        delete this.session.rpg.flags.has_welcome_drink_comp;
      }
    }
    const note = {
      id: `redeem_${compId}_${Date.now()}`,
      title: "Comp Redeemed",
      body: `${meta?.title ?? compId} — enjoy, member.`,
      read: false,
      timestamp: nowIso(),
    };
    rewards.notifications.unshift(note);
    this.onNotify?.(note);
    return true;
  }

  pushNotification(title, body, id = null) {
    const rewards = this.ensureRewards();
    const note = {
      id: id ?? `note_${Date.now()}`,
      title,
      body,
      read: false,
      timestamp: nowIso(),
    };
    rewards.notifications.unshift(note);
    this.onNotify?.(note);
    return note;
  }

  progressToNextTier() {
    const rewards = this.ensureRewards();
    const next = nextTier(rewards.tier);
    if (!next) return { pct: 100, next: null, remaining: 0 };
    const currentTier = tierForWagered(rewards.lifetimeWagered);
    const span = next.minWagered - currentTier.minWagered;
    const into = rewards.lifetimeWagered - currentTier.minWagered;
    const pct = span > 0 ? Math.min(100, Math.round((into / span) * 100)) : 100;
    return { pct, next, remaining: Math.max(0, next.minWagered - rewards.lifetimeWagered) };
  }
}

export function migrateSessionRewards(session, dataVersion) {
  if (!session.rewards) {
    session.rewards = defaultRewardsState();
  }
  const total = totalWageredFromWallet(session.wallet);
  session.rewards.lifetimeWagered = Math.max(session.rewards.lifetimeWagered, total);
  session.rewards.tier = tierForWagered(session.rewards.lifetimeWagered).id;
  if (dataVersion < SAVE_VERSION_WITH_REWARDS && !session.rewards.notifications.length) {
    session.rewards.notifications.push({
      id: "welcome_enroll",
      title: "Welcome to MGM Rewards",
      body: "Your Sapphire membership is active. Play to earn comps!",
      read: false,
      timestamp: nowIso(),
    });
  }
  syncRewardsFlags(session);
}

export function syncRewardsFlags(session) {
  if (!session.rpg) return;
  session.rpg.flags = session.rpg.flags ?? {};
  const rewards = session.rewards;
  if (!rewards) return;
  if (rewards.unlockedComps.includes("welcome_drink") && !rewards.redeemedComps.includes("welcome_drink")) {
    session.rpg.flags.has_welcome_drink_comp = true;
  }
}

export function attachRewardsToSession(session, data) {
  const version = data.version ?? 1;
  if (data.rewards) {
    session.rewards = { ...defaultRewardsState(), ...data.rewards };
    syncRewardsFlags(session);
    return;
  }
  migrateSessionRewards(session, version);
}
