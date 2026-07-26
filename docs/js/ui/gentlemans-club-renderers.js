import {
  CLUB_NAME,
  CLUB_TAGLINE,
  RAIN_TIERS,
  CLUB_BAR,
  CLUB_ENCOUNTERS,
  CLUB_MINIGAMES,
  ensureClub,
  markClubVisit,
  makeItRain,
  orderClubDrink,
  runClubEncounter,
  playTipCascade,
  startBottleMemory,
  resolveBottleMemory,
  playFeltFlip,
  clubSummary,
  canEnterGentlemansClub,
} from "../gentlemans-club.js?v=ae04ebc";
import { fmtChips } from "../core.js";

/**
 * Gentleman's Club terminal screens — hotel amenity nightlife lounge.
 * @param {object} ctx
 */
export function buildGentlemansClubRenderers(ctx) {
  const {
    session, pushView, goBack, navigateTo, persist, render, el, banner, chipLine,
    statusBanner, showStatus, recordActivityVisit,
  } = ctx;

  function menuBtn(label, onclick, isBack = false) {
    return el("li", {}, [
      el("button", {
        className: "menu-btn" + (isBack ? " back" : ""),
        innerHTML: label,
        onclick,
      }),
    ]);
  }

  function logLine(log, result) {
    log.appendChild(el("div", {
      className: `line ${result.ok ? "success" : "error"}`,
      textContent: result.message,
    }));
  }

  function renderClubHub() {
    const gate = canEnterGentlemansClub(session);
    if (!gate.ok) {
      return el("div", { className: "panel" }, [
        banner(CLUB_NAME),
        chipLine(),
        el("p", { className: "error", textContent: gate.reason }),
        el("p", {
          className: "dim",
          textContent: "Gold tier+, suite/penthouse key, or the club phone line from your room opens the rope.",
        }),
        el("div", { className: "action-bar" }, [
          el("button", { className: "btn", textContent: "Back", onclick: () => goBack() }),
        ]),
      ]);
    }

    markClubVisit(session);
    recordActivityVisit?.("gentlemans_club");
    persist?.();
    const sum = clubSummary(session);

    return el("div", {}, [
      statusBanner(),
      banner(`${CLUB_NAME} — Gentleman's Club`),
      chipLine(),
      el("div", { className: "panel amenities-panel gentlemans-club" }, [
        el("p", { className: "subtitle", textContent: CLUB_TAGLINE }),
        el("p", {
          className: "dim",
          textContent: `${gate.rewardsTier.label} · rains ${sum.rainCount} · bar tabs ${sum.drinks} · secrets ${sum.eggs}`,
        }),
        el("ul", { className: "menu-list" }, [
          menuBtn("<span class=\"num\">1)</span> Make it rain — tip the room", () => pushView("gentlemans-club-rain")),
          menuBtn("<span class=\"num\">2)</span> Encounters — hosts, felt, bottle captain", () => pushView("gentlemans-club-encounters")),
          menuBtn("<span class=\"num\">3)</span> The Ledger Bar — first-person FPV", () => {
            if (ctx.barOverlay) {
              ctx.barOverlay.setSession(session);
              ctx.barOverlay.open("velvet_ledger");
            } else {
              pushView("gentlemans-club-bar");
            }
          }),
          menuBtn("<span class=\"num\">4)</span> Minigames — cascade, bottles, felt", () => pushView("gentlemans-club-minigames")),
          menuBtn("<span class=\"num\">5)</span> Club ledger — stats & secrets", () => pushView("gentlemans-club-ledger")),
          menuBtn("<span class=\"num\">0)</span> Leave the velvet rope", () => goBack(), true),
        ]),
      ]),
    ]);
  }

  function renderRain() {
    const log = el("div", { className: "log-area" });
    return el("div", {}, [
      statusBanner(),
      banner("Make It Rain"),
      chipLine(),
      el("div", { className: "panel amenities-panel" }, [
        el("p", { className: "dim", textContent: "Cash becomes weather. The room applauds in LED." }),
        log,
        el("ul", { className: "menu-list" }, [
          ...RAIN_TIERS.map((t) => menuBtn(
            `${t.label} — $${t.amount.toLocaleString()}`,
            () => {
              const r = makeItRain(session, t.id);
              logLine(log, r);
              persist?.();
              render();
            },
          )),
          menuBtn("Back to club", () => navigateTo("gentlemans-club"), true),
        ]),
      ]),
    ]);
  }

  function renderBar() {
    if (ctx.barOverlay) {
      ctx.barOverlay.setSession(session);
      ctx.barOverlay.open("velvet_ledger");
      return el("div", { className: "panel" }, [
        el("p", { className: "dim", textContent: "Opening The Ledger Bar overlay…" }),
      ]);
    }
    const log = el("div", { className: "log-area" });
    return el("div", {}, [
      statusBanner(),
      banner("The Ledger Bar"),
      chipLine(),
      el("div", { className: "panel amenities-panel" }, [
        el("p", { className: "dim", textContent: "Fourteen pours. Four bottles that require a spine. No questions." }),
        log,
        el("ul", { className: "menu-list" }, [
          ...CLUB_BAR.map((d) => menuBtn(
            `${d.name} — $${d.price.toLocaleString()} <span class="dim">${d.description}</span>`,
            () => {
              const r = orderClubDrink(session, d.id);
              logLine(log, r);
              persist?.();
              render();
            },
          )),
          menuBtn("Back to club", () => navigateTo("gentlemans-club"), true),
        ]),
      ]),
    ]);
  }

  function renderEncounters() {
    return el("div", {}, [
      statusBanner(),
      banner("Club Encounters"),
      chipLine(),
      el("div", { className: "panel amenities-panel" }, [
        el("p", { className: "dim", textContent: "Pick a face. Pay the price. Collect the story." }),
        el("ul", { className: "menu-list" }, [
          ...CLUB_ENCOUNTERS.map((enc) => menuBtn(
            `${enc.name} <span class="dim">${enc.blurb}</span>`,
            () => pushView("gentlemans-club-encounter", { encounterId: enc.id }),
          )),
          menuBtn("Back to club", () => navigateTo("gentlemans-club"), true),
        ]),
      ]),
    ]);
  }

  function renderEncounter({ encounterId }) {
    const enc = CLUB_ENCOUNTERS.find((e) => e.id === encounterId);
    if (!enc) {
      return el("div", { className: "panel" }, [
        banner("Gone"),
        el("p", { textContent: "They left the floor." }),
        el("button", { className: "btn", textContent: "Back", onclick: () => navigateTo("gentlemans-club-encounters") }),
      ]);
    }
    const log = el("div", { className: "log-area" });
    return el("div", {}, [
      statusBanner(),
      banner(enc.name),
      chipLine(),
      el("div", { className: "panel amenities-panel" }, [
        el("p", { className: "dim", textContent: enc.blurb }),
        log,
        el("ul", { className: "menu-list" }, [
          ...enc.choices.map((c, i) => menuBtn(
            c.cost ? `${c.label} ($${c.cost.toLocaleString()})` : c.label,
            () => {
              const r = runClubEncounter(session, encounterId, i);
              logLine(log, r);
              persist?.();
              if (r.ok && r.minigame) {
                showStatus?.(`Opening ${r.minigame.replace(/_/g, " ")}…`);
                pushView("gentlemans-club-minigame", { gameId: r.minigame });
                return;
              }
              render();
            },
          )),
          menuBtn("Back", () => navigateTo("gentlemans-club-encounters"), true),
        ]),
      ]),
    ]);
  }

  function renderMinigames() {
    return el("div", {}, [
      statusBanner(),
      banner("Club Minigames"),
      chipLine(),
      el("div", { className: "panel amenities-panel" }, [
        el("p", { className: "dim", textContent: "Skill, memory, and Dante's shoe — antes apply." }),
        el("ul", { className: "menu-list" }, [
          ...CLUB_MINIGAMES.map((g) => menuBtn(
            `${g.name} — ante $${g.ante} <span class="dim">${g.blurb}</span>`,
            () => pushView("gentlemans-club-minigame", { gameId: g.id }),
          )),
          menuBtn("Back to club", () => navigateTo("gentlemans-club"), true),
        ]),
      ]),
    ]);
  }

  function renderMinigame({ gameId }) {
    const log = el("div", { className: "log-area" });

    if (gameId === "tip_cascade") {
      let meter = 0;
      let dir = 1;
      let timer = null;
      const meterEl = el("div", {
        className: "gc-meter",
        textContent: "████░░░░░░",
      });
      const start = () => {
        if (timer) return;
        timer = setInterval(() => {
          meter += dir * 0.04;
          if (meter >= 1) { meter = 1; dir = -1; }
          if (meter <= 0) { meter = 0; dir = 1; }
          const filled = Math.round(meter * 10);
          meterEl.textContent = `${"█".repeat(filled)}${"░".repeat(10 - filled)}  ${(meter * 100).toFixed(0)}%`;
        }, 50);
      };
      start();
      const stop = () => {
        if (timer) clearInterval(timer);
        timer = null;
        const r = playTipCascade(session, meter);
        logLine(log, r);
        persist?.();
        render();
      };
      return el("div", {}, [
        statusBanner(),
        banner("Tip Cascade"),
        chipLine(),
        el("div", { className: "panel amenities-panel" }, [
          el("p", { className: "dim", textContent: "Stop in the green band (~62–78%) when the cascade peaks." }),
          meterEl,
          log,
          el("ul", { className: "menu-list" }, [
            menuBtn("STOP THE RAIN", stop),
            menuBtn("Back", () => {
              if (timer) clearInterval(timer);
              navigateTo("gentlemans-club-minigames");
            }, true),
          ]),
        ]),
      ]);
    }

    if (gameId === "bottle_memory") {
      const round = startBottleMemory();
      let revealDone = false;
      const guess = [];
      const prompt = el("p", {
        className: "subtitle",
        textContent: `Watch: ${round.sequence.join(" → ")}`,
      });
      const picked = el("p", { className: "dim", textContent: "Picked: —" });
      setTimeout(() => {
        revealDone = true;
        prompt.textContent = "Repeat the order:";
      }, 2000);
      return el("div", {}, [
        statusBanner(),
        banner("Bottle Memory"),
        chipLine(),
        el("div", { className: "panel amenities-panel" }, [
          prompt,
          picked,
          log,
          el("ul", { className: "menu-list" }, [
            ...round.labels.map((label) => menuBtn(label, () => {
              if (!revealDone) {
                showStatus?.("Still flashing — wait for the labels to hide.");
                return;
              }
              if (guess.length >= 3) return;
              guess.push(label);
              picked.textContent = `Picked: ${guess.join(" → ")}`;
              if (guess.length >= 3) {
                const r = resolveBottleMemory(session, round.sequence, guess);
                logLine(log, r);
                persist?.();
              }
            })),
            menuBtn("Back", () => navigateTo("gentlemans-club-minigames"), true),
          ]),
        ]),
      ]);
    }

    if (gameId === "felt_flip") {
      return el("div", {}, [
        statusBanner(),
        banner("Felt Flip"),
        chipLine(),
        el("div", { className: "panel amenities-panel" }, [
          el("p", { className: "dim", textContent: "Call high (8–K) or low (A–7). Ante applies when you call." }),
          log,
          el("ul", { className: "menu-list" }, [
            menuBtn("Call HIGH", () => {
              logLine(log, playFeltFlip(session, "high"));
              persist?.();
              render();
            }),
            menuBtn("Call LOW", () => {
              logLine(log, playFeltFlip(session, "low"));
              persist?.();
              render();
            }),
            menuBtn("Back", () => navigateTo("gentlemans-club-minigames"), true),
          ]),
        ]),
      ]);
    }

    return el("div", { className: "panel" }, [
      banner("Unknown game"),
      el("button", { className: "btn", textContent: "Back", onclick: () => navigateTo("gentlemans-club-minigames") }),
    ]);
  }

  function renderLedger() {
    const club = ensureClub(session);
    const sum = clubSummary(session);
    return el("div", {}, [
      statusBanner(),
      banner("Club Ledger"),
      chipLine(),
      el("div", { className: "panel amenities-panel" }, [
        el("p", { textContent: `Visits: ${sum.visits}` }),
        el("p", { textContent: `Rains: ${sum.rainCount} · Total tipped: ${fmtChips(sum.totalRained)}` }),
        el("p", { textContent: `Drinks: ${sum.drinks} · Encounters: ${sum.encounters} · Minigames: ${sum.minigamesPlayed}` }),
        el("p", { className: "subtitle", textContent: "Secrets underlined" }),
        club.eggs.length
          ? el("ul", { className: "dim" }, club.eggs.map((e) => el("li", { textContent: e })))
          : el("p", { className: "dim", textContent: "None yet — rain harder, order stranger, talk to Sasha." }),
        el("ul", { className: "menu-list" }, [
          menuBtn("Back to club", () => navigateTo("gentlemans-club"), true),
        ]),
      ]),
    ]);
  }

  return {
    "gentlemans-club": renderClubHub,
    "gentlemans-club-rain": renderRain,
    "gentlemans-club-bar": renderBar,
    "gentlemans-club-encounters": renderEncounters,
    "gentlemans-club-encounter": renderEncounter,
    "gentlemans-club-minigames": renderMinigames,
    "gentlemans-club-minigame": renderMinigame,
    "gentlemans-club-ledger": renderLedger,
  };
}
