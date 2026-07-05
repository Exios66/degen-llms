"""Real-time day/night cycle — 2 hours real time = 1 in-game day."""

from __future__ import annotations

import time
from dataclasses import dataclass, field

from mandalay_bay.hotel import default_hotel_state, fmt_chips, is_net_positive
from mandalay_bay.resort_bridge import get_session_tier_index
from mandalay_bay.session import PlayerSession

MS_PER_GAME_DAY = 2 * 60 * 60 * 1000

WORLD_PHASES = [
    {"id": 0, "label": "Dawn over the bay", "start": 0.0, "end": 0.25},
    {"id": 1, "label": "Midday chlorination", "start": 0.25, "end": 0.5},
    {"id": 2, "label": "Neon dusk", "start": 0.5, "end": 0.75},
    {"id": 3, "label": "2 AM clarity", "start": 0.75, "end": 1.0},
]

RESERVATION_REQUIREMENTS = [
    {"id": "phone", "label": "MGM Rewards phone locate", "needs_phone": True, "needs_desk": False, "needs_net_positive": False},
    {"id": "desk", "label": "Front desk terminal only", "needs_phone": False, "needs_desk": True, "needs_net_positive": False},
    {"id": "both", "label": "Phone then desk confirmation", "needs_phone": True, "needs_desk": True, "needs_net_positive": False},
    {"id": "whale", "label": "Net-positive then desk", "needs_phone": False, "needs_desk": True, "needs_net_positive": True},
]

DAILY_RATES = {
    "standard": {"room": 89, "resort": 45, "parking": 25},
    "suite": {"room": 250, "resort": 45, "parking": 15},
    "penthouse": {"room": 890, "resort": 45, "parking": 0},
}


@dataclass
class WorldCycleState:
    clock_anchor_ms: int = field(default_factory=lambda: int(time.time() * 1000))
    processed_day: int = 0
    reservation_confirmed_desk: bool = False
    room_evicted: bool = False
    overdue_balance: int = 0
    last_rollover_messages: list[str] = field(default_factory=list)


@dataclass
class CycleResult:
    ok: bool
    message: str
    already: bool = False


def ensure_world_cycle(session: PlayerSession) -> WorldCycleState:
    if not hasattr(session, "world_cycle") or session.world_cycle is None:
        session.world_cycle = WorldCycleState()
    return session.world_cycle


def _now_ms() -> int:
    return int(time.time() * 1000)


def get_world_cycle_state(session: PlayerSession) -> dict:
    wc = ensure_world_cycle(session)
    elapsed = max(0, _now_ms() - wc.clock_anchor_ms)
    day_index = elapsed // MS_PER_GAME_DAY
    day_progress = (elapsed % MS_PER_GAME_DAY) / MS_PER_GAME_DAY
    phase = WORLD_PHASES[-1]
    for p in WORLD_PHASES:
        if p["start"] <= day_progress < p["end"]:
            phase = p
            break
    ms_until = MS_PER_GAME_DAY - (elapsed % MS_PER_GAME_DAY)
    requirement = RESERVATION_REQUIREMENTS[day_index % len(RESERVATION_REQUIREMENTS)]
    return {
        "day_index": day_index,
        "display_day": day_index + 1,
        "phase": phase,
        "ms_until_next_day": ms_until,
        "requirement": requirement,
        "room_evicted": wc.room_evicted,
        "overdue_balance": wc.overdue_balance,
    }


def get_daily_charge_total(hotel, tier_index: int = 0) -> dict:
    rates = dict(DAILY_RATES.get(hotel.room_type, DAILY_RATES["standard"]))
    resort = rates["resort"]
    if tier_index >= 3:
        resort = max(0, resort - 20)
    if tier_index >= 5:
        resort = 0
    rates["resort"] = resort
    rates["total"] = rates["room"] + resort + rates["parking"]
    return rates


def _reset_daily_reservation(hotel) -> None:
    hotel.found_reservation = False
    hotel.reservation_confirmed_desk = False
    hotel.reached_room = False
    hotel.hallway_progress = 0
    hotel.hallway_log.clear()
    hotel.late_checkout_used = False
    hotel.room_evicted = False
    if hotel.room_amenities:
        hotel.room_amenities.checked_out = False


