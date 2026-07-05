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
    session, pushView, goBack, persist, render, el, banner, chipLine,
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

  function renderAmenityLog(log, result) {
    log.replaceChildren();
    for (const line of result.message.split("\n")) {
      log.appendChild(el("div", { className: `line ${result.ok ? "success" : "error"}`, textContent: line }));
    }
  }

  function renderPoolComplexHub() {
    ensurePoolComplex(session);
    const summary = getPoolSummary(session);
    const unlocked = getUnlockedPoolEvents(session);

    return el("div", {}, [
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
          menuBtn("Back to hotel lobby", () => pushView("hotel-lobby")),
          menuBtn("Back", goBack, true),
        ]),
      ]),
    ]);
  }

  function renderPoolWave() {
    const log = el("div", { className: "log-area hotel-log" });
    enterZone(session, "wave_pool");
    persist();

    return el("div", {}, [
      banner("Wave Pool"),
      chipLine(),
      el("div", { className: "panel hotel-panel pool-zone-view" }, [
        el("p", { className: "subtitle", textContent: POOL_ZONES.wave_pool.description }),
        log,
        el("p", { className: "dim", textContent: "Catch the wave — pick your timing:" }),
        el("ul", { className: "menu-list" }, [
          menuBtn("Jump early", () => { renderAmenityLog(log, playCatchWave(session, 0)); persist(); }),
          menuBtn("Ride the crest", () => { renderAmenityLog(log, playCatchWave(session, 1)); persist(); render(); }),
          menuBtn("Bail late", () => { renderAmenityLog(log, playCatchWave(session, 2)); persist(); render(); }),
        ]),
        el("p", { className: "dim", textContent: "Ring toss — $10 minimum:" }),
        el("ul", { className: "menu-list" }, [
          menuBtn("Toss at inner tube ($25)", () => {
            renderAmenityLog(log, playRingToss(session, 25, 0)); persist(); render();
          }),
          menuBtn("Toss at lifeguard tower ($50)", () => {
            renderAmenityLog(log, playRingToss(session, 50, 1)); persist(); render();
          }),
          menuBtn("Toss at cabana post ($100)", () => {
            renderAmenityLog(log, playRingToss(session, 100, 2)); persist(); render();
          }),
          menuBtn("Back to pool complex", () => pushView("pool-complex")),
          menuBtn("Back", goBack, true),
        ]),
      ]),
    ]);
  }

  function renderPoolHotTubs() {
    const log = el("div", { className: "log-area hotel-log" });
    enterZone(session, "hot_tubs");
    persist();

    return el("div", {}, [
      banner("Hot Tubs"),
      chipLine(),
      el("div", { className: "panel hotel-panel pool-zone-view" }, [
        el("p", { className: "subtitle", textContent: POOL_ZONES.hot_tubs.description }),
        log,
        el("ul", { className: "menu-list" }, [
          menuBtn("Overhear gossip — Steve Harvey at the reef?", () => {
            renderAmenityLog(log, soakHotTub(session, "gossip")); persist(); render();
          }),
          menuBtn("Relax & soak", () => {
            renderAmenityLog(log, soakHotTub(session, "relax")); persist();
          }),
          menuBtn("Odds-checking challenge", () => {
            renderAmenityLog(log, soakHotTub(session, "challenge")); persist();
          }),
          menuBtn("Back to pool complex", () => pushView("pool-complex")),
          menuBtn("Back", goBack, true),
        ]),
      ]),
    ]);
  }

  function renderPoolCabanas() {
    const log = el("div", { className: "log-area hotel-log" });
    const pc = ensurePoolComplex(session);

    return el("div", {}, [
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
            renderAmenityLog(log, bookCabana(session)); persist(); render();
          }),
          menuBtn("Bottle service ($85)", () => {
            renderAmenityLog(log, cabanaService(session, "bottle")); persist(); render();
          }),
          menuBtn("Afternoon nap", () => {
            renderAmenityLog(log, cabanaService(session, "nap")); persist();
          }),
          menuBtn("People-watch the wave pool", () => {
            renderAmenityLog(log, cabanaService(session, "people_watch")); persist();
          }),
          menuBtn("Back to pool complex", () => pushView("pool-complex")),
          menuBtn("Back", goBack, true),
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
        renderAmenityLog(log, photographShark(session, sp.id)); persist(); render();
      }),
    );

    return el("div", {}, [
      banner("Shark Reef Aquarium"),
      chipLine(),
      el("div", { className: "panel hotel-panel pool-zone-view" }, [
        el("p", { className: "subtitle", textContent: POOL_ZONES.shark_reef.description }),
        el("p", { className: "dim", textContent: `${pc.sharkPhotos.length}/5 species photographed — unlock Reef Photographer.` }),
        log,
        el("ul", { className: "menu-list" }, [
          ...photoButtons,
          menuBtn("Back to pool complex", () => pushView("pool-complex")),
          menuBtn("Back", goBack, true),
        ]),
      ]),
    ]);
  }

  function renderPoolBeachClub() {
    const log = el("div", { className: "log-area hotel-log" });
    const pc = ensurePoolComplex(session);

    return el("div", {}, [
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
            renderAmenityLog(log, enterBeachClub(session)); persist(); render();
          }),
          menuBtn("Pool bar — frozen cocktail ($18)", () => {
            renderAmenityLog(log, beachClubAction(session, "bar")); persist(); render();
          }),
          menuBtn("Claim a sun deck lounger", () => {
            renderAmenityLog(log, beachClubAction(session, "sun_deck")); persist();
          }),
          menuBtn("VIP rope section ($50)", () => {
            renderAmenityLog(log, beachClubAction(session, "vip_rope")); persist(); render();
          }),
          menuBtn("Back to pool complex", () => pushView("pool-complex")),
          menuBtn("Back", goBack, true),
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
      persist();
      if (res.message.includes("Sequence hit")) render();
    }

    return el("div", {}, [
      banner("Beach Rave"),
      chipLine(),
      el("div", { className: "panel hotel-panel pool-zone-view" }, [
        el("p", { className: "subtitle", textContent: POOL_ZONES.beach_rave.description }),
        el("p", { className: "dim", textContent: "Match the DJ's three-move sequence to unlock Rave Til Dawn." }),
        log,
        el("ul", { className: "menu-list" }, [
          menuBtn("Start dance sequence", () => {
            renderAmenityLog(log, startRaveDance(session)); persist();
          }),
          menuBtn("Fist pump", () => doMove(0)),
          menuBtn("Shuffling", () => doMove(1)),
          menuBtn("Glow spin", () => doMove(2)),
          menuBtn("Back to pool complex", () => pushView("pool-complex")),
          menuBtn("Back", goBack, true),
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
          menuBtn("Back to pool complex", () => pushView("pool-complex")),
          menuBtn("Back", goBack, true),
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
