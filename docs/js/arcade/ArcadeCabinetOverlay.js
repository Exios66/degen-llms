/**
 * Fullscreen CRT arcade cabinet overlay for the web terminal.
 * Mount on #arcade-overlay (sibling of #app).
 */
import { ARCADE_GAMES, getArcadeGame, payoutFromMult, ticketsFromScore } from "./catalog.js";
import { ensureArcade, persistArcade } from "./state.js";
import { createStripCross } from "./games/stripCross.js";
import { createNeonInvaders } from "./games/neonInvaders.js";
import { createHighRollerBreakout } from "./games/highRollerBreakout.js";
import { createShowgirlBeat } from "./games/showgirlBeat.js";

const FACTORIES = {
  strip_cross: createStripCross,
  neon_invaders: createNeonInvaders,
  high_roller_breakout: createHighRollerBreakout,
  showgirl_beat: createShowgirlBeat,
};

function el(tag, attrs = {}, kids = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "className") node.className = v;
    else if (k === "textContent") node.textContent = v;
    else if (k === "innerHTML") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node[k.toLowerCase()] = v;
    else if (v != null) node.setAttribute(k, String(v));
  }
  for (const kid of kids) {
    if (kid == null || kid === false) continue;
    node.appendChild(typeof kid === "string" ? document.createTextNode(kid) : kid);
  }
  return node;
}

export class ArcadeCabinetOverlay {
  constructor(root, hooks = {}) {
    this.root = root;
    this.hooks = hooks;
    this.session = null;
    this.game = null;
    this.gameId = null;
    this.active = false;
    this._onKey = (e) => {
      if (e.key === "Escape" && this.active) {
        e.preventDefault();
        this.close();
      }
    };
  }

  setSession(session) {
    this.session = session;
  }

  open(gameId) {
    if (!this.session) return;
    const def = getArcadeGame(gameId);
    if (!def) return;
    const factory = FACTORIES[gameId];
    if (!factory) return;

    if (this.session.wallet.balance < def.cost) {
      this.hooks.onStatus?.(`Need ${def.cost} chips to play ${def.title}.`, "error");
      return;
    }
    if (!this.session.wallet.debit(def.cost, "arcade", `${def.title} play`)) {
      this.hooks.onStatus?.("Could not debit chips.", "error");
      return;
    }

    this.closeGameOnly();
    this.gameId = gameId;
    this.active = true;
    this.root.classList.add("arcade-overlay--open");
    this.root.setAttribute("aria-hidden", "false");
    document.body.classList.add("arcade-overlay-active");
    window.addEventListener("keydown", this._onKey);

    const state = ensureArcade(this.session);
    this.root.replaceChildren();

    const hudScore = el("div", { className: "arcade-overlay__stat", textContent: "SCORE 0" });
    const hudLives = el("div", { className: "arcade-overlay__stat", textContent: "LIVES —" });
    const hudMsg = el("div", { className: "arcade-overlay__msg", textContent: "INSERT COIN" });
    const hudTickets = el("div", {
      className: "arcade-overlay__stat",
      textContent: `TICKETS ${state.tickets}`,
    });
    const hudChips = el("div", {
      className: "arcade-overlay__stat",
      textContent: `CHIPS ${this.session.wallet.balance.toLocaleString()}`,
    });
    const hudHigh = el("div", {
      className: "arcade-overlay__stat",
      textContent: `HI ${state.highScores[gameId] ?? 0}`,
    });

    const canvas = el("canvas", { className: "arcade-overlay__canvas" });
    const screen = el("div", { className: "arcade-overlay__crt" }, [
      el("div", { className: "arcade-overlay__scanlines", "aria-hidden": "true" }),
      el("div", { className: "arcade-overlay__vignette", "aria-hidden": "true" }),
      canvas,
      el("div", { className: "arcade-overlay__coin-flash", textContent: "CREDIT OK" }),
    ]);

    const touch = this._buildTouchControls(def);

    const cabinet = el("div", { className: "arcade-overlay__cabinet" }, [
      el("div", { className: "arcade-overlay__marquee" }, [
        el("span", { className: "arcade-overlay__marquee-text", textContent: def.title.toUpperCase() }),
      ]),
      el("div", { className: "arcade-overlay__bezel" }, [
        el("aside", { className: "arcade-overlay__side arcade-overlay__side--left" }, [
          hudHigh, hudScore, hudLives,
        ]),
        screen,
        el("aside", { className: "arcade-overlay__side arcade-overlay__side--right" }, [
          hudChips, hudTickets,
          el("div", { className: "arcade-overlay__classic", textContent: `after ${def.classic}` }),
        ]),
      ]),
      hudMsg,
      el("p", { className: "arcade-overlay__controls", textContent: def.controls }),
      touch,
      el("div", { className: "arcade-overlay__footer" }, [
        el("button", {
          className: "arcade-overlay__exit",
          textContent: "EXIT  ESC",
          onclick: () => this.close(),
        }),
        el("span", { className: "arcade-overlay__led", "aria-hidden": "true" }),
        el("span", { className: "arcade-overlay__cost", textContent: `${def.cost} CHIPS / PLAY` }),
      ]),
    ]);

    this.root.appendChild(el("div", { className: "arcade-overlay__backdrop" }, [cabinet]));

    // Coin flash
    requestAnimationFrame(() => {
      this.root.querySelector(".arcade-overlay__coin-flash")?.classList.add("is-on");
      setTimeout(() => {
        this.root.querySelector(".arcade-overlay__coin-flash")?.classList.remove("is-on");
      }, 700);
    });

    const api = {
      onHud: ({ score, lives, message }) => {
        hudScore.textContent = `SCORE ${score ?? 0}`;
        if (lives != null) hudLives.textContent = `LIVES ${lives}`;
        if (message) hudMsg.textContent = message;
      },
      onEnded: (result) => this._settle(def, result, { hudMsg, hudTickets, hudChips, hudHigh }),
    };

    this.game = factory(canvas, api);
    this.game.start();
    this.hooks.onPersist?.();
    this.hooks.onOpened?.(gameId);
  }

