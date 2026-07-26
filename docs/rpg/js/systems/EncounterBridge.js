import { BlackjackGame, Action } from "../../../js/blackjack/game.js";
import { fmtChips } from "../../../js/core.js";
import { pickQuip } from "../../../js/dealers.js";
import { effectiveTableStakes } from "../../../js/stakes.js";
import {
  HIGH_LIMIT_SALON_CHIP_MIN,
  canEnterFoundationRoom,
  canEnterHighLimitSalon,
} from "../../../js/venues.js?v=aadf7ac";
import { canEnterGentlemansClub } from "../../../js/gentlemans-club.js?v=aadf7ac";
import { createCardSpriteRow } from "../../../js/ui/card-sprites.js";
import { RouletteOverlay } from "./overlays/RouletteOverlay.js";
import { HoldemOverlay } from "./overlays/HoldemOverlay.js";
import { RhythmOverlay } from "./overlays/RhythmOverlay.js";
import { VegasStripDriveOverlay } from "./overlays/VegasStripDriveOverlay.js";
import { HOSTED_ENCOUNTERS, TABLE_STAKE_ACTIVITIES, prepareHostedState } from "./HostedEncounters.js";

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
    const maxBet = Math.max(minBet, Math.min(options.maxBet ?? 100, chipsBefore));
    this.tier = options.tier ?? null;

    this.game = new BlackjackGame(
      {
        startingBankroll: chipsBefore,
        minBet,
        maxBet,
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

    if (this.tier) {
      const tierLine = document.createElement("p");
      tierLine.className = "bj-dealer-tagline";
      tierLine.textContent = `${this.tier.name} stakes`;
      panel.appendChild(tierLine);
    }

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
      dealerRow.className = "bj-dealer bj-dealer--sprites";
      const label = document.createElement("div");
      label.className = "bj-hand-heading";
      label.textContent = `${this.dealerName} (${snapshot.dealer.value})`;
      dealerRow.appendChild(label);
      dealerRow.appendChild(
        createCardSpriteRow(snapshot.dealer.cards, { rowId: "rpg-bj-dealer" })
      );
      table.appendChild(dealerRow);
    }

    for (const row of snapshot.rows) {
      const div = document.createElement("div");
      div.className = "bj-row bj-row--sprites" + (row.highlight ? " highlight" : "");
      let suffix = "";
      if (row.blackjack) {
        suffix = " [BJ]";
        this.hooks.onNatural21?.();
      } else if (row.bust) suffix = " [BUST]";
      else if (row.surrendered) suffix = " [SURR]";
      const heading = document.createElement("div");
      heading.className = "bj-hand-heading";
      heading.textContent = `${row.label} (${row.value}) — bet $${row.bet}${suffix}`;
      div.appendChild(heading);
      div.appendChild(
        createCardSpriteRow(row.cards, { rowId: `rpg-bj-${row.seat}-${row.label}` })
      );
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

/** Bespoke pixel overlays keyed by encounter id. */
const BESPOKE_ALIASES = {
  blackjack: "blackjack",
  holdem: "holdem",
  roulette: "roulette",
  house_of_blues: "rhythm",
  rhythm: "rhythm",
  vegas_strip_drive: "vegas_strip_drive",
  strip_drive: "vegas_strip_drive",
};

/**
 * Route encounter ids either to a bespoke pixel overlay ("battle screens")
 * or to the shared terminal screens mounted by TerminalHostOverlay.
 */
export class EncounterBridge {
  /**
   * @param {{
   *   session: import("../../../js/core.js").PlayerSession,
   *   overlays: Record<string, { isActive: () => boolean, open: Function }>,
   *   terminalHost: import("./TerminalHostOverlay.js").TerminalHostOverlay,
   *   onPersist: () => void,
   *   questManager?: import("./QuestManager.js").QuestManager,
   *   onEncounterEnd?: (encounterId: string, result: { net: number }) => void,
   * }} deps
   */
  constructor(deps) {
    this.session = deps.session;
    this.overlays = deps.overlays;
    this.terminalHost = deps.terminalHost ?? null;
    this.diningOverlay = deps.diningOverlay ?? null;
    this.poolOverlay = deps.poolOverlay ?? null;
    this.onPersist = deps.onPersist;
    this.questManager = deps.questManager ?? null;
    this.onEncounterEnd = deps.onEncounterEnd ?? null;
    this.blackjack = deps.overlays.blackjack;
  }

  isAnyActive() {
    if (this.terminalHost?.isActive()) return true;
    if (this.diningOverlay?.active) return true;
    if (this.poolOverlay?.active) return true;
    return Object.values(this.overlays).some((o) => o?.isActive?.());
  }

  /** Every encounter id this bridge knows how to open. */
  knownEncounters() {
    return [...Object.keys(BESPOKE_ALIASES), ...Object.keys(HOSTED_ENCOUNTERS)];
  }

  canStart(encounterId) {
    return Boolean(BESPOKE_ALIASES[encounterId] || HOSTED_ENCOUNTERS[encounterId]);
  }

  /**
   * Velvet-rope check for overworld doors, using the same rules the terminal
   * venue screens enforce. The salon also needs a qualifying stake tier, so a
   * player who clears the chip bar is offered the shared tier picker at the
   * rope rather than being bounced.
   * @param {"high_limit_salon" | "foundation_room" | "gentlemans_club"} gateId
   * @returns {Promise<{ ok: boolean, reason?: string }>}
   */
  async checkVenue(gateId) {
    if (gateId === "foundation_room") {
      return canEnterFoundationRoom(this.session);
    }
    if (gateId === "gentlemans_club") {
      return canEnterGentlemansClub(this.session);
    }
    if (gateId !== "high_limit_salon") return { ok: true };

    const tier = () => this.terminalHost?.runtime?.stakeTier ?? null;
    let gate = canEnterHighLimitSalon(this.session, tier());
    if (gate.ok || this.session.wallet.balance < HIGH_LIMIT_SALON_CHIP_MIN) return gate;

    if (await this.terminalHost?.pickStakeTier("blackjack")) {
      gate = canEnterHighLimitSalon(this.session, tier());
    }
    return gate;
  }

  async start(encounterId, context = {}) {
    const result = HOSTED_ENCOUNTERS[encounterId]
      ? await this._startHosted(encounterId, context)
      : await this._startBespoke(encounterId, context);

    if (encounterId === "blackjack") {
      this.questManager?.advance("dana_lucky_hand");
      this.session.ensureRpgState().flags.played_blackjack = true;
    }

    this.questManager?.syncDerived?.();
    this.onEncounterEnd?.(encounterId, result);
    this.onPersist();
    return result;
  }

  async _startHosted(encounterId, context) {
    const spec = HOSTED_ENCOUNTERS[encounterId];
    if (spec.activityId === "dining" && this.diningOverlay) {
      return this._startDining(spec);
    }
    if (spec.activityId === "pool_complex" && this.poolOverlay) {
      return this._startPool(spec);
    }
    if (!this.terminalHost) {
      console.warn(`No terminal host available for "${encounterId}"`);
      return { net: 0 };
    }
    if (spec.stakeFor) {
      const tier = await this.terminalHost.pickStakeTier(spec.stakeFor);
      if (!tier) return { net: 0 };
    }
    prepareHostedState(this.terminalHost.runtime, spec);
    return this.terminalHost.open({
      view: spec.view,
      data: { ...(spec.data ?? {}), ...(context.data ?? {}) },
      activityId: spec.activityId ?? null,
      tab: spec.tab ?? null,
      title: spec.title,
    });
  }

  _startDining(spec) {
    const chipsAtOpen = this.session.wallet.balance;
    return new Promise((resolve) => {
      this.diningOverlay.setSession(this.session);
      this.diningOverlay.onceClosed(() => {
        const net = this.session.wallet.balance - chipsAtOpen;
        this.onPersist();
        resolve({ net });
      });
      this.diningOverlay.open(spec.venueId ?? null);
    });
  }

  _startPool(spec) {
    const chipsAtOpen = this.session.wallet.balance;
    return new Promise((resolve) => {
      this.poolOverlay.setSession(this.session);
      this.poolOverlay.onceClosed(() => {
        const net = this.session.wallet.balance - chipsAtOpen;
        this.onPersist();
        resolve({ net });
      });
      this.poolOverlay.open(spec.zoneId ?? "hub");
    });
  }

  async _startBespoke(encounterId, context) {
    const key = BESPOKE_ALIASES[encounterId] ?? encounterId;
    const overlay = this.overlays[key];
    if (!overlay) {
      console.warn(`Unknown encounter: ${encounterId}`);
      return { net: 0 };
    }

    const openOpts = { ...context };
    const stakeActivity = TABLE_STAKE_ACTIVITIES[encounterId];
    if (stakeActivity && this.terminalHost) {
      const tier = await this.terminalHost.pickStakeTier(stakeActivity);
      if (!tier) return { net: 0 };
      const stakes = effectiveTableStakes(tier, this.session.wallet.balance);
      openOpts.tier = tier;
      openOpts.minBet = stakes.minBet;
      openOpts.maxBet = stakes.maxBet;
    }

    return overlay.open(openOpts);
  }
}

export {
  RouletteOverlay,
  HoldemOverlay,
  RhythmOverlay,
  VegasStripDriveOverlay,
};
