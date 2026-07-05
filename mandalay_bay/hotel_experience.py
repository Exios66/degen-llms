"""Mandalay Bay Hotel Experience — CLI text mode."""

from __future__ import annotations

from mandalay_bay.display import TerminalUI, fmt_chips
from mandalay_bay.hotel import (
    ensure_hotel,
    extend_stay,
    find_reservation,
    get_room_type,
    hallway_choice,
    is_net_positive,
    reservation_hint,
    reset_hallway,
    session_net_chips,
    upgrade_room,
)
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
        choice = ui.menu_choice(
            [
                "Front Desk — Clerk Carmen",
                "Find my room (hallway)",
                "Enter room" if hotel.reached_room else None,
                "Return to casino floor",
            ],
            title="Hotel lobby:",
        )
        if choice == 0:
            return
        if choice == 1:
            run_front_desk(session, ui)
        elif choice == 2:
            run_hallway(session, ui)
        elif choice == 3 and hotel.reached_room:
            run_room(session, ui)
        else:
            return


def run_front_desk(session: PlayerSession, ui: TerminalUI) -> None:
    hotel = ensure_hotel(session)
    while True:
        ui.banner("Front Desk — Clerk Carmen")
        ui.print(f"Conf {hotel.reservation_code} · {get_room_type(hotel)['label']}")
        choice = ui.menu_choice(
            [
                "Locate reservation",
                "Upgrade to Panorama Suite",
                "Upgrade to Chairman Penthouse",
                "Extend stay (+1 night)",
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
            res = upgrade_room(session, "suite")
            ui.success(res.message) if res.ok else ui.error(res.message)
        elif choice == 3:
            res = upgrade_room(session, "penthouse")
            ui.success(res.message) if res.ok else ui.error(res.message)
        elif choice == 4:
            res = extend_stay(session, 1)
            ui.success(res.message) if res.ok else ui.error(res.message)
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
    hotel = ensure_hotel(session)
    room = get_room_type(hotel)
    ui.banner(room["label"])
    ui.print(f"Room {hotel.room_number} · Floor {hotel.floor}")
    ui.dim(f"{hotel.nights_remaining} night(s) remaining.")
    ui.pause()
