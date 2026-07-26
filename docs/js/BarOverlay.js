/**
 * Fullscreen bar overlay — first-person drink POV at every resort lounge.
 */
import {
  BAR_VENUES,
  canEnterBar,
  canEnterBarVenue,
  createBarRound,
  ensureBar,
  getBarVenueById,
  orderBarVenueDrink,
  resolveBarEncounter,
  settleBarRound,
} from "./bar.js";
import { getIntoxicationLevel } from "./intoxication-effects.js";
import { fmtChips } from "./core.js";
import { buildBarFpvStage, playBarSipAnimation, syncBarFpvSprites } from "./bar-sprites.js";

function el(tag, attrs = {}, kids = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "className") node.className = v;
    else if (k === "textContent") node.textContent = v;
    else if (k === "innerHTML") node.innerHTML = v;
    else if (k === "disabled") node.disabled = Boolean(v);
    else if (k.startsWith("on") && typeof v === "function") node[k.toLowerCase()] = v;
    else if (v != null) node.setAttribute(k, String(v));
  }
  for (const kid of kids) {
    if (kid == null || kid === false) continue;
    node.appendChild(typeof kid === "string" ? document.createTextNode(kid) : kid);
  }
  return node;
}

export class BarOverlay {
  constructor(root, hooks = {}) {
    this.root = root;
    this.hooks = hooks;
    this.session = null;
    this.active = false;
    this.round = null;
    this.phase = "select";
    this._ordering = false;
    this._lastDrinkId = null;
    this._fpv = null;
    this._barMounted = false;
    this._fromSelect = false;
    this._onKey = (e) => {
      if (e.key !== "Escape" || !this.active) return;
      e.preventDefault();
      e.stopPropagation();
      this.requestClose();
    };
  }

  setSession(session) {
    this.session = session;
  }

  open(venueId = null) {
    if (!this.session) return;
    const gate = canEnterBar(this.session);
    if (!gate.ok) {
      this.hooks.onStatus?.(gate.message, "error");
      return;
    }
    if (venueId) {
      const vGate = canEnterBarVenue(this.session, venueId);
      if (!vGate.ok) {
        this.hooks.onStatus?.(vGate.message, "error");
        return;
      }
    }
    ensureBar(this.session);
    this.active = true;
    this.round = null;
    this._ordering = false;
    this._lastDrinkId = null;
    this._fpv = null;
    this._barMounted = false;
    this.phase = venueId && getBarVenueById(venueId) ? "bar" : "select";
    this._fromSelect = this.phase === "select";
    this._chipsAtOpen = this.session.wallet.balance;
    if (this.phase === "bar") {
      this.round = createBarRound(venueId);
    }
    this.root.classList.add("bar-overlay--open");
    this.root.setAttribute("aria-hidden", "false");
    document.body.classList.add("bar-overlay-active");
    window.addEventListener("keydown", this._onKey);
    this.render();
    this.hooks.onPersist?.();
  }

  requestClose() {
    if (!this.active) return;
    // Esc from a pour returns to the lounge picker when the guest started there.
    if (this.phase === "bar" && this._fromSelect && this.round && !this.round.closed) {
      if (this.round.pendingEncounter) {
        resolveBarEncounter(this.session, this.round, this.round.pendingEncounter.choices[0].id);
      }
      const result = settleBarRound(this.session, this.round);
      this.hooks.onStatus?.(result.message, "success");
      this.round = null;
      this.phase = "select";
      this._ordering = false;
      this._lastDrinkId = null;
      this._fpv = null;
      this._barMounted = false;
      this.hooks.onPersist?.();
      this.render();
      return;
    }
    if (this.round && !this.round.closed) {
      if (this.round.pendingEncounter) {
        resolveBarEncounter(this.session, this.round, this.round.pendingEncounter.choices[0].id);
      }
      const result = settleBarRound(this.session, this.round);
      this.hooks.onStatus?.(result.message, "success");
    }
    this.close();
  }

