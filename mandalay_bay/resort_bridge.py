"""Cross-resort requirement checks — room, pool, shopping, rewards tier."""

from __future__ import annotations

from mandalay_bay.casino_amenities import ensure_amenities
from mandalay_bay.hotel import ensure_hotel
from mandalay_bay.pool_complex import ensure_pool_complex
from mandalay_bay.rewards import tier_for_wagered
from mandalay_bay.rewards_perks import tier_index
from mandalay_bay.session import PlayerSession


def _has_all(haystack: list[str], needles: list[str]) -> bool:
    return all(n in haystack for n in needles)


def get_session_tier_index(session: PlayerSession) -> int:
    rewards = getattr(session, "rewards", None)
    wagered = rewards.lifetime_wagered if rewards else 0
    return tier_index(tier_for_wagered(wagered).id)


def resort_requirements_met(session: PlayerSession, req: dict, *, hotel=None, room_amenities=None) -> bool:
    if not req:
        return True
    hotel = hotel or ensure_hotel(session)
    ra = room_amenities or getattr(hotel, "room_amenities", None)
    pc = ensure_pool_complex(session)
    amenities = ensure_amenities(session)

    if "pool_zones" in req and not _has_all(pc.visited_zones, req["pool_zones"]):
        return False
    if "pool_events" in req and not _has_all(pc.unlocked_events, req["pool_events"]):
        return False
    if ra and "room_events" in req and not _has_all(ra.unlocked_events, req["room_events"]):
        return False
    if "shopping_items" in req and not _has_all(amenities.purchased_items, req["shopping_items"]):
        return False
    if "min_tier_index" in req and get_session_tier_index(session) < req["min_tier_index"]:
        return False
    if "room_types" in req and hotel.room_type not in req["room_types"]:
        return False
    return True
