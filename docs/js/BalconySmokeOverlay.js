/**
 * Fullscreen suite-balcony POV — Strip vista + smoke-break minigame.
 * Mount on #balcony-smoke-overlay (sibling of #app / inside game-shell).
 */
import {
  BALCONY_HIT_MAX,
  canEnterBalconySmoke,
  closeBalconySitting,
  createBalconySitting,
  ensureBalconySmoke,
  startBalconyVisit,
  takeBalconyHit,
} from "./balcony-smoke.js";
import { ensureHotel, getRoomType } from "./hotel.js";
import { getIntoxicationSummary } from "./intoxication-effects.js";
import { makeRoomDecision } from "./room-amenities.js";

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

export class BalconySmokeOverlay {
  /**
   * @param {HTMLElement} root
   * @param {{ onPersist?: () => void, onStatus?: (msg: string, kind?: string) => void,
   *           onClosed?: () => void, onIntoxChange?: () => void }} hooks
   */
  constructor(root, hooks = {}) {
    this.root = root;
    this.hooks = hooks;
    this.session = null;
    this.active = false;
    this.sitting = null;
    this.statusLine = "";
    this.exhaleBurst = 0;
    this._raf = 0;
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

  /**
   * @param {{ recordDecision?: boolean }} [opts]
   */
  open(opts = {}) {
    if (!this.session) return;
    const gate = canEnterBalconySmoke(this.session);
    if (!gate.ok) {
      this.hooks.onStatus?.(gate.message, "error");
      return;
    }

    if (opts.recordDecision !== false) {
      // Prefer the suite POV decision (also stamps "balcony" for vignette unlocks).
      const pov = makeRoomDecision(this.session, "balcony_smoke_pov");
      if (!pov.ok) makeRoomDecision(this.session, "balcony");
    }

    const started = startBalconyVisit(this.session);
    if (!started.ok) {
      this.hooks.onStatus?.(started.message, "error");
      return;
    }

    ensureBalconySmoke(this.session);
    this.sitting = createBalconySitting(this.session);
    this.statusLine = `${started.roomLabel} balcony · visit #${started.visits}`;
    this.exhaleBurst = 0;
    this.active = true;
    this.root.classList.add("balcony-smoke-overlay--open");
    this.root.setAttribute("aria-hidden", "false");
    document.body.classList.add("balcony-smoke-overlay-active");
    window.addEventListener("keydown", this._onKey);
    this.render();
    this._startMotion();
    this.hooks.onPersist?.();
  }

  requestClose() {
    if (!this.active) return;
    const result = closeBalconySitting(this.session, this.sitting);
    this.hooks.onStatus?.(result.message, "success");
    this.close();
  }

  close() {
    if (!this.active) return;
    this.active = false;
    this.sitting = null;
    this._stopMotion();
    this.root.classList.remove("balcony-smoke-overlay--open");
    this.root.setAttribute("aria-hidden", "true");
    this.root.replaceChildren();
    document.body.classList.remove("balcony-smoke-overlay-active");
    window.removeEventListener("keydown", this._onKey);
    this.hooks.onPersist?.();
    const once = this._onClosedOnce;
    this._onClosedOnce = null;
    once?.({});
    this.hooks.onClosed?.({});
  }

  /** @param {(result: object) => void} cb */
  onceClosed(cb) {
    this._onClosedOnce = cb;
  }

  _startMotion() {
    this._stopMotion();
    const tick = () => {
      if (!this.active) return;
      if (this.exhaleBurst > 0) this.exhaleBurst -= 1;
      this._raf = window.requestAnimationFrame(tick);
    };
    this._raf = window.requestAnimationFrame(tick);
  }

  _stopMotion() {
    if (this._raf) {
      window.cancelAnimationFrame(this._raf);
      this._raf = 0;
    }
  }

  _hit() {
    const result = takeBalconyHit(this.session, this.sitting);
    this.statusLine = result.message;
    if (result.ok) {
      this.exhaleBurst = 48;
      this.root.classList.remove("balcony-smoke-overlay--exhale");
      void this.root.offsetWidth;
      this.root.classList.add("balcony-smoke-overlay--exhale");
      this.hooks.onIntoxChange?.();
    }
    this.hooks.onPersist?.();
    this.render();
  }

  render() {
    if (!this.active || !this.session || !this.sitting) return;
    const hotel = ensureHotel(this.session);
    const room = getRoomType(hotel);
    const intox = getIntoxicationSummary(this.session);
    const hits = this.sitting.hits;
    const done = hits >= BALCONY_HIT_MAX;
    const haze = Math.min(1, hits / BALCONY_HIT_MAX);

    this.root.replaceChildren();
    this.root.appendChild(el("div", {
      className: `balcony-smoke-overlay__stage balcony-smoke-overlay__stage--haze${haze.toFixed(2).replace(".", "")}`,
      style: `--balcony-haze: ${haze}; --balcony-hits: ${hits}`,
    }, [
      this._buildSky(),
      this._buildStrip(),
      this._buildAtmosphere(haze),
      this._buildForeground(),
      this._buildHud(room, intox, hits, done),
    ]));
  }

  _buildSky() {
    return el("div", { className: "balcony-sky", "aria-hidden": "true" }, [
      el("div", { className: "balcony-sky__gradient" }),
      el("div", { className: "balcony-sky__stars" }),
      el("div", { className: "balcony-sky__beam" }),
      el("div", { className: "balcony-sky__moon" }),
    ]);
  }

  _buildStrip() {
    const towers = [
      { cls: "tower-pyramid", label: "Luxor" },
      { cls: "tower-sphere", label: "Sphere" },
      { cls: "tower-bellagio", label: "Bellagio" },
      { cls: "tower-paris", label: "Paris" },
      { cls: "tower-venetian", label: "Venetian" },
      { cls: "tower-aria", label: "Aria" },
      { cls: "tower-mandalay", label: "Mandalay" },
      { cls: "tower-casino", label: "Casino" },
    ];
    return el("div", { className: "balcony-strip", "aria-hidden": "true" }, [
      el("div", { className: "balcony-strip__horizon" }),
      el("div", { className: "balcony-strip__mountains" }),
      el("div", { className: "balcony-strip__skyline" },
        towers.map((t) => el("div", {
          className: `balcony-tower ${t.cls}`,
          title: t.label,
        }, [
          el("div", { className: "balcony-tower__body" }),
          el("div", { className: "balcony-tower__lights" }),
        ]))),
      el("div", { className: "balcony-strip__boulevard" }, [
        el("div", { className: "balcony-traffic balcony-traffic--a" }),
        el("div", { className: "balcony-traffic balcony-traffic--b" }),
      ]),
      el("div", { className: "balcony-strip__fountains" }),
      el("div", { className: "balcony-strip__glow" }),
    ]);
  }

  _buildAtmosphere(haze) {
    return el("div", { className: "balcony-atmosphere", "aria-hidden": "true" }, [
      el("div", { className: "balcony-haze", style: `opacity:${0.15 + haze * 0.55}` }),
      el("div", { className: "balcony-smoke-plumes" }, [
        el("span", { className: "plume plume--1" }),
        el("span", { className: "plume plume--2" }),
        el("span", { className: "plume plume--3" }),
        el("span", { className: "plume plume--4" }),
        el("span", { className: "plume plume--5" }),
      ]),
      el("div", { className: "balcony-exhale-burst" }),
    ]);
  }

  _buildForeground() {
    return el("div", { className: "balcony-foreground", "aria-hidden": "true" }, [
      el("div", { className: "balcony-railing" }, [
        el("div", { className: "balcony-railing__glass" }),
        el("div", { className: "balcony-railing__bar" }),
        el("div", { className: "balcony-railing__posts" }),
      ]),
      el("div", { className: "balcony-hands" }, [
        el("div", { className: "balcony-hand balcony-hand--left" }),
        el("div", { className: "balcony-joint-wrap" }, [
          el("div", { className: "balcony-joint" }, [
            el("div", { className: "balcony-joint__paper" }),
            el("div", { className: "balcony-joint__ember" }),
            el("div", { className: "balcony-joint__smoke" }),
          ]),
        ]),
        el("div", { className: "balcony-hand balcony-hand--right" }),
      ]),
    ]);
  }

  _buildHud(room, intox, hits, done) {
    const hotel = ensureHotel(this.session);
    return el("div", { className: "balcony-hud" }, [
      el("header", { className: "balcony-hud__brand" }, [
        el("p", { className: "balcony-hud__eyebrow", textContent: "Mandalay Bay" }),
        el("h2", { className: "balcony-hud__title", textContent: "Suite Balcony" }),
        el("p", {
          className: "balcony-hud__meta",
          textContent: `${room.label} · Fl ${hotel.floor} · Rm ${hotel.roomNumber}`,
        }),
      ]),
      el("p", {
        className: "balcony-hud__tagline",
        textContent: "POV · Las Vegas Strip · high-roller stillness",
      }),
      el("p", { className: "balcony-hud__status", textContent: this.statusLine }),
      el("div", { className: "balcony-hud__meters" }, [
        el("div", { className: "balcony-meter" }, [
          el("span", { textContent: `Ember ${hits}/${BALCONY_HIT_MAX}` }),
          el("div", { className: "balcony-meter__track" }, [
            el("div", {
              className: "balcony-meter__fill balcony-meter__fill--ember",
              style: `width:${Math.round((hits / BALCONY_HIT_MAX) * 100)}%`,
            }),
          ]),
        ]),
        el("div", { className: "balcony-meter" }, [
          el("span", { textContent: `Buzz ${intox.level}` }),
          el("div", { className: "balcony-meter__track" }, [
            el("div", {
              className: "balcony-meter__fill balcony-meter__fill--buzz",
              style: `width:${Math.min(100, intox.level)}%`,
            }),
          ]),
        ]),
      ]),
      el("div", { className: "balcony-hud__actions" }, [
        el("button", {
          className: "balcony-btn balcony-btn--primary",
          textContent: done ? "Ember out" : "Take a hit",
          disabled: done,
          onclick: () => { if (!done) this._hit(); },
        }),
        el("button", {
          className: "balcony-btn",
          textContent: "Savor the view",
          onclick: () => {
            this.statusLine = "Warm wind. Neon bloom. You let the Strip do the talking.";
            this.render();
          },
        }),
        el("button", {
          className: "balcony-btn balcony-btn--ghost",
          textContent: "Step inside",
          onclick: () => this.requestClose(),
        }),
      ]),
      el("p", {
        className: "balcony-hud__hint",
        textContent: "Esc to step inside · suite & penthouse exclusive",
      }),
    ]);
  }
}
