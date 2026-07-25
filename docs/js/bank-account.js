/** Private offshore / off-strip bank account — cashed-out chips, life/business spend, resort privileges. */

import { BUY_CHIPS_MAX, CASHOUT_TO_BANK_MAX, bankWithdrawMaxForSession } from "./chip-limits.js";
import { settleIntoxication } from "./intoxication-effects.js";

export const DEFAULT_ACCOUNT_NAME = "Private Offshore Account";

export const BankTransactionKind = {
  DEPOSIT: "deposit",
  WITHDRAW: "withdraw",
  EXPENSE: "expense",
};

/**
 * Decision-tree groups for outside / life / business expenses.
 * Each group expands into concrete ledger categories.
 */
export const OUTSIDE_EXPENSE_GROUPS = [
  {
    id: "personal",
    label: "Personal lifestyle",
    blurb: "Dining, rides, shopping, lodging, and shows off-property.",
    categories: [
      ["dining", "Dining & drinks (off-property)"],
      ["transport", "Rideshare / taxi"],
      ["shopping", "Shopping & souvenirs"],
      ["lodging", "Nearby lodging"],
      ["entertainment", "Shows & entertainment"],
    ],
  },
  {
    id: "legal",
    label: "Legal & obligations",
    blurb: "Counsel retainers and debt repayments from offshore cash.",
    categories: [
      ["legal_fees", "Legal fees & counsel"],
      ["debt_repayment", "Debt repayments"],
    ],
  },
  {
    id: "business",
    label: "Business affairs",
    blurb: "Operating costs and contract retainers for your side hustle.",
    categories: [
      ["business_expenses", "Business operating expenses"],
      ["business_contracts", "Business contracts & retainers"],
    ],
  },
  {
    id: "other",
    label: "Miscellaneous",
    blurb: "Anything that does not fit a cleaner ledger line.",
    categories: [
      ["other", "Miscellaneous"],
    ],
  },
];

/** Flat list for labels / legacy callers. */
export const OUTSIDE_EXPENSE_CATEGORIES = OUTSIDE_EXPENSE_GROUPS.flatMap((g) => g.categories);

/**
 * Fixed-price resort privileges bought with offshore cash.
 * Improve the web-terminal casino experience (chips, comps, venue access, recovery).
 */
export const BANK_RESORT_PURCHASES = [
  {
    id: "floor_float",
    label: "Floor float — $500 chips",
    blurb: "Wire a working float straight to your cage wallet.",
    cost: 500,
    kind: "chips",
    amount: 500,
    repeatable: true,
  },
  {
    id: "high_roller_float",
    label: "High-roller float — $2,500 chips",
    blurb: "A thicker rail for High Limit nights.",
    cost: 2500,
    kind: "chips",
    amount: 2500,
    repeatable: true,
  },
  {
    id: "betty_welcome",
    label: "Betty's welcome round",
    blurb: "Unlock a complimentary welcome cocktail voucher on Rewards.",
    cost: 175,
    kind: "comp",
    compId: "welcome_drink",
    repeatable: false,
  },
  {
    id: "arcade_voucher",
    label: "Arcade free-spin voucher",
    blurb: "Narrative free-spin flag for Arcade Alley.",
    cost: 200,
    kind: "flag",
    flag: "arcade_slot_voucher",
    repeatable: false,
  },
  {
    id: "arcade_drink",
    label: "Arcade drink refill",
    blurb: "Welcome-drink refill flag for the cabinet floor.",
    cost: 125,
    kind: "flag",
    flag: "arcade_drink_refill",
    repeatable: false,
  },
  {
    id: "late_checkout_credit",
    label: "Concierge late-checkout credit",
    blurb: "Carmen holds the room two extra hours — no floor net required.",
    cost: 350,
    kind: "perk",
    perkId: "late_checkout_credit",
    repeatable: false,
  },
  {
    id: "vip_host_retainer",
    label: "VIP host retainer",
    blurb: "Opens Foundation Room entry as a host-goodwill path.",
    cost: 2500,
    kind: "perk",
    perkId: "vip_host_retainer",
    repeatable: false,
  },
  {
    id: "high_limit_marker",
    label: "High Limit salon marker",
    blurb: "Waives the $10k floor-chip velvet-rope check for the salon.",
    cost: 5000,
    kind: "perk",
    perkId: "high_limit_marker",
    repeatable: false,
  },
  {
    id: "recovery_spa",
    label: "Eleven Acres recovery spa",
    blurb: "Clears max intoxication screen effects and resets to sober.",
    cost: 400,
    kind: "settle_intox",
    repeatable: true,
  },
  {
    id: "lucky_rail",
    label: "Lucky rail tip",
    blurb: "Tip the crew — $250 lands on your floor wallet.",
    cost: 250,
    kind: "chips",
    amount: 250,
    repeatable: true,
  },
];

