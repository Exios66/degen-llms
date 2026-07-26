/**
 * Fullscreen Mandalay Beach / Pool Complex overlay for the web terminal (and RPG host).
 * Mount on #pool-overlay (sibling of #app / inside game-shell).
 */
import { fmtChips } from "./core.js";
import {
  POOL_ZONES,
  SHARK_SPECIES,
  POOL_EVENTS,
  ensurePoolComplex,
  enterZone,
  playCatchWave,
  playRingToss,
  photographShark,
  soakHotTub,
  bookCabana,
  cabanaService,
  enterBeachClub,
  beachClubAction,
  startRaveDance,
  submitRaveMove,
  getPoolSummary,
  getUnlockedPoolEvents,
} from "./pool-complex.js";

const ZONE_META = {
  hub: {
    id: "hub",
    label: "Mandalay Beach",
    eyebrow: "11-Acre Expansion Pack",
    blurb: "Scorching Nevada sun. Chlorine dreams. Eleven acres of resort excess.",
    motif: "panorama",
  },
  wave_pool: {
    ...POOL_ZONES.wave_pool,
    eyebrow: "Catch the crest",
    motif: "wave",
  },
  hot_tubs: {
    ...POOL_ZONES.hot_tubs,
    eyebrow: "Steam & gossip",
    motif: "steam",
  },
  cabanas: {
    ...POOL_ZONES.cabanas,
    eyebrow: "Shade & bottle service",
    motif: "cabana",
  },
  shark_reef: {
    ...POOL_ZONES.shark_reef,
    eyebrow: "Acrylic abyss",
    motif: "reef",
  },
  beach_club: {
    ...POOL_ZONES.beach_club,
    eyebrow: "21+ sun deck",
    motif: "club",
  },
  beach_rave: {
    ...POOL_ZONES.beach_rave,
    eyebrow: "After dark neon",
    motif: "rave",
  },
  events: {
    id: "events",
    label: "Highlight Reel",
    eyebrow: "Pool vignettes",
    blurb: "Unlocks as you conquer the complex.",
    motif: "reel",
  },
};

const HUB_CARDS = [
  { zoneId: "wave_pool", icon: "≋", tag: "Minigame", hint: "Wave timing · ring toss" },
  { zoneId: "hot_tubs", icon: "♨", tag: "Soak", hint: "Gossip · steam · odds talk" },
  { zoneId: "cabanas", icon: "▨", tag: "VIP", hint: "Book · bottle · people-watch" },
  { zoneId: "shark_reef", icon: "◈", tag: "Quest", hint: "Photo five species" },
  { zoneId: "beach_club", icon: "☀", tag: "21+", hint: "Cover · bar · sun deck" },
  { zoneId: "beach_rave", icon: "✦", tag: "Night", hint: "Glow-stick dance sequence" },
  { zoneId: "events", icon: "★", tag: "Log", hint: "Unlocked pool vignettes" },
];

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

export class PoolComplexOverlay {
  /**
   * @param {HTMLElement} root
   * @param {{ onPersist?: () => void, onStatus?: (msg: string, kind?: string) => void,
   *           onClosed?: (result?: { net: number }) => void, onChipDelta?: (delta: number) => void }} hooks
   */
  constructor(root, hooks = {}) {
    this.root = root;
    this.hooks = hooks;
    this.session = null;
    this.active = false;
    this.zoneId = "hub";
    this.lastMessage = "";
    this.lastOk = true;
    this.fxClass = null;
    this._fxTimer = null;
    this._onKey = (e) => {
      if (e.key === "Escape" && this.active) {
        e.preventDefault();
        if (this.zoneId !== "hub") this.openZone("hub");
        else this.close();
      }
    };
  }

  setSession(session) {
    this.session = session;
  }

  /** @param {string | null} zoneId hub or a POOL_ZONES id / "events" */
  open(zoneId = "hub") {
    if (!this.session) return;
    ensurePoolComplex(this.session);
    this.active = true;
    this.zoneId = zoneId && ZONE_META[zoneId] ? zoneId : "hub";
    this.lastMessage = "";
    this.lastOk = true;
    this._chipsAtOpen = this.session.wallet.balance;
    this.root.classList.add("pool-overlay--open");
    this.root.setAttribute("aria-hidden", "false");
    document.body.classList.add("pool-overlay-active");
    window.addEventListener("keydown", this._onKey);
    if (this.zoneId !== "hub" && this.zoneId !== "events") {
      enterZone(this.session, this.zoneId);
      this.hooks.onPersist?.();
    }
    this.render();
  }

