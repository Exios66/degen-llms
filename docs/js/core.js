import { attachRewardsToSession } from "./rewards.js";
import { attachHotelToSession } from "./hotel.js";
import { attachAmenitiesToSession } from "./casino-amenities.js";
import { attachPoolComplexToSession } from "./pool-complex.js";
import { attachWorldCycleToSession } from "./world-cycle.js";
import { attachBankToSession } from "./bank-account.js";
import { attachStaffOverridesToSession } from "./staff-manifest.js";
import { attachIntoxicationToSession } from "./intoxication-effects.js";
import { attachDiningToSession } from "./dining.js";
import { attachBalconySmokeToSession } from "./balcony-smoke.js";
import {
  getActiveSlotId,
  mirrorLibraryToCache,
  readCacheLibrary,
  setActiveSlotId,
} from "./profileCache.js";
import {
  flushCasinoTime,
  formatCasinoTimeInGame,
  formatCasinoTimeLabel,
  formatPlayTimeReal,
  formatPlayTimeSummary,
  formatSaveSlotPlayTimes,
  getCasinoTimeMs,
} from "./casino-time.js";
import { formatVegasDateTimeShort } from "./vegas-time.js";

export const CASINO_NAME = "The Mandalay Bay";
export const SAVE_VERSION = 8;

export {
  formatCasinoTimeInGame,
  formatCasinoTimeLabel,
  formatPlayTimeReal,
  formatPlayTimeSummary,
  formatSaveSlotPlayTimes,
  getCasinoTimeMs,
};

/** New arrivals start on the sidewalk and walk in through the gold doors. */
export const RPG_START_MAP = "strip_sidewalk";

/** Default RPG overworld state for pixel mode (Phase 1+). */
export function defaultRpgState(overrides = {}) {
  return {
    mapId: RPG_START_MAP,
    x: 15,
    y: 26,
    playerSprite: "weekend_warrior",
    archetype: "weekend_warrior",
    appearance: { skin: "fair", hair: "teal", outfit: "teal" },
    quests: {},
    flags: {},
    playTimeMinutes: 0,
    worldTime: 720,
    reputation: { whales: 0, staff: 0, tourists: 0 },
    inventory: [],
    dex: {},
    eggs: {},
    mapVisits: {},
    options: { muted: false, textSpeed: "normal", footsteps: true },
    ...overrides,
  };
}

/**
 * Fold a save's `rpg` blob forward to the v8 shape.
 *
 * v7 and earlier stored only position, flags, and quests; the collection
 * buckets are added empty rather than derived, and existing keys are never
 * renamed, so a v7 save loads with its progress intact. The pre-Phase-1
 * `rpgData` blob is folded in here and no longer written back out.
 * @param {object | null | undefined} rpg
 * @param {{ flags?: Record<string, boolean> } | null} [legacyRpgData]
 */
export function migrateRpgState(rpg, legacyRpgData = null) {
  const legacyFlags = legacyRpgData?.flags ?? null;
  if (!rpg) {
    if (!legacyFlags || !Object.keys(legacyFlags).length) return null;
    return { ...defaultRpgState(), mapId: "main_resort", flags: { ...legacyFlags } };
  }
  const merged = { ...defaultRpgState(), ...rpg };
  if (legacyFlags) merged.flags = { ...legacyFlags, ...merged.flags };
  // A v7 save was mid-game on the old 9-map world; keep it where it stood.
  if (!rpg.mapId) merged.mapId = "main_resort";
  if (!Array.isArray(merged.inventory)) merged.inventory = [];
  for (const key of ["dex", "eggs", "mapVisits"]) {
    if (!merged[key] || typeof merged[key] !== "object") merged[key] = {};
  }
  merged.options = { ...defaultRpgState().options, ...(rpg.options ?? {}) };
  return merged;
}

