/**
 * Fullscreen restaurant dining overlay for the web terminal (and RPG host).
 * Mount on #dining-overlay (sibling of #app / inside game-shell).
 */
import {
  DINING_VENUES,
  canEnterDining,
  createSitting,
  ensureDining,
  getVenueById,
  orderAndConsume,
  resolveEncounter,
  settleSitting,
  encounterChance,
  DINING_EGGS,
  FULLNESS_MAX,
  COMPOSURE_MAX,
} from "./dining.js";
import { getIntoxicationLevel } from "./intoxication-effects.js";
import { fmtChips } from "./core.js";

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

function meter(label, value, max, kind) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return el("div", { className: `dining-meter dining-meter--${kind}` }, [
    el("div", { className: "dining-meter__label", textContent: `${label} ${value}/${max}` }),
    el("div", { className: "dining-meter__track" }, [
      el("div", { className: "dining-meter__fill", style: `width:${pct}%` }),
    ]),
  ]);
}

export class DiningOverlay {
  /**
   * @param {HTMLElement} root
   * @param {{ onPersist?: () => void, onStatus?: (msg: string, kind?: string) => void,
   *           onClosed?: () => void, onChipDelta?: (delta: number) => void }} hooks
   */
  constructor(root, hooks = {}) {
    this.root = root;
    this.hooks = hooks;
    this.session = null;
    this.active = false;
    this.sitting = null;
    this.pace = "pace";
    this.phase = "select"; // select | table | encounter | settled
    this._onKey = (e) => {
      if (e.key === "Escape" && this.active) {
        e.preventDefault();
        this.requestClose();
      }
    };
  }

  setSession(session) {
    this.session = session;
  }

  open(venueId = null) {
    if (!this.session) return;
    const gate = canEnterDining(this.session);
    if (!gate.ok) {
      this.hooks.onStatus?.(gate.message, "error");
      return;
    }
    ensureDining(this.session);
    this.active = true;
    this.sitting = null;
    this.pace = "pace";
    this.phase = venueId && getVenueById(venueId) ? "table" : "select";
    if (this.phase === "table") {
      this.sitting = createSitting(venueId);
      this._chipsAtOpen = this.session.wallet.balance;
    } else {
      this._chipsAtOpen = this.session.wallet.balance;
    }
    this.root.classList.add("dining-overlay--open");
    this.root.setAttribute("aria-hidden", "false");
    document.body.classList.add("dining-overlay-active");
    window.addEventListener("keydown", this._onKey);
    this.render();
    this.hooks.onPersist?.();
  }

