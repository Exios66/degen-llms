"""Suite balcony POV smoke-break ledger (CLI parity for web overlay)."""

from __future__ import annotations

from dataclasses import dataclass, field

from mandalay_bay.hotel import ensure_hotel
from mandalay_bay.intoxication import record_consumption
from mandalay_bay.session import PlayerSession
from mandalay_bay.world_cycle import can_access_hotel_room

BALCONY_JOINT_ID = "balcony_suite_joint"
BALCONY_SMOKE_ROOM_TYPES = ("suite", "penthouse")
BALCONY_HIT_MAX = 5

BALCONY_VIBE_LINES = [
    "Luxor's beam cuts the haze. You own this altitude for one more inhale.",
    "Traffic crawls like chips across a felt. You are above the action.",
    "Neon blooms. The Strip performs for anyone with a key this high.",
    "A warm wind lifts the ember. Somewhere below, someone loses a bet.",
    "Bellagio's fountains stutter in the distance. You don't hurry for anyone.",
]


@dataclass
class BalconySmokeState:
    visits: int = 0
    lifetime_hits: int = 0
    last_visit_at: int | None = None
    eggs: list[str] = field(default_factory=list)


@dataclass
class BalconySitting:
    room_type: str
    room_number: int
    floor: int
    hits: int = 0
    closed: bool = False


@dataclass
class ActionResult:
    ok: bool
    message: str
    hits: int = 0
    done: bool = False


def ensure_balcony_smoke(session: PlayerSession) -> BalconySmokeState:
    if not hasattr(session, "balcony_smoke") or session.balcony_smoke is None:
        session.balcony_smoke = BalconySmokeState()
    return session.balcony_smoke


def can_enter_balcony_smoke(session: PlayerSession) -> ActionResult:
    hotel = ensure_hotel(session)
    if not can_access_hotel_room(session) or not hotel.reached_room:
        return ActionResult(False, "Reach your suite door first — then the balcony is yours.")
    if hotel.room_type not in BALCONY_SMOKE_ROOM_TYPES:
        return ActionResult(
            False,
            "Strip POV smoke breaks are a suite and penthouse perk. Ask Carmen about an upgrade.",
        )
    return ActionResult(True, "Balcony open.")


def start_balcony_visit(session: PlayerSession) -> tuple[ActionResult, BalconySitting | None]:
    gate = can_enter_balcony_smoke(session)
    if not gate.ok:
        return gate, None
    hotel = ensure_hotel(session)
    ledger = ensure_balcony_smoke(session)
    ledger.visits += 1
    sitting = BalconySitting(
        room_type=hotel.room_type,
        room_number=hotel.room_number,
        floor=hotel.floor,
    )
    return ActionResult(True, f"Floor {hotel.floor} balcony — visit #{ledger.visits}."), sitting


def take_balcony_hit(session: PlayerSession, sitting: BalconySitting) -> ActionResult:
    if sitting.closed:
        return ActionResult(False, "Step back onto the balcony first.", done=True)
    if sitting.hits >= BALCONY_HIT_MAX:
        return ActionResult(False, "The joint is ash. Savor the view, then step inside.", hits=sitting.hits, done=True)
    record_consumption(session, BALCONY_JOINT_ID, source="balcony_smoke")
    sitting.hits += 1
    ledger = ensure_balcony_smoke(session)
    ledger.lifetime_hits += 1
    if sitting.hits >= 3 and "high_roller_haze" not in ledger.eggs:
        ledger.eggs.append("high_roller_haze")
    vibe = BALCONY_VIBE_LINES[(sitting.hits + sitting.room_number) % len(BALCONY_VIBE_LINES)]
    done = sitting.hits >= BALCONY_HIT_MAX
    msg = f"Final hit. {vibe}" if done else f"Hit {sitting.hits}/{BALCONY_HIT_MAX}. {vibe}"
    return ActionResult(True, msg, hits=sitting.hits, done=done)


def close_balcony_sitting(session: PlayerSession, sitting: BalconySitting) -> ActionResult:
    if sitting.closed:
        return ActionResult(True, "Already back inside.")
    sitting.closed = True
    ledger = ensure_balcony_smoke(session)
    if sitting.hits == 0:
        return ActionResult(True, "You watched the Strip without lighting up.")
    return ActionResult(
        True,
        f"You step inside after {sitting.hits} hit(s). Lifetime balcony hits: {ledger.lifetime_hits}.",
        hits=sitting.hits,
    )