  openZone(zoneId) {
    if (!this.active) {
      this.open(zoneId);
      return;
    }
    this.zoneId = ZONE_META[zoneId] ? zoneId : "hub";
    this.lastMessage = "";
    if (this.zoneId !== "hub" && this.zoneId !== "events") {
      const res = enterZone(this.session, this.zoneId);
      this.lastMessage = res.message;
      this.lastOk = res.ok;
      this.hooks.onPersist?.();
    }
    this.render();
  }

  close() {
    if (!this.active) return;
    const delta = this.session
      ? this.session.wallet.balance - (this._chipsAtOpen ?? this.session.wallet.balance)
      : 0;
    this.active = false;
    this.zoneId = "hub";
    this.lastMessage = "";
    this.fxClass = null;
    if (this._fxTimer) clearTimeout(this._fxTimer);
    this.root.classList.remove("pool-overlay--open");
    this.root.setAttribute("aria-hidden", "true");
    this.root.replaceChildren();
    document.body.classList.remove("pool-overlay-active");
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
    const meta = ZONE_META[this.zoneId] ?? ZONE_META.hub;
    const pc = ensurePoolComplex(this.session);
    this.root.replaceChildren();

    const backdrop = el("div", {
      className: [
        "pool-overlay__backdrop",
        `pool-overlay__backdrop--${meta.motif}`,
        this.fxClass || "",
      ].filter(Boolean).join(" "),
    }, [
      this._atmosphere(meta.motif),
      this._shell(meta, pc),
    ]);
    this.root.appendChild(backdrop);
  }

  _atmosphere(motif) {
    return el("div", { className: "pool-atmosphere", "aria-hidden": "true" }, [
      el("div", { className: "pool-atmosphere__sky" }),
      el("div", { className: "pool-atmosphere__sun" }, [
        el("span", { className: "pool-atmosphere__sun-core" }),
        el("span", { className: "pool-atmosphere__sun-ray" }),
      ]),
      el("div", { className: "pool-atmosphere__haze" }),
      el("div", { className: "pool-atmosphere__desert" }),
      el("div", { className: "pool-atmosphere__palms" }, [
        el("span", { className: "pool-palm pool-palm--a" }),
        el("span", { className: "pool-palm pool-palm--b" }),
      ]),
      el("div", { className: `pool-atmosphere__water pool-atmosphere__water--${motif}` }, [
        el("span", { className: "pool-wave pool-wave--1" }),
        el("span", { className: "pool-wave pool-wave--2" }),
        el("span", { className: "pool-wave pool-wave--3" }),
      ]),
      motif === "steam" ? el("div", { className: "pool-atmosphere__steam" }) : null,
      motif === "reef" ? el("div", { className: "pool-atmosphere__bubbles" }, [
        el("span"), el("span"), el("span"), el("span"), el("span"),
      ]) : null,
      motif === "rave" ? el("div", { className: "pool-atmosphere__neon" }) : null,
      motif === "cabana" ? el("div", { className: "pool-atmosphere__stripes" }) : null,
    ]);
  }

