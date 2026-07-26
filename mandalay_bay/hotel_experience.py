"""Mandalay Bay Hotel Experience — CLI text mode."""

from __future__ import annotations

from mandalay_bay.display import TerminalUI, fmt_chips
from mandalay_bay.guest_directory import (
    format_signed_at,
    has_signed,
    list_all_guests,
    load_registry,
    sign_guest_directory,
)
from mandalay_bay.hotel import (
    checkout_stay,
    ensure_hotel,
    express_checkout,
    extend_stay,
    find_reservation,
    find_reservation_at_desk,
    get_room_type,
    hallway_choice,
    is_net_positive,
    late_checkout,
    reservation_hint,
    reset_hallway,
    review_folio,
    session_net_chips,
    upgrade_room,
    wake_up_call,
)
from mandalay_bay.world_cycle import reservation_access_met, settle_hotel_overdue
from mandalay_bay.session import PlayerSession


def run_hotel_lobby(session: PlayerSession, ui: TerminalUI) -> None:
    hotel = ensure_hotel(session)
    room = get_room_type(hotel)

    while True:
        ui.banner("Mandalay Bay — Hotel")
        ui.chip_line(session.wallet.balance)
        ui.print(f"Reservation: {hotel.reservation_code}")
        ui.print(f"Room: {room['label']} ({hotel.nights_remaining} night(s))")
        if hotel.found_reservation:
            ui.dim(reservation_hint(hotel))
        else:
            ui.print("Locate your reservation via MGM Rewards or the front desk.")
        if is_net_positive(session):
            ui.success(f"Floor net: {session_net_chips(session):+,} — upgrades available.")
        from mandalay_bay.world_cycle import can_access_hotel_room, grant_room_key_if_reservation_ready

        grant_room_key_if_reservation_ready(session)
        options = [
            "Front Desk — Clerk Carmen",
            "Guest Directory — lobby guest book",
        ]
        if can_access_hotel_room(session) and not hotel.reached_room:
            options.append("Find my room (hallway)")
        if can_access_hotel_room(session) and hotel.room_key_active and not hotel.reached_room:
            options.append("Use key — go straight to your door")
        options.append("Pool Complex — 11-acre expansion pack")
        options.append("Gentleman's Club — The Velvet Ledger")
        if hotel.reached_room:
            options.append("Enter room")
        options.append("Return to casino floor")
        choice = ui.menu_choice(options, title="Hotel lobby:")
        if choice == 0:
            return
        label = options[choice - 1]
        if label.startswith("Front Desk"):
            run_front_desk(session, ui)
        elif label.startswith("Guest Directory"):
            run_guest_directory(session, ui)
        elif label.startswith("Find my room"):
            run_hallway(session, ui)
        elif label.startswith("Gentleman"):
            from mandalay_bay.gentlemans_club import run_gentlemans_club

            run_gentlemans_club(session, ui)
        elif label.startswith("Use key"):
            from mandalay_bay.hotel import use_room_key_to_door

            res = use_room_key_to_door(session)
            ui.success(res.message) if res.ok else ui.error(res.message)
            if res.ok:
                run_room(session, ui)
        elif label.startswith("Pool Complex"):
            from mandalay_bay.pool_experience import run_pool_complex

            run_pool_complex(session, ui)
        elif label.startswith("Enter room"):
            run_room(session, ui)
        else:
            return