/** True when a slot already has meaningful pixel-RPG progress. */
export function hasRpgProgress(rpg) {
  if (!rpg) return false;
  if (rpg.archetype) return true;
  const visits = rpg.mapVisits && Object.keys(rpg.mapVisits).length > 0;
  const eggs = rpg.eggs && Object.keys(rpg.eggs).length > 0;
  const flags = rpg.flags && Object.keys(rpg.flags).length > 0;
  const quests = rpg.quests && Object.values(rpg.quests).some(
    (q) => q?.complete || (q?.progress ?? 0) > 0,
  );
  return visits || eggs || flags || quests;
}

/** True when the session has casino-terminal progress worth carrying into RPG. */
export function hasCasinoProfileProgress(session) {
  if (!session) return false;
  const stats = session.activityStats ?? {};
  if (Object.values(stats).some((s) => (s?.visits ?? 0) > 0 || (s?.handsOrBets ?? 0) > 0)) {
    return true;
  }
  if ((session.casinoTimeMs ?? 0) > 0) return true;
  if (session.hotel?.foundReservation || session.hotel?.reachedRoom) return true;
  if ((session.rewards?.lifetimeWagered ?? 0) > 0) return true;
  if ((session.amenities?.purchasedItems?.length ?? 0) > 0) return true;
  return false;
}

/** Slot was played in the web terminal but has not entered the overworld yet. */
export function isCasinoOnlyProfile(session) {
  return hasCasinoProfileProgress(session) && !hasRpgProgress(session.rpg);
}

/**
 * Prepare a shared save slot for pixel RPG without erasing casino progress.
 * @returns {{ session: PlayerSession, importedFromCasino: boolean, needsCharacterSetup: boolean }}
 */
export function bootstrapSessionForRpg(session) {
  const needsCharacterSetup = !hasRpgProgress(session.rpg);
  const importedFromCasino = needsCharacterSetup && hasCasinoProfileProgress(session);
  const rpg = session.ensureRpgState();
  // defaultRpgState() fills archetype/appearance; strip them for first-time RPG
  // entry so casino-only slots stay "needs setup" until the character creator runs.
  if (needsCharacterSetup) {
    rpg.archetype = null;
    rpg.appearance = null;
  }
  if (rpg.worldTime == null) rpg.worldTime = 720;
  if (!rpg.reputation) rpg.reputation = { whales: 0, staff: 0, tourists: 0 };
  if (!Array.isArray(rpg.inventory)) rpg.inventory = [];
  for (const key of ["dex", "eggs", "mapVisits"]) {
    if (!rpg[key] || typeof rpg[key] !== "object") rpg[key] = {};
  }
  if (!rpg.options) rpg.options = { ...defaultRpgState().options };
  return { session, importedFromCasino, needsCharacterSetup };
}

export const TransactionKind = {
  BUY_IN: "buy_in",
  CASH_OUT: "cash_out",
  WAGER: "wager",
  WIN: "win",
  PUSH: "push",
  REFUND: "refund",
};

export function fmtChips(amount) {
  return `$${Number(amount).toLocaleString("en-US")}`;
}

export function signedChips(value) {
  if (value > 0) return `+${fmtChips(value)}`;
  if (value < 0) return `-${fmtChips(Math.abs(value))}`;
  return fmtChips(0);
}

export function secureRandomInt(min, max) {
  const range = max - min + 1;
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return min + (buf[0] % range);
}

