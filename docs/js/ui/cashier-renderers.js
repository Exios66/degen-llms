// Extracted from app.js — shared by the web terminal and the pixel RPG.
import {
  OUTSIDE_EXPENSE_CATEGORIES, buyInForSession, cashOutToBank, ensureBank,
  expenseCategoryLabel, fundBankFromOutside, payBankExpense, renameBankAccount,
} from "../bank-account.js";
import {
  BUY_CHIPS_MAX, CASHOUT_TO_BANK_MAX, bankWithdrawMaxForSession, cashOutMaxForSession,
} from "../chip-limits.js";
import { fmtChips } from "../core.js";
import { formatVegasTime } from "../vegas-time.js";
import { tierForWagered } from "../rewards.js";

export function buildCashierRenderers(ctx) {
  const { el, banner, chipLine, statusBanner, showStatus, menu, pushView, popView, goBack, render, persist } = ctx;
  const runtime = ctx.runtime;

  function renderCashier() {
    return el("div", {}, [
      statusBanner(),
      banner("Cashier"),
      chipLine(),
      menu(
        ["Buy chips ($500 bundle)", "Buy custom amount", "Cash out chips to bank", "View floor transaction ledger"],
        "Chip window:",
        (choice) => {
          if (choice === 0) { goBack(); return; }
          if (choice === 1) {
            const outcome = buyInForSession(ctx.session, 500, { useOutsideFunds: true });
            persist();
            const bank = ensureBank(ctx.session);
            if (outcome === "from_bank") {
              showStatus(`Purchased ${fmtChips(500)} from ${bank.accountName}. Floor balance: ${fmtChips(ctx.session.wallet.balance)}`);
            } else {
              showStatus(`Purchased ${fmtChips(500)} with outside funds. Balance: ${fmtChips(ctx.session.wallet.balance)}`);
            }
          } else if (choice === 2) {
            pushView("cashier-buy");
          } else if (choice === 3) {
            pushView("cashier-cashout");
          } else if (choice === 4) {
            pushView("cashier-ledger");
          }
        },
        { showCasinoBanner: false },
      ),
    ]);
  }

  function renderCashierBuy() {
    const input = el("input", {
      type: "number", min: "50", max: String(BUY_CHIPS_MAX), value: "500",
    });
    const withdrawMax = bankWithdrawMaxForSession(ctx.session);
    const tier = tierForWagered(ctx.session.rewards?.lifetimeWagered ?? 0);
    return el("div", { className: "panel" }, [
      banner("Buy Chips"),
      chipLine(),
      el("p", {
        className: "dim",
        textContent: `Up to $${BUY_CHIPS_MAX.toLocaleString()} per purchase. Offshore withdraws capped at $${withdrawMax.toLocaleString()} (${tier.label}).`,
      }),
      el("div", { className: "form-row" }, [
        el("label", { textContent: `Amount ($50–$${BUY_CHIPS_MAX.toLocaleString()})` }),
        input,
      ]),
      el("div", { className: "action-bar" }, [
        el("button", {
          className: "btn primary",
          textContent: "Purchase",
          onclick: () => {
            const amount = parseInt(input.value, 10);
            if (amount < 50 || amount > BUY_CHIPS_MAX) {
              alert(`Enter $50–$${BUY_CHIPS_MAX.toLocaleString()}`);
              return;
            }
            const bank = ensureBank(ctx.session);
            let outcome;
            if (bank.balance >= amount) {
              outcome = buyInForSession(ctx.session, amount);
              if (outcome === "tier_withdraw_limit") {
                if (confirm(
                  `${tier.label} offshore withdraw limit is $${withdrawMax.toLocaleString()}. `
                  + "Use outside funds instead?",
                )) {
                  outcome = buyInForSession(ctx.session, amount, { useOutsideFunds: true });
                } else {
                  return;
                }
              }
            } else if (confirm(`Only ${fmtChips(bank.balance)} in ${bank.accountName}. Use outside funds for the buy-in?`)) {
              outcome = buyInForSession(ctx.session, amount, { useOutsideFunds: true });
            } else {
              return;
            }
            persist();
            if (outcome === "from_bank") {
              showStatus(`Purchased ${fmtChips(amount)} from ${bank.accountName}. Floor balance: ${fmtChips(ctx.session.wallet.balance)}`);
            } else if (outcome === "outside_funds") {
              showStatus(`Purchased ${fmtChips(amount)} with outside funds. Balance: ${fmtChips(ctx.session.wallet.balance)}`);
            } else if (outcome === "over_buy_limit") {
              showStatus(`Purchase limit is $${BUY_CHIPS_MAX.toLocaleString()}.`, "error");
              return;
            } else {
              showStatus("Buy-in failed.", "error");
              return;
            }
            popView();
            render();
          },
        }),
        el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
      ]),
    ]);
  }

  function renderCashierCashout() {
    const maxOut = cashOutMaxForSession(ctx.session);
    const input = el("input", {
      type: "number",
      min: "1",
      max: String(maxOut),
      value: String(maxOut),
    });
    return el("div", { className: "panel" }, [
      banner("Cash Out"),
      chipLine(),
      el("p", {
        className: "dim",
        textContent: `Wire to your private offshore account — up to $${CASHOUT_TO_BANK_MAX.toLocaleString()} per transfer.`,
      }),
      el("div", { className: "form-row" }, [el("label", { textContent: "Amount to cash out" }), input]),
      el("div", { className: "action-bar" }, [
        el("button", {
          className: "btn primary",
          textContent: "Cash out",
          onclick: () => {
            const amount = parseInt(input.value, 10);
            const bank = ensureBank(ctx.session);
            if (amount > CASHOUT_TO_BANK_MAX) {
              alert(`Offshore cash-out limit is $${CASHOUT_TO_BANK_MAX.toLocaleString()} per transfer.`);
              return;
            }
            if (cashOutToBank(ctx.session, amount)) {
              persist();
              showStatus(`Cashed out ${fmtChips(amount)} to ${bank.accountName}. Floor balance: ${fmtChips(ctx.session.wallet.balance)}`);
              popView();
              render();
            } else showStatus("Cash out failed.", "error");
          },
        }),
        el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
      ]),
    ]);
  }

  function renderCashierLedger() {
    const txs = ctx.session.wallet.recentTransactions(20);
    const table = el("table", { className: "ledger-table" }, [
      el("thead", {}, [el("tr", {}, [
        el("th", { textContent: "Time" }),
        el("th", { textContent: "Activity" }),
        el("th", { textContent: "Amount" }),
        el("th", { textContent: "Balance" }),
        el("th", { textContent: "Description" }),
      ])]),
      el("tbody", {}, txs.length ? [...txs].reverse().map((tx) => {
        const sign = tx.amount >= 0 ? "+" : "";
        return el("tr", {}, [
          el("td", { textContent: formatVegasTime(tx.timestamp) }),
          el("td", { textContent: tx.activity }),
          el("td", { textContent: `${sign}${tx.amount.toLocaleString()}` }),
          el("td", { textContent: tx.balanceAfter.toLocaleString() }),
          el("td", { textContent: tx.description }),
        ]);
      }) : [el("tr", {}, [el("td", { colSpan: "5", className: "dim", textContent: "No transactions yet." })])]),
    ]);

    return el("div", { className: "panel" }, [
      banner("Transaction Ledger"),
      el("div", { className: "ledger-table-wrap" }, [table]),
      el("div", { className: "action-bar" }, [
        el("button", { className: "btn", textContent: "Back", onclick: () => { popView(); render(); } }),
      ]),
    ]);
  }

  function renderBankAccount() {
    const bank = ensureBank(ctx.session);
    return el("div", {}, [
      statusBanner(),
      banner(bank.accountName),
      chipLine(),
      el("p", {
        className: "dim",
        textContent: "Your private offshore account — cashed-out chips land here for life outside the casino.",
      }),
      menu(
        ["Deposit outside funds", "Pay outside expense", "Rename account", "View bank ledger"],
        "Offshore banking:",
        (choice) => {
          if (choice === 0) { goBack(); return; }
          if (choice === 1) pushView("bank-deposit");
          else if (choice === 2) pushView("bank-expense");
          else if (choice === 3) pushView("bank-rename");
          else if (choice === 4) pushView("bank-ledger");
        },
        { showCasinoBanner: false },
      ),
    ]);
  }

  function renderBankDeposit() {
    const input = el("input", { type: "number", min: "50", max: "1000000", value: "500" });
    return el("div", { className: "panel" }, [
      banner("Deposit Outside Funds"),
      chipLine(),
      el("p", { className: "dim", textContent: "Symbolic personal funds wired to your off-strip account." }),
      el("div", { className: "form-row" }, [el("label", { textContent: "Amount" }), input]),
      el("div", { className: "action-bar" }, [
        el("button", {
          className: "btn primary",
          textContent: "Deposit",
          onclick: () => {
            const amount = parseInt(input.value, 10);
            if (amount < 50 || amount > 1000000) { alert("Enter $50–$1,000,000"); return; }
            fundBankFromOutside(ctx.session, amount);
            persist();
            showStatus(`Deposited ${fmtChips(amount)}. Bank balance: ${fmtChips(ctx.session.bank.balance)}`);
            goBack();
          },
        }),
        el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
      ]),
    ]);
  }

  function renderBankExpense() {
    const bank = ensureBank(ctx.session);
    if (bank.balance <= 0) {
      return el("div", { className: "panel" }, [
        banner("Pay Outside Expense"),
        el("p", { className: "error", textContent: "Your bank account is empty." }),
        el("div", { className: "action-bar" }, [
          el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
        ]),
      ]);
    }

    const withdrawMax = bankWithdrawMaxForSession(ctx.session);
    const tier = tierForWagered(ctx.session.rewards?.lifetimeWagered ?? 0);
    const spendCap = Math.min(bank.balance, withdrawMax);
    const categorySelect = el("select", {}, OUTSIDE_EXPENSE_CATEGORIES.map(([id, label]) =>
      el("option", { value: id, textContent: label })
    ));
    const amountInput = el("input", {
      type: "number",
      min: "1",
      max: String(spendCap),
      value: String(Math.min(100, spendCap)),
    });
    const memoInput = el("input", { type: "text", placeholder: "Optional memo" });

    return el("div", { className: "panel" }, [
      banner("Pay Outside Expense"),
      chipLine(),
      el("p", {
        className: "dim",
        textContent: `${tier.label} withdraw limit: $${withdrawMax.toLocaleString()} per transfer (scales with MGM Rewards).`,
      }),
      el("div", { className: "form-row" }, [el("label", { textContent: "Category" }), categorySelect]),
      el("div", { className: "form-row" }, [el("label", { textContent: "Amount" }), amountInput]),
      el("div", { className: "form-row" }, [el("label", { textContent: "Memo" }), memoInput]),
      el("div", { className: "action-bar" }, [
        el("button", {
          className: "btn primary",
          textContent: "Pay",
          onclick: () => {
            const amount = parseInt(amountInput.value, 10);
            if (amount < 1 || amount > spendCap) {
              alert(`Enter $1–$${spendCap.toLocaleString()} (${tier.label} limit)`);
              return;
            }
            const categoryId = categorySelect.value;
            const label = expenseCategoryLabel(categoryId);
            const memo = memoInput.value.trim();
            const description = memo ? `${label} — ${memo}` : label;
            const outcome = payBankExpense(ctx.session, amount, categoryId, description);
            if (outcome === "ok") {
              persist();
              showStatus(`Paid ${fmtChips(amount)} for ${label}. Bank balance: ${fmtChips(bank.balance)}`);
              goBack();
            } else if (outcome === "tier_withdraw_limit") {
              showStatus(`${tier.label} withdraw limit is $${withdrawMax.toLocaleString()}.`, "error");
            } else {
              showStatus("Payment failed.", "error");
            }
          },
        }),
        el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
      ]),
    ]);
  }

  function renderBankRename() {
    const bank = ensureBank(ctx.session);
    const input = el("input", { type: "text", value: bank.accountName });
    return el("div", { className: "panel" }, [
      banner("Rename Account"),
      el("div", { className: "form-row" }, [el("label", { textContent: "Account name" }), input]),
      el("div", { className: "action-bar" }, [
        el("button", {
          className: "btn primary",
          textContent: "Save name",
          onclick: () => {
            renameBankAccount(ctx.session, input.value);
            persist();
            showStatus(`Account renamed to ${ctx.session.bank.accountName}.`);
            goBack();
          },
        }),
        el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
      ]),
    ]);
  }

  function renderBankLedger() {
    const txs = ensureBank(ctx.session).recentTransactions(20);
    const table = el("table", { className: "ledger-table" }, [
      el("thead", {}, [el("tr", {}, [
        el("th", { textContent: "Time" }),
        el("th", { textContent: "Category" }),
        el("th", { textContent: "Amount" }),
        el("th", { textContent: "Balance" }),
        el("th", { textContent: "Description" }),
      ])]),
      el("tbody", {}, txs.length ? [...txs].reverse().map((tx) => {
        const sign = tx.amount >= 0 ? "+" : "";
        return el("tr", {}, [
          el("td", { textContent: formatVegasTime(tx.timestamp) }),
          el("td", { textContent: tx.category }),
          el("td", { textContent: `${sign}${tx.amount.toLocaleString()}` }),
          el("td", { textContent: tx.balanceAfter.toLocaleString() }),
          el("td", { textContent: tx.description }),
        ]);
      }) : [el("tr", {}, [el("td", { colSpan: "5", className: "dim", textContent: "No bank transactions yet." })])]),
    ]);

    return el("div", { className: "panel" }, [
      banner("Bank Ledger"),
      el("div", { className: "ledger-table-wrap" }, [table]),
      el("div", { className: "action-bar" }, [
        el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
      ]),
    ]);
  }

  return {
    cashier: renderCashier,
    "cashier-buy": renderCashierBuy,
    "cashier-cashout": renderCashierCashout,
    "cashier-ledger": renderCashierLedger,
    "bank-account": renderBankAccount,
    "bank-deposit": renderBankDeposit,
    "bank-expense": renderBankExpense,
    "bank-rename": renderBankRename,
    "bank-ledger": renderBankLedger,
  };
}
