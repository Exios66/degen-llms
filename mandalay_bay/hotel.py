"""Hotel state and Mandalay Bay Hotel Experience logic (Python CLI parity)."""

from __future__ import annotations

from dataclasses import dataclass, field

from mandalay_bay.chips import ChipWallet, TransactionKind
from mandalay_bay.rewards import RewardsState, has_unredeemed_comp, redeem_comp
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
class RoomAmenitiesState:
    tv_channel: str | None = None
    channels_watched: list[str] = field(default_factory=list)
    minibar_purchases: list[str] = field(default_factory=list)
    minibar_tab: int = 0
    phone_calls: list[str] = field(default_factory=list)
    decisions: list[str] = field(default_factory=list)
    unlocked_events: list[str] = field(default_factory=list)
    event_log: list[str] = field(default_factory=list)
    amenity_actions: int = 0
    wake_up_scheduled: bool = False
    checked_out: bool = False


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
    room_amenities: RoomAmenitiesState | None = None
    resort_time: int = 0
    folio_reviewed: bool = False
    late_checkout_used: bool = False
    reservation_confirmed_desk: bool = False
    room_evicted: bool = False


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
    from mandalay_bay.world_cycle import sync_world_cycle

    sync_world_cycle(session)
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
    from mandalay_bay.world_cycle import locate_reservation_via_phone

    result = locate_reservation_via_phone(session)
    hotel = ensure_hotel(session)
    hint = reservation_hint(hotel)
    if result.already:
        return ReservationResult(hint=hint, already=True)
    if not result.ok:
        return ReservationResult(hint=hint, clue=result.message)
    return ReservationResult(hint=hint, clue=result.message)


def find_reservation_at_desk(session: PlayerSession) -> ReservationResult:
    from mandalay_bay.world_cycle import confirm_reservation_at_desk

    result = confirm_reservation_at_desk(session)
    hotel = ensure_hotel(session)
    hint = reservation_hint(hotel)
    if result.already:
        return ReservationResult(hint=hint, already=True)
    if not result.ok:
        return ReservationResult(hint=hint, clue=result.message)
    return ReservationResult(hint=hint, clue=result.message)


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
    from mandalay_bay.world_cycle import reservation_access_met, sync_world_cycle

    sync_world_cycle(session)
    hotel = ensure_hotel(session)
    wc = getattr(session, "world_cycle", None)
    if wc and wc.room_evicted:
        return HallwayResult(False, "Settle overdue charges at the front desk.")
    if not reservation_access_met(session):
        return HallwayResult(False, "Complete today's reservation requirement first.")
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
    rewards: RewardsState | None = getattr(session, "rewards", None)
    comp_id = spec["comp_id"]
    if rewards and has_unredeemed_comp(rewards, comp_id):
        redeem_comp(rewards, comp_id)
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
    rewards: RewardsState | None = getattr(session, "rewards", None)
    if rewards and has_unredeemed_comp(rewards, "room_night"):
        redeem_comp(rewards, "room_night")
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


def build_folio_lines(session: PlayerSession) -> list[str]:
    """Satirical checkout folio — minibar, room service, shopping."""
    hotel = ensure_hotel(session)
    ra = hotel.room_amenities or RoomAmenitiesState()
    lines = [f"Folio — Room {hotel.room_number} · Conf {hotel.reservation_code}"]

    if ra.minibar_tab > 0:
        lines.append(f"Minibar tab: {fmt_chips(ra.minibar_tab)} (sensor-enabled hospitality)")

    room_service_total = 0
    if "room_service" in ra.decisions:
        room_service_total += 35
    if "tip_maid" in ra.decisions:
        room_service_total += 25
    if room_service_total:
        lines.append(f"In-room services: {fmt_chips(room_service_total)}")

    amenities = getattr(session, "amenities", None)
    if amenities and amenities.purchased_items:
        lines.append(f"Mandalay Place deliveries: {len(amenities.purchased_items)} item(s) to your room")

    if len(lines) == 1:
        lines.append("No charges. Suspiciously responsible for Vegas.")
    return lines


def review_folio(session: PlayerSession) -> ActionResult:
    hotel = ensure_hotel(session)
    hotel.folio_reviewed = True
    body = "\n".join(build_folio_lines(session))
    return ActionResult(True, body)


def late_checkout(session: PlayerSession) -> ActionResult:
    hotel = ensure_hotel(session)
    if hotel.late_checkout_used:
        return ActionResult(False, "You already negotiated late checkout.")
    hotel.late_checkout_used = True
    if is_net_positive(session):
        return ActionResult(True, "Carmen comps an extra two hours. The minibar sensor sleeps.")
    cost = 75
    if session.wallet.debit(cost, "hotel", "Late checkout"):
        return ActionResult(True, f"Paid {fmt_chips(cost)} for two extra hours. Worth it.")
    return ActionResult(False, f"Need {fmt_chips(cost)} or net-positive floor status.")


def wake_up_call(session: PlayerSession) -> ActionResult:
    import random

    hotel = ensure_hotel(session)
    ra = hotel.room_amenities or RoomAmenitiesState()
    alarms = [
        "Steve Harvey: \"Rise and shine! Survey says… you're late for brunch!\"",
        "Shark Reef feed narration: \"The sand tiger approaches… your alarm clock.\"",
        "Convention keynote: \"Synergy waits for no one. Especially not you.\"",
    ]
    msg = random.choice(alarms)
    ra.wake_up_scheduled = False
    return ActionResult(True, msg)


def checkout_stay(session: PlayerSession) -> ActionResult:
    hotel = ensure_hotel(session)
    ra = hotel.room_amenities or RoomAmenitiesState()
    if ra.checked_out:
        return ActionResult(False, "You already checked out. The carpet misses you.")
    ra.checked_out = True
    hotel.nights_remaining = max(0, hotel.nights_remaining - 1)
    folio = "\n".join(build_folio_lines(session))
    if hotel.nights_remaining == 0:
        return ActionResult(
            True,
            f"{folio}\n\nCheckout complete. Nights remaining: 0 — Carmen offers extend-stay or casino floor exile.",
        )
    return ActionResult(True, f"{folio}\n\nCheckout complete. {hotel.nights_remaining} night(s) remaining on your stay.")


def express_checkout(session: PlayerSession) -> ActionResult:
    from mandalay_bay.resort_bridge import get_session_tier_index

    tier_idx = get_session_tier_index(session)
    hotel = ensure_hotel(session)
    ra = hotel.room_amenities or RoomAmenitiesState()
    if ra.checked_out:
        return ActionResult(False, "Already checked out.")
    if tier_idx < 1:
        return ActionResult(False, "Pearl+ required for express checkout. Join the regular line.")
    ra.checked_out = True
    hotel.nights_remaining = max(0, hotel.nights_remaining - 1)
    if tier_idx >= 5:
        return ActionResult(True, "Chairman express — folio waived spiritually. Chauffeur waiting.")
    return ActionResult(True, "Express checkout — line skipped. Folio emailed to guilt@vegas.com.")