export function fisherYatesShuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = secureRandomInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class ChipWallet {
  constructor(balance = 1000) {
    this.balance = Math.max(0, balance);
    this.transactions = [];
  }

  _record(kind, amount, activity, description) {
    this.transactions.push({
      timestamp: new Date().toISOString(),
      kind,
      amount,
      activity,
      description,
      balanceAfter: this.balance,
    });
  }

  canAfford(amount) {
    return amount > 0 && this.balance >= amount;
  }

  debit(amount, activity, description) {
    if (!this.canAfford(amount)) return false;
    this.balance -= amount;
    this._record(TransactionKind.WAGER, -amount, activity, description);
    return true;
  }

  credit(amount, activity, description, kind = TransactionKind.WIN) {
    if (amount <= 0) return;
    this.balance += amount;
    this._record(kind, amount, activity, description);
  }

  buyIn(amount) {
    if (amount <= 0) throw new Error("Buy-in must be positive");
    this.balance += amount;
    this._record(TransactionKind.BUY_IN, amount, "cashier", `Purchased ${fmtChips(amount)} in chips`);
  }

  cashOut(amount) {
    if (amount <= 0 || amount > this.balance) return false;
    this.balance -= amount;
    this._record(TransactionKind.CASH_OUT, -amount, "cashier", `Cashed out ${fmtChips(amount)} in chips`);
    return true;
  }

  syncBalance(newBalance, activity, description) {
    const delta = newBalance - this.balance;
    if (delta > 0) {
      this.credit(delta, activity, description);
    } else if (delta < 0) {
      if (!this.debit(-delta, activity, description)) {
        this.balance = newBalance;
        this._record(TransactionKind.WAGER, delta, activity, description);
      }
    }
  }

  get netSession() {
    return this.transactions
      .filter((t) => t.kind !== TransactionKind.BUY_IN && t.kind !== TransactionKind.CASH_OUT)
      .reduce((sum, t) => sum + t.amount, 0);
  }

  recentTransactions(limit = 10) {
    return this.transactions.slice(-limit);
  }

  toJSON() {
    return { balance: this.balance, transactions: this.transactions };
  }

  static fromJSON(data) {
    const w = new ChipWallet(data.balance ?? 1000);
    w.transactions = data.transactions ?? [];
    return w;
  }
}

export class ActivityStats {
  constructor() {
    this.visits = 0;
    this.handsOrBets = 0;
    this.netWinnings = 0;
  }
}

export class PlayerSession {
  constructor({
    playerName = "Guest",
    chips = 1000,
    useColor = true,
    useUnicode = true,
    slotId = null,
    slotLabel = "",
  } = {}) {
    this.playerName = playerName;
    this.wallet = new ChipWallet(chips);
    this.useColor = useColor;
    this.useUnicode = useUnicode;
    this.activityStats = {};
    this.slotId = slotId;
    this.slotLabel = slotLabel;
    this.sportsbookData = null;
    this.tradingDeskData = null;
    this.arcadeData = null;
    this.rpg = null;
    this.rewards = null;
    this.hotel = null;
    this.amenities = null;
    this.poolComplex = null;
    this.worldCycle = null;
    this.intoxication = null;
    this.dining = null;
    this.balconySmoke = null;
    this.progressivePools = {};
    this.horseRacingCustomNames = null;
    this.horseRacingNameOffset = 0;
    this.horseRacingSpriteOffset = 0;
    this.bank = null;
    this.staffOverrides = null;
    this.casinoTimeMs = 0;
  }

  statFor(activity) {
    if (!this.activityStats[activity]) {
      this.activityStats[activity] = new ActivityStats();
    }
    return this.activityStats[activity];
  }

  recordVisit(activity) {
    this.statFor(activity).visits += 1;
  }

  recordResult(activity, net, bets = 1) {
    const stats = this.statFor(activity);
    stats.handsOrBets += bets;
    stats.netWinnings += net;
  }

  ensureRpgState() {
    if (!this.rpg) this.rpg = defaultRpgState();
    return this.rpg;
  }

