import { signedChips } from "./core.js";
import {
  ensureHotel, getRoomType, getProperty, reservationHint, findReservation,
  currentHallwayBeat, hallwayChoice, upgradeRoom, extendStay, resetHallway,
  isNetPositive, sessionNetChips,
} from "./hotel.js";

/**
 * Hotel view renderers for the digital casino.
 * @param {object} ctx
 */
export function buildHotelRenderers(ctx) {
  const {
    session, rewardsPhone, pushView, goBack, persist, render, el, banner, chipLine, statusBanner,
  } = ctx;

  const tracker = () => rewardsPhone?.tracker ?? null;

  function menuBtn(label, onclick, isBack = false) {
    return el("li", {}, [
      el("button", {
        className: "menu-btn" + (isBack ? " back" : ""),
        textContent: label,
        onclick,
      }),
    ]);
  }

  function appendResult(log, res) {
    log.appendChild(el("div", { className: `line ${res.ok ? "success" : "error"}`, textContent: res.message }));
  }

  function hasUnredeemedComp(compId) {
    const r = session.rewards;
    if (!r) return false;
    return r.unlockedComps?.includes(compId) && !r.redeemedComps?.includes(compId);
  }

  function renderHotelLobby() {
    const hotel = ensureHotel(session);
    const room = getRoomType(hotel);
    const prop = getProperty(hotel);
    const netLine = isNetPositive(session)
      ? el("p", { className: "success", textContent: `Floor session net: ${signedChips(sessionNetChips(session))} — comps and upgrades available.` })
      : el("p", { className: "dim", textContent: "Hit the casino net-positive to extend your stay or pay for upgrades." });

    return el("div", {}, [
      statusBanner(),
      banner(`${prop.name} — Hotel`),
      chipLine(),
      el("div", { className: "panel hotel-panel" }, [
        el("p", { className: "subtitle", textContent: "Mandalay Bay Hotel Experience" }),
        el("p", { className: "dim", textContent: prop.tagline }),
        el("div", { className: "hotel-status" }, [
          el("p", { textContent: `Reservation: ${hotel.reservationCode}` }),
          el("p", { textContent: `Room: ${room.label} (${hotel.nightsRemaining} night(s))` }),
          hotel.foundReservation
            ? el("p", { className: "dim", textContent: reservationHint(hotel) })
            : el("p", { className: "warning", textContent: "Open MGM Rewards (P) → Reservation to locate your room." }),
          hotel.reachedRoom
            ? el("p", { className: "success", textContent: `You're in — room ${hotel.roomNumber}.` })
            : null,
        ]),
        netLine,
        el("ul", { className: "menu-list" }, [
          menuBtn("Front Desk — Clerk Carmen", () => pushView("hotel-front-desk")),
          menuBtn("Find my room (hallway)", () => pushView("hotel-hallway")),
          hotel.reachedRoom ? menuBtn("Enter your room", () => pushView("hotel-room")) : null,
          menuBtn("Return to Casino Floor", () => { viewToHub(ctx); }),
          menuBtn("Back", goBack, true),
        ].filter(Boolean)),
      ]),
    ]);
  }

  function renderHotelFrontDesk() {
    const hotel = ensureHotel(session);
    const log = el("div", { className: "log-area" });
    const netPositive = isNetPositive(session);

    return el("div", {}, [
      banner("Front Desk — Clerk Carmen"),
      chipLine(),
      el("div", { className: "panel hotel-panel" }, [
        el("p", { className: "subtitle", textContent: "\"Welcome back. Carmen at the desk — how can I comp you today?\"" }),
        el("p", { className: "dim", textContent: `Conf ${hotel.reservationCode} · ${getRoomType(hotel).label}` }),
        log,
        el("ul", { className: "menu-list" }, [
          menuBtn("Locate reservation (desk terminal)", () => {
            const r = findReservation(session);
            log.appendChild(el("div", { className: "line dim", textContent: r.hint }));
            if (r.clue) log.appendChild(el("div", { className: "line success", textContent: r.clue }));
            tracker()?.pushNotification("Reservation Found", r.clue ?? r.hint);
            rewardsPhone?.sync();
            persist();
          }),
          menuBtn("Upgrade to Panorama Suite", () => {
            appendResult(log, upgradeRoom(session, "suite", tracker()));
            persist();
            render();
          }),
          menuBtn("Upgrade to Chairman Penthouse", () => {
            appendResult(log, upgradeRoom(session, "penthouse", tracker()));
            persist();
            render();
          }),
          menuBtn("Extend stay (+1 night)", () => {
            appendResult(log, extendStay(session, 1, tracker()));
            persist();
            render();
          }),
          netPositive
            ? el("p", { className: "dim", textContent: "Net-positive — paid upgrades available if comps are spent." })
            : el("p", { className: "dim", textContent: "Unlock room comps via MGM Rewards tier play." }),
          menuBtn("Back to hotel lobby", () => pushView("hotel-lobby")),
          menuBtn("Back", goBack, true),
        ]),
      ]),
    ]);
  }

  function renderHotelHallway() {
    const hotel = ensureHotel(session);
    const log = el("div", { className: "log-area hotel-log" });
    for (const line of hotel.hallwayLog.slice(-6)) {
      log.appendChild(el("div", { className: "line dim", textContent: line }));
    }

    if (!hotel.foundReservation) {
      return el("div", {}, [
        banner("Hotel Hallways"),
        el("div", { className: "panel" }, [
          el("p", { className: "error", textContent: "You don't know which tower you're in. Press P → Reservation on your MGM Rewards phone." }),
          el("div", { className: "action-bar" }, [
            el("button", { className: "btn", textContent: "Back", onclick: goBack }),
          ]),
        ]),
      ]);
    }

    if (hotel.reachedRoom) {
      return el("div", {}, [
        banner("Your Door"),
        el("div", { className: "panel" }, [
          el("p", { className: "success", textContent: `Room ${hotel.roomNumber}. The key card works. Eventually.` }),
          el("div", { className: "action-bar" }, [
            el("button", { className: "btn primary", textContent: "Enter room", onclick: () => pushView("hotel-room") }),
            el("button", { className: "btn", textContent: "Back", onclick: goBack }),
          ]),
        ]),
      ]);
    }

    const beat = currentHallwayBeat(session);
    const choiceItems = beat
      ? beat.choices(hotel).map((c, i) => menuBtn(c.label, () => {
          const res = hallwayChoice(session, i);
          if (res.quip) {
            log.appendChild(el("div", { className: `line ${res.success ? "success" : "dim"}`, textContent: res.quip }));
          }
          persist();
          if (res.done) pushView("hotel-room");
          else render();
        }))
      : [];

    return el("div", {}, [
      banner("Hotel Hallways"),
      chipLine(),
      el("div", { className: "panel hotel-panel" }, [
        el("p", { className: "subtitle", textContent: beat?.text ?? "You wander." }),
        log,
        el("ul", { className: "menu-list" }, [
          ...choiceItems,
          menuBtn("Start over (lobby elevator)", () => { resetHallway(session); persist(); render(); }),
          menuBtn("Back", goBack, true),
        ]),
      ]),
    ]);
  }

  function renderHotelRoom() {
    const hotel = ensureHotel(session);
    const room = getRoomType(hotel);
    return el("div", {}, [
      banner(room.label),
      chipLine(),
      el("div", { className: "panel hotel-panel hotel-room-view" }, [
        el("p", { className: "subtitle", textContent: `Room ${hotel.roomNumber} · Floor ${hotel.floor}` }),
        el("p", { textContent: room.description }),
        el("p", { className: "dim", textContent: `${hotel.nightsRemaining} night(s) remaining. The bay glitters below.` }),
        el("ul", { className: "menu-list" }, [
          menuBtn("Return to casino floor", () => viewToHub(ctx)),
          menuBtn("Hotel lobby", () => pushView("hotel-lobby")),
          menuBtn("Back", goBack, true),
        ]),
      ]),
    ]);
  }

  return {
    "hotel-lobby": renderHotelLobby,
    "hotel-front-desk": renderHotelFrontDesk,
    "hotel-hallway": renderHotelHallway,
    "hotel-room": renderHotelRoom,
  };
}

function viewToHub(ctx) {
  ctx.viewStack.length = 0;
  ctx.viewStack.push({ name: "hub", data: {} });
  ctx.render();
}