def run_front_desk(session: PlayerSession, ui: TerminalUI) -> None:
    hotel = ensure_hotel(session)
    hotel.front_desk_visits = getattr(hotel, "front_desk_visits", 0) + 1
    while True:
        ui.banner("Front Desk — Clerk Carmen")
        ui.print(f"Conf {hotel.reservation_code} · {get_room_type(hotel)['label']}")
        from mandalay_bay.world_cycle import can_access_hotel_room, grant_room_key_if_reservation_ready
        from mandalay_bay.hotel import use_room_key_to_door

        grant_room_key_if_reservation_ready(session)
        options = [
            "Locate reservation (phone — see MGM Rewards)",
            "Confirm reservation (desk terminal)",
        ]
        if can_access_hotel_room(session) and not hotel.reached_room:
            options.append("Find my room (hallway)")
        if can_access_hotel_room(session) and hotel.room_key_active and not hotel.reached_room:
            options.append("Skip hallway — use key to door")
        if can_access_hotel_room(session) and hotel.reached_room:
            options.append("Enter your room")
        options.extend(
            [
                "Settle overdue resort charges",
                "Upgrade to Panorama Suite",
                "Upgrade to Chairman Penthouse",
                "Extend stay (+1 night)",
                "Review folio (checkout preview)",
                "Late checkout (+2 hours)",
                "Express checkout (Pearl+)",
                "Standard checkout",
                "Guest Directory — sign the lobby book",
                "Resort dining — restaurants & capacity challenge",
                "Back",
            ]
        )
        choice = ui.menu_choice(options, title="Clerk Carmen:")
        if choice == 0:
            return
        label = options[choice - 1]
        if label.startswith("Locate reservation"):
            result = find_reservation(session)
            ui.print(result.hint)
            if result.clue:
                ui.success(result.clue)
            if result.clue and "Located" in (result.clue or ""):
                ui.print("Carmen: Your key is active. Take the hallway — or I can skip you to the door.")
        elif label.startswith("Confirm reservation"):
            result = find_reservation_at_desk(session)
            ui.print(result.hint)
            if result.clue:
                ui.success(result.clue)
            ui.print("Carmen: Key active. Trust the carpet — or skip straight to the door.")
        elif label.startswith("Find my room"):
            ui.print(f"Carmen: South? North? Trust the carpet — Room {hotel.room_number} is waiting.")
            run_hallway(session, ui)
            continue
        elif label.startswith("Skip hallway"):
            res = use_room_key_to_door(session)
            ui.success(res.message) if res.ok else ui.error(res.message)
            if res.ok:
                run_room(session, ui)
                continue
        elif label.startswith("Enter your room"):
            ui.print(f"Carmen: Enjoy Room {hotel.room_number}. Don't tip the minibar.")
            run_room(session, ui)
            continue
        elif label.startswith("Settle overdue"):
            res = settle_hotel_overdue(session)
            ui.success(res.message) if res.ok else ui.error(res.message)
        elif label.startswith("Upgrade to Panorama"):
            res = upgrade_room(session, "suite")
            ui.success(res.message) if res.ok else ui.error(res.message)
        elif label.startswith("Upgrade to Chairman"):
            res = upgrade_room(session, "penthouse")
            ui.success(res.message) if res.ok else ui.error(res.message)
        elif label.startswith("Extend stay"):
            res = extend_stay(session, 1)
            ui.success(res.message) if res.ok else ui.error(res.message)
        elif label.startswith("Review folio"):
            res = review_folio(session)
            ui.success(res.message)
        elif label.startswith("Late checkout"):
            res = late_checkout(session)
            ui.success(res.message) if res.ok else ui.error(res.message)
        elif label.startswith("Express checkout"):
            res = express_checkout(session)
            ui.success(res.message) if res.ok else ui.error(res.message)
        elif label.startswith("Standard checkout"):
            res = checkout_stay(session)
            ui.success(res.message) if res.ok else ui.error(res.message)
        elif label.startswith("Guest Directory"):
            run_guest_directory(session, ui)
        elif label.startswith("Resort dining"):
            from mandalay_bay.dining_experience import run_dining_lobby

            run_dining_lobby(session, ui)
            continue
        ui.pause()


def run_guest_directory(session: PlayerSession, ui: TerminalUI) -> None:
    title, subtitle, _ = load_registry()
    player_name = (session.player_name or "Guest").strip()

    while True:
        guests = list_all_guests()
        ui.banner(title)
        if subtitle:
            ui.dim(subtitle)
        ui.print(f"{len(guests)} signature(s) on record — past guests remain visible to everyone.")
        ui.print("")
        for i, guest in enumerate(guests, start=1):
            line = f"{i:>2}. {guest.name}  ({format_signed_at(guest.signed_at)})"
            ui.print(line)
            if guest.note:
                ui.dim(f"    {guest.note}")
        already = has_signed(player_name)
        options: list[str] = []
        if not already:
            options.append("Sign the guest book")
        pick = ui.menu_choice(options, title="Guest directory:")
        if pick == 0:
            return
        note = ui.prompt("Optional note (room, occasion, etc.): ")
        result = sign_guest_directory(player_name, note)
        if result.ok:
            ui.success(result.message)
        else:
            ui.error(result.message)
        ui.pause()