  toJSON() {
    const payload = {
      version: SAVE_VERSION,
      playerName: this.playerName,
      slotId: this.slotId,
      slotLabel: this.slotLabel,
      wallet: this.wallet.toJSON(),
      useColor: this.useColor,
      useUnicode: this.useUnicode,
      activityStats: this.activityStats,
      sportsbook: this.sportsbookData ?? null,
      tradingDesk: this.tradingDeskData ?? null,
      arcade: this.arcadeData ?? null,
      progressivePools: this.progressivePools ?? {},
      horseRacingCustomNames: this.horseRacingCustomNames ?? null,
      horseRacingNameOffset: this.horseRacingNameOffset ?? 0,
      horseRacingSpriteOffset: this.horseRacingSpriteOffset ?? 0,
      bank: this.bank?.toJSON?.() ?? null,
      staffOverrides: this.staffOverrides ?? null,
      casinoTimeMs: this.casinoTimeMs ?? 0,
    };
    if (this.rpg) payload.rpg = this.rpg;
    if (this.rewards) payload.rewards = this.rewards;
    if (this.hotel) payload.hotel = this.hotel;
    if (this.amenities) payload.amenities = this.amenities;
    if (this.poolComplex) payload.poolComplex = this.poolComplex;
    if (this.worldCycle) payload.worldCycle = this.worldCycle;
    if (this.intoxication) payload.intoxication = this.intoxication;
    if (this.dining) payload.dining = this.dining;
    if (this.balconySmoke) payload.balconySmoke = this.balconySmoke;
    return payload;
  }

  static fromJSON(data) {
    const s = new PlayerSession({
      playerName: data.playerName ?? "Guest",
      chips: data.wallet?.balance ?? 1000,
      useColor: data.useColor ?? true,
      useUnicode: data.useUnicode ?? true,
      slotId: data.slotId ?? null,
      slotLabel: data.slotLabel ?? "",
    });
    s.wallet = ChipWallet.fromJSON(data.wallet ?? { balance: 1000, transactions: [] });
    s.activityStats = data.activityStats ?? {};
    s.sportsbookData = data.sportsbook ?? null;
    s.tradingDeskData = data.tradingDesk ?? null;
    s.arcadeData = data.arcade ?? null;
    s.progressivePools = data.progressivePools ?? {};
    s.horseRacingCustomNames = data.horseRacingCustomNames ?? null;
    s.horseRacingNameOffset = data.horseRacingNameOffset ?? 0;
    s.horseRacingSpriteOffset = data.horseRacingSpriteOffset ?? 0;
    s.rpg = migrateRpgState(data.rpg, data.rpgData);
    attachRewardsToSession(s, data);
    attachHotelToSession(s, data);
    attachAmenitiesToSession(s, data);
    attachPoolComplexToSession(s, data);
    attachWorldCycleToSession(s, data);
    attachBankToSession(s, data);
    attachStaffOverridesToSession(s, data);
    attachIntoxicationToSession(s, data);
    attachDiningToSession(s, data);
    attachBalconySmokeToSession(s, data);
    s.casinoTimeMs = data.casinoTimeMs ?? 0;
    return s;
  }
}

export const MAX_SLOTS = 5;
const LIBRARY_KEY = "mandalay-bay-library";

function emptyLibrary() {
  return { recent: [], summaries: {}, slots: {} };
}

export function loadLibrary() {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (raw) {
      const lib = { ...emptyLibrary(), ...JSON.parse(raw) };
      mirrorLibraryToCache(lib);
      return lib;
    }
  } catch {
    /* ignore corrupt data */
  }
  migrateLegacySession();
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (raw) {
      const lib = { ...emptyLibrary(), ...JSON.parse(raw) };
      mirrorLibraryToCache(lib);
      return lib;
    }
  } catch {
    /* ignore */
  }
  const cached = readCacheLibrary();
  if (cached) {
    const lib = { ...emptyLibrary(), ...cached };
    writeLibrary(lib);
    return lib;
  }
  return emptyLibrary();
}

