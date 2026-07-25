"""Resort completion tracker."""

from __future__ import annotations

from mandalay_bay.pool_complex import POOL_EVENTS, ensure_pool_complex
from mandalay_bay.room_amenities import ROOM_EVENTS, TV_CHANNELS, ensure_room_amenities
from mandalay_bay.hotel import ensure_hotel
from mandalay_bay.session import PlayerSession

TOTAL_ROOM_EVENTS = len(ROOM_EVENTS)
TOTAL_POOL_EVENTS = len(POOL_EVENTS)
TOTAL_TV_CHANNELS = len(TV_CHANNELS)


def get_resort_completion(session: PlayerSession) -> dict:
    hotel = ensure_hotel(session)
    ra = ensure_room_amenities(hotel)
    pc = ensure_pool_complex(session)

    items = [
        {"id": "room_events", "label": "Room vignettes", "current": len(ra.unlocked_events), "total": TOTAL_ROOM_EVENTS},
        {"id": "pool_events", "label": "Pool vignettes", "current": len(pc.unlocked_events), "total": TOTAL_POOL_EVENTS},
        {"id": "tv_channels", "label": "TV channels sampled", "current": len(ra.channels_watched), "total": TOTAL_TV_CHANNELS},
    ]
    earned = sum(min(i["current"], i["total"]) for i in items)
    possible = sum(i["total"] for i in items)
    percent = round((earned / possible) * 100) if possible else 0
    return {
        "items": items,
        "earned": earned,
        "possible": possible,
        "percent": percent,
        "is_complete": earned >= possible,
    }
