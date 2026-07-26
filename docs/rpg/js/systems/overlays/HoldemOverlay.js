import { OverlayBase, actionRow } from "../OverlayBase.js";
import { HoldemTable, BettingAction, STREET_ORDER } from "../../../../js/holdem/game.js";
import { fmtChips } from "../../../../js/core.js";
import { createCardSpriteRow } from "../../../../js/ui/card-sprites.js";

export class HoldemOverlay extends OverlayBase {
  constructor(root, session, hooks) {
    super(root, session, hooks, "holdem");
    this.table = null;
    this.buyIn = 0;
    this.phase = "buyin";
    this.log = [];
  }

  open(options = {}) {
    this.table = null;
    this.buyIn = 0;
    this.phase = "buyin";
    this.log = [];
    return super.open(options);
  }

  close() {
    if (this.table && this.buyIn > 0) {
      const stack = this.table.human.stack;
      if (stack > 0) {
        this.session.wallet.credit(stack, "holdem", "Cash out");
      }
      this.sessionNet += stack - this.buyIn;
    }
    this.table = null;
    super.close();
  }

  _streetLabel(street) {
    return STREET_ORDER.map((s) => (s === street ? `[${s}]` : s)).join(" → ");
  }

  _render() {
    if (this.phase === "buyin") {
      const panel = this._panel(`TEXAS HOLD'EM · ${this._options.dealerName ?? "Dealer"}`);
      this._msg(panel, "No-limit · 5-handed (you + 4 bots). Buy-in stays on the table across hands.");
      const form = document.createElement("div");
      form.className = "bj-form";
      const input = document.createElement("input");
      input.type = "number";
      const max = this.session.wallet.balance;
      input.min = "10";
      input.max = String(max);
      input.value = String(Math.min(200, Math.max(10, max)));
      form.appendChild(input);
      panel.appendChild(form);
      actionRow(panel, [
        {
          label: "Sit down",
          primary: true,
          onClick: () => {
            const amt = parseInt(input.value, 10) || 0;
            if (amt < 10) { alert("Minimum buy-in $10."); return; }
            if (!this.session.wallet.debit(amt, "holdem", "Buy-in")) {
              alert("Not enough chips.");
              return;
            }
            this.buyIn = amt;
            this.table = HoldemTable.quickTable(amt, 4);
            this.table.startHand();
            this.phase = "play";
            this.session.ensureRpgState().flags.played_holdem = true;
            this._runBots();
            this._render();
          },
        },
        { label: "Leave", onClick: () => this.close() },
      ]);
      return;
    }

    const t = this.table;
    const sessionDelta = t.human.stack - this.buyIn;
    const panel = this._panel(`HOLD'EM · Pot ${fmtChips(t.pot)}`);
    this._msg(
      panel,
      `${this._streetLabel(t.street)} · Stack ${fmtChips(t.human.stack)} · Session ${sessionDelta >= 0 ? "+" : ""}${sessionDelta}`,
    );
    const board = document.createElement("div");
    board.className = "bj-table holdem-sprite-table";

    const boardHeading = document.createElement("div");
    boardHeading.className = "bj-hand-heading";
    boardHeading.textContent = "Board";
    board.appendChild(boardHeading);
    const boardCards = [];
    for (let i = 0; i < 5; i++) boardCards.push(t.community[i] ?? null);
    board.appendChild(createCardSpriteRow(boardCards, { slots: 5, rowId: "rpg-holdem-board" }));

    for (const p of t.players) {
      const row = document.createElement("div");
      row.className = "bj-row bj-row--sprites" + (p.isHuman ? " highlight" : "");
      const acting = !t.handOver && t.players[t.actionIndex] === p ? " · ACTING" : "";
      const bet = p.betThisStreet > 0 ? ` · bet ${fmtChips(p.betThisStreet)}` : "";
      const heading = document.createElement("div");
      heading.className = "bj-hand-heading";
      heading.textContent = `${p.name}${acting} · stack ${fmtChips(p.stack)}${bet}${p.folded ? " [FOLD]" : ""}${p.allIn ? " [ALL-IN]" : ""}`;
      row.appendChild(heading);
      const hole = p.isHuman || t.handOver ? p.hole : p.hole.map(() => null);
      row.appendChild(
        createCardSpriteRow(hole, {
          hiddenMask: (_, c) => !c,
          rowId: `rpg-holdem-hole-${p.name}`,
        })
      );
      board.appendChild(row);
    }

    if (t.lastMessage) {
      const msg = document.createElement("div");
      msg.className = "bj-dealer";
      msg.textContent = t.lastMessage;
      board.appendChild(msg);
    }
    for (const line of (t.actionLog || this.log).slice(-8)) {
      const logLine = document.createElement("div");
      logLine.className = "bj-row dim";
      logLine.textContent = line;
      board.appendChild(logLine);
    }
    panel.appendChild(board);

    if (t.handOver) {
      actionRow(panel, [
        {
          label: "Next hand",
          primary: true,
          onClick: () => {
            if (t.human.stack <= 0) {
              alert("Busted.");
              this.close();
              return;
            }
            t.startHand();
            this._runBots();
            this._render();
          },
        },
        { label: "Cash out", onClick: () => this.close() },
      ]);
      return;
    }

    const actor = t.players[t.actionIndex];
    if (!actor?.isHuman) {
      this._runBots();
      this._render();
      return;
    }

    const toCall = Math.max(0, t.currentBet - actor.betThisStreet);
    const legal = t.legalActions(actor);
    const buttons = [];
    if (legal.has(BettingAction.CHECK)) {
      buttons.push({ label: "Check", primary: true, onClick: () => this._act(BettingAction.CHECK) });
    }
    if (legal.has(BettingAction.CALL)) {
      buttons.push({
        label: toCall >= actor.stack ? `All-in ${fmtChips(actor.stack)}` : `Call ${fmtChips(toCall)}`,
        primary: true,
        onClick: () => this._act(BettingAction.CALL),
      });
    }
    if (legal.has(BettingAction.RAISE)) {
      const minTo = t.minRaiseTo(actor);
      const maxTo = t.maxRaiseTo(actor);
      buttons.push({
        label: toCall > 0 ? "Raise…" : "Bet…",
        onClick: () => {
          const raw = prompt(
            `${toCall > 0 ? "Raise to" : "Bet"} amount (${minTo}–${maxTo}, or all-in ${maxTo}):`,
            String(minTo),
          );
          if (raw == null) return;
          let raiseTo = parseInt(raw, 10);
          if (!Number.isFinite(raiseTo)) {
            alert("Enter a valid amount.");
            return;
          }
          if (raiseTo < minTo && raiseTo < maxTo) {
            alert(`Minimum is ${minTo}, or go all-in for ${maxTo}.`);
            return;
          }
          raiseTo = Math.min(Math.max(raiseTo, Math.min(minTo, maxTo)), maxTo);
          this._act(BettingAction.RAISE, raiseTo);
        },
      });
      buttons.push({
        label: `All-in ${fmtChips(maxTo)}`,
        onClick: () => this._act(BettingAction.RAISE, maxTo),
      });
    }
    if (legal.has(BettingAction.FOLD)) {
      buttons.push({ label: "Fold", onClick: () => this._act(BettingAction.FOLD) });
    }
    buttons.push({ label: "Cash out", onClick: () => this.close() });
    actionRow(panel, buttons);
  }

  _act(action, raiseTo = null) {
    const actor = this.table.players[this.table.actionIndex];
    try {
      this.table.applyAction(actor, action, raiseTo);
    } catch (err) {
      alert(err.message || String(err));
      return;
    }
    this._runBots();
    this._render();
  }

  _runBots() {
    let guard = 0;
    while (!this.table.handOver && guard++ < 80) {
      const actor = this.table.players[this.table.actionIndex];
      if (!actor || actor.isHuman) break;
      if (actor.folded || actor.allIn) {
        this.table.actionIndex = (this.table.actionIndex + 1) % this.table.players.length;
        this.table._seekActor();
        continue;
      }
      const decision = this.table.botAction(actor);
      this.table.applyAction(actor, decision.action, decision.raiseTo);
    }
  }
}