  _shell(meta, pc) {
    const unlocked = getUnlockedPoolEvents(this.session);
    const body = this.zoneId === "hub" ? this._renderHub(pc, unlocked)
      : this.zoneId === "events" ? this._renderEvents(pc, unlocked)
      : this.zoneId === "wave_pool" ? this._renderWave(pc)
      : this.zoneId === "hot_tubs" ? this._renderHotTubs(pc)
      : this.zoneId === "cabanas" ? this._renderCabanas(pc)
      : this.zoneId === "shark_reef" ? this._renderReef(pc)
      : this.zoneId === "beach_club" ? this._renderBeachClub(pc)
      : this.zoneId === "beach_rave" ? this._renderRave(pc)
      : this._renderHub(pc, unlocked);

    return el("div", {
      className: `pool-overlay__shell pool-overlay__shell--${meta.motif}`,
      role: "dialog",
      "aria-label": meta.label,
    }, [
      el("header", { className: "pool-overlay__header" }, [
        el("div", { className: "pool-overlay__brand" }, [
          el("p", { className: "pool-overlay__eyebrow", textContent: "Mandalay Bay · Pool Complex" }),
          el("h2", { className: "pool-overlay__title", textContent: meta.label }),
        ]),
        el("div", { className: "pool-overlay__stats" }, [
          el("span", {
            className: "pool-overlay__chips",
            "data-chip-balance": String(this.session.wallet.balance),
            textContent: fmtChips(this.session.wallet.balance),
          }),
          el("span", { className: "dim", textContent: `${unlocked.length}/${Object.keys(POOL_EVENTS).length} events` }),
          el("span", { className: "dim", textContent: `${pc.visitedZones.length}/6 zones` }),
        ]),
      ]),
      el("p", {
        className: "pool-overlay__tagline",
        textContent: meta.description || meta.blurb || meta.eyebrow,
      }),
      this.lastMessage
        ? el("div", {
          className: `pool-overlay__message ${this.lastOk ? "is-ok" : "is-bad"}`,
          textContent: this.lastMessage.split("\n")[0],
        })
        : null,
      el("div", { className: "pool-overlay__body" }, [body]),
      el("footer", { className: "pool-overlay__footer" }, [
        this.zoneId === "hub"
          ? el("button", {
            className: "pool-overlay__exit",
            textContent: "LEAVE BEACH  ESC",
            onclick: () => this.close(),
          })
          : el("button", {
            className: "pool-overlay__exit",
            textContent: "← COMPLEX MAP",
            onclick: () => this.openZone("hub"),
          }),
        el("span", {
          className: "dim pool-overlay__footer-note",
          textContent: this.zoneId === "hub"
            ? "Sun, sand, and bad decisions — all chip-compatible."
            : (meta.eyebrow || "Mandalay Beach"),
        }),
      ]),
    ]);
  }

  _renderHub(pc, unlocked) {
    return el("div", { className: "pool-hub" }, [
      el("p", { className: "pool-hub__summary dim", textContent: getPoolSummary(this.session) }),
      unlocked.length
        ? el("p", { className: "pool-hub__unlocks", textContent: `${unlocked.length} vignette(s) unlocked — check the highlight reel.` })
        : el("p", { className: "dim", textContent: "Explore every zone to unlock Vegas pool vignettes." }),
      el("div", { className: "pool-zone-grid" },
        HUB_CARDS.map((card) => {
          const z = ZONE_META[card.zoneId];
          const visited = card.zoneId !== "events" && pc.visitedZones.includes(card.zoneId);
          return el("button", {
            type: "button",
            className: [
              "pool-zone-card",
              `pool-zone-card--${z.motif}`,
              visited ? "pool-zone-card--visited" : "",
            ].filter(Boolean).join(" "),
            onclick: () => this.openZone(card.zoneId),
          }, [
            el("div", { className: "pool-zone-card__visual", "aria-hidden": "true" }, [
              el("span", { className: "pool-zone-card__icon", textContent: card.icon }),
            ]),
            el("div", { className: "pool-zone-card__meta" }, [
              el("span", { className: "pool-zone-card__tag", textContent: card.tag }),
              el("strong", { className: "pool-zone-card__name", textContent: z.label }),
              el("span", { className: "dim", textContent: card.hint }),
            ]),
          ]);
        })),
    ]);
  }

  _actionBtn(label, onclick, { primary = false, disabled = false } = {}) {
    return el("button", {
      type: "button",
      className: `pool-action-btn${primary ? " pool-action-btn--primary" : ""}`,
      textContent: label,
      disabled,
      onclick,
    });
  }

  _run(result, { fx = null, refresh = true } = {}) {
    this.lastMessage = result?.message || "";
    this.lastOk = Boolean(result?.ok);
    if (result?.message) {
      this.hooks.onStatus?.(result.message.split("\n")[0], result.ok ? "success" : "error");
    }
    if (fx) this._triggerFx(fx);
    this.hooks.onPersist?.();
    this._pulseChips();
    if (refresh) this.render();
  }

  _triggerFx(name) {
    this.fxClass = `pool-fx--${name}`;
    if (this._fxTimer) clearTimeout(this._fxTimer);
    this._fxTimer = setTimeout(() => {
      this.fxClass = null;
      const node = this.root.querySelector(".pool-overlay__backdrop");
      if (node) node.classList.remove(`pool-fx--${name}`);
    }, 900);
  }

  _pulseChips() {
    const node = this.root.querySelector("[data-chip-balance]");
    if (!node || !this.session) return;
    const next = this.session.wallet.balance;
    node.textContent = fmtChips(next);
    node.dataset.chipBalance = String(next);
    node.classList.remove("chip-pulse--up", "chip-pulse--down");
    void node.offsetWidth;
    node.classList.add("chip-pulse", "chip-pulse--up");
  }

