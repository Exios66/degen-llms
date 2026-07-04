import { BlackjackGame, defaultConfig, Action } from "../../../js/blackjack/game.js";
import { fmtChips, persistSession } from "../session.js";

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "className") node.className = v;
    else if (k === "textContent") node.textContent = v;
    else if (k === "innerHTML") node.innerHTML = v;
    else if (k.startsWith("on")) node[k.toLowerCase()] = v;
    else node.setAttribute(k, v);
  }
  for (const child of children) {
    if (typeof child === "string") node.appendChild(document.createTextNode(child));
    else if (child) node.appendChild(child);
  }
  return node;
}

function formatCardLabel(card, useUnicode = true) {
  if (!card) return useUnicode ? "[?]" : "[??]";
  return card.label(useUnicode);
}

function renderTable(snapshot, useUnicode = true) {
  const container = el("div", { className: "table-display" });
  for (const row of snapshot.rows) {
    const cards = row.cards.map((c) => formatCardLabel(c, useUnicode)).join(" ");
    let suffix = "";
    if (row.surrendered) suffix = " [surrendered]";
    else if (row.bust) suffix = " [BUST]";
    else if (row.blackjack) suffix = " [BLACKJACK]";
    const cls = row.highlight ? "seat-line highlight" : "seat-line";
    container.appendChild(el("div", {
      className: cls,
      innerHTML: `Seat ${row.seat} ${row.label} (${fmtChips(row.bankroll)}): bet ${fmtChips(row.bet)} — ${cards} (${row.value})${suffix}`,
    }));
  }
  if (snapshot.dealer) {
    const d = snapshot.dealer;
    const cards = d.cards.map((c) => formatCardLabel(c, useUnicode)).join(" ");
    container.appendChild(el("div", {
      className: "dealer-line",
      innerHTML: `Dealer: ${cards} (${d.value})`,
    }));
  }
  return container;
}

export default class BlackjackEncounter {
  constructor({ overlayEl, onComplete }) {
    this.overlayEl = overlayEl;
    this.onComplete = onComplete;
    this.session = null;
    this.game = null;
    this.sessionNet = 0;
    this.title = "Blackjack";
    this._keyHandler = this._keyHandler.bind(this);
  }

  start(session, { title = "Casino Floor — Blackjack", minBet = 10, maxBet = null } = {}) {
    this.session = session;
    this.title = title;
    this.sessionNet = 0;

    const balance = session.wallet.balance;
    const cfg = defaultConfig(balance);
    cfg.minBet = minBet;
    cfg.maxBet = maxBet ?? Math.min(100, balance);
    cfg.startingBankroll = balance;
    cfg.numBots = 0;

    this.game = new BlackjackGame(cfg, (newBalance) => {
      session.wallet.syncBalance(newBalance, "blackjack", "RPG table sync");
      persistSession(session);
    });

    this.game.beginRound();
    this.overlayEl.classList.add("blackjack-overlay");
    document.addEventListener("keydown", this._keyHandler);
    this.render();
  }

  finish(silent = false) {
    if (this.game) {
      if (this.game.phase === "complete" && !this.game.roundOverEarly) {
        this.sessionNet += this.game.humanNet;
      }
      this.session.recordResult("blackjack", this.sessionNet);
      persistSession(this.session);
      const net = this.sessionNet;
      this.game = null;
      this.sessionNet = 0;
      this.overlayEl.innerHTML = "";
      this.overlayEl.classList.remove("blackjack-overlay");
      document.removeEventListener("keydown", this._keyHandler);
      if (this.onComplete) {
        this.onComplete({ net, silent });
      }
    }
  }