  close() {
    if (!this.active) return;
    const delta = this.session
      ? this.session.wallet.balance - (this._chipsAtOpen ?? this.session.wallet.balance)
      : 0;
    this.active = false;
    this.round = null;
    this.phase = "select";
    this._ordering = false;
    this._lastDrinkId = null;
    this._fpv = null;
    this._barMounted = false;
    this.root.classList.remove("bar-overlay--open");
    this.root.setAttribute("aria-hidden", "true");
    this.root.replaceChildren();
    document.body.classList.remove("bar-overlay-active");
    window.removeEventListener("keydown", this._onKey);
    this.hooks.onPersist?.();
    if (delta !== 0) this.hooks.onChipDelta?.(delta);
    const once = this._onClosedOnce;
    this._onClosedOnce = null;
    once?.({ net: delta });
    this.hooks.onClosed?.({ net: delta });
  }

  onceClosed(cb) {
    this._onClosedOnce = cb;
  }

  render() {
    if (!this.active || !this.session) return;
    if (this.phase === "bar" && this.round && this._barMounted) {
      this._syncBar();
      this._syncEncounterModal();
      return;
    }
    this.root.replaceChildren();
    this._barMounted = false;
    this._fpv = null;
    const backdrop = el("div", { className: "bar-overlay__backdrop" });
    if (this.phase === "select") backdrop.appendChild(this._renderSelect());
    else if (this.phase === "settled") backdrop.appendChild(this._renderSettled());
    else {
      backdrop.appendChild(this._renderBar());
      this._barMounted = true;
    }
    this.root.appendChild(backdrop);
    if (this.round?.pendingEncounter) {
      this.root.appendChild(this._renderEncounterModal());
    }
  }

  _renderSelect() {
    const bar = ensureBar(this.session);
    return el("div", { className: "bar-overlay__shell bar-overlay__shell--lobby" }, [
      el("header", { className: "bar-overlay__header" }, [
        el("p", { className: "bar-overlay__eyebrow", textContent: "Resort Bars" }),
        el("h2", { className: "bar-overlay__title", textContent: "First person at the rail" }),
        el("p", {
          className: "bar-overlay__tagline",
          textContent: "Eight lounges. One chip wallet. Drinks raise encounter odds — Betty is watching.",
        }),
      ]),
      el("div", { className: "bar-overlay__stats dim" }, [
        el("span", { textContent: `Visits ${bar.visits}` }),
        el("span", { textContent: `Drinks ${bar.lifetimeDrinks}` }),
        el("span", { textContent: `Chips ${fmtChips(this.session.wallet.balance)}` }),
      ]),
      el("div", { className: "bar-venue-grid" },
        BAR_VENUES.map((v) => {
          const gate = canEnterBarVenue(this.session, v.id);
          return el("button", {
            className: `bar-venue-card bar-venue-card--${v.motif}${gate.ok ? "" : " bar-venue-card--locked"}`,
            disabled: !gate.ok,
            title: gate.ok ? v.location : gate.reason,
            onclick: () => {
              if (!canEnterBarVenue(this.session, v.id).ok) return;
              this.round = createBarRound(v.id);
              this.phase = "bar";
              this._chipsAtOpen = this.session.wallet.balance;
              this._lastDrinkId = null;
              this._barMounted = false;
              this.render();
            },
          }, [
            el("span", { className: "bar-venue-card__icon", textContent: v.icon }),
            el("strong", { textContent: v.name }),
            el("span", { className: "dim", textContent: v.location }),
            el("span", {
              className: "bar-venue-card__hi dim",
              textContent: gate.ok
                ? `${bar.venueVisits[v.id] ?? 0} visit(s) · ${v.drinks.length} pours`
                : "Velvet rope",
            }),
          ]);
        })),
      el("footer", { className: "bar-overlay__footer" }, [
        el("button", {
          className: "bar-overlay__exit",
          textContent: "EXIT  ESC",
          title: "Leave the bar menu",
          onclick: () => this.close(),
        }),
        el("span", { className: "dim", textContent: "Esc closes the lounge menu." }),
      ]),
    ]);
  }

