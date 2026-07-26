/** Private offshore / off-strip bank account — cashed-out chips and outside expenses. */

import { BUY_CHIPS_MAX, CASHOUT_TO_BANK_MAX, bankWithdrawMaxForSession } from "./chip-limits.js";

export const DEFAULT_ACCOUNT_NAME = "Private Offshore Account";

export const BankTransactionKind = {
  DEPOSIT: "deposit",
  WITHDRAW: "withdraw",
  EXPENSE: "expense",
};

export const OUTSIDE_EXPENSE_CATEGORIES = [
  ["dining", "Dining & drinks (off-property)"],
  ["transport", "Rideshare / taxi"],
  ["shopping", "Shopping & souvenirs"],
  ["lodging", "Nearby lodging"],
  ["entertainment", "Shows & entertainment"],
  ["other", "Miscellaneous"],
];

export class BankAccount {
  constructor({ balance = 0, accountName = DEFAULT_ACCOUNT_NAME, transactions = [] } = {}) {
    this.balance = Math.max(0, balance);
    this.accountName = accountName;
    this.transactions = transactions;
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
    };
  }

  static fromJSON(data) {
    return new BankAccount({
      balance: data?.balance ?? 0,
      accountName: data?.accountName ?? DEFAULT_ACCOUNT_NAME,
      transactions: data?.transactions ?? [],
    });
  }
}

export function ensureBank(session) {
  if (!session.bank) {
    session.bank = new BankAccount();
  }
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

function formatBankAmount(amount) {
  return `$${Number(amount).toLocaleString("en-US")}`;
}

export function attachBankToSession(session, data) {
  session.bank = data?.bank ? BankAccount.fromJSON(data.bank) : new BankAccount();
  return session.bank;
}
