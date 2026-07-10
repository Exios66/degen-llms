import {
  POOL_ZONES, SHARK_SPECIES, POOL_EVENTS,
  ensurePoolComplex, enterZone, playCatchWave, playRingToss,
  photographShark, soakHotTub, bookCabana, cabanaService,
  enterBeachClub, beachClubAction, startRaveDance, submitRaveMove,
  getPoolSummary, getUnlockedPoolEvents,
} from "./pool-complex.js";

/**
 * Pool Complex view renderers — accessible from hotel lobby.
 * @param {object} ctx
 */
export function buildPoolRenderers(ctx) {
  const {
    session, pushView, goBack, navigateTo, persist, render, el, banner, chipLine, statusBanner, showStatus,
  } = ctx;

  function menuBtn(label, onclick, isBack = false) {
    return el("li", {}, [
      el("button", {
        className: "menu-btn" + (isBack ? " back" : ""),
        textContent: label,
        onclick,
      }),
    ]);
  }

  function flashResult(result) {
    if (result?.message) {
      showStatus(result.message.split("\n")[0], result.ok ? "success" : "error");
    }
  }

  function renderAmenityLog(log, result) {
    log.replaceChildren();
    for (const line of result.message.split("\n")) {
      log.appendChild(el("div", { className: `line ${result.ok ? "success" : "error"}`, textContent: line }));
    }
  }

  function runAction(log, result, { refresh = false } = {}) {
    renderAmenityLog(log, result);
    flashResult(result);
    persist();
    if (refresh) render();
  }

  function renderPoolComplexHub() {
    ensurePoolComplex(session);
    const summary = getPoolSummary(session);
    const unlocked = getUnlockedPoolEvents(session);

    return el("div", {}, [
      statusBanner(),
      banner("Mandalay Bay — Pool Complex"),
      chipLine(),
      el("div", { className: "panel hotel-panel pool-complex-panel" }, [
        el("p", { className: "subtitle", textContent: "11-Acre Expansion Pack" }),
        el("p", { className: "dim", textContent: "Wave pool · hot tubs · cabanas · shark reef · beach club · beach rave" }),
        el("p", { className: "room-amenities-summary dim", textContent: summary }),
        unlocked.length
          ? el("p", { className: "success", textContent: `${unlocked.length} pool event(s) unlocked` })
          : el("p", { className: "dim", textContent: "Explore every zone to unlock Vegas pool vignettes." }),
        el("ul", { className: "menu-list" }, [
          menuBtn("Wave Pool — catch the wave & ring toss", () => pushView("pool-wave")),
          menuBtn("Hot Tubs — soak, gossip, steam", () => pushView("pool-hot-tubs")),
          menuBtn("Private Cabanas — book & bottle service", () => pushView("pool-cabanas")),
          menuBtn("Shark Reef Aquarium — photo collection quest", () => pushView("pool-reef")),
          menuBtn("Topless Beach Club — 21+ pool deck", () => pushView("pool-beach-club")),
          menuBtn("Beach Rave — glow-stick dance minigame", () => pushView("pool-rave")),
          menuBtn("Event log — pool highlight reel", () => pushView("pool-events")),
          menuBtn("Back to hotel lobby", () => navigateTo("hotel-lobby"), true),
        ]),
      ]),
    ]);
  }

  function renderPoolWave() {
    const log = el("div", { className: "log-area hotel-log" });
    enterZone(session, "wave_pool");
    persist();

    return el("div", {}, [
      statusBanner(),
      banner("Wave Pool"),
      chipLine(),
      el("div", { className: "panel hotel-panel pool-zone-view" }, [
        el("p", { className: "subtitle", textContent: POOL_ZONES.wave_pool.description }),
        log,
        el("p", { className: "dim", textContent: "Catch the wave — pick your timing:" }),
        el("ul", { className: "menu-list" }, [
          menuBtn("Jump early", () => { runAction(log, playCatchWave(session, 0)); }),
          menuBtn("Ride the crest", () => { runAction(log, playCatchWave(session, 1), { refresh: true }); }),
          menuBtn("Bail late", () => { runAction(log, playCatchWave(session, 2), { refresh: true }); }),
        ]),
        el("p", { className: "dim", textContent: "Ring toss — $10 minimum:" }),
        el("ul", { className: "menu-list" }, [
          menuBtn("Toss at inner tube ($25)", () => {
            runAction(log, playRingToss(session, 25, 0), { refresh: true });
          }),
          menuBtn("Toss at lifeguard tower ($50)", () => {
            runAction(log, playRingToss(session, 50, 1), { refresh: true });
          }),
          menuBtn("Toss at cabana post ($100)", () => {
            runAction(log, playRingToss(session, 100, 2), { refresh: true });
          }),
          menuBtn("Back to pool complex", () => navigateTo("pool-complex"), true),
        ]),
      ]),
    ]);
  }

  function renderPoolHotTubs() {
    const log = el("div", { className: "log-area hotel-log" });
    enterZone(session, "hot_tubs");
    persist();

    return el("div", {}, [
      statusBanner(),
      banner("Hot Tubs"),
      chipLine(),
      el("div", { className: "panel hotel-panel pool-zone-view" }, [
        el("p", { className: "subtitle", textContent: POOL_ZONES.hot_tubs.description }),
        log,
        el("ul", { className: "menu-list" }, [
          menuBtn("Overhear gossip — Steve Harvey at the reef?", () => {
            runAction(log, soakHotTub(session, "gossip"), { refresh: true });
          }),
          menuBtn("Relax & soak", () => {
            runAction(log, soakHotTub(session, "relax"));
          }),
          menuBtn("Odds-checking challenge", () => {
            runAction(log, soakHotTub(session, "challenge"));
          }),
          menuBtn("Back to pool complex", () => navigateTo("pool-complex"), true),
        ]),
      ]),
    ]);
  }

  function renderPoolCabanas() {
    const log = el("div", { className: "log-area hotel-log" });
    const pc = ensurePoolComplex(session);

    return el("div", {}, [
      statusBanner(),
      banner("Private Cabanas"),
      chipLine(),
      el("div", { className: "panel hotel-panel pool-zone-view" }, [
        el("p", { className: "subtitle", textContent: POOL_ZONES.cabanas.description }),
        pc.flags.cabana_booked
          ? el("p", { className: "success", textContent: "Your cabana is booked." })
          : el("p", { className: "dim", textContent: "Book for $200 — shade, privacy, implied bottle service." }),
        log,
        el("ul", { className: "menu-list" }, [
          menuBtn("Book cabana ($200)", () => {
            runAction(log, bookCabana(session), { refresh: true });
          }),
          menuBtn("Bottle service ($85)", () => {
            runAction(log, cabanaService(session, "bottle"), { refresh: true });
          }),
          menuBtn("Afternoon nap", () => {
            runAction(log, cabanaService(session, "nap"));
          }),
          menuBtn("People-watch the wave pool", () => {
            runAction(log, cabanaService(session, "people_watch"));
          }),
          menuBtn("Back to pool complex", () => navigateTo("pool-complex"), true),
        ]),
      ]),
    ]);
  }

  function renderPoolReef() {
    const log = el("div", { className: "log-area hotel-log" });
    const pc = ensurePoolComplex(session);
    enterZone(session, "shark_reef");
    persist();

    const photoButtons = Object.values(SHARK_SPECIES).map((sp) =>
      menuBtn(`📷 ${sp.label}`, () => {
        runAction(log, photographShark(session, sp.id), { refresh: true });
      }),
    );

    return el("div", {}, [
      statusBanner(),
      banner("Shark Reef Aquarium"),
      chipLine(),
      el("div", { className: "panel hotel-panel pool-zone-view" }, [
        el("p", { className: "subtitle", textContent: POOL_ZONES.shark_reef.description }),
        el("p", { className: "dim", textContent: `${pc.sharkPhotos.length}/5 species photographed — unlock Reef Photographer.` }),
        log,
        el("ul", { className: "menu-list" }, [
          ...photoButtons,
          menuBtn("Back to pool complex", () => navigateTo("pool-complex"), true),
        ]),
      ]),
    ]);
  }

  function renderPoolBeachClub() {
    const log = el("div", { className: "log-area hotel-log" });
    const pc = ensurePoolComplex(session);

    return el("div", {}, [
      statusBanner(),
      banner("Topless Beach Club — 21+"),
      chipLine(),
      el("div", { className: "panel hotel-panel pool-zone-view" }, [
        el("p", { className: "subtitle", textContent: POOL_ZONES.beach_club.description }),
        pc.flags.beach_club_pass
          ? el("p", { className: "success", textContent: "Pass active — welcome back." })
          : el("p", { className: "warning", textContent: "Cover charge: $75 · 21+ only" }),
        log,
        el("ul", { className: "menu-list" }, [
          menuBtn("Enter / show pass ($75 first visit)", () => {
            runAction(log, enterBeachClub(session), { refresh: true });
          }),
          menuBtn("Pool bar — frozen cocktail ($18)", () => {
            runAction(log, beachClubAction(session, "bar"), { refresh: true });
          }),
          menuBtn("Claim a sun deck lounger", () => {
            runAction(log, beachClubAction(session, "sun_deck"));
          }),
          menuBtn("VIP rope section ($50)", () => {
            runAction(log, beachClubAction(session, "vip_rope"), { refresh: true });
          }),
          menuBtn("Back to pool complex", () => navigateTo("pool-complex"), true),
        ]),
      ]),
    ]);
  }

  function renderPoolRave() {
    const log = el("div", { className: "log-area hotel-log" });
    enterZone(session, "beach_rave");
    persist();

    function doMove(moveIndex) {
      const res = submitRaveMove(session, moveIndex);
      renderAmenityLog(log, res);
      flashResult(res);
      persist();
      if (res.message.includes("Sequence hit")) render();
    }

    return el("div", {}, [
      statusBanner(),
      banner("Beach Rave"),
      chipLine(),
      el("div", { className: "panel hotel-panel pool-zone-view" }, [
        el("p", { className: "subtitle", textContent: POOL_ZONES.beach_rave.description }),
        el("p", { className: "dim", textContent: "Match the DJ's three-move sequence to unlock Rave Til Dawn." }),
        log,
        el("ul", { className: "menu-list" }, [
          menuBtn("Start dance sequence", () => {
            runAction(log, startRaveDance(session));
          }),
          menuBtn("Fist pump", () => doMove(0)),
          menuBtn("Shuffling", () => doMove(1)),
          menuBtn("Glow spin", () => doMove(2)),
          menuBtn("Back to pool complex", () => navigateTo("pool-complex"), true),
        ]),
      ]),
    ]);
  }

  function renderPoolEvents() {
    const pc = ensurePoolComplex(session);
    const unlocked = getUnlockedPoolEvents(session);
    const locked = Object.values(POOL_EVENTS).filter((e) => !pc.unlockedEvents.includes(e.id));

    return el("div", {}, [
      banner("Pool Complex Event Log"),
      chipLine(),
      el("div", { className: "panel hotel-panel pool-zone-view" }, [
        unlocked.length
          ? el("ul", { className: "room-events-list" },
              unlocked.map((evt) => el("li", {}, [
                el("strong", { textContent: evt.label }),
                el("span", { textContent: ` — ${evt.narrative}` }),
              ])))
          : el("p", { className: "dim", textContent: "Nothing unlocked yet." }),
        locked.length
          ? el("div", { className: "room-events-locked" }, [
              el("p", { className: "dim", textContent: "Still on the table:" }),
              el("ul", { className: "room-events-list dim" },
                locked.map((evt) => el("li", { textContent: evt.label }))),
            ])
          : null,
        el("ul", { className: "menu-list" }, [
          menuBtn("Back to pool complex", () => navigateTo("pool-complex"), true),
        ]),
      ]),
    ]);
  }

  return {
    "pool-complex": renderPoolComplexHub,
    "pool-wave": renderPoolWave,
    "pool-hot-tubs": renderPoolHotTubs,
    "pool-cabanas": renderPoolCabanas,
    "pool-reef": renderPoolReef,
    "pool-beach-club": renderPoolBeachClub,
    "pool-rave": renderPoolRave,
    "pool-events": renderPoolEvents,
  };
}
