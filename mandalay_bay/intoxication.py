"""Intoxication tracking for liquor, beer, and contraband consumption (CLI parity)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal

IntoxCategory = Literal["liquor", "beer", "contraband"]

INTOXICATION_MAX = 100
# How long max-level intoxication may last before settling to sober (seconds).
INTOX_MAX_SETTLE_SECONDS = 3 * 60

CONSUMABLE_POTENCY: dict[str, dict[str, object]] = {
    "eyecandy_mandalay_mule": {"category": "liquor", "potency": 2},
    "eyecandy_sound_check": {"category": "liquor", "potency": 2},
    "eyecandy_neon_fizz": {"category": "liquor", "potency": 2},
    "eyecandy_top_shelf": {"category": "liquor", "potency": 3},
    "big_chill_frozen_marg": {"category": "liquor", "potency": 2},
    "big_chill_daquiri": {"category": "liquor", "potency": 2},
    "big_chill_refill": {"category": "liquor", "potency": 2},
    "big_chill_mojito": {"category": "liquor", "potency": 2},
    "rr_southern_lemonade": {"category": "liquor", "potency": 2},
    "rr_kentucky_cooler": {"category": "liquor", "potency": 2},
    "rr_dove_margarita": {"category": "liquor", "potency": 2},
    "rr_craft_beer": {"category": "beer", "potency": 1},
    "mini_vodka": {"category": "liquor", "potency": 3},
    "champagne_split": {"category": "liquor", "potency": 2},
    "noir_herb_preroll": {"category": "contraband", "potency": 4},
    "foundation_edible": {"category": "contraband", "potency": 5},
    "pool_beach_club_bar": {"category": "liquor", "potency": 2},
    "pool_cabana_bottle": {"category": "liquor", "potency": 3},
    "welcome_cocktail": {"category": "liquor", "potency": 2},
}

POOL_CONSUMABLE_IDS = {
    "bar": "pool_beach_club_bar",
    "bottle": "pool_cabana_bottle",
}


@dataclass
class IntoxicationState:
    level: int = 0
    total_doses: int = 0
    last_consumed_at: str | None = None
    history: list[dict[str, object]] = field(default_factory=list)


def default_intoxication_state(**overrides: object) -> IntoxicationState:
    return IntoxicationState(
        level=int(overrides.get("level", 0)),  # type: ignore[arg-type]
        total_doses=int(overrides.get("total_doses", 0)),  # type: ignore[arg-type]
        last_consumed_at=overrides.get("last_consumed_at"),  # type: ignore[arg-type]
        history=list(overrides.get("history", [])),  # type: ignore[arg-type]
    )


def ensure_intoxication(session: object) -> IntoxicationState:
    if not hasattr(session, "intoxication") or session.intoxication is None:
        session.intoxication = IntoxicationState()
    return session.intoxication


def _potency_for(item_id: str) -> dict[str, object] | None:
    return CONSUMABLE_POTENCY.get(item_id)


def _compute_level_from_session_history(session: object) -> int:
    level = 0
    amenities = getattr(session, "amenities", None)
    if amenities is not None:
        for drink_id in getattr(amenities, "bar_orders", []):
            spec = _potency_for(drink_id)
            if spec:
                level += int(spec["potency"])
    hotel = getattr(session, "hotel", None)
    if hotel is not None:
        ra = getattr(hotel, "room_amenities", None)
        if ra is not None:
            for item_id in getattr(ra, "minibar_purchases", []):
                spec = _potency_for(item_id)
                if spec:
                    level += int(spec["potency"])
    rpg = getattr(session, "rpg", None)
    if rpg is not None:
        flags = getattr(rpg, "flags", {}) or {}
        if flags.get("redeemed_welcome_drink"):
            spec = _potency_for("welcome_cocktail")
            if spec:
                level += int(spec["potency"])
    return min(INTOXICATION_MAX, level)


def _parse_consumed_at(iso: str | None) -> datetime | None:
    if not iso:
        return None
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def settle_intoxication(session: object) -> bool:
    """Reset intoxication level to sober. Returns True if a reset occurred."""
    state = ensure_intoxication(session)
    if state.level <= 0:
        return False
    state.level = 0
    return True


def maybe_settle_max_intoxication(
    session: object,
    *,
    now: datetime | None = None,
) -> bool:
    """
    If the guest has been at max intoxication for INTOX_MAX_SETTLE_SECONDS,
    settle to sober. Returns True when a settle happened.
    """
    state = ensure_intoxication(session)
    if state.level < INTOXICATION_MAX:
        return False
    current = now or datetime.now(timezone.utc)
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    started = _parse_consumed_at(state.last_consumed_at)
    if started is None:
        state.last_consumed_at = current.isoformat()
        return False
    elapsed = (current - started).total_seconds()
    if elapsed >= INTOX_MAX_SETTLE_SECONDS:
        return settle_intoxication(session)
    return False


def attach_intoxication_to_session(session: object, data: dict | None = None) -> IntoxicationState:
    raw = (data or {}).get("intoxication") or {}
    if raw.get("level") is not None or raw.get("total_doses") is not None or raw.get("totalDoses") is not None:
        session.intoxication = IntoxicationState(
            level=int(raw.get("level", 0)),
            total_doses=int(raw.get("total_doses", raw.get("totalDoses", 0))),
            last_consumed_at=raw.get("last_consumed_at") or raw.get("lastConsumedAt"),
            history=list(raw.get("history", [])),
        )
    else:
        session.intoxication = default_intoxication_state(level=_compute_level_from_session_history(session))
    maybe_settle_max_intoxication(session)
    return session.intoxication


def record_consumption(session: object, item_id: str, *, source: str = "unknown") -> dict[str, object]:
    spec = _potency_for(item_id)
    if spec is None:
        state = ensure_intoxication(session)
        return {"ok": False, "level": state.level, "added": 0}

    state = ensure_intoxication(session)
    added = int(spec["potency"])
    state.level = min(INTOXICATION_MAX, state.level + added)
    state.total_doses += 1
    state.last_consumed_at = datetime.now(timezone.utc).isoformat()
    state.history.append(
        {
            "itemId": item_id,
            "category": spec["category"],
            "potency": added,
            "source": source,
            "at": state.last_consumed_at,
        }
    )
    if len(state.history) > 40:
        state.history = state.history[-40:]
    return {"ok": True, "level": state.level, "added": added}


def get_intoxication_level(session: object) -> int:
    maybe_settle_max_intoxication(session)
    return ensure_intoxication(session).level


def is_consumable_item(item_id: str) -> bool:
    return item_id in CONSUMABLE_POTENCY