  render() {
    const game = this.game;
    if (!game) return;

    this.overlayEl.innerHTML = "";
    const panel = el("div", { className: "overlay-panel" });

    panel.appendChild(el("h2", { textContent: this.title }));

    const chipEl = el("p", {
      className: "hud-dim",
      textContent: `Chips: ${fmtChips(this.session.wallet.balance)}`,
    });
    panel.appendChild(chipEl);

    panel.appendChild(el("p", {
      className: "hud-dim",
      textContent: game.statusLine(),
    }));

    const log = el("div", { className: "log-area" });
    for (const m of game.messages) {
      log.appendChild(el("div", { className: m.type, textContent: m.text }));
    }

    const reveal = game.phase === "settlement" || game.phase === "complete" || game.dealer.holeRevealed;
    const highlight = game.pendingAction?.player?.seat ?? game.human()?.seat;
    const snapshot = game.getTableSnapshot(reveal, highlight);
    panel.appendChild(renderTable(snapshot, this.session.useUnicode !== false));

    panel.appendChild(log);

    const actionBar = el("div", { className: "action-bar" });

    if (game.phase === "betting" && game.pendingBet) {
      const betInput = el("input", {
        type: "number",
        min: String(game.config.minBet),
        max: String(Math.min(game.config.maxBet, game.human().bankroll)),
        value: String(game.config.minBet),
      });
      actionBar.appendChild(el("div", { className: "form-row" }, [
        el("label", { textContent: `Place bet ($${game.config.minBet}-$${game.config.maxBet}, 0 to leave)` }),
        betInput,
      ]));
      actionBar.appendChild(el("button", {
        className: "overlay-btn primary",
        textContent: "Deal",
        onclick: () => {
          const amount = parseInt(betInput.value, 10);
          if (amount === 0) {
            this.finish(true);
            return;
          }
          if (!game.placeHumanBet(amount)) return;
          if (game.roundOverEarly) {
            this.finish(true);
            return;
          }
          this.render();
        },
      }));
    }

    if (game.pendingInsurance) {
      actionBar.appendChild(el("button", {
        className: "overlay-btn primary",
        textContent: "Take insurance",
        onclick: () => { game.takeInsurance(true); this.render(); },
      }));
      actionBar.appendChild(el("button", {
        className: "overlay-btn",
        textContent: "Decline",
        onclick: () => { game.takeInsurance(false); this.render(); },
      }));
    }

    if (game.pendingAction) {
      const legal = game.getCurrentLegalActions();
      const shortcuts = [
        [Action.HIT, "Hit (H)"], [Action.STAND, "Stand (S)"], [Action.DOUBLE, "Double (D)"],
        [Action.SPLIT, "Split (P)"], [Action.SURRENDER, "Surrender (U)"],
      ];
      for (const [act, label] of shortcuts) {
        if (legal.has(act)) {
          actionBar.appendChild(el("button", {
            className: "overlay-btn primary",
            textContent: label,
            onclick: () => { game.playerAction(act); this.render(); },
          }));
        }
      }
    }

    if (game.phase === "complete" && !game.roundOverEarly) {
      for (const line of game.resultLines) {
        const cls = line.includes("+") ? "success" : line.includes("-") ? "error" : "";
        log.appendChild(el("div", { className: cls, textContent: line }));
      }

      if (game.canPlayAnother()) {
        actionBar.appendChild(el("button", {
          className: "overlay-btn primary",
          textContent: "Play another hand",
          onclick: () => {
            this.sessionNet += game.humanNet;
            game.beginRound();
            this.render();
          },
        }));
      }
      actionBar.appendChild(el("button", {
        className: "overlay-btn",
        textContent: "Leave table",
        onclick: () => this.finish(),
      }));
    }

    if (game.roundOverEarly && game.phase === "complete") {
      actionBar.appendChild(el("button", {
        className: "overlay-btn",
        textContent: "Leave table",
        onclick: () => this.finish(true),
      }));
    }

    panel.appendChild(actionBar);
    this.overlayEl.appendChild(panel);
  }

  _keyHandler(e) {
    if (!this.game?.pendingAction) return;
    const map = { h: Action.HIT, s: Action.STAND, d: Action.DOUBLE, p: Action.SPLIT, u: Action.SURRENDER };
    const act = map[e.key.toLowerCase()];
    if (act && this.game.getCurrentLegalActions().has(act)) {
      this.game.playerAction(act);
      this.render();
    }
  }
}