  _renderBar() {
    const venue = getBarVenueById(this.round.venueId);
    const stage = buildBarFpvStage(venue.motif, { venueName: venue.name });
    this._fpv = stage;
    syncBarFpvSprites(stage, { drinkId: null, caption: `${venue.name} · bell up` });

    const shell = el("div", {
      className: `bar-overlay__shell bar-overlay__shell--fpv bar-motif--${venue.motif} bar-venue--${venue.id}`,
    });
    const layout = el("div", { className: `bar-fpv-layout bar-fpv-layout--${venue.motif}` });
    const stageWrap = el("div", { className: "bar-fpv-layout__stage" });
    stageWrap.appendChild(stage);

    const panel = el("aside", { className: `bar-fpv-layout__panel bar-fpv-layout__panel--${venue.motif}` }, [
      el("header", { className: "bar-overlay__header" }, [
        el("p", { className: "bar-overlay__eyebrow", textContent: `${venue.icon} ${venue.name}` }),
        el("h2", { className: "bar-overlay__title", textContent: venue.vibe }),
        el("p", { className: "bar-overlay__tagline dim", textContent: venue.location }),
      ]),
      el("div", { className: "bar-hud", "data-bar-hud": "1" }),
      el("p", { className: "bar-message", "data-bar-message": "1", textContent: this.round.lastMessage }),
      el("div", { className: "bar-menu-list", "data-bar-menu": "1" }),
      el("footer", { className: "bar-overlay__footer" }, [
        el("button", {
          className: "bar-overlay__exit",
          "data-bar-exit": "1",
          textContent: "LAST CALL  ESC",
          onclick: () => this._settleAndExit(),
        }),
        el("span", { className: "dim", "data-bar-footer-hint": "1", textContent: "Encounters rise with every pour." }),
      ]),
    ]);

    layout.appendChild(stageWrap);
    layout.appendChild(panel);
    shell.appendChild(layout);

    const menuHost = panel.querySelector("[data-bar-menu]");
    if (menuHost) {
      menuHost.append(...venue.drinks.map((drink) =>
        el("button", {
          className: "bar-menu-item",
          "data-drink-id": drink.id,
          disabled: this.round.closed || !!this.round.pendingEncounter || this._ordering,
          onclick: () => this._order(drink.id),
        }, [
          el("div", { className: "bar-menu-item__row" }, [
            el("strong", { textContent: drink.name }),
            el("span", { className: "bar-menu-item__price", textContent: `$${drink.price}` }),
          ]),
          el("p", { className: "dim", textContent: drink.description }),
        ]),
      ));
    }
    this._writeHud(panel.querySelector("[data-bar-hud]"));
    return shell;
  }

  _writeHud(host) {
    if (!host || !this.round) return;
    host.replaceChildren(
      el("div", { className: "bar-hud__row" }, [
        el("span", { "data-stat": "tab", textContent: `Tab $${this.round.tab.toLocaleString()}` }),
        el("span", { "data-stat": "score", textContent: `Score ${this.round.score}` }),
        el("span", { "data-stat": "drinks", textContent: `Drinks ${this.round.drinksThisRound}` }),
        el("span", { "data-stat": "intox", textContent: `Intox ${getIntoxicationLevel(this.session)}` }),
        el("span", { className: "bar-hud__chips", "data-chip-balance": "1", textContent: fmtChips(this.session.wallet.balance) }),
      ]),
    );
  }

  _syncBar() {
    const hud = this.root.querySelector("[data-bar-hud]");
    const msg = this.root.querySelector("[data-bar-message]");
    const exitBtn = this.root.querySelector("[data-bar-exit]");
    if (hud && this.round) {
      const set = (key, text) => {
        const n = hud.querySelector(`[data-stat="${key}"]`);
        if (n) n.textContent = text;
      };
      set("tab", `Tab $${this.round.tab.toLocaleString()}`);
      set("score", `Score ${this.round.score}`);
      set("drinks", `Drinks ${this.round.drinksThisRound}`);
      set("intox", `Intox ${getIntoxicationLevel(this.session)}`);
      const chip = hud.querySelector("[data-chip-balance]");
      if (chip) chip.textContent = fmtChips(this.session.wallet.balance);
    }
    if (msg) msg.textContent = this.round?.lastMessage ?? "";
    const locked = this.round?.closed || !!this.round?.pendingEncounter || this._ordering;
    this.root.querySelectorAll(".bar-menu-item").forEach((btn) => { btn.disabled = locked; });
    if (exitBtn) exitBtn.textContent = this.round?.closed ? "SETTLE & EXIT" : "LAST CALL  ESC";
  }

