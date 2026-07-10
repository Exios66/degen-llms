import { BlackjackGame, Action } from "../../../js/blackjack/game.js";
import { fmtChips } from "../../../js/core.js";
import { pickQuip } from "../../../js/dealers.js";
import { RouletteOverlay } from "./overlays/RouletteOverlay.js";
import { HoldemOverlay } from "./overlays/HoldemOverlay.js";
import { SlotsOverlay } from "./overlays/SlotsOverlay.js";
import { SportsbookOverlay } from "./overlays/SportsbookOverlay.js";
import { HorseRacingOverlay } from "./overlays/HorseRacingOverlay.js";
import { EquestrianOverlay } from "./overlays/EquestrianOverlay.js";
import { PoolOverlay } from "./overlays/PoolOverlay.js";
import { HotelOverlay } from "./overlays/HotelOverlay.js";
import { AmenitiesOverlay, CashierOverlay, RhythmOverlay } from "./overlays/AmenitiesOverlay.js";

/**
 * DOM overlay that wraps the shared BlackjackGame engine for RPG encounters.
 */
export class BlackjackOverlay {
  /**
   * @param {HTMLElement} root
   * @param {import("../../../js/core.js").PlayerSession} session
   * @param {{ onClose: (result: { net: number }) => void, onNatural21?: () => void }} hooks
   */
  constructor(root, session, hooks) {
    this.root = root;
    this.session = session;
    this.hooks = hooks;
    this.game = null;
    this.sessionNet = 0;
    this._active = false;
    this.dealerProfile = null;
    this.dealerName = "Dealer";
    this._settlementQuipShown = false;
  }

  isActive() {
    return this._active;
  }

  open(options = {}) {
    if (this._active) return Promise.resolve({ net: 0 });
    this._active = true;
    this.sessionNet = 0;
    this.dealerProfile = options.dealerProfile ?? null;
    this.dealerName = options.dealerName ?? this.dealerProfile?.name ?? "Dealer";
    this._settlementQuipShown = false;
    this.session.recordVisit("blackjack");
    this.root.hidden = false;

    const chipsBefore = this.session.wallet.balance;
    const minBet = options.minBet ?? 10;

    this.game = new BlackjackGame(
      {
        startingBankroll: chipsBefore,
        minBet,
        maxBet: Math.min(100, chipsBefore),
        numDecks: 6,
        dealerHitsSoft17: true,
        numBots: 0,
        humanSeat: 1,
      },
      (newBalance) => {
        this.session.wallet.syncBalance(newBalance, "blackjack", "Table balance sync");
      }
    );
    this.game.beginRound();
    this._injectDealerQuip("deal");

    return new Promise((resolve) => {
      this._resolve = resolve;
      this._render();
    });
  }

  close() {
    if (this.game) {
      if (this.game.phase === "complete" && !this.game.roundOverEarly) {
        this.sessionNet += this.game.humanNet;
      }
      this.session.recordResult("blackjack", this.sessionNet);
      this.game = null;
    }
    this.root.hidden = true;
    this.root.innerHTML = "";
    this._active = false;
    this.dealerProfile = null;
    this.dealerName = "Dealer";
    const net = this.sessionNet;
    this.sessionNet = 0;
    const resolve = this._resolve;
    this._resolve = null;
    if (resolve) resolve({ net });
    this.hooks.onClose?.({ net });
  }

  _injectDealerQuip(kind) {
    if (!this.dealerProfile || !this.game) return;
    const text = pickQuip(this.dealerProfile, kind);
    if (text) {
      this.game.messages.push({ type: "dim", text: `${this.dealerName}: "${text}"` });
    }
  }

