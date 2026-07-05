"""Hotel state and Mandalay Bay Hotel Experience logic (Python CLI parity)."""

from __future__ import annotations

from dataclasses import dataclass, field

from mandalay_bay.chips import ChipWallet, TransactionKind
from mandalay_bay.session import PlayerSession

ROOM_TYPES = {
    "standard": {"label": "Deluxe King", "wing": "south", "floor": 23, "comp_id": "room_night"},
    "suite": {"label": "Panorama Suite", "wing": "east", "floor": 31, "comp_id": "suite_upgrade"},
    "penthouse": {"label": "Chairman Penthouse", "wing": "sky", "floor": 62, "comp_id": "penthouse_fantasy"},
}


@dataclass
class HallwayChoice:
    label: str
    wing: str
    quip: str | None = None


@dataclass
class HallwayBeat:
    text: str
    choices: list[HallwayChoice]


@dataclass
class HotelState:
    property_id: str = "mandalay_bay"
    reservation_code: str = "MB-0000"
    room_type: str = "standard"
    wing: str = "south"
    floor: int = 23
    room_number: int = 23017
    nights_remaining: int = 2
    found_reservation: bool = False
    reached_room: bool = False
    hallway_progress: int = 0
    hallway_log: list[str] = field(default_factory=list)


@dataclass
class ActionResult:
    ok: bool
    message: str


@dataclass
class ReservationResult:
    hint: str
    clue: str | None = None
    already: bool = False


def _generate_room_number(floor: int) -> int:
    return floor * 1000 + 17


def default_hotel_state() -> HotelState:
    return HotelState(
        reservation_code="MB-4821",
        room_number=_generate_room_number(23),
    )


def ensure_hotel(session: PlayerSession) -> HotelState:
    if not hasattr(session, "hotel") or session.hotel is None:
        session.hotel = default_hotel_state()
    return session.hotel


def get_room_type(hotel: HotelState) -> dict:
    return ROOM_TYPES.get(hotel.room_type, ROOM_TYPES["standard"])


def reservation_hint(hotel: HotelState) -> str:
    room = get_room_type(hotel)
    return (
        f"{room['label']} · Mandalay Bay · {hotel.wing.upper()} tower · "
        f"Floor {hotel.floor} · Room {hotel.room_number} · Conf {hotel.reservation_code}"
    )


def session_net_chips(session: PlayerSession) -> int:
    return session.wallet.net_session


def is_net_positive(session: PlayerSession) -> bool:
    return session_net_chips(session) > 0


def _hallway_beats(hotel: HotelState) -> list[HallwayBeat]:
    return [
        HallwayBeat(
            "The elevator dings. Hallway in three directions.",
            [
                HallwayChoice("Left — convention center", "west", "Synergy keynote. Not your room."),
                HallwayChoice("Right — tower signage", hotel.wing),
                HallwayChoice("Straight — shark mural", "reef", "Still lost."),
            ],
        ),
        HallwayBeat(
            f"Ice machine hums. Gold elevator to floor {hotel.floor}?",
            [
                HallwayChoice(f"Gold elevator to floor {hotel.floor}", hotel.wing),
                HallwayChoice("Check ice machine", "ice", "Ice only."),
                HallwayChoice("Follow cart", "service", "STAFF ONLY."),
            ],
        ),
        HallwayBeat(
            "Carpet pattern repeats.",
            [
                HallwayChoice(f"Find room {hotel.room_number}", hotel.wing),
                HallwayChoice("Ask tourist", "tourist", "They mention the wave pool."),
                HallwayChoice("Sit and reflect", "existential", "Not helpful."),
            ],
        ),
    ]


def find_reservation(session: PlayerSession) -> ReservationResult:
    hotel = ensure_hotel(session)
    hint = reservation_hint(hotel)
    if hotel.found_reservation:
        return ReservationResult(hint=hint, already=True)
    hotel.found_reservation = True
    clue = f"Head to the {hotel.wing.upper()} tower. Gold elevator to floor {hotel.floor}."
    return ReservationResult(hint=hint, clue=clue)


def current_hallway_beat(session: PlayerSession) -> HallwayBeat | None:
    hotel = ensure_hotel(session)
    beats = _hallway_beats(hotel)
    if hotel.hallway_progress >= len(beats):
        return None
    return beats[hotel.hallway_progress]