def _apply_day_rollover(session: PlayerSession, day_index: int) -> str:
    if not hasattr(session, "hotel") or session.hotel is None:
        session.hotel = default_hotel_state()
    hotel = session.hotel
    wc = ensure_world_cycle(session)
    tier = get_session_tier_index(session)
    charges = get_daily_charge_total(hotel, tier)
    req = RESERVATION_REQUIREMENTS[day_index % len(RESERVATION_REQUIREMENTS)]
    _reset_daily_reservation(hotel)
    total_due = charges["total"] + wc.overdue_balance
    msg = f"Day {day_index + 1} — {req['label']}."
    if session.wallet.debit(total_due, "hotel", f"Day {day_index + 1} resort charges"):
        wc.overdue_balance = 0
        wc.room_evicted = False
        hotel.room_evicted = False
        msg += f" {fmt_chips(charges['total'])} posted."
    else:
        paid = session.wallet.balance
        if paid > 0:
            session.wallet.debit(paid, "hotel", f"Partial day {day_index + 1} charges")
        wc.overdue_balance = total_due - paid
        wc.room_evicted = True
        hotel.room_evicted = True
        hotel.reached_room = False
        msg += f" Could not cover {fmt_chips(total_due)} — {fmt_chips(wc.overdue_balance)} overdue."
    if hotel.nights_remaining > 0:
        hotel.nights_remaining -= 1
    return msg


def sync_world_cycle(session: PlayerSession) -> dict:
    if getattr(session, "_world_cycle_syncing", False):
        state = get_world_cycle_state(session)
        state["advanced"] = False
        state["messages"] = []
        return state
    session._world_cycle_syncing = True
    try:
        wc = ensure_world_cycle(session)
        state = get_world_cycle_state(session)
        messages: list[str] = []
        day_index = state["day_index"]
        if day_index > wc.processed_day:
            for d in range(wc.processed_day, day_index):
                messages.append(_apply_day_rollover(session, d))
            wc.processed_day = day_index
            wc.last_rollover_messages = messages[-3:]
        state["advanced"] = bool(messages)
        state["messages"] = messages
        return state
    finally:
        session._world_cycle_syncing = False


def get_reservation_requirement(session: PlayerSession) -> dict:
    return get_world_cycle_state(session)["requirement"]


def reservation_access_met(session: PlayerSession) -> bool:
    if not hasattr(session, "hotel") or session.hotel is None:
        return False
    hotel = session.hotel
    req = get_reservation_requirement(session)
    if req.get("needs_net_positive") and not is_net_positive(session):
        return False
    if req.get("needs_phone") and not hotel.found_reservation:
        return False
    if req.get("needs_desk") and not hotel.reservation_confirmed_desk:
        return False
    return True


def locate_reservation_via_phone(session: PlayerSession) -> CycleResult:
    sync_world_cycle(session)
    if not hasattr(session, "hotel") or session.hotel is None:
        session.hotel = default_hotel_state()
    hotel = session.hotel
    req = get_reservation_requirement(session)
    if not req.get("needs_phone") and req.get("needs_desk"):
        return CycleResult(False, "Today's requirement: front desk only.")
    if hotel.found_reservation:
        return CycleResult(True, "Already located via phone.", already=True)
    hotel.found_reservation = True
    return CycleResult(True, f"Located. Tower {hotel.wing.upper()}, floor {hotel.floor}.")


def confirm_reservation_at_desk(session: PlayerSession) -> CycleResult:
    sync_world_cycle(session)
    if not hasattr(session, "hotel") or session.hotel is None:
        session.hotel = default_hotel_state()
    hotel = session.hotel
    req = get_reservation_requirement(session)
    if req.get("needs_net_positive") and not is_net_positive(session):
        return CycleResult(False, "Net-positive floor session required today.")
    if req.get("needs_phone") and not hotel.found_reservation:
        return CycleResult(False, "Phone locate required first.")
    if not req.get("needs_desk"):
        return CycleResult(True, "Desk confirmation not required today.")
    if hotel.reservation_confirmed_desk:
        return CycleResult(True, "Already confirmed at desk.", already=True)
    hotel.reservation_confirmed_desk = True
    hotel.found_reservation = True
    return CycleResult(True, "Desk confirmed. Hallway access granted.")


def settle_hotel_overdue(session: PlayerSession) -> CycleResult:
    sync_world_cycle(session)
    wc = ensure_world_cycle(session)
    if wc.overdue_balance <= 0 and not wc.room_evicted:
        return CycleResult(True, "No overdue balance.")
    amount = wc.overdue_balance
    if not session.wallet.debit(amount, "hotel", "Overdue resort charges"):
        return CycleResult(False, f"Need {fmt_chips(amount)} to restore room access.")
    wc.overdue_balance = 0
    wc.room_evicted = False
    if hasattr(session, "hotel") and session.hotel is not None:
        session.hotel.room_evicted = False
    return CycleResult(True, f"{fmt_chips(amount)} settled. Room access restored.")
