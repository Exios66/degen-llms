import { SportsbookState } from "../../../js/sportsbook.js";
import { onActivityVisit, onSessionSwing, syncContactIntros } from "../../../js/phone-contacts.js";
import { createRuntime, createShell, createViewStack } from "../../../js/ui/shell.js";
import { buildStakesRenderers } from "../../../js/ui/stakes-ui.js";
import { buildSlotsRenderers } from "../../../js/ui/slots-renderers.js";
import { buildSportsbookRenderers } from "../../../js/ui/sportsbook-renderers.js";
import { buildCrapsRenderers } from "../../../js/ui/craps-renderers.js";
import { buildLotteryRenderers } from "../../../js/ui/lottery-renderers.js";
import { buildRacingRenderers } from "../../../js/ui/racing-renderers.js";
import { buildCashierRenderers } from "../../../js/ui/cashier-renderers.js";
import { buildMetaRenderers } from "../../../js/ui/meta-renderers.js";
import { buildVenueRenderers } from "../../../js/ui/venue-renderers.js";
import { buildGentlemansClubRenderers } from "../../../js/ui/gentlemans-club-renderers.js";
import { buildHotelRenderers } from "../../../js/hotel-ui.js";
import { buildPoolRenderers } from "../../../js/pool-complex-ui.js";
import { buildAmenitiesRenderers } from "../../../js/casino-amenities-ui.js";
import { ensureHotel } from "../../../js/hotel.js";
import { recordDex } from "./Dex.js";

/** View the host stack falls back to when the player backs out of the entry screen. */
const EXIT_VIEW = "__host_exit__";
/** Sentinel the stake-tier picker pushes once a tier is chosen. */
const STAKE_DONE_VIEW = "__stake_chosen__";

/**
 * Mounts the web terminal's shared renderers inside an RPG encounter panel.
 *
 * The RPG and the terminal build screens from the same `buildXRenderers(ctx)`
 * factories; this class supplies the RPG flavor of `ctx` (its own view stack,
 * its own persist/render callbacks) so every terminal feature is playable in
 * the overworld without a second implementation.
 */
export class TerminalHostOverlay {
  /**
   * @param {HTMLElement} root
   * @param {import("../../../js/core.js").PlayerSession} session
   * @param {{ onClose?: (r: { net: number }) => void, onPersist?: () => void,
   *           onView?: (view: string) => void, rewardsPhone?: object,
   *           diningOverlay?: import("../../../js/DiningOverlay.js").DiningOverlay,
   *           poolOverlay?: import("../../../js/PoolComplexOverlay.js").PoolComplexOverlay,
   *           balconySmokeOverlay?: import("../../../js/BalconySmokeOverlay.js").BalconySmokeOverlay }} hooks
   */
  constructor(root, session, hooks = {}) {
    this.root = root;
    this.session = session;
    this.hooks = hooks;
    this._active = false;
    this._resolve = null;
    this._chipsAtOpen = 0;
    this.activityId = null;

    this.runtime = createRuntime({
      sportsbook: SportsbookState.fromJSON(session.sportsbookData),
    });

    const ctx = {
      get session() { return session; },
      get rewardsPhone() { return hooks.rewardsPhone ?? null; },
      get diningOverlay() { return hooks.diningOverlay ?? null; },
      get poolOverlay() { return hooks.poolOverlay ?? null; },
      get balconySmokeOverlay() { return hooks.balconySmokeOverlay ?? null; },
      ensurePoolOverlay: () => hooks.poolOverlay ?? null,
      openPoolComplexVisual: (zoneId = "hub") => {
        const overlay = hooks.poolOverlay;
        if (!overlay) return false;
        overlay.setSession(session);
        overlay.open(zoneId || "hub");
        return true;
      },
      runtime: this.runtime,
      persist: () => this.persist(),
      render: () => this.render(),
      recordActivityVisit: (activity) => {
        session.recordVisit(activity);
        onActivityVisit(session, activity);
      },
      recordActivityResult: (activity, net, bets = 1) => {
        session.recordResult(activity, net, bets);
        onSessionSwing(session, activity, net);
      },
      settingsBar: () => null,
      // Terminal screens that "return to the casino floor" reset to the hub view;
      // in the overworld the floor is the map behind the panel, so close instead.
      onExitToFloor: () => this.close(),
    };
    this.ctx = ctx;

    Object.assign(ctx, createShell(ctx));
    this.views = createViewStack({
      persist: () => this.persist(),
      render: () => this.render(),
      initial: [{ name: EXIT_VIEW, data: {} }],
    });
    Object.assign(ctx, {
      pushView: this.views.pushView,
      popView: this.views.popView,
      goBack: this.views.goBack,
      navigateTo: this.views.navigateTo,
      popToView: this.views.popToView,
      viewStack: this.views.stack,
    });

    const { clearSlotsSpinTimers, slotMachineCard, ...slotsRenderers } = buildSlotsRenderers(ctx);
    const { renderHorsePaddock, ...racingRenderers } = buildRacingRenderers(ctx);
    this.clearSlotsSpinTimers = clearSlotsSpinTimers;

    this.renderers = {
      ...buildStakesRenderers(ctx),
      ...slotsRenderers,
      ...buildSportsbookRenderers(ctx),
      ...buildCrapsRenderers(ctx),
      ...buildLotteryRenderers(ctx),
      ...racingRenderers,
      ...buildCashierRenderers(ctx),
      ...buildMetaRenderers(ctx),
      ...buildVenueRenderers(ctx),
      ...buildGentlemansClubRenderers(ctx),
      ...buildHotelRenderers(ctx),
      ...buildPoolRenderers(ctx),
      ...buildAmenitiesRenderers(ctx),
      [STAKE_DONE_VIEW]: () => {
        this._stakeChosen = true;
        queueMicrotask(() => this.close());
        return null;
      },
    };
  }