  _renderWave(pc) {
    return el("div", { className: "pool-zone pool-zone--wave" }, [
      el("div", { className: "pool-zone__hero pool-zone__hero--wave", "aria-hidden": "true" }, [
        el("div", { className: "pool-hero-wave" }),
        el("div", { className: "pool-hero-splash" }),
      ]),
      el("p", { className: "dim", textContent: `Perfect rides: ${pc.waveWins} · Ring toss wins: ${pc.ringTossWins}` }),
      el("section", { className: "pool-action-block" }, [
        el("h3", { textContent: "Catch the wave" }),
        el("p", { className: "dim", textContent: "Pick your timing — crest pays +$25." }),
        el("div", { className: "pool-action-row" }, [
          this._actionBtn("Jump early", () => {
            const res = playCatchWave(this.session, 0);
            this._run(res, { fx: /PERFECT/i.test(res.message) ? "splash" : "mistime" });
          }),
          this._actionBtn("Ride the crest", () => {
            const res = playCatchWave(this.session, 1);
            this._run(res, { fx: /PERFECT/i.test(res.message) ? "splash" : "mistime" });
          }, { primary: true }),
          this._actionBtn("Bail late", () => {
            const res = playCatchWave(this.session, 2);
            this._run(res, { fx: /PERFECT/i.test(res.message) ? "splash" : "mistime" });
          }),
        ]),
      ]),
      el("section", { className: "pool-action-block" }, [
        el("h3", { textContent: "Ring toss" }),
        el("p", { className: "dim", textContent: "Aim for tube, tower, or cabana post." }),
        el("div", { className: "pool-action-row" }, [
          this._actionBtn("Inner tube · $25", () => {
            this._run(playRingToss(this.session, 25, 0), { fx: "ring" });
          }),
          this._actionBtn("Lifeguard tower · $50", () => {
            this._run(playRingToss(this.session, 50, 1), { fx: "ring" });
          }),
          this._actionBtn("Cabana post · $100", () => {
            this._run(playRingToss(this.session, 100, 2), { fx: "ring" });
          }),
        ]),
      ]),
    ]);
  }

  _renderHotTubs(pc) {
    return el("div", { className: "pool-zone pool-zone--steam" }, [
      el("div", { className: "pool-zone__hero pool-zone__hero--steam", "aria-hidden": "true" }),
      el("p", { className: "dim", textContent: `Soaks logged: ${pc.hotTubSoaks}` }),
      el("div", { className: "pool-action-row pool-action-row--stack" }, [
        this._actionBtn("Overhear gossip — Steve at the reef?", () => {
          this._run(soakHotTub(this.session, "gossip"), { fx: "steam" });
        }, { primary: true }),
        this._actionBtn("Relax & soak", () => {
          this._run(soakHotTub(this.session, "relax"), { fx: "steam" });
        }),
        this._actionBtn("Odds-checking challenge", () => {
          this._run(soakHotTub(this.session, "challenge"), { fx: "steam" });
        }),
      ]),
    ]);
  }

  _renderCabanas(pc) {
    return el("div", { className: "pool-zone pool-zone--cabana" }, [
      el("div", { className: "pool-zone__hero pool-zone__hero--cabana", "aria-hidden": "true" }),
      pc.flags.cabana_booked
        ? el("p", { className: "pool-hub__unlocks", textContent: "Your cabana is booked — shade secured." })
        : el("p", { className: "dim", textContent: "Book for $200 — privacy, ice bucket, implied bottle service." }),
      el("div", { className: "pool-action-row pool-action-row--stack" }, [
        this._actionBtn("Book cabana · $200", () => {
          this._run(bookCabana(this.session), { fx: "gold" });
        }, { primary: true, disabled: Boolean(pc.flags.cabana_booked) }),
        this._actionBtn("Bottle service · $85", () => {
          this._run(cabanaService(this.session, "bottle"), { fx: "gold" });
        }),
        this._actionBtn("Afternoon nap", () => {
          this._run(cabanaService(this.session, "nap"), { fx: "gold" });
        }),
        this._actionBtn("People-watch the wave pool", () => {
          this._run(cabanaService(this.session, "people_watch"), { fx: "gold" });
        }),
      ]),
    ]);
  }