function migrateLegacySession() {
  const LEGACY = "mandalay-bay-session";
  const raw = localStorage.getItem(LEGACY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    const lib = emptyLibrary();
    lib.slots["1"] = { ...data, slotId: 1, slotLabel: data.slotLabel ?? "Slot 1" };
    lib.summaries["1"] = {
      label: "Slot 1",
      playerName: data.playerName ?? "Guest",
      balance: data.wallet?.balance ?? 1000,
      updatedAt: new Date().toISOString(),
    };
    lib.recent = [1];
    writeLibrary(lib);
    localStorage.removeItem(LEGACY);
  } catch {
    /* ignore */
  }
}

function writeLibrary(lib) {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib));
    mirrorLibraryToCache(lib);
  } catch {
    /* ignore quota errors */
  }
}

function touchRecent(lib, slotId) {
  lib.recent = lib.recent.filter((id) => id !== slotId);
  lib.recent.unshift(slotId);
  lib.recent = lib.recent.slice(0, MAX_SLOTS);
}

function updateSummary(lib, session) {
  if (session.slotId == null) return;
  lib.summaries[String(session.slotId)] = {
    label: session.slotLabel || `Slot ${session.slotId}`,
    playerName: session.playerName,
    balance: session.wallet.balance,
    updatedAt: new Date().toISOString(),
    casinoTimeMs: session.casinoTimeMs ?? 0,
    hasRpgProgress: hasRpgProgress(session.rpg),
  };
}

export function listSlots() {
  const lib = loadLibrary();
  const slots = [];
  for (let id = 1; id <= MAX_SLOTS; id++) {
    const key = String(id);
    const occupied = Boolean(lib.slots[key]);
    const meta = lib.summaries[key] ?? {};
    slots.push({
      slotId: id,
      label: occupied ? (meta.label ?? `Slot ${id}`) : `Slot ${id} (empty)`,
      playerName: meta.playerName ?? "",
      balance: meta.balance ?? 0,
      updatedAt: meta.updatedAt ?? null,
      casinoTimeMs: meta.casinoTimeMs ?? 0,
      hasRpgProgress: meta.hasRpgProgress ?? false,
      occupied,
    });
  }
  return slots;
}

export function recentSlots() {
  const lib = loadLibrary();
  const byId = Object.fromEntries(listSlots().filter((s) => s.occupied).map((s) => [s.slotId, s]));
  const ordered = [];
  for (const id of lib.recent) {
    if (byId[id]) ordered.push(byId[id]);
  }
  for (const slot of listSlots()) {
    if (slot.occupied && !lib.recent.includes(slot.slotId)) ordered.push(slot);
  }
  return ordered;
}

export function loadSlot(slotId) {
  const lib = loadLibrary();
  const raw = lib.slots[String(slotId)];
  if (!raw) return null;
  const session = PlayerSession.fromJSON(raw);
  session.slotId = slotId;
  touchRecent(lib, slotId);
  writeLibrary(lib);
  setActiveSlotId(slotId);
  return session;
}

export function saveSlot(session) {
  if (session.slotId == null) return;
  flushCasinoTime(session);
  const lib = loadLibrary();
  lib.slots[String(session.slotId)] = session.toJSON();
  updateSummary(lib, session);
  touchRecent(lib, session.slotId);
  writeLibrary(lib);
  setActiveSlotId(session.slotId);
}

export function deleteSlot(slotId) {
  const lib = loadLibrary();
  delete lib.slots[String(slotId)];
  delete lib.summaries[String(slotId)];
  lib.recent = lib.recent.filter((id) => id !== slotId);
  writeLibrary(lib);
  if (getActiveSlotId() === slotId) {
    const next = lib.recent.find((id) => lib.slots[String(id)]);
    setActiveSlotId(next ?? null);
  }
}

/** Load the last remembered casino profile, or the most recent save. */
export function loadActiveProfile() {
  const preferred = getActiveSlotId();
  if (preferred != null) {
    const session = loadSlot(preferred);
    if (session) return session;
  }
  const recent = recentSlots();
  if (recent.length) return loadSlot(recent[0].slotId);
  return null;
}

