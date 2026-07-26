import { signedChips, fmtChips } from "./core.js";
import {
  ensureHotel, getRoomType, getProperty, reservationHint, findReservation, findReservationAtDesk,
  currentHallwayBeat, hallwayChoice, upgradeRoom, extendStay, resetHallway, useRoomKeyToDoor,
  isNetPositive, sessionNetChips, reviewFolio, lateCheckout, triggerWakeUpCall,
  checkoutStay, expressCheckout, getWorldCycleSummary, settleHotelOverdue, reservationStatusMessage,
  canAccessHotelRoom, recordFrontDeskVisit, grantRoomKeyIfReservationReady,
} from "./hotel.js";
import {
  loadGuestRegistry, listAllGuests, signGuestDirectory, hasSigned, formatSignedAt,
} from "./guest-directory.js";
import {
  MINIBAR_ITEMS, ROOM_EVENTS,
  tuneTvChannel, purchaseMinibarItem, makePhoneCall, makeRoomDecision,
  getUnlockedEvents, getRoomAmenitiesSummary, ensureRoomAmenities,
  filterTvChannels, filterPhoneCalls, filterRoomDecisions, filterMinibarItems,
  getSessionResortPhase, getEventHint, conciergeMinibarNudge,
} from "./room-amenities.js";
import { getReservationRequirement } from "./world-cycle.js";
import { getResortCompletion, maybeAutoSignGuestBook } from "./resort-completion.js";
import * as diningApi from "./dining.js";

/**
 * Hotel view renderers for the digital casino.
 * @param {object} ctx
 */