  requestClose() {
    if (!this.active) return;
    if (this.sitting && !this.sitting.closed) {
      if (this.sitting.pendingEncounter) {
        resolveEncounter(this.session, this.sitting, this.sitting.pendingEncounter.choices[0].id);
      }
      const result = settleSitting(this.session, this.sitting, 18);
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
    this.sitting = null;
    this.phase = "select";
    this.root.classList.remove("dining-overlay--open");
    this.root.setAttribute("aria-hidden", "true");
    this.root.replaceChildren();
    document.body.classList.remove("dining-overlay-active");
    window.removeEventListener("keydown", this._onKey);
    this.hooks.onPersist?.();
    if (delta !== 0) this.hooks.onChipDelta?.(delta);
    const once = this._onClosedOnce;
    this._onClosedOnce = null;
    once?.({ net: delta });
    this.hooks.onClosed?.({ net: delta });
  }

  /** @param {(result: { net: number }) => void} cb */
  onceClosed(cb) {
    this._onClosedOnce = cb;
  }

  render() {
    if (!this.active || !this.session) return;
    this.root.replaceChildren();
    const backdrop = el("div", { className: "dining-overlay__backdrop" });
    if (this.phase === "select") backdrop.appendChild(this._renderSelect());
    else if (this.phase === "settled") backdrop.appendChild(this._renderSettled());
    else backdrop.appendChild(this._renderTable());
    this.root.appendChild(backdrop);
    if (this.sitting?.pendingEncounter) {
      this.root.appendChild(this._renderEncounterModal());
    }
  }

  _renderSelect() {
    const dining = ensureDining(this.session);
    return el("div", { className: "dining-overlay__shell dining-overlay__shell--lobby" }, [
      el("header", { className: "dining-overlay__header" }, [
        el("p", { className: "dining-overlay__eyebrow", textContent: "Resort Dining" }),
        el("h2", { className: "dining-overlay__title", textContent: "How much can you handle?" }),
        el("p", {
          className: "dining-overlay__tagline",
          textContent: "Order courses. Pace yourself. Drinks raise the odds of unexpected company.",
        }),
      ]),
      el("div", { className: "dining-overlay__stats dim" }, [
        el("span", { textContent: `Visits ${dining.visits}` }),
        el("span", { textContent: `Courses ${dining.lifetimeCourses}` }),
        el("span", { textContent: `Eggs ${dining.unlockedEggs.length}/${Object.keys(DINING_EGGS).length}` }),
        el("span", { textContent: `Chips ${fmtChips(this.session.wallet.balance)}` }),
      ]),
      el("div", { className: "dining-venue-grid" },
        DINING_VENUES.map((v) =>
          el("button", {
            className: `dining-venue-card dining-venue-card--${v.motif}`,
            onclick: () => {
              this.sitting = createSitting(v.id);
              this.phase = "table";
              this._chipsAtOpen = this.session.wallet.balance;
              this.render();
            },
          }, [
            el("span", { className: "dining-venue-card__icon", textContent: v.icon }),
            el("strong", { textContent: v.name }),
            el("span", { className: "dim", textContent: `${v.type} · ${v.priceRange}` }),
            el("span", { className: "dining-venue-card__chef dim", textContent: v.chef }),
            el("span", {
              className: "dining-venue-card__hi",
              textContent: dining.venueHighScores[v.id] != null
                ? `Best score ${dining.venueHighScores[v.id]}`
                : "No score yet",
            }),
          ]),
        )),
      el("footer", { className: "dining-overlay__footer" }, [
        el("button", {
          className: "dining-overlay__exit",
          textContent: "EXIT  ESC",
          onclick: () => this.close(),
        }),
        el("span", { className: "dim", textContent: "Carmen can call ahead — you can still walk in hungry." }),
      ]),
    ]);
  }

  _renderTable() {
    const venue = getVenueById(this.sitting.venueId);
    const chance = Math.round(encounterChance(this.sitting, this.session) * 100);
    const intox = getIntoxicationLevel(this.session);
    const food = venue.menu.filter((m) => m.kind === "food");
    const drinks = venue.menu.filter((m) => m.kind === "drink");
    const extras = venue.menu.filter((m) => m.kind === "extra");

    const paceBar = el("div", { className: "dining-pace-bar" }, [
      ["pace", "Pace yourself"],
      ["clean_plate", "Clean the plate"],
      ["chase_shots", "Chase with shots"],
    ].map(([id, label]) =>
      el("button", {
        className: `dining-pace-btn${this.pace === id ? " is-active" : ""}`,
        textContent: label,
        onclick: () => { this.pace = id; this.render(); },
      }),
    ));

    const menuSection = (title, items) => el("section", { className: "dining-menu-section" }, [
      el("h3", { textContent: title }),
      el("div", { className: "dining-menu-list" },
        items.map((item) =>
          el("button", {
            className: "dining-menu-item",
            disabled: this.sitting.busted || this.sitting.closed || !!this.sitting.pendingEncounter,
            onclick: () => this._order(item.id),
          }, [
            el("div", { className: "dining-menu-item__row" }, [
              el("strong", { textContent: item.name }),
              el("span", { className: "dining-menu-item__price", textContent: `$${item.price}` }),
            ]),
            el("p", { className: "dim", textContent: item.description }),
            el("p", {
              className: "dining-menu-item__meta dim",
              textContent: `Fill +${item.satiation ?? 0} · Prestige ${item.prestige ?? 0}${item.kind === "drink" ? " · Drink" : ""}`,
            }),
          ]),
        )),
    ]);

    return el("div", {
      className: `dining-overlay__shell dining-overlay__shell--table dining-motif--${venue.motif}`,
    }, [
      el("header", { className: "dining-overlay__header" }, [
        el("p", { className: "dining-overlay__eyebrow", textContent: `${venue.icon} ${venue.name}` }),
        el("h2", { className: "dining-overlay__title", textContent: venue.chef }),
        el("p", { className: "dining-overlay__tagline", textContent: venue.description }),
      ]),
      el("div", { className: "dining-hud" }, [
        meter("Fullness", this.sitting.fullness, FULLNESS_MAX, "fullness"),
        meter("Composure", this.sitting.composure, COMPOSURE_MAX, "composure"),
        el("div", { className: "dining-hud__stats" }, [
          el("span", { textContent: `Tab $${this.sitting.tab.toLocaleString()}` }),
          el("span", { textContent: `Score ${this.sitting.score}` }),
          el("span", { textContent: `Courses ${this.sitting.coursesCleared}` }),
          el("span", { textContent: `Drinks ${this.sitting.drinksThisSitting}` }),
          el("span", { className: "dining-hud__risk", textContent: `Encounter risk ~${chance}%` }),
          el("span", { textContent: `Intox ${intox}` }),
          el("span", { className: "chip-pulse", "data-chip-balance": String(this.session.wallet.balance), textContent: fmtChips(this.session.wallet.balance) }),
        ]),
      ]),
      el("p", { className: "dining-message", textContent: this.sitting.lastMessage }),
      paceBar,
      el("div", { className: "dining-menu-columns" }, [
        menuSection("Plates", food),
        menuSection("Drinks", drinks),
        extras.length ? menuSection("Extras", extras) : null,
      ]),
      el("footer", { className: "dining-overlay__footer" }, [
        el("button", {
          className: "dining-overlay__exit",
          textContent: this.sitting.busted || this.sitting.closed ? "SETTLE & EXIT" : "CLOSE OUT  ESC",
          onclick: () => this._settleAndExit(),
        }),
        el("span", {
          className: "dim",
          textContent: this.sitting.busted
            ? "You're done — settle before the walk of shame."
            : "Unexpected encounters rise with every pour.",
        }),
      ]),
    ]);
  }

  _renderEncounterModal() {
    const enc = this.sitting.pendingEncounter;
    return el("div", { className: "dining-encounter", role: "dialog", "aria-modal": "true" }, [
      el("div", { className: "dining-encounter__silhouettes", "aria-hidden": "true" }, [
        el("span", { className: `dining-encounter__sil dining-encounter__sil--${enc.category}` }),
      ]),
      el("div", { className: "dining-encounter__card dining-encounter__card--enter" }, [
        el("p", { className: "dining-encounter__cat", textContent: enc.category.replace(/_/g, " ") }),
        el("h3", { textContent: enc.title }),
        el("p", { textContent: enc.body }),
        el("div", { className: "dining-encounter__choices" },
          enc.choices.map((c) =>
            el("button", {
              className: "dining-encounter__choice",
              textContent: c.label,
              onclick: () => {
                const res = resolveEncounter(this.session, this.sitting, c.id);
                this.hooks.onStatus?.(res.message, "success");
                this.hooks.onPersist?.();
                this._pulseChips();
                this.render();
              },
            }),
          )),
      ]),
    ]);
  }

  _renderSettled() {
    const venue = getVenueById(this.sitting.venueId);
    const dining = ensureDining(this.session);
    return el("div", { className: "dining-overlay__shell dining-overlay__shell--settled" }, [
      el("header", { className: "dining-overlay__header" }, [
        el("h2", { className: "dining-overlay__title", textContent: "Tab closed" }),
        el("p", {
          className: "dining-overlay__tagline",
          textContent: `${venue.name} · Score ${this.sitting.score} · Spent $${this.sitting.tab.toLocaleString()}`,
        }),
      ]),
      el("ul", { className: "dining-settled-list dim" }, [
        el("li", { textContent: `Courses cleared: ${this.sitting.coursesCleared}` }),
        el("li", { textContent: `Drinks this sitting: ${this.sitting.drinksThisSitting}` }),
        el("li", { textContent: `Encounters: ${this.sitting.encounterLog.length}` }),
        el("li", { textContent: `Lifetime high at ${venue.name}: ${dining.venueHighScores[venue.id] ?? this.sitting.score}` }),
        this.sitting.busted ? el("li", { className: "warning", textContent: "Food coma flag set — hallway may wobble." }) : null,
      ]),
      el("footer", { className: "dining-overlay__footer" }, [
        el("button", {
          className: "dining-overlay__exit dining-overlay__exit--primary",
          textContent: "Back to the floor",
          onclick: () => this.close(),
        }),
        el("button", {
          className: "btn",
          textContent: "Another restaurant",
          onclick: () => {
            this.sitting = null;
            this.phase = "select";
            this.render();
          },
        }),
      ]),
    ]);
  }

  _order(itemId) {
    const before = this.session.wallet.balance;
    const result = orderAndConsume(this.session, this.sitting, itemId, this.pace);
    if (!result.ok) {
      this.hooks.onStatus?.(result.message, "error");
      return;
    }
    this._pulseChips(before);
    this.hooks.onPersist?.();
    if (result.busted) {
      this.hooks.onStatus?.(result.message, "error");
    }
    this.render();
  }

  _settleAndExit() {
    if (this.sitting.pendingEncounter) {
      resolveEncounter(this.session, this.sitting, this.sitting.pendingEncounter.choices[0].id);
    }
    if (!this.sitting.closed) {
      const result = settleSitting(this.session, this.sitting, 18);
      this.hooks.onStatus?.(result.message, "success");
    }
    this.phase = "settled";
    this.hooks.onPersist?.();
    this._pulseChips();
    this.render();
  }

  _pulseChips(previousBalance) {
    const node = this.root.querySelector("[data-chip-balance]");
    if (!node) return;
    const next = this.session.wallet.balance;
    node.textContent = fmtChips(next);
    node.dataset.chipBalance = String(next);
    node.classList.remove("chip-pulse--up", "chip-pulse--down");
    void node.offsetWidth;
    if (previousBalance != null) {
      node.classList.add(next > previousBalance ? "chip-pulse--up" : next < previousBalance ? "chip-pulse--down" : "chip-pulse--up");
    } else {
      node.classList.add("chip-pulse--up");
    }
  }
}