export function createSlot(slotId, { playerName = "Guest", chips = 1000, label = "", useColor = true, useUnicode = true } = {}) {
  const session = new PlayerSession({
    playerName,
    chips,
    useColor,
    useUnicode,
    slotId,
    slotLabel: label || `Slot ${slotId}`,
  });
  saveSlot(session);
  return session;
}

export function formatSaveTime(iso) {
  if (!iso) return "never";
  try {
    return formatVegasDateTimeShort(iso);
  } catch {
    return "unknown";
  }
}

export function createGuestSession({ playerName = "Guest", chips = 1000, useColor = true, useUnicode = true } = {}) {
  return new PlayerSession({
    playerName,
    chips,
    useColor,
    useUnicode,
    slotId: null,
    slotLabel: "Guest visit (no save)",
  });
}

export const ACTIVITIES = {
  blackjack: {
    id: "blackjack",
    name: "Blackjack",
    floor: "Table Games",
    minBet: 10,
    description: "Classic 21 with solo or full-table play. 3:2 blackjack, split, double, insurance.",
  },
  holdem: {
    id: "holdem",
    name: "Texas Hold'em",
    floor: "Table Games",
    minBet: 10,
    description: "Full Hold'em vs AI opponents — pre-flop through showdown with UCI hand rankings.",
  },
  roulette: {
    id: "roulette",
    name: "Mandalay Roulette",
    floor: "Table Games",
    minBet: 5,
    description: "European single-zero wheel — straights, colors, dozens, and even-money bets.",
  },
  craps: {
    id: "craps",
    name: "Mandalay Craps",
    floor: "Table Games",
    minBet: 5,
    description: "Dice table — Pass / Don't Pass, Field, props, and hardways.",
  },
  slots: {
    id: "slots",
    name: "Mandalay Bay Slots",
    floor: "Slot Machines",
    minBet: 1,
    description: "Nearly 1,000 reel games from penny slots to high-limit progressives.",
  },
  lottery: {
    id: "lottery",
    name: "Mandalay Lottery",
    floor: "Lottery Counter",
    minBet: 2,
    description: "Pick 3/4, Mega jackpot draws, and instant scratchers.",
  },
  sportsbook: {
    id: "sportsbook",
    name: "Mandalay Sports Book",
    floor: "Sports Book",
    minBet: 10,
    description: "125+ stored sports scenarios and prediction markets — ML, spread, totals, props, parlays, futures.",
  },
  trading_desk: {
    id: "trading_desk",
    name: "Mandalay Markets",
    floor: "Trading Floor",
    minBet: 25,
    description: "Futures and call/put options on NYSE equities, commodities, and crypto contracts.",
  },
  arcade: {
    id: "arcade",
    name: "Mandalay Arcade",
    floor: "Arcade Alley",
    minBet: 5,
    description: "Vegas-styled CRT cabinets — Strip Cross, Neon Invaders, Breakout, Showgirl Beat.",
  },
  horse_racing: {
    id: "horse_racing",
    name: "Mandalay Racing",
    floor: "Racing Pavilion",
    minBet: 5,
    description: "Simulated thoroughbred racing — win, place, and show wagers.",
  },
  dressage: {
    id: "dressage",
    name: "Dressage Arena",
    floor: "Equestrian Arena",
    minBet: 5,
    description: "Score-based dressage competition — bet on the top-placing horse and rider.",
  },
  jumper: {
    id: "jumper",
    name: "Show Jumping",
    floor: "Equestrian Arena",
    minBet: 5,
    description: "Fault-and-time show jumping — wager on clear rounds and podium finishes.",
  },
};

export const FLOOR_ORDER = [
  "Table Games",
  "Slot Machines",
  "Lottery Counter",
  "Sports Book",
  "Trading Floor",
  "Arcade Alley",
  "Racing Pavilion",
  "Equestrian Arena",
];