export function buildHotelRenderers(ctx) {
  const {
    session, rewardsPhone, pushView, goBack, navigateTo, persist, render, el, banner, chipLine, statusBanner, showStatus,
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

  function ensureCarmenLog(hotel) {
    if (!Array.isArray(hotel.carmenDeskLog)) hotel.carmenDeskLog = [];
    return hotel.carmenDeskLog;
  }

  /** Persist Carmen dialogue so re-renders don't wipe her replies. */
  function pushCarmenLines(hotel, text, ok = true) {
    const log = ensureCarmenLog(hotel);
    const lines = String(text ?? "").split("\n").filter((line) => line.trim().length);
    if (!lines.length) {
      log.push({ ok, text: "Carmen: …terminal hiccup. Try that again." });
      return;
    }
    for (const line of lines) {
      const body = line.startsWith("Carmen:") ? line : `Carmen: ${line}`;
      log.push({ ok, text: body });
    }
    while (log.length > 24) log.shift();
  }

  function paintCarmenLog(container, hotel) {
    container.replaceChildren();
    for (const entry of ensureCarmenLog(hotel).slice(-12)) {
      container.appendChild(el("div", {
        className: `line ${entry.ok ? "success" : "error"}`,
        textContent: entry.text,
      }));
    }
  }

  function appendResult(log, res) {
    const hotel = ensureHotel(session);
    pushCarmenLines(hotel, res?.message ?? "No reply from the terminal.", Boolean(res?.ok));
    paintCarmenLog(log, hotel);
  }

  function carmenLine(log, text, ok = true) {
    const hotel = ensureHotel(session);
    pushCarmenLines(hotel, text, ok);
    paintCarmenLog(log, hotel);
  }

  /**
   * Run a Carmen desk action with visible feedback. Always showStatus + persist log,
   * then re-render so hallway / key options appear when check-in succeeds.
   */
  function carmenAction(log, fn, { notifyTitle = null, navigate = null } = {}) {
    const hotel = ensureHotel(session);
    try {
      const r = fn();
      const ok = Boolean(r?.ok);
      const message = r?.message ?? (ok ? "Done." : "That didn't work.");
      pushCarmenLines(hotel, message, ok);
      showStatus(String(message).split("\n")[0], ok ? "success" : "error");
      if (ok && notifyTitle) {
        try { tracker()?.pushNotification(notifyTitle, message); } catch { /* phone optional */ }
      }
      persist();
      if (navigate && ok) {
        navigate();
        return;
      }
      render();
    } catch (err) {
      const msg = err?.message ? `Terminal glitch — ${err.message}` : "Terminal glitch. Try again.";
      pushCarmenLines(hotel, msg, false);
      showStatus(msg, "error");
      persist();
      render();
    }
  }

  function renderWorldCycleBanner() {
    const cycle = getWorldCycleSummary(session);
    const evicted = cycle.roomEvicted;
    return el("div", { className: `world-cycle-banner resort-time-${cycle.phase.id}` }, [
      el("p", { className: "subtitle", textContent: `Day ${cycle.displayDay} · ${cycle.phaseLabel}` }),
      el("p", { className: "dim", textContent: `${cycle.vegasClock} · ${cycle.timeLabel} · Daily charges: ${fmtChips(cycle.dailyTotal)}` }),
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

  function openBalconySmokePov(opts = {}) {
    const overlay = ctx.balconySmokeOverlay;
    if (!overlay) {
      showStatus("Balcony POV overlay not ready.", "error");
      return false;
    }
    overlay.setSession(session);
    overlay.open(opts);
    return true;
  }

  function schematicZoneView(zoneId) {
    if (zoneId === "balcony") {
      const hotel = ensureHotel(session);
      if (hotel.roomType === "suite" || hotel.roomType === "penthouse") {
        if (openBalconySmokePov({ recordDecision: true })) return;
      }
    }
    const map = {
      tv: "hotel-room-tv",
      minibar: "hotel-room-minibar",
      phone: "hotel-room-phone",
      balcony: "hotel-room-decisions",
      bed: "hotel-room-decisions",
    };
    pushView(map[zoneId] ?? "hotel-room");
  }

  function renderHotelLobby() {
    const hotel = ensureHotel(session);
    grantRoomKeyIfReservationReady(session);
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
          canAccessHotelRoom(session) && hotel.foundReservation
            ? el("p", { className: "dim", textContent: reservationHint(hotel) })
            : !canAccessHotelRoom(session)
              ? el("p", { className: "warning", textContent: reservationStatusMessage(session) })
              : el("p", { className: "dim", textContent: reservationStatusMessage(session) }),
          hotel.reachedRoom
            ? el("p", { className: "success", textContent: `You're in — room ${hotel.roomNumber}.` })
            : hotel.roomKeyActive
              ? el("p", { className: "success", textContent: "Room key active — take the hallway (or ask Carmen to skip)." })
              : null,
        ]),
        netLine,
        renderWorldCycleBanner(),
        renderResortCompletionPanel(),
        el("ul", { className: "menu-list" }, [
          menuBtn("Front Desk — Clerk Carmen", () => pushView("hotel-front-desk")),
          menuBtn("Guest Directory — lobby guest book", () => pushView("hotel-guest-directory")),
          canAccessHotelRoom(session) && !hotel.reachedRoom
            ? menuBtn("Find my room (hallway)", () => pushView("hotel-hallway"))
            : null,
          canAccessHotelRoom(session) && hotel.roomKeyActive && !hotel.reachedRoom
            ? menuBtn("Use key — go straight to your door", () => {
                const r = useRoomKeyToDoor(session);
                showStatus(r.message, r.ok ? "success" : "error");
                persist();
                if (r.ok) pushView("hotel-room");
                else render();
              })
            : null,
          menuBtn("Pool Complex — 11-acre expansion pack", () => openPoolComplex("hub")),
          menuBtn("Gentleman's Club — The Velvet Ledger", () => pushView("gentlemans-club")),
          menuBtn("Horse Stables — meet the residents", () => pushView("horse-stables")),
          hotel.reachedRoom ? menuBtn("Enter your room", () => pushView("hotel-room")) : null,
          !canAccessHotelRoom(session) || !hotel.reachedRoom
            ? el("p", { className: "dim", textContent: reservationStatusMessage(session) })
            : null,
          menuBtn("Return to Casino Floor", () => { viewToHub(ctx); }),
          menuBtn("Back", goBack, true),
        ].filter(Boolean)),
      ]),
    ]);
  }

  function renderHotelFrontDesk() {
    const hotel = ensureHotel(session);
    grantRoomKeyIfReservationReady(session);
    const log = el("div", { className: "log-area hotel-log carmen-desk-log" });
    if (!ensureCarmenLog(hotel).length) {
      recordFrontDeskVisit(session);
      pushCarmenLines(
        hotel,
        `"Welcome back. Carmen at the desk — Conf ${hotel.reservationCode} is on my screen. How can I help?"`,
        true,
      );
      persist();
    }
    paintCarmenLog(log, hotel);
    const netPositive = isNetPositive(session);
    const access = canAccessHotelRoom(session);
    const req = getReservationRequirement(session);

    return el("div", {}, [
      banner("Front Desk — Clerk Carmen"),
      chipLine(),
      el("div", { className: "panel hotel-panel" }, [
        el("p", { className: "subtitle", textContent: "\"Welcome back. Carmen at the desk — how can I comp you today?\"" }),
        el("p", { className: "dim", textContent: `Conf ${hotel.reservationCode} · ${getRoomType(hotel).label} · ${req.label}` }),
        access
          ? el("p", {
            className: "success",
            textContent: hotel.reachedRoom
              ? `Checked in — Room ${hotel.roomNumber}. Enter when you're ready.`
              : `Key ready — Room ${hotel.roomNumber}. Find the hallway or skip to the door.`,
          })
          : el("p", { className: "warning", textContent: reservationStatusMessage(session) }),
        log,
        el("ul", { className: "menu-list" }, [
          menuBtn("Locate reservation (desk terminal)", () => {
            carmenAction(log, () => {
              const r = findReservationAtDesk(session);
              grantRoomKeyIfReservationReady(session);
              if (r.ok) {
                return {
                  ok: true,
                  message: `${r.message}\nYour key is active. Take the hallway — or I can skip you to the door.`,
                };
              }
              return r;
            }, { notifyTitle: "Desk Check-In" });
          }),
          access && !hotel.reachedRoom
            ? menuBtn("Find my room (hallway)", () => {
                carmenAction(log, () => ({
                  ok: true,
                  message: `South? North? Trust the carpet — Room ${hotel.roomNumber} is waiting.`,
                }), { navigate: () => pushView("hotel-hallway") });
              })
            : null,
          access && hotel.roomKeyActive && !hotel.reachedRoom
            ? menuBtn("Skip hallway — use key to door", () => {
                carmenAction(log, () => useRoomKeyToDoor(session), {
                  navigate: () => pushView("hotel-room"),
                });
              })
            : null,
          access && hotel.reachedRoom
            ? menuBtn("Enter your room", () => {
                carmenAction(log, () => ({
                  ok: true,
                  message: `Enjoy Room ${hotel.roomNumber}. Don't tip the minibar.`,
                }), { navigate: () => pushView("hotel-room") });
              })
            : null,
          menuBtn("Settle overdue resort charges", () => {
            carmenAction(log, () => {
              const r = settleHotelOverdue(session);
              if (r.ok) {
                return { ok: true, message: `${r.message}\nBalance clear. The carpet forgives — mostly.` };
              }
              return r;
            });
          }),
          menuBtn("Upgrade to Panorama Suite", () => {
            carmenAction(log, () => {
              const r = upgradeRoom(session, "suite", tracker());
              if (r.ok) {
                return {
                  ok: true,
                  message: `${r.message}\nSuite keys reprinting… check your phone Room tab, then locate again.`,
                };
              }
              return r;
            }, { notifyTitle: "Suite Upgrade" });
          }),
          menuBtn("Upgrade to Chairman Penthouse", () => {
            carmenAction(log, () => {
              const r = upgradeRoom(session, "penthouse", tracker());
              if (r.ok) {
                return {
                  ok: true,
                  message: `${r.message}\nPenthouse folio spun. Phone updated — locate again for the new door.`,
                };
              }
              return r;
            }, { notifyTitle: "Penthouse Upgrade" });
          }),
          menuBtn("Extend stay (+1 night)", () => {
            carmenAction(log, () => extendStay(session, 1, tracker()));
          }),
          menuBtn("Review folio (checkout preview)", () => {
            carmenAction(log, () => {
              const r = reviewFolio(session);
              return {
                ok: r.ok,
                message: r.ok
                  ? `${r.message}\nThat's the damage so far — sensors don't lie.`
                  : (r.message || "Folio printer jammed. Try again."),
              };
            });
          }),
          menuBtn("Late checkout (+2 hours)", () => {
            carmenAction(log, () => lateCheckout(session, tracker()));
          }),
          menuBtn("Express checkout (Pearl+)", () => {
            carmenAction(log, () => expressCheckout(session));
          }),
          menuBtn("Standard checkout", () => {
            carmenAction(log, () => checkoutStay(session));
          }),
          hotel.nightsRemaining === 0
            ? el("p", { className: "warning", textContent: "Last night — extend stay or check out before the carpet claims you." })
            : null,
          menuBtn("Guest Directory — sign the lobby book", () => {
            carmenAction(log, () => ({
              ok: true,
              message: "Leather book, permanent ink — make it count.",
            }), { navigate: () => pushView("hotel-guest-directory") });
          }),
          menuBtn("Resort dining — restaurants & capacity challenge", () => {
            carmenAction(log, () => ({
              ok: true,
              message: "Three tables worth the reservation. Don't order the wine tower sober.",
            }), { navigate: () => pushView("hotel-dining") });
          }),
          netPositive
            ? el("p", { className: "dim", textContent: "Net-positive — paid upgrades available if comps are spent." })
            : el("p", { className: "dim", textContent: "Unlock room comps via MGM Rewards tier play." }),
          menuBtn("Back to hotel lobby", () => navigateTo("hotel-lobby"), true),
        ].filter(Boolean)),
      ]),
    ]);
  }

  function renderHotelHallway() {
    const hotel = ensureHotel(session);
    const log = el("div", { className: "log-area hotel-log" });
    for (const line of hotel.hallwayLog.slice(-6)) {
      log.appendChild(el("div", { className: "line dim", textContent: line }));
    }

    if (!canAccessHotelRoom(session)) {
      const msg = session.worldCycle?.roomEvicted || hotel.roomEvicted
        ? "Room locked — settle overdue charges at the front desk or win on the casino floor."
        : reservationStatusMessage(session);
      return el("div", {}, [
        banner("Hotel Hallways"),
        el("div", { className: "panel" }, [
          el("p", { className: "error", textContent: msg }),
          el("div", { className: "action-bar" }, [
            el("button", { className: "btn primary", textContent: "Front Desk — Clerk Carmen", onclick: () => pushView("hotel-front-desk") }),
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

    grantRoomKeyIfReservationReady(session);
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
        el("p", {
          className: "dim",
          textContent: hotel.roomKeyActive
            ? `Key active for Room ${hotel.roomNumber} — wrong turns are free comedy.`
            : reservationStatusMessage(session),
        }),
        log,
        el("ul", { className: "menu-list" }, [
          ...choiceItems,
          hotel.roomKeyActive
            ? menuBtn("Use key — skip to door", () => {
                const r = useRoomKeyToDoor(session);
                showStatus(r.message, r.ok ? "success" : "error");
                persist();
                if (r.ok) pushView("hotel-room");
                else render();
              })
            : null,
          menuBtn("Start over (lobby elevator)", () => { resetHallway(session); persist(); render(); }),
          menuBtn("Back", goBack, true),
        ].filter(Boolean)),
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
          menuBtn("Back to hotel lobby", () => navigateTo("hotel-lobby"), true),
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
    grantRoomKeyIfReservationReady(session);
    const room = getRoomType(hotel);
    ensureRoomAmenities(hotel);
    const unlocked = getUnlockedEvents(hotel);
    const summary = getRoomAmenitiesSummary(hotel);
    const time = getSessionResortPhase(session);
    const timeClass = `hotel-room-view resort-time-${time.slot}`;

    if (!canAccessHotelRoom(session) || !hotel.reachedRoom) {
      const msg = !canAccessHotelRoom(session)
        ? (session.worldCycle?.roomEvicted || hotel.roomEvicted
          ? "Room locked — settle overdue charges at the front desk."
          : reservationStatusMessage(session))
        : "Complete the hallway to reach your room door first.";
      if (!canAccessHotelRoom(session) && hotel.reachedRoom) {
        hotel.reachedRoom = false;
      }
      return el("div", {}, [
        banner(room.label),
        el("div", { className: "panel" }, [
          el("p", { className: "error", textContent: msg }),
          el("div", { className: "action-bar" }, [
            el("button", { className: "btn primary", textContent: "Hotel lobby", onclick: () => navigateTo("hotel-lobby") }),
            el("button", { className: "btn", textContent: "Front Desk", onclick: () => navigateTo("hotel-front-desk") }),
            el("button", { className: "btn", textContent: "Back", onclick: goBack }),
          ]),
        ]),
      ]);
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
          menuBtn("Checkout — front desk folio", () => navigateTo("hotel-front-desk")),
          menuBtn("Return to casino floor", () => viewToHub(ctx)),
          menuBtn("Hotel lobby", () => navigateTo("hotel-lobby"), true),
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
          menuBtn("Back to room", () => navigateTo("hotel-room"), true),
        ]),
      ]),
    ]);
  }

  function renderHotelRoomMinibar() {
    const hotel = ensureHotel(session);
    const ra = ensureRoomAmenities(hotel);
    const log = el("div", { className: "log-area hotel-log minibar-neon" });
    const nudge = conciergeMinibarNudge(session);

    const itemButtons = filterMinibarItems(session, hotel).map((item) =>
      menuBtn(`${item.label} — $${item.price}`, () => {
        const res = purchaseMinibarItem(session, item.id);
        log.replaceChildren();
        renderAmenityLog(log, res);
        if (res.ok) tracker()?.pushNotification("Minibar", item.label);
        if (res.message) showStatus(res.message.split("\n")[0], res.ok ? "success" : "error");
        persist();
        render();
      }),
    );

    return el("div", {}, [
      statusBanner(),
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
          menuBtn("Back to room", () => navigateTo("hotel-room"), true),
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
          menuBtn("Back to room", () => navigateTo("hotel-room"), true),
        ]),
      ]),
    ]);
  }

  function renderHotelRoomDecisions() {
    const hotel = ensureHotel(session);
    const log = el("div", { className: "log-area hotel-log" });
    const decisions = filterRoomDecisions(session, hotel);
    const suiteBalcony = hotel.roomType === "suite" || hotel.roomType === "penthouse";

    const decisionButtons = decisions.map((dec) => {
      const priceTag = dec.price ? ` — $${dec.price}` : "";
      return menuBtn(`${dec.label}${priceTag}`, () => {
        if (dec.id === "balcony_smoke_pov" || (dec.id === "balcony" && suiteBalcony)) {
          if (openBalconySmokePov({ recordDecision: true })) return;
        }
        const res = makeRoomDecision(session, dec.id);
        log.replaceChildren();
        renderAmenityLog(log, res);
        if (res.message) showStatus(res.message.split("\n")[0], res.ok ? "success" : "error");
        persist();
        render();
      });
    });

    return el("div", {}, [
      statusBanner(),
      banner("Room Decisions"),
      chipLine(),
      el("div", { className: "panel hotel-panel hotel-room-view" }, [
        el("p", { className: "subtitle", textContent: "Small choices. Large room charges." }),
        hotel.roomType === "penthouse"
          ? el("p", { className: "dim", textContent: "Penthouse perks: telescope, butler, Foundation access, Strip POV balcony." })
          : hotel.roomType === "suite"
            ? el("p", { className: "dim", textContent: "Suite living room and Strip POV balcony smoke break available." })
            : null,
        log,
        el("ul", { className: "menu-list" }, [
          ...decisionButtons,
          suiteBalcony
            ? menuBtn("Open Strip POV balcony (smoke break)", () => {
                openBalconySmokePov({ recordDecision: true });
              })
            : null,
          menuBtn("Trigger wake-up call now", () => {
            appendResult(log, triggerWakeUpCall(session));
            persist();
          }),
          menuBtn("Back to room", () => navigateTo("hotel-room"), true),
        ].filter(Boolean)),
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
          menuBtn("Back to room", () => navigateTo("hotel-room"), true),
        ]),
      ]),
    ]);
  }

  function renderHotelDining() {
    const summary = diningApi.diningSummary(session);
    const gate = diningApi.canEnterDining(session);

    return el("div", {}, [
      banner("Resort Dining — Clerk Carmen Recommends"),
      chipLine(),
      el("div", { className: "panel hotel-panel" }, [
        el("p", { className: "subtitle", textContent: "\"Three tables you actually need a reservation for — and a stomach of steel.\"" }),
        el("p", {
          className: "dim",
          textContent: "Order food and drinks in the dining overlay. Pace yourself. The more you pour, the stranger the company.",
        }),
        el("p", {
          className: "dim",
          textContent: `Your dining ledger — ${summary.visits} visits · ${summary.lifetimeCourses} courses · ${summary.eggs}/${summary.eggTotal} eggs`,
        }),
        !gate.ok
          ? el("p", { className: "warning", textContent: gate.message })
          : null,
        el("div", { className: "dining-grid" },
          diningApi.DINING_VENUES.map((r) =>
            el("div", { className: "dining-card" }, [
              el("div", { className: "dining-card-header" }, [
                el("span", { className: "dining-icon", textContent: r.icon }),
                el("div", {}, [
                  el("strong", { textContent: r.name }),
                  el("span", { className: "dim", textContent: ` — ${r.chef}` }),
                ]),
                el("span", { className: "dining-price dim", textContent: r.priceRange }),
              ]),
              el("p", { className: "dim", textContent: `${r.type} · ${r.hours}` }),
              el("p", { textContent: r.description }),
              el("p", { className: "dim", textContent: `📍 ${r.location}` }),
              el("div", { className: "action-bar" }, [
                el("button", {
                  className: "btn primary",
                  textContent: `Dine at ${r.name}`,
                  disabled: !gate.ok,
                  onclick: () => openDining(r.id),
                }),
              ]),
            ])
          )
        ),
        el("ul", { className: "menu-list" }, [
          menuBtn("Open dining lobby (pick any restaurant)", () => openDining(null)),
          menuBtn("Back to front desk", () => navigateTo("hotel-front-desk"), true),
        ]),
      ]),
    ]);
  }

  function openDining(venueId) {
    const overlay = ctx.diningOverlay;
    if (!overlay) {
      showStatus("Dining overlay not ready.", "error");
      return;
    }
    overlay.setSession(session);
    overlay.open(venueId);
  }

  function openPoolComplex(zoneId = "hub") {
    if (typeof ctx.openPoolComplexVisual === "function") {
      const wasActive = ctx.poolOverlay?.active;
      const opened = ctx.openPoolComplexVisual(zoneId);
      if (opened && !wasActive) pushView("pool-complex");
      else if (!opened) pushView("pool-complex");
      return;
    }
    const overlay = typeof ctx.ensurePoolOverlay === "function"
      ? ctx.ensurePoolOverlay()
      : ctx.poolOverlay;
    if (!overlay) {
      showStatus("Pool overlay not ready.", "error");
      pushView("pool-complex");
      return;
    }
    overlay.setSession(session);
    const target = zoneId || "hub";
    if (!overlay.active) {
      pushView("pool-complex");
      overlay.open(target);
    } else if (target !== "hub" && overlay.zoneId !== target) {
      overlay.openZone(target);
    }
  }

  return {
    "hotel-lobby": renderHotelLobby,
    "hotel-front-desk": renderHotelFrontDesk,
    "hotel-dining": renderHotelDining,
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
  if (typeof ctx.onExitToFloor === "function") {
    ctx.onExitToFloor();
    return;
  }
  ctx.viewStack.length = 0;
  ctx.viewStack.push({ name: "hub", data: {} });
  ctx.render();
}