export class BankAccount {
  constructor({
    balance = 0,
    accountName = DEFAULT_ACCOUNT_NAME,
    transactions = [],
    resortPerks = {},
  } = {}) {
    this.balance = Math.max(0, balance);
    this.accountName = accountName;
    this.transactions = transactions;
    this.resortPerks = { ...(resortPerks || {}) };
  }

  _record(kind, amount, category, description) {
    this.transactions.push({
      timestamp: new Date().toISOString(),
      kind,
      amount,
      category,
      description,
      balanceAfter: this.balance,
    });
  }

  canAfford(amount) {
    return amount > 0 && this.balance >= amount;
  }

  hasPerk(perkId) {
    return Boolean(this.resortPerks?.[perkId]);
  }

  grantPerk(perkId) {
    this.resortPerks[perkId] = true;
  }

  consumePerk(perkId) {
    if (!this.resortPerks?.[perkId]) return false;
    delete this.resortPerks[perkId];
    return true;
  }

  deposit(amount, category, description) {
    if (amount <= 0) throw new Error("Deposit must be positive");
    this.balance += amount;
    this._record(BankTransactionKind.DEPOSIT, amount, category, description);
  }

  withdraw(amount, category, description) {
    if (!this.canAfford(amount)) return false;
    this.balance -= amount;
    this._record(BankTransactionKind.WITHDRAW, -amount, category, description);
    return true;
  }

  payExpense(amount, category, description) {
    if (!this.canAfford(amount)) return false;
    this.balance -= amount;
    this._record(BankTransactionKind.EXPENSE, -amount, category, description);
    return true;
  }

  recentTransactions(limit = 10) {
    return this.transactions.slice(-limit);
  }

  toJSON() {
    return {
      balance: this.balance,
      accountName: this.accountName,
      transactions: this.transactions,
      resortPerks: { ...this.resortPerks },
    };
  }

  static fromJSON(data) {
    return new BankAccount({
      balance: data?.balance ?? 0,
      accountName: data?.accountName ?? data?.account_name ?? DEFAULT_ACCOUNT_NAME,
      transactions: data?.transactions ?? [],
      resortPerks: data?.resortPerks ?? data?.resort_perks ?? {},
    });
  }
}

export function ensureBank(session) {
  if (!session.bank) {
    session.bank = new BankAccount();
  }
  if (!session.bank.resortPerks) session.bank.resortPerks = {};
  return session.bank;
}

export function cashOutToBank(session, amount) {
  if (amount <= 0 || amount > session.wallet.balance) return false;
  if (amount > CASHOUT_TO_BANK_MAX) return false;
  if (!session.wallet.cashOut(amount)) return false;
  ensureBank(session).deposit(
    amount,
    "casino",
    `Cashed out ${formatBankAmount(amount)} in chips to offshore account`,
  );
  return true;
}

export function buyInForSession(session, amount, { useOutsideFunds = false } = {}) {
  if (amount <= 0) throw new Error("Buy-in must be positive");
  if (amount > BUY_CHIPS_MAX) return "over_buy_limit";
  const bank = ensureBank(session);
  if (bank.balance >= amount) {
    if (amount > bankWithdrawMaxForSession(session)) return "tier_withdraw_limit";
    if (!bank.withdraw(amount, "casino", `Buy-in for ${formatBankAmount(amount)} in floor chips`)) {
      return "failed";
    }
    session.wallet.buyIn(amount);
    return "from_bank";
  }
  if (useOutsideFunds || bank.balance === 0) {
    session.wallet.buyIn(amount);
    return "outside_funds";
  }
  return "insufficient";
}

/** Pay an outside expense, capped by MGM Rewards tier withdraw limit. */
export function payBankExpense(session, amount, category, description) {
  if (amount <= 0) return "invalid";
  if (!isKnownExpenseCategory(category)) return "invalid_category";
  if (amount > bankWithdrawMaxForSession(session)) return "tier_withdraw_limit";
  const bank = ensureBank(session);
  if (!bank.payExpense(amount, category, description)) return "insufficient";
  return "ok";
}

