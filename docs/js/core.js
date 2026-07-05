import { attachRewardsToSession } from "./rewards.js";
import { attachHotelToSession } from "./hotel.js";
import {
  getActiveSlotId,
  mirrorLibraryToCache,
  readCacheLibrary,
  setActiveSlotId,
} from "./profileCache.js";

export const CASINO_NAME = "The Mandalay Bay";
export const SAVE_VERSION = 4;

/** Default RPG overworld state for pixel mode (Phase 1+). */
export function defaultRpgState(overrides = {}) {
  return {
    mapId: "main_resort",
    x: 15,
    y: 26,
    playerSprite: "weekend_warrior",
    quests: {},
    flags: {},
    playTimeMinutes: 0,
    ...overrides,
  };
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
    this.rpg = null;
    this.rpgData = null;
    this.rewards = null;
    this.hotel = null;
    this.progressivePools = {};
    this.horseRacingCustomNames = null;
    this.horseRacingNameOffset = 0;
    this.horseRacingSpriteOffset = 0;
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
      rpgData: this.rpgData ?? null,
      progressivePools: this.progressivePools ?? {},
      horseRacingCustomNames: this.horseRacingCustomNames ?? null,
      horseRacingNameOffset: this.horseRacingNameOffset ?? 0,
      horseRacingSpriteOffset: this.horseRacingSpriteOffset ?? 0,
    };
    if (this.rpg) payload.rpg = this.rpg;
    if (this.rewards) payload.rewards = this.rewards;
    if (this.hotel) payload.hotel = this.hotel;
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
    s.progressivePools = data.progressivePools ?? {};
    s.horseRacingCustomNames = data.horseRacingCustomNames ?? null;
    s.horseRacingNameOffset = data.horseRacingNameOffset ?? 0;
    s.horseRacingSpriteOffset = data.horseRacingSpriteOffset ?? 0;
    s.rpg = data.rpg ? { ...defaultRpgState(), ...data.rpg } : null;
    s.rpgData = data.rpgData ?? null;
    attachRewardsToSession(s, data);
    attachHotelToSession(s, data);
    return s;
  }
}

export const DEFAULT_RPG_DATA = {
  location: "main_lobby",
  flags: {},
};

export function ensureRpgData(session) {
  if (!session.rpgData) {
    session.rpgData = { ...DEFAULT_RPG_DATA, flags: {} };
  } else {
    session.rpgData = {
      location: session.rpgData.location ?? DEFAULT_RPG_DATA.location,
      flags: { ...session.rpgData.flags },
    };
  }
  return session.rpgData;
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
    return new Date(iso).toLocaleString();
  } catch {
    return "unknown";
  }
}

/** @deprecated use saveSlot(session) */
export function saveSession(session) {
  saveSlot(session);
}

/** @deprecated */
export function loadSession() {
  const recent = recentSlots();
  if (recent.length) return loadSlot(recent[0].slotId);
  return null;
}

/** @deprecated */
export function clearSession() {
  const lib = loadLibrary();
  localStorage.removeItem(LIBRARY_KEY);
  return lib;
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
  slots: {
    id: "slots",
    name: "Mandalay Bay Slots",
    floor: "Slot Machines",
    minBet: 1,
    description: "Nearly 1,000 reel games from penny slots to high-limit progressives.",
  },
  sportsbook: {
    id: "sportsbook",
    name: "Mandalay Sports Book",
    floor: "Sports Book",
    minBet: 10,
    description: "Wager on simulated live events — moneyline and spread betting.",
  },
  horse_racing: {
    id: "horse_racing",
    name: "Mandalay Racing",
    floor: "Racing Pavilion",
    minBet: 5,
    description: "Simulated thoroughbred racing — win, place, and show wagers.",
  },
};

export const FLOOR_ORDER = ["Table Games", "Slot Machines", "Sports Book", "Racing Pavilion"];