@dataclass
class HallwayResult:
    success: bool
    quip: str | None = None
    done: bool = False


def hallway_choice(session: PlayerSession, choice_index: int) -> HallwayResult:
    hotel = ensure_hotel(session)
    if not hotel.found_reservation:
        return HallwayResult(False, "Locate reservation first.")
    beat = current_hallway_beat(session)
    if beat is None:
        hotel.reached_room = True
        return HallwayResult(True, f"Room {hotel.room_number}.", done=True)
    if choice_index < 0 or choice_index >= len(beat.choices):
        return HallwayResult(False, "Pick a direction.")
    pick = beat.choices[choice_index]
    hotel.hallway_log.append(pick.label)
    if pick.wing == hotel.wing and pick.quip is None:
        hotel.hallway_progress += 1
        if hotel.hallway_progress >= len(_hallway_beats(hotel)):
            hotel.reached_room = True
            return HallwayResult(True, f"Room {hotel.room_number}.", done=True)
        return HallwayResult(True, "That felt right.")
    return HallwayResult(False, pick.quip or "Dead end.")


def reset_hallway(session: PlayerSession) -> None:
    hotel = ensure_hotel(session)
    hotel.hallway_progress = 0
    hotel.hallway_log.clear()
    hotel.reached_room = False


def upgrade_room(session: PlayerSession, target: str) -> ActionResult:
    hotel = ensure_hotel(session)
    spec = ROOM_TYPES.get(target)
    if not spec:
        return ActionResult(False, "Unknown room type.")
    rewards = getattr(session, "rewards", None)
    comp_id = spec["comp_id"]
    has_comp = rewards and comp_id in rewards.get("unlocked_comps", []) and comp_id not in rewards.get("redeemed_comps", [])
    if has_comp and rewards is not None:
        rewards.setdefault("redeemed_comps", []).append(comp_id)
        _apply_room(session, target, spec)
        return ActionResult(True, f"Comp applied — {spec['label']}.")
    if is_net_positive(session) and target == "suite":
        cost = 500
        if not session.wallet.debit(cost, "hotel", "Suite upgrade"):
            return ActionResult(False, f"Need {fmt_chips(cost)}.")
        _apply_room(session, target, spec)
        return ActionResult(True, f"Upgraded to {spec['label']}.")
    if is_net_positive(session) and target == "penthouse":
        cost = 2000
        if not session.wallet.debit(cost, "hotel", "Penthouse upgrade"):
            return ActionResult(False, f"Need {fmt_chips(cost)}.")
        _apply_room(session, target, spec)
        return ActionResult(True, f"Penthouse unlocked.")
    return ActionResult(False, "Earn comps or finish net-positive on the floor.")


def extend_stay(session: PlayerSession, nights: int = 1) -> ActionResult:
    hotel = ensure_hotel(session)
    rewards = getattr(session, "rewards", None)
    if rewards and "room_night" in rewards.get("unlocked_comps", []) and "room_night" not in rewards.get("redeemed_comps", []):
        rewards.setdefault("redeemed_comps", []).append("room_night")
        hotel.nights_remaining += nights
        return ActionResult(True, f"{hotel.nights_remaining} night(s) remaining.")
    if is_net_positive(session):
        cost = 150 * nights
        if not session.wallet.debit(cost, "hotel", f"Extend {nights} night(s)"):
            return ActionResult(False, f"Need {fmt_chips(cost)}.")
        hotel.nights_remaining += nights
        return ActionResult(True, f"{hotel.nights_remaining} night(s) remaining.")
    return ActionResult(False, "Net-positive or room-night comp required.")


def _apply_room(session: PlayerSession, room_type: str, spec: dict) -> None:
    hotel = ensure_hotel(session)
    hotel.room_type = room_type
    hotel.wing = spec["wing"]
    hotel.floor = spec["floor"]
    hotel.room_number = _generate_room_number(spec["floor"])
    hotel.found_reservation = False
    hotel.reached_room = False
    hotel.hallway_progress = 0
    hotel.hallway_log.clear()


def fmt_chips(amount: int) -> str:
    return f"${amount:,}"