export function fundBankFromOutside(session, amount) {
  ensureBank(session).deposit(
    amount,
    "outside",
    `Personal funds deposited to ${session.bank.accountName}`,
  );
}

export function renameBankAccount(session, name) {
  const cleaned = name.trim();
  if (cleaned) ensureBank(session).accountName = cleaned;
}

export function expenseCategoryLabel(categoryId) {
  const match = OUTSIDE_EXPENSE_CATEGORIES.find(([id]) => id === categoryId);
  return match ? match[1] : categoryId.replace(/_/g, " ");
}

export function expenseGroupById(groupId) {
  return OUTSIDE_EXPENSE_GROUPS.find((g) => g.id === groupId) ?? null;
}

export function isKnownExpenseCategory(categoryId) {
  return OUTSIDE_EXPENSE_CATEGORIES.some(([id]) => id === categoryId);
}

export function getResortPurchase(itemId) {
  return BANK_RESORT_PURCHASES.find((p) => p.id === itemId) ?? null;
}

export function resortPurchaseAvailable(session, item) {
  const bank = ensureBank(session);
  if (!item) return { ok: false, reason: "Unknown privilege." };
  if (bank.balance < item.cost) {
    return { ok: false, reason: `Need ${formatBankAmount(item.cost)} offshore.` };
  }
  if (item.cost > bankWithdrawMaxForSession(session)) {
    return { ok: false, reason: "Above your MGM Rewards withdraw limit." };
  }
  if (!item.repeatable) {
    if (item.kind === "perk" && bank.hasPerk(item.perkId)) {
      return { ok: false, reason: "Already purchased." };
    }
    if (item.kind === "flag") {
      const flags = session.rpg?.flags ?? {};
      if (flags[item.flag]) return { ok: false, reason: "Already unlocked." };
    }
    if (item.kind === "comp") {
      const rewards = session.rewards;
      const unlocked = rewards?.unlockedComps?.includes(item.compId);
      const redeemed = rewards?.redeemedComps?.includes(item.compId);
      // Block only while an unused voucher is already sitting in the wallet.
      if (unlocked && !redeemed) {
        return { ok: false, reason: "Voucher already waiting to redeem." };
      }
    }
  }
  return { ok: true };
}

/**
 * Buy a resort privilege with offshore cash.
 * @returns {"ok"|"insufficient"|"tier_withdraw_limit"|"unavailable"|"invalid"|"failed"}
 */
export function purchaseBankResortItem(session, itemId) {
  const item = getResortPurchase(itemId);
  if (!item) return "invalid";
  const avail = resortPurchaseAvailable(session, item);
  if (!avail.ok) {
    if (avail.reason?.includes("withdraw limit")) return "tier_withdraw_limit";
    if (avail.reason?.startsWith("Need")) return "insufficient";
    return "unavailable";
  }

  const bank = ensureBank(session);
  if (!bank.payExpense(item.cost, "resort", item.label)) return "insufficient";

  if (item.kind === "chips") {
    session.wallet.buyIn(item.amount);
  } else if (item.kind === "comp") {
    session.rewards = session.rewards ?? {};
    session.rewards.unlockedComps = session.rewards.unlockedComps ?? [];
    session.rewards.redeemedComps = session.rewards.redeemedComps ?? [];
    if (!session.rewards.unlockedComps.includes(item.compId)) {
      session.rewards.unlockedComps.push(item.compId);
    }
    session.rewards.redeemedComps = session.rewards.redeemedComps.filter((id) => id !== item.compId);
    session.rpg = session.rpg ?? {};
    session.rpg.flags = session.rpg.flags ?? {};
    if (item.compId === "welcome_drink") {
      session.rpg.flags.has_welcome_drink_comp = true;
    }
  } else if (item.kind === "flag") {
    session.rpg = session.rpg ?? {};
    session.rpg.flags = session.rpg.flags ?? {};
    session.rpg.flags[item.flag] = true;
  } else if (item.kind === "perk") {
    bank.grantPerk(item.perkId);
  } else if (item.kind === "settle_intox") {
    settleIntoxication(session);
  } else {
    return "failed";
  }
  return "ok";
}

function formatBankAmount(amount) {
  return `$${Number(amount).toLocaleString("en-US")}`;
}

export function attachBankToSession(session, data) {
  session.bank = data?.bank ? BankAccount.fromJSON(data.bank) : new BankAccount();
  return session.bank;
}
