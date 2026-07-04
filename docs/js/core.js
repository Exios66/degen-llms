export const CASINO_NAME = "The Mandalay Bay";

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
  constructor({ playerName = "Guest", chips = 1000, useColor = true, useUnicode = true } = {}) {
    this.playerName = playerName;
    this.wallet = new ChipWallet(chips);
    this.useColor = useColor;
    this.useUnicode = useUnicode;
    this.activityStats = {};
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

  toJSON() {
    return {
      playerName: this.playerName,
      wallet: this.wallet.toJSON(),
      useColor: this.useColor,
      useUnicode: this.useUnicode,
      activityStats: this.activityStats,
    };
  }

  static fromJSON(data) {
    const s = new PlayerSession({
      playerName: data.playerName ?? "Guest",
      chips: data.wallet?.balance ?? 1000,
      useColor: data.useColor ?? true,
      useUnicode: data.useUnicode ?? true,
    });
    s.wallet = ChipWallet.fromJSON(data.wallet ?? { balance: 1000, transactions: [] });
    s.activityStats = data.activityStats ?? {};
    return s;
  }
}

const STORAGE_KEY = "mandalay-bay-session";

export function saveSession(session) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session.toJSON()));
  } catch {
    /* ignore quota errors */
  }
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return PlayerSession.fromJSON(JSON.parse(raw));
  } catch {
    /* ignore corrupt data */
  }
  return null;
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export const ACTIVITIES = {
  blackjack: { id: "blackjack", name: "Blackjack", floor: "Table Games", minBet: 10 },
  slots: { id: "slots", name: "Mandalay Fortune Slots", floor: "Slot Machines", minBet: 5 },
  sportsbook: { id: "sportsbook", name: "Mandalay Sports Book", floor: "Sports Book", minBet: 10 },
};

export const FLOOR_ORDER = ["Table Games", "Slot Machines", "Sports Book"];
