/**
 * Fullscreen restaurant dining overlay — first-person eating POV simulator.
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
import { buildFpvStage, looksLikeDrink, playConsumeAnimation, syncFpvSprites } from "./dining-sprites.js";

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
    this._ordering = false;
    this._lastFoodId = null;
    this._lastDrinkId = null;
    this._fpv = null;
    this._tableMounted = false;
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
    this._ordering = false;
    this._lastFoodId = null;
    this._lastDrinkId = null;
    this._fpv = null;
    this._tableMounted = false;
    this.phase = venueId && getVenueById(venueId) ? "table" : "select";
    this._chipsAtOpen = this.session.wallet.balance;
    if (this.phase === "table") {
      this.sitting = createSitting(venueId);
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
    this._ordering = false;
    this._lastFoodId = null;
    this._lastDrinkId = null;
    this._fpv = null;
    this._tableMounted = false;
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

    // Table phase: mount once, then patch in place (avoids choppy remounts).
    if (this.phase === "table" && this.sitting && this._tableMounted) {
      this._syncTable();
      this._syncEncounterModal();
      return;
    }

    this.root.replaceChildren();
    this._tableMounted = false;
    this._fpv = null;

    const backdrop = el("div", { className: "dining-overlay__backdrop" });
    if (this.phase === "select") {
      backdrop.appendChild(this._renderSelect());
    } else if (this.phase === "settled") {
      backdrop.appendChild(this._renderSettled());
    } else {
      backdrop.appendChild(this._renderTable());
      this._tableMounted = true;
    }
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
              this._lastFoodId = null;
              this._lastDrinkId = null;
              this._tableMounted = false;
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
    const food = venue.menu.filter((m) => m.kind === "food");
    const drinks = venue.menu.filter((m) => m.kind === "drink");
    const extras = venue.menu.filter((m) => m.kind === "extra");

    const stage = buildFpvStage(venue.motif, { venueName: venue.name });
    this._fpv = stage;
    syncFpvSprites(stage, { foodId: null, drinkId: null, caption: `${venue.name} · place setting` });

    const shell = el("div", {
      className: `dining-overlay__shell dining-overlay__shell--table dining-overlay__shell--fpv dining-motif--${venue.motif} dining-venue--${venue.id}`,
    });

    const layout = el("div", { className: `dining-fpv-layout dining-fpv-layout--${venue.motif}` });
    const stageWrap = el("div", { className: "dining-fpv-layout__stage" });
    stageWrap.appendChild(stage);

    const panel = el("aside", { className: `dining-fpv-layout__panel dining-fpv-layout__panel--${venue.motif}` }, [
      el("header", { className: "dining-overlay__header" }, [
        el("p", { className: "dining-overlay__eyebrow", textContent: `${venue.icon} ${venue.name}` }),
        el("h2", { className: "dining-overlay__title", textContent: venue.chef }),
        el("p", { className: "dining-overlay__tagline", textContent: venue.description }),
      ]),
      el("div", { className: "dining-hud", "data-dining-hud": "1" }),
      el("p", { className: "dining-message", "data-dining-message": "1", textContent: this.sitting.lastMessage }),
      el("div", { className: "dining-pace-bar", "data-dining-pace": "1" }),
      el("div", { className: "dining-menu-columns", "data-dining-menu": "1" }),
      el("footer", { className: "dining-overlay__footer" }, [
        el("button", {
          className: "dining-overlay__exit",
          "data-dining-exit": "1",
          textContent: "CLOSE OUT  ESC",
          onclick: () => this._settleAndExit(),
        }),
        el("span", {
          className: "dim",
          "data-dining-footer-hint": "1",
          textContent: "Unexpected encounters rise with every pour.",
        }),
      ]),
    ]);

    layout.appendChild(stageWrap);
    layout.appendChild(panel);
    shell.appendChild(layout);

    const menuHost = panel.querySelector("[data-dining-menu]");
    if (menuHost) {
      menuHost.append(
        this._menuSection("Plates", food),
        this._menuSection("Drinks", drinks),
      );
      if (extras.length) menuHost.append(this._menuSection("Extras", extras));
    }
    this._fillPaceBar(panel.querySelector("[data-dining-pace]"));
    this._writeHud(panel.querySelector("[data-dining-hud]"));

    return shell;
  }

  _menuSection(title, items) {
    return el("section", { className: "dining-menu-section" }, [
      el("h3", { textContent: title }),
      el("div", { className: "dining-menu-list" },
        items.map((item) =>
          el("button", {
            className: "dining-menu-item",
            "data-item-id": item.id,
            disabled: this.sitting.busted || this.sitting.closed || !!this.sitting.pendingEncounter || this._ordering,
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
  }

  _fillPaceBar(host) {
    if (!host) return;
    host.replaceChildren();
    for (const [id, label] of [
      ["pace", "Pace yourself"],
      ["clean_plate", "Clean the plate"],
      ["chase_shots", "Chase with shots"],
    ]) {
      host.appendChild(el("button", {
        className: `dining-pace-btn${this.pace === id ? " is-active" : ""}`,
        "data-pace": id,
        textContent: label,
        onclick: () => {
          if (this.pace === id) return;
          this.pace = id;
          this._syncPaceOnly();
        },
      }));
    }
  }

  _writeHud(host) {
    if (!host || !this.sitting) return;
    const chance = Math.round(encounterChance(this.sitting, this.session) * 100);
    const intox = getIntoxicationLevel(this.session);
    const fullnessPct = Math.max(0, Math.min(100, Math.round((this.sitting.fullness / FULLNESS_MAX) * 100)));
    const composurePct = Math.max(0, Math.min(100, Math.round((this.sitting.composure / COMPOSURE_MAX) * 100)));

    host.replaceChildren(
      el("div", { className: "dining-meter dining-meter--fullness" }, [
        el("div", {
          className: "dining-meter__label",
          "data-meter-label": "fullness",
          textContent: `Fullness ${this.sitting.fullness}/${FULLNESS_MAX}`,
        }),
        el("div", { className: "dining-meter__track" }, [
          el("div", {
            className: "dining-meter__fill",
            "data-meter-fill": "fullness",
            style: `width:${fullnessPct}%`,
          }),
        ]),
      ]),
      el("div", { className: "dining-meter dining-meter--composure" }, [
        el("div", {
          className: "dining-meter__label",
          "data-meter-label": "composure",
          textContent: `Composure ${this.sitting.composure}/${COMPOSURE_MAX}`,
        }),
        el("div", { className: "dining-meter__track" }, [
          el("div", {
            className: "dining-meter__fill",
            "data-meter-fill": "composure",
            style: `width:${composurePct}%`,
          }),
        ]),
      ]),
      el("div", { className: "dining-hud__stats" }, [
        el("span", { "data-stat": "tab", textContent: `Tab $${this.sitting.tab.toLocaleString()}` }),
        el("span", { "data-stat": "score", textContent: `Score ${this.sitting.score}` }),
        el("span", { "data-stat": "courses", textContent: `Courses ${this.sitting.coursesCleared}` }),
        el("span", { "data-stat": "drinks", textContent: `Drinks ${this.sitting.drinksThisSitting}` }),
        el("span", { className: "dining-hud__risk", "data-stat": "risk", textContent: `Encounter risk ~${chance}%` }),
        el("span", { "data-stat": "intox", textContent: `Intox ${intox}` }),
        el("span", {
          className: "chip-pulse",
          "data-chip-balance": String(this.session.wallet.balance),
          textContent: fmtChips(this.session.wallet.balance),
        }),
      ]),
    );
  }

  /** In-place HUD / message / menu disable sync — no remount. */
  _syncTable() {
    if (!this.sitting) return;
    const hud = this.root.querySelector("[data-dining-hud]");
    const msg = this.root.querySelector("[data-dining-message]");
    const exitBtn = this.root.querySelector("[data-dining-exit]");
    const hint = this.root.querySelector("[data-dining-footer-hint]");

    if (hud) {
      const fullnessPct = Math.max(0, Math.min(100, Math.round((this.sitting.fullness / FULLNESS_MAX) * 100)));
      const composurePct = Math.max(0, Math.min(100, Math.round((this.sitting.composure / COMPOSURE_MAX) * 100)));
      const chance = Math.round(encounterChance(this.sitting, this.session) * 100);
      const intox = getIntoxicationLevel(this.session);

      const fLabel = hud.querySelector('[data-meter-label="fullness"]');
      const cLabel = hud.querySelector('[data-meter-label="composure"]');
      const fFill = hud.querySelector('[data-meter-fill="fullness"]');
      const cFill = hud.querySelector('[data-meter-fill="composure"]');
      if (fLabel) fLabel.textContent = `Fullness ${this.sitting.fullness}/${FULLNESS_MAX}`;
      if (cLabel) cLabel.textContent = `Composure ${this.sitting.composure}/${COMPOSURE_MAX}`;
      if (fFill) fFill.style.width = `${fullnessPct}%`;
      if (cFill) cFill.style.width = `${composurePct}%`;

      const set = (key, text) => {
        const n = hud.querySelector(`[data-stat="${key}"]`);
        if (n) n.textContent = text;
      };
      set("tab", `Tab $${this.sitting.tab.toLocaleString()}`);
      set("score", `Score ${this.sitting.score}`);
      set("courses", `Courses ${this.sitting.coursesCleared}`);
      set("drinks", `Drinks ${this.sitting.drinksThisSitting}`);
      set("risk", `Encounter risk ~${chance}%`);
      set("intox", `Intox ${intox}`);

      const chip = hud.querySelector("[data-chip-balance]");
      if (chip) {
        chip.textContent = fmtChips(this.session.wallet.balance);
        chip.dataset.chipBalance = String(this.session.wallet.balance);
      }
    }

    if (msg) msg.textContent = this.sitting.lastMessage || "";

    const locked = this.sitting.busted || this.sitting.closed || !!this.sitting.pendingEncounter || this._ordering;
    this.root.querySelectorAll(".dining-menu-item").forEach((btn) => {
      btn.disabled = locked;
    });
    this.root.querySelectorAll(".dining-pace-btn").forEach((btn) => {
      btn.disabled = locked;
    });

    if (exitBtn) {
      exitBtn.textContent = this.sitting.busted || this.sitting.closed ? "SETTLE & EXIT" : "CLOSE OUT  ESC";
    }
    if (hint) {
      hint.textContent = this.sitting.busted
        ? "You're done — settle before the walk of shame."
        : "Unexpected encounters rise with every pour.";
    }

    this._syncPaceOnly();
  }

  _syncPaceOnly() {
    this.root.querySelectorAll(".dining-pace-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-pace") === this.pace);
    });
  }

  _syncEncounterModal() {
    const existing = this.root.querySelector(".dining-encounter");
    if (this.sitting?.pendingEncounter) {
      if (!existing) this.root.appendChild(this._renderEncounterModal());
    } else if (existing) {
      existing.remove();
    }
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
                this._syncTable();
                this._syncEncounterModal();
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
            this._tableMounted = false;
            this._fpv = null;
            this.render();
          },
        }),
      ]),
    ]);
  }

  async _order(itemId) {
    if (this._ordering || !this.sitting || this.sitting.pendingEncounter) return;
    const venue = getVenueById(this.sitting.venueId);
    const item = venue?.menu.find((m) => m.id === itemId);
    if (!item) return;

    const before = this.session.wallet.balance;
    const result = orderAndConsume(this.session, this.sitting, itemId, this.pace);
    if (!result.ok) {
      this.hooks.onStatus?.(result.message, "error");
      return;
    }

    this._ordering = true;
    this._syncTable();

    const stage = this._fpv || this.root.querySelector(".dining-fpv");
    if (stage) {
      await playConsumeAnimation(stage, item);
      if (looksLikeDrink(item)) this._lastDrinkId = item.id;
      else this._lastFoodId = item.id;
      // Caption only — sprites already placed by the consume animation (avoid remount flash).
      syncFpvSprites(stage, { caption: item.name });
    }

    this._ordering = false;
    this._pulseChips(before);
    this.hooks.onPersist?.();
    if (result.busted) {
      this.hooks.onStatus?.(result.message, "error");
    }
    this._syncTable();
    this._syncEncounterModal();
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
    this._tableMounted = false;
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