  _render() {
    const game = this.game;
    if (!game) return;

    this.root.innerHTML = "";
    const panel = document.createElement("div");
    panel.className = "blackjack-panel";

    const title = document.createElement("h2");
    title.textContent = `BLACKJACK — Table 7 · ${this.dealerName}`;
    panel.appendChild(title);

    if (this.dealerProfile?.tagline) {
      const tag = document.createElement("p");
      tag.className = "bj-dealer-tagline";
      tag.textContent = this.dealerProfile.tagline;
      panel.appendChild(tag);
    }

    const chipLine = document.createElement("p");
    chipLine.className = "bj-chip-line";
    chipLine.textContent = `Chips: ${fmtChips(this.session.wallet.balance)}`;
    panel.appendChild(chipLine);

    const status = document.createElement("p");
    status.className = "bj-status";
    status.textContent = game.statusLine();
    panel.appendChild(status);

    panel.appendChild(this._renderTable(game));

    const log = document.createElement("div");
    log.className = "bj-log";
    for (const m of game.messages) {
      const line = document.createElement("div");
      line.className = m.type || "";
      line.textContent = m.text;
      log.appendChild(line);
    }
    panel.appendChild(log);

    const actions = document.createElement("div");
    actions.className = "bj-actions";
    this._renderActions(game, actions, log);
    panel.appendChild(actions);

    this.root.appendChild(panel);
  }

  _renderTable(game) {
    const reveal = game.phase === "settlement" || game.phase === "complete" || game.dealer.holeRevealed;
    const highlight = game.pendingAction?.player?.seat ?? game.human()?.seat;
    const snapshot = game.getTableSnapshot(reveal, highlight);

    const table = document.createElement("div");
    table.className = "bj-table";

    if (snapshot.dealer) {
      const dealerRow = document.createElement("div");
      dealerRow.className = "bj-dealer";
      const cards = snapshot.dealer.cards.map((c) => (c ? c.label(this.session.useUnicode) : "??")).join(" ");
      dealerRow.textContent = `${this.dealerName}: ${cards} (${snapshot.dealer.value})`;
      table.appendChild(dealerRow);
    }

    for (const row of snapshot.rows) {
      const div = document.createElement("div");
      div.className = "bj-row" + (row.highlight ? " highlight" : "");
      const cards = row.cards.map((c) => c.label(this.session.useUnicode)).join(" ");
      let suffix = "";
      if (row.blackjack) {
        suffix = " [BJ]";
        this.hooks.onNatural21?.();
      } else if (row.bust) suffix = " [BUST]";
      else if (row.surrendered) suffix = " [SURR]";
      div.textContent = `${row.label}: ${cards} (${row.value}) — bet $${row.bet}${suffix}`;
      table.appendChild(div);
    }

    return table;
  }

  _renderActions(game, actions, log) {
    if (game.phase === "betting" && game.pendingBet) {
      const form = document.createElement("div");
      form.className = "bj-form";
      const label = document.createElement("label");
      label.textContent = `Place bet ($${game.config.minBet}-$${Math.min(game.config.maxBet, game.human().bankroll)}, 0 to leave)`;
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.max = String(Math.min(game.config.maxBet, game.human().bankroll));
      input.value = String(game.config.minBet);
      form.appendChild(label);
      form.appendChild(input);

      const dealBtn = document.createElement("button");
      dealBtn.className = "primary";
      dealBtn.textContent = "Deal";
      dealBtn.onclick = () => {
        const amount = parseInt(input.value, 10);
        if (amount === 0) {
          this.close();
          return;
        }
        if (!game.placeHumanBet(amount)) {
          alert(`Enter a bet between ${game.config.minBet} and ${Math.min(game.config.maxBet, game.human().bankroll)}.`);
          return;
        }
        if (game.roundOverEarly) {
          this.close();
          return;
        }
        this._render();
      };
      actions.appendChild(form);
      actions.appendChild(dealBtn);
      return;
    }

    if (game.pendingInsurance) {
      const take = document.createElement("button");
      take.className = "primary";
      take.textContent = "Take insurance";
      take.onclick = () => { game.takeInsurance(true); this._render(); };
      const decline = document.createElement("button");
      decline.textContent = "Decline";
      decline.onclick = () => { game.takeInsurance(false); this._render(); };
      actions.append(take, decline);
      return;
    }

    if (game.pendingAction) {
      const legal = game.getCurrentLegalActions();
      const shortcuts = [
        [Action.HIT, "Hit"], [Action.STAND, "Stand"], [Action.DOUBLE, "Double"],
        [Action.SPLIT, "Split"], [Action.SURRENDER, "Surrender"],
      ];
      for (const [act, label] of shortcuts) {
        if (legal.has(act)) {
          const btn = document.createElement("button");
          btn.className = "primary";
          btn.textContent = label;
          btn.onclick = () => { game.playerAction(act); this._render(); };
          actions.appendChild(btn);
        }
      }
      return;
    }

    if (game.phase === "complete" && !game.roundOverEarly) {
      const net = game.humanNet;
      if (this.dealerProfile && !this._settlementQuipShown) {
        const quipKind = net > 0 ? "win" : net < 0 ? "lose" : "push";
        const quipLine = document.createElement("div");
        quipLine.className = "dim";
        quipLine.textContent = `${this.dealerName}: "${pickQuip(this.dealerProfile, quipKind)}"`;
        log.appendChild(quipLine);
        this._settlementQuipShown = true;
      }

      for (const line of game.resultLines) {
        const div = document.createElement("div");
        div.className = line.includes("+") ? "success" : line.includes("-") ? "error" : "";
        div.textContent = line;
        log.appendChild(div);
      }

      if (game.canPlayAnother()) {
        const again = document.createElement("button");
        again.className = "primary";
        again.textContent = "Play another hand";
        again.onclick = () => {
          this.sessionNet += game.humanNet;
          game.beginRound();
          this._settlementQuipShown = false;
          this._injectDealerQuip("deal");
          this._render();
        };
        actions.appendChild(again);
      }
      const leave = document.createElement("button");
      leave.textContent = "Leave table";
      leave.onclick = () => this.close();
      actions.appendChild(leave);
      return;
    }

    if (game.roundOverEarly && game.phase === "complete") {
      const leave = document.createElement("button");
      leave.textContent = "Leave table";
      leave.onclick = () => this.close();
      actions.appendChild(leave);
    }
  }
}