  /**
   * Run the shared stake-tier picker on its own, so bespoke pixel tables
   * (blackjack, hold'em, roulette) start from the same tier rules.
   * @returns {Promise<import("../../../js/stakes.js").StakeTier | null>}
   */
  async pickStakeTier(activityId) {
    this._stakeChosen = false;
    await this.open({
      view: "stake-tier",
      data: { activityId, nextView: STAKE_DONE_VIEW },
      title: "CHOOSE YOUR STAKES",
    });
    return this._stakeChosen ? this.runtime.stakeTier : null;
  }

  isActive() {
    return this._active;
  }

  hasView(name) {
    return Boolean(this.renderers[name]);
  }

  persist() {
    if (this.session.slotId != null) {
      this.session.sportsbookData = this.runtime.sportsbook.toJSON();
    }
    syncContactIntros(this.session);
    this.hooks.onPersist?.();
  }

  /**
   * @param {{ view?: string, data?: object, activityId?: string, tab?: string, title?: string }} options
   * @returns {Promise<{ net: number }>}
   */
  open(options = {}) {
    if (this._active) return Promise.resolve({ net: 0 });
    const view = options.view;
    if (!view || !this.renderers[view]) {
      console.warn(`TerminalHostOverlay: unknown view "${view}"`);
      return Promise.resolve({ net: 0 });
    }
    this._active = true;
    this.title = options.title ?? null;
    this.activityId = options.activityId ?? null;
    this._chipsAtOpen = this.session.wallet.balance;
    if (this.activityId) {
      this.session.recordVisit(this.activityId);
      onActivityVisit(this.session, this.activityId);
    }
    ensureHotel(this.session);
    this.runtime.sportsbook = SportsbookState.fromJSON(this.session.sportsbookData);
    if (options.tab) this.runtime.sportsbook.activeTab = options.tab;
    this.views.reset([{ name: EXIT_VIEW, data: {} }, { name: view, data: options.data ?? {} }]);
    this.root.hidden = false;
    this.root.classList.add("encounter-overlay--active", "terminal-host");
    return new Promise((resolve) => {
      this._resolve = resolve;
      this.render();
    });
  }

  close() {
    if (!this._active) return;
    this.clearSlotsSpinTimers?.();
    const net = this.session.wallet.balance - this._chipsAtOpen;
    this.persist();
    this.root.hidden = true;
    this.root.innerHTML = "";
    this.root.classList.remove("encounter-overlay--active", "terminal-host");
    this._active = false;
    const resolve = this._resolve;
    this._resolve = null;
    if (resolve) resolve({ net });
    this.hooks.onClose?.({ net });
  }

  render() {
    if (!this._active) return;
    const current = this.views.current();
    if (!current || current.name === EXIT_VIEW) {
      this.close();
      return;
    }
    const fn = this.renderers[current.name];
    if (!fn) {
      console.warn(`TerminalHostOverlay: missing renderer "${current.name}"`);
      this.close();
      return;
    }
    // Sitting down at a machine or table is what fills the dex, and hosted
    // screens are the only place that happens.
    if (current.name === "slots-play" && this.runtime.slots?.machine) {
      recordDex(this.session, "slots", this.runtime.slots.machine.id);
    }
    this.hooks.onView?.(current.name);
    this.root.innerHTML = "";
    const panel = document.createElement("div");
    panel.className = "encounter-panel encounter-panel--terminal";

    const bar = document.createElement("div");
    bar.className = "terminal-host-bar";
    const label = document.createElement("span");
    label.textContent = this.title ?? current.name.replace(/-/g, " ").toUpperCase();
    const exit = document.createElement("button");
    exit.type = "button";
    exit.className = "terminal-host-exit";
    exit.textContent = "✕ EXIT";
    exit.onclick = () => this.close();
    bar.append(label, exit);
    panel.appendChild(bar);

    const mount = document.createElement("div");
    mount.className = "terminal-host-mount";
    let content = null;
    try {
      content = fn(current.data ?? {});
    } catch (err) {
      console.error(`TerminalHostOverlay: "${current.name}" failed`, err);
      content = document.createElement("p");
      content.className = "bj-status error";
      content.textContent = `This screen is closed right now (${err.message}).`;
    }
    if (content) mount.appendChild(content);
    panel.appendChild(mount);
    this.root.appendChild(panel);
    this.root.scrollTop = 0;
  }
}