def run_hallway(session: PlayerSession, ui: TerminalUI) -> None:
    hotel = ensure_hotel(session)
    from mandalay_bay.world_cycle import sync_world_cycle

    sync_world_cycle(session)
    if hotel.room_evicted or (hasattr(session, "world_cycle") and session.world_cycle and session.world_cycle.room_evicted):
        ui.error("Room locked — settle overdue charges at the front desk or win on the casino floor.")
        ui.pause()
        return
    if not reservation_access_met(session):
        ui.error("Complete today's check-in requirement first (MGM Rewards phone and/or front desk).")
        ui.pause()
        return

    from mandalay_bay.hotel import current_hallway_beat

    from mandalay_bay.hotel import use_room_key_to_door
    from mandalay_bay.world_cycle import grant_room_key_if_reservation_ready

    grant_room_key_if_reservation_ready(session)
    while not hotel.reached_room:
        beat = current_hallway_beat(session)
        if beat is None:
            hotel.reached_room = True
            break
        ui.print(beat.text)
        labels = [c.label for c in beat.choices]
        if hotel.room_key_active:
            labels.append("Use key — skip to door")
        pick = ui.menu_choice(labels, title="Which way?")
        if pick == 0:
            reset_hallway(session)
            return
        if hotel.room_key_active and pick == len(labels):
            res = use_room_key_to_door(session)
            ui.success(res.message) if res.ok else ui.error(res.message)
            break
        result = hallway_choice(session, pick - 1)
        if result.quip:
            ui.dim(result.quip)
        if result.done:
            ui.success(f"Room {hotel.room_number}.")
            break
    ui.pause()


def run_room(session: PlayerSession, ui: TerminalUI) -> None:
    from mandalay_bay.room_amenities import (
        MINIBAR_ITEMS,
        PHONE_CALLS,
        ROOM_DECISIONS,
        ROOM_EVENTS,
        TV_CHANNELS,
        ensure_room_amenities,
        get_room_amenities_summary,
        make_phone_call,
        make_room_decision,
        purchase_minibar_item,
        tune_tv_channel,
    )

    hotel = ensure_hotel(session)
    room = get_room_type(hotel)
    ensure_room_amenities(hotel)

    while True:
        ui.banner(room["label"])
        ui.chip_line(session.wallet.balance)
        ui.print(f"Room {hotel.room_number} · Floor {hotel.floor}")
        ui.dim(f"{hotel.nights_remaining} night(s) remaining.")
        ui.dim(get_room_amenities_summary(hotel))
        ra = ensure_room_amenities(hotel)
        if ra.unlocked_events:
            ui.success(f"{len(ra.unlocked_events)} Vegas event(s) unlocked.")
        choice = ui.menu_choice(
            [
                "TV — aquarium channel & resort loops",
                "Minibar — sensor-enabled debauchery",
                "Room phone — unlimited foreign calls",
                "Room decisions — balcony, DND, room service",
                "Event log — Vegas highlight reel",
                "Back to hotel lobby",
            ],
            title="Your room:",
        )
        if choice == 0:
            return
        if choice == 1:
            _run_room_tv(session, ui, TV_CHANNELS, tune_tv_channel)
        elif choice == 2:
            _run_room_minibar(session, ui, MINIBAR_ITEMS, purchase_minibar_item)
        elif choice == 3:
            _run_room_phone(session, ui, PHONE_CALLS, make_phone_call)
        elif choice == 4:
            _run_room_decisions(session, ui, ROOM_DECISIONS, make_room_decision)
        elif choice == 5:
            _run_room_events(ui, ra, ROOM_EVENTS)