  _renderReef(pc) {
    const photos = new Set(pc.sharkPhotos);
    return el("div", { className: "pool-zone pool-zone--reef" }, [
      el("div", { className: "pool-zone__hero pool-zone__hero--reef", "aria-hidden": "true" }, [
        el("div", { className: "pool-reef-glass" }),
      ]),
      el("p", {
        className: "dim",
        textContent: `${pc.sharkPhotos.length}/5 species photographed — unlock Reef Photographer.`,
      }),
      el("div", { className: "pool-species-grid" },
        Object.values(SHARK_SPECIES).map((sp) => {
          const shot = photos.has(sp.id);
          return el("button", {
            type: "button",
            className: `pool-species-card${shot ? " pool-species-card--shot" : ""}`,
            onclick: () => this._run(photographShark(this.session, sp.id), { fx: "shutter" }),
          }, [
            el("span", { className: "pool-species-card__mark", textContent: shot ? "✓" : "◎" }),
            el("strong", { textContent: sp.label }),
            el("span", { className: "dim", textContent: shot ? "In camera roll" : "Tap to photograph" }),
          ]);
        })),
    ]);
  }

  _renderBeachClub(pc) {
    return el("div", { className: "pool-zone pool-zone--club" }, [
      el("div", { className: "pool-zone__hero pool-zone__hero--club", "aria-hidden": "true" }),
      pc.flags.beach_club_pass
        ? el("p", { className: "pool-hub__unlocks", textContent: "Pass active — welcome back to the deck." })
        : el("p", { className: "pool-warning", textContent: "Cover charge $75 · 21+ only" }),
      el("div", { className: "pool-action-row pool-action-row--stack" }, [
        this._actionBtn("Enter / show pass · $75 first visit", () => {
          this._run(enterBeachClub(this.session), { fx: "sun" });
        }, { primary: true }),
        this._actionBtn("Pool bar — first-person at the rail", () => {
          if (this.hooks.barOverlay) {
            this.hooks.barOverlay.setSession(this.session);
            this.hooks.barOverlay.open("pool_beach_club");
          } else {
            this._run(beachClubAction(this.session, "bar"), { fx: "sun" });
          }
        }),
        this._actionBtn("Claim a sun deck lounger", () => {
          this._run(beachClubAction(this.session, "sun_deck"), { fx: "sun" });
        }),
        this._actionBtn("VIP rope section · $50", () => {
          this._run(beachClubAction(this.session, "vip_rope"), { fx: "gold" });
        }),
      ]),
    ]);
  }

  _renderRave(pc) {
    const step = pc.raveStep || 0;
    const moves = pc.raveMoves || [];
    return el("div", { className: "pool-zone pool-zone--rave" }, [
      el("div", { className: "pool-zone__hero pool-zone__hero--rave", "aria-hidden": "true" }, [
        el("div", { className: "pool-rave-deck" }),
      ]),
      el("p", {
        className: "dim",
        textContent: moves.length
          ? `Sequence armed — step ${Math.min(step + 1, 3)}/3. Match the DJ.`
          : "Match the DJ's three-move sequence to unlock Rave Til Dawn.",
      }),
      el("div", { className: "pool-rave-pads" }, [
        this._actionBtn("Start dance sequence", () => {
          this._run(startRaveDance(this.session), { fx: "neon" });
        }, { primary: true }),
        el("div", { className: "pool-action-row" }, [
          this._actionBtn("Fist pump", () => {
            const res = submitRaveMove(this.session, 0);
            this._run(res, { fx: "neon" });
          }),
          this._actionBtn("Shuffling", () => {
            this._run(submitRaveMove(this.session, 1), { fx: "neon" });
          }),
          this._actionBtn("Glow spin", () => {
            this._run(submitRaveMove(this.session, 2), { fx: "neon" });
          }),
        ]),
      ]),
    ]);
  }

  _renderEvents(pc, unlocked) {
    const locked = Object.values(POOL_EVENTS).filter((e) => !pc.unlockedEvents.includes(e.id));
    return el("div", { className: "pool-zone pool-zone--reel" }, [
      unlocked.length
        ? el("ul", { className: "pool-event-list" },
          unlocked.map((evt) => el("li", { className: "pool-event-list__item is-unlocked" }, [
            el("strong", { textContent: evt.label }),
            el("span", { textContent: evt.narrative }),
          ])))
        : el("p", { className: "dim", textContent: "Nothing unlocked yet — get in the water." }),
      locked.length
        ? el("div", { className: "pool-event-locked" }, [
          el("p", { className: "dim", textContent: "Still on the table:" }),
          el("ul", { className: "pool-event-list pool-event-list--locked" },
            locked.map((evt) => el("li", { textContent: evt.label }))),
        ])
        : el("p", { className: "pool-hub__unlocks", textContent: "Every vignette unlocked. Eleven acres conquered." }),
    ]);
  }
}