  _buildTouchControls(def) {
    const row = el("div", { className: "arcade-overlay__touch" });
    if (def.id === "showgirl_beat") {
      [["kick", "KICK"], ["snare", "SNARE"], ["hat", "HAT"]].forEach(([id, label]) => {
        row.appendChild(el("button", {
          className: "arcade-touch-btn",
          textContent: label,
          onclick: () => this.game?.input?.(id),
        }));
      });
      return row;
    }
    const dpad = el("div", { className: "arcade-overlay__dpad" });
    const bind = (dir, label, hold) => {
      const b = el("button", { className: "arcade-touch-btn", textContent: label });
      if (hold) {
        b.onpointerdown = (e) => { e.preventDefault(); this.game?.input?.(dir); };
        b.onpointerup = () => this.game?.input?.(`${dir}-up`);
        b.onpointerleave = () => this.game?.input?.(`${dir}-up`);
      } else {
        b.onclick = () => this.game?.input?.(dir);
      }
      return b;
    };
    if (def.id === "strip_cross") {
      dpad.append(
        bind("up", "▲"),
        el("div", { className: "arcade-overlay__dpad-mid" }, [
          bind("left", "◀"), bind("down", "▼"), bind("right", "▶"),
        ]),
      );
    } else {
      dpad.append(
        bind("left", "◀", true),
        bind("right", "▶", true),
        bind("fire", "FIRE"),
      );
    }
    row.appendChild(dpad);
    return row;
  }

  _settle(def, result, hud) {
    if (!this.session || !this.active) return;
    const payout = payoutFromMult(def.cost, result.payoutMult);
    const tickets = ticketsFromScore(result.score, { cleared: !!result.cleared });
    if (payout > 0) {
      this.session.wallet.credit(payout, "arcade", `${def.title} payout`);
    }
    const state = ensureArcade(this.session);
    const isHigh = state.recordPlay(def.id, result.score, tickets);
    persistArcade(this.session, state);

    const net = payout - def.cost;
    this.hooks.onPlayResult?.({ gameId: def.id, net, payout, tickets, score: result.score });

    const stamp = result.cleared || result.won ? "YOU WIN" : "GAME OVER";
    hud.hudMsg.textContent = `${stamp}  +${payout} chips · +${tickets} tix${isHigh ? " · NEW HI" : ""}`;
    hud.hudTickets.textContent = `TICKETS ${state.tickets}`;
    hud.hudChips.textContent = `CHIPS ${this.session.wallet.balance.toLocaleString()}`;
    hud.hudHigh.textContent = `HI ${state.highScores[def.id] ?? 0}`;

    this.root.querySelector(".arcade-overlay__crt")?.classList.add(
      result.won || result.cleared ? "is-win" : "is-lose",
    );

    this.hooks.onPersist?.();
    this.hooks.onStatus?.(
      `${def.title}: ${stamp} — ${payout} chips, ${tickets} tickets.`,
      result.won || result.cleared ? "success" : undefined,
    );

    // Replay / exit strip
    const actions = el("div", { className: "arcade-overlay__end-actions" }, [
      el("button", {
        className: "arcade-touch-btn arcade-touch-btn--primary",
        textContent: "PLAY AGAIN",
        onclick: () => {
          this.closeGameOnly();
          this.open(def.id);
        },
      }),
      el("button", {
        className: "arcade-touch-btn",
        textContent: "BACK TO ALLEY",
        onclick: () => this.close(),
      }),
    ]);
    this.root.querySelector(".arcade-overlay__cabinet")?.appendChild(actions);
  }

  closeGameOnly() {
    if (this.game?.stop) this.game.stop();
    this.game = null;
  }

  close() {
    this.closeGameOnly();
    this.active = false;
    this.gameId = null;
    window.removeEventListener("keydown", this._onKey);
    this.root.classList.remove("arcade-overlay--open");
    this.root.setAttribute("aria-hidden", "true");
    this.root.replaceChildren();
    document.body.classList.remove("arcade-overlay-active");
    this.hooks.onClosed?.();
  }
}

export { ARCADE_GAMES };