def _run_room_tv(session, ui, channels, tune_fn) -> None:
    labels = [ch["label"] for ch in channels.values()]
    pick = ui.menu_choice(labels + ["Back"], title="In-room TV:")
    if pick == 0 or pick > len(labels):
        return
    channel_id = list(channels.keys())[pick - 1]
    res = tune_fn(session, channel_id)
    ui.success(res.message) if res.ok else ui.error(res.message)
    ui.pause()


def _run_room_minibar(session, ui, items, purchase_fn) -> None:
    labels = [f"{it['label']} — ${it['price']}" for it in items.values()]
    pick = ui.menu_choice(labels + ["Back"], title="Minibar:")
    if pick == 0 or pick > len(labels):
        return
    item_id = list(items.keys())[pick - 1]
    res = purchase_fn(session, item_id)
    ui.success(res.message) if res.ok else ui.error(res.message)
    ui.pause()


def _run_room_phone(session, ui, calls, call_fn) -> None:
    labels = [c["label"] for c in calls.values()]
    pick = ui.menu_choice(labels + ["Back"], title="Room phone (unlimited foreign calls):")
    if pick == 0 or pick > len(labels):
        return
    call_id = list(calls.keys())[pick - 1]
    res = call_fn(session, call_id)
    ui.success(res.message) if res.ok else ui.error(res.message)
    ui.pause()


def _run_room_decisions(session, ui, decisions, decide_fn) -> None:
    hotel = ensure_hotel(session)
    entries = []
    for decision_id, dec in decisions.items():
        room_types = dec.get("room_types")
        if room_types and hotel.room_type not in room_types:
            continue
        price = dec.get("price")
        entries.append((decision_id, f"{dec['label']}" + (f" — ${price}" if price else "")))
    labels = [label for _, label in entries]
    pick = ui.menu_choice(labels + ["Back"], title="Room decisions:")
    if pick == 0 or pick > len(labels):
        return
    decision_id = entries[pick - 1][0]
    res = decide_fn(session, decision_id)
    ui.success(res.message) if res.ok else ui.error(res.message)
    if decision_id in ("balcony_smoke_pov", "balcony") and hotel.room_type in ("suite", "penthouse"):
        _run_balcony_smoke_pov(session, ui)
        return
    ui.pause()


def _run_balcony_smoke_pov(session, ui) -> None:
    """Text POV smoke break — mirrors the web suite balcony overlay."""
    from mandalay_bay.balcony_smoke import (
        BALCONY_HIT_MAX,
        close_balcony_sitting,
        start_balcony_visit,
        take_balcony_hit,
    )

    gate, sitting = start_balcony_visit(session)
    if not gate.ok or sitting is None:
        ui.error(gate.message)
        ui.pause()
        return

    ui.banner("Suite Balcony — Strip POV")
    ui.print("Glass railing. Warm wind. The Las Vegas Strip performs below.")
    ui.dim(gate.message)
    while True:
        options = []
        if sitting.hits < BALCONY_HIT_MAX:
            options.append("Take a hit")
        options.extend(["Savor the view", "Step inside"])
        pick = ui.menu_choice(options, title="Balcony:")
        if pick == 0:
            break
        label = options[pick - 1]
        if label.startswith("Take a hit"):
            hit = take_balcony_hit(session, sitting)
            ui.success(hit.message) if hit.ok else ui.dim(hit.message)
            if hit.done:
                ui.dim("The ember is out. The Strip keeps glittering.")
        elif label.startswith("Savor"):
            ui.dim("Warm wind. Neon bloom. You let the Strip do the talking.")
        else:
            break
    done = close_balcony_sitting(session, sitting)
    ui.success(done.message)
    ui.pause()


def _run_room_events(ui, ra, events) -> None:
    ui.banner("Vegas Event Log")
    if ra.unlocked_events:
        ui.print("Unlocked:")
        for event_id in ra.unlocked_events:
            evt = events.get(event_id, {})
            ui.success(f"  {evt.get('label', event_id)} — {evt.get('narrative', '')}")
    else:
        ui.dim("Nothing unlocked yet.")
    locked = [e for k, e in events.items() if k not in ra.unlocked_events]
    if locked:
        ui.print("")
        ui.dim("Still on the table:")
        for evt in locked:
            ui.dim(f"  {evt['label']}")
    ui.pause()