/**
 * Route encounter ids to activity overlays.
 */
export class EncounterBridge {
  /**
   * @param {{
   *   session: import("../../../js/core.js").PlayerSession,
   *   overlays: Record<string, { isActive: () => boolean, open: Function }>,
   *   onPersist: () => void,
   *   questManager?: import("./QuestManager.js").QuestManager,
   * }} deps
   */
  constructor(deps) {
    this.session = deps.session;
    this.overlays = deps.overlays;
    this.onPersist = deps.onPersist;
    this.questManager = deps.questManager ?? null;
    this.blackjack = deps.overlays.blackjack;
  }

  isAnyActive() {
    return Object.values(this.overlays).some((o) => o?.isActive?.());
  }

  async start(encounterId, context = {}) {
    const map = {
      blackjack: "blackjack",
      holdem: "holdem",
      roulette: "roulette",
      slots_fortune: "slots",
      slots_high_roller: "slots",
      slots: "slots",
      sportsbook: "sportsbook",
      horse_racing: "horse_racing",
      dressage: "dressage",
      jumper: "jumper",
      hotel: "hotel",
      pool: "pool",
      pool_wave: "pool",
      pool_reef: "pool",
      pool_rave: "pool",
      amenities: "amenities",
      bar: "amenities",
      cashier: "cashier",
      house_of_blues: "rhythm",
      rhythm: "rhythm",
    };

    const key = map[encounterId] ?? encounterId;
    const overlay = this.overlays[key];
    if (!overlay) {
      console.warn(`Unknown encounter: ${encounterId}`);
      return { net: 0 };
    }

    const openOpts = { ...context };
    if (encounterId === "slots_fortune" || encounterId === "slots") openOpts.machineId = "fortune";
    if (encounterId === "slots_high_roller") openOpts.machineId = "high_roller";
    if (encounterId === "pool_wave" || encounterId === "pool") openOpts.zone = context.zone ?? "wave_pool";
    if (encounterId === "pool_reef") openOpts.zone = "shark_reef";
    if (encounterId === "pool_rave") openOpts.zone = "beach_rave";
    if (encounterId === "bar") openOpts.mode = "bar";
    if (encounterId === "dressage") openOpts.mode = "dressage";
    if (encounterId === "jumper") openOpts.mode = "jumper";

    const result = await overlay.open(openOpts);

    if (encounterId === "blackjack" || key === "blackjack") {
      this.questManager?.advance("dana_lucky_hand");
      this.session.ensureRpgState().flags.played_blackjack = true;
    }

    this.onPersist();
    return result;
  }
}

export {
  RouletteOverlay,
  HoldemOverlay,
  SlotsOverlay,
  SportsbookOverlay,
  HorseRacingOverlay,
  EquestrianOverlay,
  PoolOverlay,
  HotelOverlay,
  AmenitiesOverlay,
  CashierOverlay,
  RhythmOverlay,
};
