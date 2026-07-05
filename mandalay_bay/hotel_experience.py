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
from mandalay_bay.world_cycle import settle_hotel_overdue
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
        options = [
            "Front Desk — Clerk Carmen",
            "Guest Directory — lobby guest book",
            "Find my room (hallway)",
            "Pool Complex — 11-acre expansion pack",
        ]
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
        choice = ui.menu_choice(
            [
                "Locate reservation (phone — see MGM Rewards)",
                "Confirm reservation (desk terminal)",
                "Settle overdue resort charges",
                "Upgrade to Panorama Suite",
                "Upgrade to Chairman Penthouse",
                "Extend stay (+1 night)",
                "Review folio (checkout preview)",
                "Late checkout (+2 hours)",
                "Express checkout (Pearl+)",
                "Standard checkout",
                "Guest Directory — sign the lobby book",
                "Dining recommendations — Resort restaurants",
                "Back",
            ],
            title="Clerk Carmen:",
        )
        if choice == 0:
            return
        if choice == 1:
            result = find_reservation(session)
            ui.print(result.hint)
            if result.clue:
                ui.success(result.clue)
        elif choice == 2:
            result = find_reservation_at_desk(session)
            ui.print(result.hint)
            if result.clue:
                ui.success(result.clue)
        elif choice == 3:
            res = settle_hotel_overdue(session)
            ui.success(res.message) if res.ok else ui.error(res.message)
        elif choice == 4:
            res = upgrade_room(session, "suite")
            ui.success(res.message) if res.ok else ui.error(res.message)
        elif choice == 5:
            res = upgrade_room(session, "penthouse")
            ui.success(res.message) if res.ok else ui.error(res.message)
        elif choice == 6:
            res = extend_stay(session, 1)
            ui.success(res.message) if res.ok else ui.error(res.message)
        elif choice == 7:
            res = review_folio(session)
            ui.success(res.message)
        elif choice == 8:
            res = late_checkout(session)
            ui.success(res.message) if res.ok else ui.error(res.message)
        elif choice == 9:
            res = express_checkout(session)
            ui.success(res.message) if res.ok else ui.error(res.message)
        elif choice == 10:
            res = checkout_stay(session)
            ui.success(res.message) if res.ok else ui.error(res.message)
        elif choice == 11:
            run_guest_directory(session, ui)
        elif choice == 12:
            _run_dining_recommendations(ui)
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
    if not hotel.found_reservation:
        ui.error("Locate your reservation first (front desk or MGM Rewards).")
        ui.pause()
        return

    from mandalay_bay.hotel import current_hallway_beat

    while not hotel.reached_room:
        beat = current_hallway_beat(session)
        if beat is None:
            hotel.reached_room = True
            break
        ui.print(beat.text)
        labels = [c.label for c in beat.choices]
        pick = ui.menu_choice(labels, title="Which way?")
        if pick == 0:
            reset_hallway(session)
            return
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
    labels = []
    for dec in decisions.values():
        price = dec.get("price")
        labels.append(f"{dec['label']}" + (f" — ${price}" if price else ""))
    pick = ui.menu_choice(labels + ["Back"], title="Room decisions:")
    if pick == 0 or pick > len(labels):
        return
    decision_id = list(decisions.keys())[pick - 1]
    res = decide_fn(session, decision_id)
    ui.success(res.message) if res.ok else ui.error(res.message)
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


_DINING_PICKS = [
    {
        "name": "Aureole",
        "chef": "Charlie Palmer",
        "type": "American fine dining",
        "price": "$$$$$",
        "hours": "Dinner nightly",
        "blurb": (
            "Four-story wine tower staffed by harness-rigged 'wine angels.' Seasonal tasting menus, "
            "dry-aged beef, and the most theatrical wine service on the Strip."
        ),
        "location": "East lobby, Mandalay Bay Resort",
    },
    {
        "name": "Border Grill",
        "chef": "Mary Sue Milliken & Susan Feniger",
        "type": "Modern Mexican",
        "price": "$$$$",
        "hours": "Brunch & dinner daily",
        "blurb": (
            "Bold chef-driven Mexican from the 'Too Hot Tamales.' Poolside windows overlook Mandalay "
            "Beach — famous for Border Brunch. House-made tortillas since 1990."
        ),
        "location": "Poolside, Mandalay Bay Resort",
    },
    {
        "name": "Stripsteak",
        "chef": "Michael Mina",
        "type": "Contemporary steakhouse",
        "price": "$$$$$",
        "hours": "Dinner nightly",
        "blurb": (
            "USDA prime and wagyu, duck-fat fries, and a cocktail program to match. "
            "Consistently ranked among Vegas's top steakhouses — reserve ahead."
        ),
        "location": "Casino level, Mandalay Bay Resort",
    },
]


def _run_dining_recommendations(ui: TerminalUI) -> None:
    ui.banner("Resort Dining — Clerk Carmen Recommends")
    ui.print('"Three tables you actually need a reservation for."')
    ui.print("")
    for i, r in enumerate(_DINING_PICKS, start=1):
        ui.print(f"{i}. {r['name']}  ({r['chef']})")
        ui.dim(f"   {r['type']}  ·  {r['price']}  ·  {r['hours']}")
        ui.print(f"   {r['blurb']}")
        ui.dim(f"   📍 {r['location']}")
        ui.print("")
