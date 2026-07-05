/** Off-strip bank account — cashed-out chips and outside expenses. */

export const DEFAULT_ACCOUNT_NAME = "Off-Strip Checking";

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
  if (!session.wallet.cashOut(amount)) return false;
  ensureBank(session).deposit(
    amount,
    "casino",
    `Cashed out ${formatBankAmount(amount)} in chips from the floor`,
  );
  return true;
}

export function buyInForSession(session, amount, { useOutsideFunds = false } = {}) {
  if (amount <= 0) throw new Error("Buy-in must be positive");
  const bank = ensureBank(session);
  if (bank.balance >= amount) {
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