  _syncEncounterModal() {
    const existing = this.root.querySelector(".bar-encounter");
    if (this.round?.pendingEncounter) {
      if (!existing) this.root.appendChild(this._renderEncounterModal());
    } else if (existing) {
      existing.remove();
    }
  }

  _renderEncounterModal() {
    const enc = this.round.pendingEncounter;
    return el("div", { className: "bar-encounter", role: "dialog", "aria-modal": "true" }, [
      el("div", { className: "bar-encounter__card" }, [
        el("p", { className: "bar-encounter__cat", textContent: enc.category }),
        el("h3", { textContent: enc.title }),
        el("p", { textContent: enc.body }),
        el("div", { className: "bar-encounter__choices" },
          enc.choices.map((c) =>
            el("button", {
              className: "bar-encounter__choice",
              textContent: c.label,
              onclick: () => {
                const res = resolveBarEncounter(this.session, this.round, c.id);
                this.hooks.onStatus?.(res.message, "success");
                this.hooks.onPersist?.();
                this._pulseChips();
                this._syncBar();
                this._syncEncounterModal();
              },
            }),
          )),
      ]),
    ]);
  }

  _renderSettled() {
    const venue = getBarVenueById(this.round.venueId);
    return el("div", { className: "bar-overlay__shell bar-overlay__shell--settled" }, [
      el("header", { className: "bar-overlay__header" }, [
        el("h2", { className: "bar-overlay__title", textContent: "Last call" }),
        el("p", {
          className: "bar-overlay__tagline",
          textContent: `${venue.name} · Score ${this.round.score} · Tab $${this.round.tab.toLocaleString()}`,
        }),
      ]),
      el("footer", { className: "bar-overlay__footer" }, [
        el("button", {
          className: "bar-overlay__exit bar-overlay__exit--primary",
          textContent: "Back to the floor",
          onclick: () => this.close(),
        }),
        el("button", {
          className: "btn",
          textContent: "Another bar",
          onclick: () => {
            this.round = null;
            this.phase = "select";
            this._barMounted = false;
            this._fpv = null;
            this.render();
          },
        }),
      ]),
    ]);
  }

  async _order(drinkId) {
    if (this._ordering || !this.round || this.round.pendingEncounter) return;
    const venue = getBarVenueById(this.round.venueId);
    const drink = venue?.drinks.find((d) => d.id === drinkId);
    if (!drink) return;

    const before = this.session.wallet.balance;
    const result = orderBarVenueDrink(this.session, this.round.venueId, drinkId, this.round);
    if (!result.ok) {
      this.hooks.onStatus?.(result.message, "error");
      return;
    }

    this._ordering = true;
    this._syncBar();
    const stage = this._fpv || this.root.querySelector(".bar-fpv");
    if (stage) {
      await playBarSipAnimation(stage, drink);
      this._lastDrinkId = drink.id;
      syncBarFpvSprites(stage, { drinkId: drink.id, drink, caption: drink.name });
    }
    this._ordering = false;
    this._pulseChips(before);
    this.hooks.onPersist?.();
    this._syncBar();
    this._syncEncounterModal();
  }

  _settleAndExit() {
    if (this.round?.pendingEncounter) {
      resolveBarEncounter(this.session, this.round, this.round.pendingEncounter.choices[0].id);
    }
    if (this.round && !this.round.closed) {
      const result = settleBarRound(this.session, this.round);
      this.hooks.onStatus?.(result.message, "success");
    }
    this.phase = "settled";
    this._barMounted = false;
    this._fpv = null;
    this.hooks.onPersist?.();
    this._pulseChips();
    this.render();
  }

  _pulseChips(previousBalance) {
    const node = this.root.querySelector("[data-chip-balance]");
    if (!node) return;
    const next = this.session.wallet.balance;
    node.textContent = fmtChips(next);
    node.classList.remove("chip-pulse--up", "chip-pulse--down");
    void node.offsetWidth;
    if (previousBalance != null) {
      node.classList.add(next > previousBalance ? "chip-pulse--up" : next < previousBalance ? "chip-pulse--down" : "chip-pulse--up");
    } else {
      node.classList.add("chip-pulse--up");
    }
  }
}
