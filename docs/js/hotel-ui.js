import { signedChips, fmtChips } from "./core.js";
import {
  ensureHotel, getRoomType, getProperty, reservationHint, findReservation, findReservationAtDesk,
  currentHallwayBeat, hallwayChoice, upgradeRoom, extendStay, resetHallway,
  isNetPositive, sessionNetChips, reviewFolio, lateCheckout, triggerWakeUpCall,
  checkoutStay, expressCheckout, getWorldCycleSummary, settleHotelOverdue, reservationStatusMessage,
  canAccessHotelRoom,
} from "./hotel.js";
import {
  loadGuestRegistry, listAllGuests, signGuestDirectory, hasSigned, formatSignedAt,
} from "./guest-directory.js";
import {
  MINIBAR_ITEMS, ROOM_EVENTS,
  tuneTvChannel, purchaseMinibarItem, makePhoneCall, makeRoomDecision,
  getUnlockedEvents, getRoomAmenitiesSummary, ensureRoomAmenities,
  filterTvChannels, filterPhoneCalls, filterRoomDecisions,
  getSessionResortPhase, getEventHint, conciergeMinibarNudge,
} from "./room-amenities.js";
import { getResortCompletion, maybeAutoSignGuestBook } from "./resort-completion.js";

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

  function renderWorldCycleBanner() {
    const cycle = getWorldCycleSummary(session);
    const hotel = ensureHotel(session);
    const evicted = cycle.roomEvicted;
    return el("div", { className: `world-cycle-banner resort-time-${cycle.phase.id}` }, [
      el("p", { className: "subtitle", textContent: `Day ${cycle.displayDay} · ${cycle.phaseLabel}` }),
      el("p", { className: "dim", textContent: `${cycle.timeLabel} · Daily charges: ${fmtChips(cycle.dailyTotal)}` }),
      el("p", { className: "dim", textContent: cycle.statusMessage }),
      evicted
        ? el("p", { className: "warning", textContent: `Room locked — ${cycle.overdueBalance > 0 ? `$${cycle.overdueBalance.toLocaleString()} overdue` : "settle at front desk"}. Hit the casino floor.` })
        : null,
    ]);
  }

  function renderResortCompletionPanel() {
    const completion = getResortCompletion(session);
    return el("div", { className: "resort-completion-panel" }, [
      el("p", { className: "subtitle", textContent: `Resort completion — ${completion.percent}%` }),
      el("p", { className: "dim", textContent: completion.tagline }),
      el("ul", { className: "resort-completion-list dim" },
        completion.items.map((item) => el("li", {
          textContent: `${item.label}: ${item.current}/${item.total}`,
        }))),
    ]);
  }

  function renderRoomSchematic(onZone) {
    const zones = [
      { id: "tv", label: "TV", row: 0, col: 0 },
      { id: "minibar", label: "Minibar", row: 0, col: 1 },
      { id: "phone", label: "Phone", row: 1, col: 0 },
      { id: "balcony", label: "Balcony", row: 1, col: 1 },
      { id: "bed", label: "Bed", row: 2, col: 0, span: 2 },
    ];
    const grid = el("div", { className: "room-schematic-grid" });
    for (const zone of zones) {
      grid.appendChild(el("button", {
        className: "room-schematic-zone",
        textContent: zone.label,
        style: zone.span ? "grid-column: span 2" : "",
        onclick: () => onZone(zone.id),
      }));
    }
    return el("div", { className: "room-schematic" }, [
      el("p", { className: "dim", textContent: "Tap a zone — or use the menus below." }),
      grid,
    ]);
  }

  function schematicZoneView(zoneId) {
    const map = {
      tv: "hotel-room-tv",
      minibar: "hotel-room-minibar",
      phone: "hotel-room-phone",
      balcony: "hotel-room-decisions",
      bed: "hotel-room-decisions",
    };
    pushView(map[zoneId] ?? "hotel-room");
  }
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
        renderWorldCycleBanner(),
        renderResortCompletionPanel(),
        el("ul", { className: "menu-list" }, [
          menuBtn("Front Desk — Clerk Carmen", () => pushView("hotel-front-desk")),
          menuBtn("Guest Directory — lobby guest book", () => pushView("hotel-guest-directory")),
          menuBtn("Find my room (hallway)", () => pushView("hotel-hallway")),
          menuBtn("Pool Complex — 11-acre expansion pack", () => pushView("pool-complex")),
          hotel.reachedRoom ? menuBtn("Enter your room", () => pushView("hotel-room")) : null,
          canAccessHotelRoom(session) && hotel.reachedRoom ? null
            : el("p", { className: "dim", textContent: reservationStatusMessage(session) }),
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
            const r = findReservationAtDesk(session);
            log.appendChild(el("div", { className: `line ${r.ok ? "success" : "error"}`, textContent: r.message }));
            if (r.ok) tracker()?.pushNotification("Desk Check-In", r.message);
            persist();
            render();
          }),
          menuBtn("Settle overdue resort charges", () => {
            appendResult(log, settleHotelOverdue(session));
            persist();
            render();
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
          menuBtn("Review folio (checkout preview)", () => {
            appendResult(log, reviewFolio(session));
            persist();
          }),
          menuBtn("Late checkout (+2 hours)", () => {
            appendResult(log, lateCheckout(session, tracker()));
            persist();
          }),
          menuBtn("Express checkout (Pearl+)", () => {
            appendResult(log, expressCheckout(session));
            persist();
            render();
          }),
          menuBtn("Standard checkout", () => {
            appendResult(log, checkoutStay(session));
            persist();
            render();
          }),
          hotel.nightsRemaining === 0
            ? el("p", { className: "warning", textContent: "Last night — extend stay or check out before the carpet claims you." })
            : null,
          menuBtn("Guest Directory — sign the lobby book", () => pushView("hotel-guest-directory")),
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

    if (!hotel.foundReservation && !reservationAccessMet(session)) {
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

  function renderGuestDirectoryPanel(container, { showSignForm = true } = {}) {
    container.replaceChildren(el("p", { className: "dim", textContent: "Opening the guest book…" }));
    Promise.all([loadGuestRegistry(), listAllGuests()]).then(([registry, guests]) => {
      container.replaceChildren();
      container.appendChild(el("p", { className: "subtitle", textContent: registry.title }));
      if (registry.subtitle) {
        container.appendChild(el("p", { className: "dim guest-directory-intro", textContent: registry.subtitle }));
      }
      container.appendChild(el("p", {
        className: "dim guest-directory-count",
        textContent: `${guests.length} signature${guests.length === 1 ? "" : "s"} on record — past guests remain visible to everyone.`,
      }));

      const list = el("ol", { className: "guest-directory-list" });
      for (const guest of guests) {
        list.appendChild(el("li", { className: "guest-directory-entry" + (guest.seed ? " seed" : "") }, [
          el("span", { className: "guest-directory-name", textContent: guest.name }),
          el("span", { className: "guest-directory-date dim", textContent: formatSignedAt(guest.signedAt) }),
          guest.note ? el("p", { className: "guest-directory-note dim", textContent: guest.note }) : null,
        ].filter(Boolean)));
      }
      container.appendChild(list);

      if (showSignForm) {
        const playerName = session.playerName?.trim() || "Guest";
        const alreadySigned = hasSigned(playerName);
        const form = el("div", { className: "guest-directory-sign" });
        form.appendChild(el("p", { className: "subtitle", textContent: "Sign the guest book" }));
        const nameInput = el("input", {
          className: "guest-directory-input",
          type: "text",
          maxLength: 64,
          value: playerName,
          placeholder: "Your name",
          disabled: alreadySigned,
        });
        const noteInput = el("input", {
          className: "guest-directory-input",
          type: "text",
          maxLength: 160,
          placeholder: "Optional note (room, occasion, etc.)",
          disabled: alreadySigned,
        });
        const feedback = el("div", { className: "log-area guest-directory-feedback" });
        const signBtn = el("button", {
          className: "btn primary",
          textContent: alreadySigned ? "Already signed" : "Sign guest book",
          disabled: alreadySigned,
          onclick: () => {
            feedback.replaceChildren();
            const result = signGuestDirectory(nameInput.value, noteInput.value);
            if (!result.ok) {
              feedback.appendChild(el("div", { className: "line error", textContent: result.message }));
              return;
            }
            feedback.appendChild(el("div", {
              className: "line success",
              textContent: `${result.entry.name} signed the guest directory.`,
            }));
            renderGuestDirectoryPanel(container, { showSignForm: true });
          },
        });
        form.appendChild(nameInput);
        form.appendChild(noteInput);
        form.appendChild(signBtn);
        form.appendChild(feedback);
        if (alreadySigned) {
          form.appendChild(el("p", {
            className: "dim",
            textContent: `"${playerName}" is already in the directory. Every past signature stays on the list.`,
          }));
        }
        container.appendChild(form);
      }
    }).catch(() => {
      container.replaceChildren(el("p", { className: "error", textContent: "Could not load the guest directory." }));
    });
  }

  function renderHotelGuestDirectory() {
    const book = el("div", { className: "guest-directory-book" });
    renderGuestDirectoryPanel(book);
    return el("div", {}, [
      banner("Guest Directory"),
      chipLine(),
      el("div", { className: "panel hotel-panel guest-directory-panel" }, [
        el("p", { className: "dim", textContent: "Leather-bound lobby guest book — hardcoded roster plus every visitor signature." }),
        book,
        el("ul", { className: "menu-list" }, [
          menuBtn("Back to hotel lobby", () => pushView("hotel-lobby")),
          menuBtn("Back", goBack, true),
        ]),
      ]),
    ]);
  }

  function renderAmenityLog(log, result) {
    for (const line of result.message.split("\n")) {
      log.appendChild(el("div", { className: `line ${result.ok ? "success" : "error"}`, textContent: line }));
    }
  }

  function renderHotelRoom() {
    const hotel = ensureHotel(session);
    const room = getRoomType(hotel);
    ensureRoomAmenities(hotel);
    const unlocked = getUnlockedEvents(hotel);
    const summary = getRoomAmenitiesSummary(hotel);
    const time = getSessionResortPhase(session);
    const timeClass = `hotel-room-view resort-time-${time.slot}`;

    if (!canAccessHotelRoom(session) && hotel.reachedRoom) {
      hotel.reachedRoom = false;
    }

    if (unlocked.length >= Object.keys(ROOM_EVENTS).length) {
      const auto = maybeAutoSignGuestBook(session, session.playerName?.trim() || "Guest");
      if (auto && !hasSigned(auto.name)) {
        signGuestDirectory(auto.name, auto.note);
      }
    }

    return el("div", {}, [
      banner(room.label),
      chipLine(),
      el("div", { className: `panel hotel-panel hotel-room-view ${timeClass}` }, [
        el("p", { className: "subtitle", textContent: `Room ${hotel.roomNumber} · Floor ${hotel.floor}` }),
        el("p", { textContent: room.description }),
        el("p", { className: "dim", textContent: `${hotel.nightsRemaining} night(s) remaining · ${time.label}` }),
        hotel.nightsRemaining === 0
          ? el("p", { className: "warning", textContent: "Checkout day — Carmen awaits at the front desk." })
          : null,
        el("p", { className: "room-amenities-summary dim", textContent: summary }),
        renderWorldCycleBanner(),
        renderRoomSchematic(schematicZoneView),
        unlocked.length
          ? el("div", { className: "room-events-unlocked" }, [
              el("p", { className: "subtitle", textContent: "Unlocked events" }),
              el("ul", { className: "room-events-list" },
                unlocked.map((evt) => el("li", { textContent: `${evt.label} — ${evt.narrative}` }))),
            ])
          : el("p", { className: "dim", textContent: "Mix TV, minibar, phone calls, and bad decisions to unlock Vegas vignettes." }),
        renderResortCompletionPanel(),
        el("ul", { className: "menu-list" }, [
          menuBtn("TV — aquarium channel & resort loops", () => pushView("hotel-room-tv")),
          menuBtn("Minibar — sensor-enabled debauchery", () => pushView("hotel-room-minibar")),
          menuBtn("Room phone — unlimited foreign calls", () => pushView("hotel-room-phone")),
          menuBtn("Room decisions — balcony, DND, room service", () => pushView("hotel-room-decisions")),
          menuBtn("Event log — your Vegas highlight reel", () => pushView("hotel-room-events")),
          menuBtn("Guest Directory — bedside guest book", () => pushView("hotel-guest-directory")),
          menuBtn("Checkout — front desk folio", () => pushView("hotel-front-desk")),
          menuBtn("Return to casino floor", () => viewToHub(ctx)),
          menuBtn("Hotel lobby", () => pushView("hotel-lobby")),
          menuBtn("Back", goBack, true),
        ]),
      ]),
    ]);
  }

  function renderHotelRoomTv() {
    const hotel = ensureHotel(session);
    const ra = ensureRoomAmenities(hotel);
    const log = el("div", { className: "log-area hotel-log tv-glow" });
    const channels = filterTvChannels(session, hotel);

    const channelButtons = channels.map((ch) =>
      menuBtn(ch.label, () => {
        const res = tuneTvChannel(session, ch.id);
        log.replaceChildren();
        renderAmenityLog(log, res);
        tracker()?.pushNotification("In-Room TV", ch.label);
        persist();
      }),
    );

    return el("div", {}, [
      banner("In-Room TV"),
      chipLine(),
      el("div", { className: "panel hotel-panel hotel-room-view tv-glow" }, [
        el("p", { className: "subtitle", textContent: "Resort channels — aquarium cam is channel 47" }),
        ra.tvChannel
          ? el("p", { className: "dim", textContent: `Now playing: ${channels.find((c) => c.id === ra.tvChannel)?.label ?? ra.tvChannel}` })
          : null,
        log,
        el("ul", { className: "menu-list" }, [
          ...channelButtons,
          menuBtn("Back to room", () => pushView("hotel-room")),
          menuBtn("Back", goBack, true),
        ]),
      ]),
    ]);
  }

  function renderHotelRoomMinibar() {
    const hotel = ensureHotel(session);
    const ra = ensureRoomAmenities(hotel);
    const log = el("div", { className: "log-area hotel-log minibar-neon" });
    const nudge = conciergeMinibarNudge(session);

    const itemButtons = Object.values(MINIBAR_ITEMS).map((item) =>
      menuBtn(`${item.label} — $${item.price}`, () => {
        const res = purchaseMinibarItem(session, item.id);
        log.replaceChildren();
        renderAmenityLog(log, res);
        if (res.ok) tracker()?.pushNotification("Minibar", item.label);
        persist();
        render();
      }),
    );

    return el("div", {}, [
      banner("Minibar"),
      chipLine(),
      el("div", { className: "panel hotel-panel hotel-room-view minibar-neon" }, [
        el("p", { className: "subtitle", textContent: "Everything costs triple. The sensor never sleeps." }),
        el("p", { className: "dim concierge-nudge", textContent: nudge.message }),
        ra.minibarTab > 0
          ? el("p", { className: "warning", textContent: `Running tab: $${ra.minibarTab.toLocaleString()}` })
          : el("p", { className: "dim", textContent: "The minibar hums. Judgment included." }),
        log,
        el("ul", { className: "menu-list" }, [
          ...itemButtons,
          menuBtn("Back to room", () => pushView("hotel-room")),
          menuBtn("Back", goBack, true),
        ]),
      ]),
    ]);
  }

  function renderHotelRoomPhone() {
    const hotel = ensureHotel(session);
    const ra = ensureRoomAmenities(hotel);
    const log = el("div", { className: "log-area hotel-log" });
    const calls = filterPhoneCalls(session, hotel);

    const callButtons = calls.map((call) =>
      menuBtn(call.label, () => {
        const res = makePhoneCall(session, call.id);
        log.replaceChildren();
        renderAmenityLog(log, res);
        tracker()?.pushNotification("Room Phone", call.destination);
        persist();
      }),
    );

    return el("div", {}, [
      banner("Room Phone"),
      chipLine(),
      el("div", { className: "panel hotel-panel hotel-room-view" }, [
        el("p", { className: "subtitle", textContent: "Unlimited foreign calls — Mandalay Bay absorbs the guilt" }),
        el("p", { className: "dim", textContent: "House of Blues, spa, Foundation Room, Delano — dial the Strip." }),
        ra.phoneCalls.length
          ? el("p", { className: "dim", textContent: `${ra.phoneCalls.length} call(s) on this stay.` })
          : null,
        log,
        el("ul", { className: "menu-list" }, [
          ...callButtons,
          menuBtn("Back to room", () => pushView("hotel-room")),
          menuBtn("Back", goBack, true),
        ]),
      ]),
    ]);
  }

  function renderHotelRoomDecisions() {
    const hotel = ensureHotel(session);
    const log = el("div", { className: "log-area hotel-log" });
    const decisions = filterRoomDecisions(session, hotel);

    const decisionButtons = decisions.map((dec) => {
      const priceTag = dec.price ? ` — $${dec.price}` : "";
      return menuBtn(`${dec.label}${priceTag}`, () => {
        const res = makeRoomDecision(session, dec.id);
        log.replaceChildren();
        renderAmenityLog(log, res);
        persist();
        render();
      });
    });

    return el("div", {}, [
      banner("Room Decisions"),
      chipLine(),
      el("div", { className: "panel hotel-panel hotel-room-view" }, [
        el("p", { className: "subtitle", textContent: "Small choices. Large room charges." }),
        hotel.roomType === "penthouse"
          ? el("p", { className: "dim", textContent: "Penthouse perks: telescope, butler, Foundation access." })
          : hotel.roomType === "suite"
            ? el("p", { className: "dim", textContent: "Suite living room and Strip-facing balcony available." })
            : null,
        log,
        el("ul", { className: "menu-list" }, [
          ...decisionButtons,
          menuBtn("Trigger wake-up call now", () => {
            appendResult(log, triggerWakeUpCall(session));
            persist();
          }),
          menuBtn("Back to room", () => pushView("hotel-room")),
          menuBtn("Back", goBack, true),
        ]),
      ]),
    ]);
  }

  function renderHotelRoomEvents() {
    const hotel = ensureHotel(session);
    const ra = ensureRoomAmenities(hotel);
    const unlocked = getUnlockedEvents(hotel);
    const locked = Object.values(ROOM_EVENTS).filter((e) => !ra.unlockedEvents.includes(e.id));

    return el("div", {}, [
      banner("Vegas Event Log"),
      chipLine(),
      el("div", { className: "panel hotel-panel hotel-room-view" }, [
        el("p", { className: "subtitle", textContent: "Unlockable vignettes from your in-room debauchery" }),
        unlocked.length
          ? el("div", { className: "room-events-unlocked" }, [
              el("p", { className: "success", textContent: `${unlocked.length} unlocked` }),
              el("ul", { className: "room-events-list" },
                unlocked.map((evt) => el("li", {}, [
                  el("strong", { textContent: evt.label }),
                  el("span", { textContent: ` — ${evt.narrative}` }),
                ]))),
            ])
          : el("p", { className: "dim", textContent: "Nothing unlocked yet. The sharks are waiting." }),
        locked.length
          ? el("div", { className: "room-events-locked" }, [
              el("p", { className: "dim", textContent: "Still on the table:" }),
              el("ul", { className: "room-events-list dim" },
                locked.map((evt) => el("li", {}, [
                  el("strong", { textContent: evt.label }),
                  el("span", { className: "event-hint", textContent: ` — ${getEventHint(evt.id)}` }),
                ]))),
            ])
          : null,
        el("ul", { className: "menu-list" }, [
          menuBtn("Back to room", () => pushView("hotel-room")),
          menuBtn("Back", goBack, true),
        ]),
      ]),
    ]);
  }

  return {
    "hotel-lobby": renderHotelLobby,
    "hotel-front-desk": renderHotelFrontDesk,
    "hotel-guest-directory": renderHotelGuestDirectory,
    "hotel-hallway": renderHotelHallway,
    "hotel-room": renderHotelRoom,
    "hotel-room-tv": renderHotelRoomTv,
    "hotel-room-minibar": renderHotelRoomMinibar,
    "hotel-room-phone": renderHotelRoomPhone,
    "hotel-room-decisions": renderHotelRoomDecisions,
    "hotel-room-events": renderHotelRoomEvents,
  };
}

function viewToHub(ctx) {
  ctx.viewStack.length = 0;
  ctx.viewStack.push({ name: "hub", data: {} });
  ctx.render();
}
