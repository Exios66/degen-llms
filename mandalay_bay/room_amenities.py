"""In-room amenities — TV, minibar, phone, unlockable Vegas events (CLI parity)."""

from __future__ import annotations

from dataclasses import dataclass, field

from mandalay_bay.hotel import RoomAmenitiesState, ensure_hotel, fmt_chips, is_net_positive
from mandalay_bay.intoxication import record_consumption
from mandalay_bay.resort_bridge import get_session_tier_index, resort_requirements_met
from mandalay_bay.session import PlayerSession

TV_CHANNELS = {
    "news": {
        "label": "Channel 4 — Financial News Loop",
        "description": "A pundit explains why your vacation is inflationary.",
        "flavor": "Markets are jittery. So are you.",
    },
    "aquarium": {
        "label": "Channel 47 — Shark Reef Live",
        "description": "Sand tiger sharks circle the acrylic tunnel.",
        "flavor": "The shark makes eye contact. It has seen worse nights than yours.",
    },
    "wave_pool": {
        "label": "Channel 12 — Wave Pool Cam",
        "description": "Artificial surf rolls across eleven acres of chlorinated ambition.",
        "flavor": "Someone loses a hat every thirty seconds. Vegas efficiency.",
    },
    "vegas_loop": {
        "label": "Channel 99 — Sin City Highlights",
        "description": "Montage of neon, fountains, and questionable life choices.",
        "flavor": "The montage knows what you did last night.",
    },
    "steve_harvey": {
        "label": "Channel 88 — Steve Harvey Race Replay",
        "description": "Steve Harvey calls a photo finish with theatrical certainty.",
        "flavor": "And the winner is— Results pending. Survey says… bet the long shot!",
        "requires_net_positive": True,
    },
    "foreign_films": {
        "label": "Channel 203 — Untranslated Cinema",
        "description": "A French noir at 2 AM. No subtitles.",
        "flavor": "The protagonist also made bad decisions in a hotel room.",
    },
    "arena_boxing": {
        "label": "Channel 22 — ULTRA Arena Fight Replay",
        "description": "Last night's championship bout loops in slow motion.",
        "flavor": "Michelob ULTRA Arena — punches echo louder than slots.",
    },
    "house_of_blues": {
        "label": "Channel 55 — House of Blues Live",
        "description": "Blues riffs drift from the venue next door.",
        "flavor": "Gold tier gets priority line.",
        "min_tier_index": 2,
    },
}

MINIBAR_ITEMS = {
    "mini_vodka": {"label": "Mini vodka", "price": 12, "flavor": "Tastes like regret and complimentary ice."},
    "salted_almonds": {"label": "Salted almonds", "price": 18, "flavor": "Sustainably sourced from your wallet."},
    "champagne_split": {"label": "Champagne split", "price": 45, "flavor": "Pop the cork. The minibar sensor applauds silently."},
    "energy_drink": {"label": "Energy drink", "price": 9, "flavor": "For when the casino floor is still winning."},
    "bottled_water": {"label": "Bottled water", "price": 8, "flavor": "Somehow costs almost as much as the vodka."},
    "noir_herb_preroll": {
        "label": "Noir pre-roll (contraband)",
        "price": 55,
        "flavor": "State-sanctioned recreational herb — farm-to-lounge, no photos.",
        "min_tier_index": 4,
    },
    "foundation_edible": {
        "label": "Foundation Room edible (contraband)",
        "price": 75,
        "flavor": "Velvet-rope gummy — the lounge sommelier nods approvingly.",
        "min_tier_index": 4,
        "room_types": ["penthouse"],
        "requires_call": "foundation_room",
    },
    "stare_at_minibar": {
        "label": "Open the door without taking anything",
        "price": 50,
        "flavor": "The sensor charges you for proximity. Classic Vegas hospitality.",
    },
}

PHONE_CALLS = {
    "home": {"label": "Call home (unlimited)", "destination": "Mom in Ohio", "flavor": "She knows you're not winning."},
    "tokyo": {"label": "Call Tokyo at 3 AM", "destination": "Tokyo", "flavor": "Fish markets and existential dread."},
    "ex": {"label": "Call your ex", "destination": "Voicemail — full", "flavor": "The mailbox is full."},
    "concierge": {"label": "Call concierge", "destination": "Front desk", "flavor": "Pool party on the 11th floor tonight."},
    "bookie": {"label": "Call Pete the bookie", "destination": "Off-strip", "flavor": "The three horse is live."},
    "paris": {"label": "Call Paris", "destination": "A café near the Seine", "flavor": "You order a croissant anyway."},
    "random_foreign": {
        "label": "Dial a random foreign number",
        "destination": "Unknown international prefix",
        "flavor": "Buckingham Palace, good evening.",
    },
    "house_of_blues": {
        "label": "Call House of Blues box office",
        "destination": "Mandalay Bay music venue",
        "flavor": "Gold members get the priority line.",
        "min_tier_index": 2,
    },
    "spa_concierge": {
        "label": "Call spa concierge",
        "destination": "Spa & Salon",
        "flavor": "Platinum comp upgrade available.",
        "min_tier_index": 3,
    },
    "foundation_room": {
        "label": "Call Foundation Room direct line",
        "destination": "Noir lounge",
        "flavor": "Penthouse key works as membership card.",
        "room_types": ["penthouse"],
        "min_tier_index": 4,
    },
    "delano_tower": {
        "label": "Call Delano sister property",
        "destination": "Delano Las Vegas",
        "flavor": "Wrong tower, darling.",
    },
}

ROOM_DECISIONS = {
    "do_not_disturb": {"label": "Hang the Do Not Disturb sign", "flavor": "Privacy secured."},
    "balcony": {"label": "Step onto the balcony", "flavor": "The Strip glitters below."},
    "room_service": {"label": "Order room service", "flavor": "A burger arrives in forty-five minutes.", "price": 35},
    "tip_maid": {"label": "Leave a chip tip for housekeeping", "flavor": "Tomorrow's towels will be fluffier.", "price": 25},
    "sky_bridge_walk": {"label": "Walk Mandalay Place sky bridge", "flavor": "Luxor's pyramid glows through the glass."},
    "suite_living_room": {
        "label": "Retreat to the suite living room",
        "flavor": "Separate TV, separate minibar judgment.",
        "room_types": ["suite", "penthouse"],
    },
    "telescope_balcony": {
        "label": "Use the penthouse telescope",
        "flavor": "Read the tote board from floor 62.",
        "room_types": ["penthouse"],
    },
    "butler_turn_down": {
        "label": "Request butler turn-down service",
        "flavor": "Chocolate on the pillow.",
        "room_types": ["penthouse"],
    },
    "spa_day": {"label": "Book spa day via room tablet", "flavor": "Hot stone massage scheduled.", "min_tier_index": 3},
    "wedding_chapel": {"label": "Accidentally book a wedding chapel tour", "flavor": "The chapel sends a brochure."},
    "wake_up_call": {"label": "Schedule wake-up call roulette", "flavor": "Steve Harvey OR Shark Reef feed."},
}

ROOM_EVENTS = {
    "shark_whisperer": {
        "label": "Shark Whisperer",
        "narrative": "You narrate the aquarium feed in a hushed sportscaster voice.",
        "requires": {"channels": ["aquarium"], "minibar": ["salted_almonds"]},
    },
    "midnight_ocean": {
        "label": "Midnight Ocean Conference",
        "narrative": "Tokyo and the shark reef are on speakerphone together.",
        "requires": {"channels": ["aquarium"], "calls": ["tokyo"]},
    },
    "champagne_sunset": {
        "label": "Champagne Sunset",
        "narrative": "Wave pool on the TV, champagne in hand.",
        "requires": {"channels": ["wave_pool"], "minibar": ["champagne_split"]},
    },
    "pool_party_vip": {
        "label": "Pool Party VIP",
        "narrative": "Concierge sends a wristband via bellhop.",
        "requires": {"calls": ["concierge"], "minibar": ["champagne_split"], "pool_zones": ["beach_rave"]},
    },
    "what_happens": {
        "label": "What Happens in Vegas…",
        "narrative": "The night blurs. Confetti and a room key that isn't yours.",
        "requires": {"minibar": ["mini_vodka", "mini_vodka"], "calls": ["ex"], "decisions": ["balcony"]},
    },
    "high_roller_crawl": {
        "label": "High-Roller Suite Crawl",
        "narrative": "Suite neighbors invite you door-to-door.",
        "requires": {"room_types": ["suite", "penthouse"], "minibar": ["champagne_split"]},
    },
    "hangover_brunch": {
        "label": "Hangover Brunch Comp",
        "narrative": "Room service sends a Bloody Mary the size of the bay.",
        "requires": {"events": ["what_happens"]},
    },
    "buckingham_moment": {
        "label": "Wrong Number, Right Palace",
        "narrative": "Nobody believes you at the bar.",
        "requires": {"calls": ["random_foreign"]},
    },
    "steve_harvey_hotline": {
        "label": "Steve Harvey Hotline",
        "narrative": "Steve loops on TV while Pete picks up. Your horse hits.",
        "requires": {"channels": ["steve_harvey"], "calls": ["bookie"], "net_positive": True},
    },
    "fight_night_suite": {
        "label": "Fight Night Suite",
        "narrative": "ULTRA Arena replay, Pete on speakerphone, suite windows rattling.",
        "requires": {"channels": ["arena_boxing"], "calls": ["bookie"], "room_types": ["suite", "penthouse"]},
    },
    "foundation_after_dark": {
        "label": "Foundation After Dark",
        "narrative": "Noir velvet rope, penthouse champagne.",
        "requires": {
            "calls": ["foundation_room"],
            "minibar": ["champagne_split"],
            "min_tier_index": 4,
            "room_types": ["penthouse"],
        },
    },
    "sky_bridge_haul": {
        "label": "Sky Bridge Haul",
        "narrative": "LUSH bath bomb, Strip balcony, spa recovery.",
        "requires": {"decisions": ["sky_bridge_walk", "balcony"], "shopping_items": ["lush_bath_bomb"]},
    },
    "eleven_acres_hangover": {
        "label": "Eleven Acres Hangover",
        "narrative": "Every pool zone yesterday. Brunch with sunglasses today.",
        "requires": {"pool_events": ["eleven_acres"], "events": ["hangover_brunch"]},
    },
    "chapel_wrong_turn": {
        "label": "Chapel Wrong Turn",
        "narrative": "Wrong number, wedding brochure, chapel tour.",
        "requires": {"calls": ["random_foreign"], "decisions": ["wedding_chapel"]},
    },
    "convention_survival": {
        "label": "Convention Survival",
        "narrative": "Synergy keynote, energy drink, DND sign.",
        "requires": {"channels": ["news"], "minibar": ["energy_drink"], "decisions": ["do_not_disturb"]},
    },
    "butler_turn_down": {
        "label": "Butler Turn-Down Legend",
        "narrative": "Chocolate, curtains, penthouse folio novella.",
        "requires": {"decisions": ["butler_turn_down"], "room_types": ["penthouse"]},
    },
    "telescope_strip": {
        "label": "Telescope Strip Sweep",
        "narrative": "Floor 62 optics on the sportsbook tote.",
        "requires": {"decisions": ["telescope_balcony"], "room_types": ["penthouse"]},
    },
}

RESORT_TIME_LABELS = ["Dawn over the bay", "Midday chlorination", "Neon dusk", "2 AM clarity"]


@dataclass
class AmenityResult:
    ok: bool
    message: str
    unlock: str | None = None


def ensure_room_amenities(hotel) -> RoomAmenitiesState:
    if not hasattr(hotel, "room_amenities") or hotel.room_amenities is None:
        hotel.room_amenities = RoomAmenitiesState()
    return hotel.room_amenities


def _has_all(haystack: list[str], needles: list[str]) -> bool:
    return all(n in haystack for n in needles)


def _amenity_allowed(session: PlayerSession, hotel, item: dict) -> bool:
    if item.get("requires_net_positive") and not is_net_positive(session):
        return False
    if "min_tier_index" in item and get_session_tier_index(session) < item["min_tier_index"]:
        return False
    if "room_types" in item and hotel.room_type not in item["room_types"]:
        return False
    if "requires_call" in item:
        ra = ensure_room_amenities(hotel)
        if item["requires_call"] not in ra.phone_calls:
            return False
    return True


def get_resort_time_of_day(hotel) -> dict:
    slot = getattr(hotel, "resort_time", 0) % 4
    return {"slot": slot, "label": RESORT_TIME_LABELS[slot]}


def advance_resort_time(hotel, steps: int = 1) -> dict:
    hotel.resort_time = (getattr(hotel, "resort_time", 0) + steps) % 4
    return get_resort_time_of_day(hotel)


def _requirements_met(session: PlayerSession, hotel, event: dict) -> bool:
    ra = ensure_room_amenities(hotel)
    req = event["requires"]
    if "channels" in req and not _has_all(ra.channels_watched, req["channels"]):
        return False
    if "minibar" in req and not _has_all(ra.minibar_purchases, req["minibar"]):
        return False
    if "calls" in req and not _has_all(ra.phone_calls, req["calls"]):
        return False
    if "decisions" in req and not _has_all(ra.decisions, req["decisions"]):
        return False
    if "events" in req and not _has_all(ra.unlocked_events, req["events"]):
        return False
    if req.get("net_positive") and not is_net_positive(session):
        return False
    if not resort_requirements_met(session, req, hotel=hotel, room_amenities=ra):
        return False
    return True


def _try_unlock_events(session: PlayerSession) -> list[dict]:
    hotel = ensure_hotel(session)
    ra = ensure_room_amenities(hotel)
    unlocked = []
    for event_id, event in ROOM_EVENTS.items():
        if event_id in ra.unlocked_events:
            continue
        if not _requirements_met(session, hotel, event):
            continue
        ra.unlocked_events.append(event_id)
        ra.event_log.append(event["narrative"])
        unlocked.append(event)
    return unlocked


def _after_amenity_action(session: PlayerSession) -> list[dict]:
    hotel = ensure_hotel(session)
    ra = ensure_room_amenities(hotel)
    ra.amenity_actions = getattr(ra, "amenity_actions", 0) + 1
    advance_resort_time(hotel)
    return _try_unlock_events(session)


def _unlock_suffix(unlocked: list[dict]) -> str:
    if not unlocked:
        return ""
    labels = ", ".join(e["label"] for e in unlocked)
    return f"\n\nUnlocked: {labels}"


def _gate_message(item: dict) -> str:
    if item.get("requires_net_positive"):
        return "Premium channel locked until you're net-positive on the floor."
    if item.get("requires_call"):
        return "Call the Foundation Room direct line first — velvet rope protocol."
    if "min_tier_index" in item:
        return f"Requires MGM Rewards tier {item['min_tier_index'] + 1} or higher."
    if "room_types" in item:
        return f"Available in {' / '.join(item['room_types'])} only."
    return "Not available."


def tune_tv_channel(session: PlayerSession, channel_id: str) -> AmenityResult:
    channel = TV_CHANNELS.get(channel_id)
    if not channel:
        return AmenityResult(False, "Static. No signal.")
    hotel = ensure_hotel(session)
    if not _amenity_allowed(session, hotel, channel):
        return AmenityResult(False, _gate_message(channel))
    ra = ensure_room_amenities(hotel)
    ra.tv_channel = channel_id
    if channel_id not in ra.channels_watched:
        ra.channels_watched.append(channel_id)
    unlocked = _after_amenity_action(session)
    time_label = get_resort_time_of_day(hotel)["label"]
    message = (
        f"{channel['label']}\n{channel['description']}\n{channel['flavor']}\n({time_label})"
        f"{_unlock_suffix(unlocked)}"
    )
    unlock = unlocked[0]["label"] if unlocked else None
    return AmenityResult(True, message, unlock)


def purchase_minibar_item(session: PlayerSession, item_id: str) -> AmenityResult:
    item = MINIBAR_ITEMS.get(item_id)
    if not item:
        return AmenityResult(False, "The minibar judges silently.")
    hotel = ensure_hotel(session)
    if not _amenity_allowed(session, hotel, item):
        return AmenityResult(False, _gate_message(item))
    ra = ensure_room_amenities(hotel)
    if not session.wallet.debit(item["price"], "hotel", f"Minibar: {item['label']}"):
        return AmenityResult(False, f"Need {fmt_chips(item['price'])} — the minibar doesn't accept IOUs.")
    ra.minibar_purchases.append(item_id)
    ra.minibar_tab += item["price"]
    record_consumption(session, item_id, source="minibar")
    unlocked = _after_amenity_action(session)
    message = (
        f"{item['label']} — {fmt_chips(item['price'])} charged to the room.\n{item['flavor']}"
        f"{_unlock_suffix(unlocked)}"
    )
    return AmenityResult(True, message)


def make_phone_call(session: PlayerSession, call_id: str) -> AmenityResult:
    call = PHONE_CALLS.get(call_id)
    if not call:
        return AmenityResult(False, "Dead line. Try again.")
    hotel = ensure_hotel(session)
    if not _amenity_allowed(session, hotel, call):
        return AmenityResult(False, _gate_message(call))
    ra = ensure_room_amenities(hotel)
    if call_id not in ra.phone_calls:
        ra.phone_calls.append(call_id)
    unlocked = _after_amenity_action(session)
    message = (
        f"{call['label']} → {call['destination']}\n{call['flavor']}\n"
        f"(Unlimited foreign calls — the hotel absorbs the guilt.)"
        f"{_unlock_suffix(unlocked)}"
    )
    return AmenityResult(True, message)


def make_room_decision(session: PlayerSession, decision_id: str) -> AmenityResult:
    decision = ROOM_DECISIONS.get(decision_id)
    if not decision:
        return AmenityResult(False, "Indecision is also a choice.")
    hotel = ensure_hotel(session)
    if not _amenity_allowed(session, hotel, decision):
        return AmenityResult(False, _gate_message(decision))
    ra = ensure_room_amenities(hotel)
    price = decision.get("price")
    if price and not session.wallet.debit(price, "hotel", decision["label"]):
        return AmenityResult(False, f"Need {fmt_chips(price)}.")
    if decision_id not in ra.decisions:
        ra.decisions.append(decision_id)
    if decision_id == "wake_up_call":
        ra.wake_up_scheduled = True
    unlocked = _after_amenity_action(session)
    message = f"{decision['label']}\n{decision['flavor']}{_unlock_suffix(unlocked)}"
    return AmenityResult(True, message)


def get_room_amenities_summary(hotel) -> str:
    ra = ensure_room_amenities(hotel)
    parts = [get_resort_time_of_day(hotel)["label"]]
    if ra.tv_channel:
        ch = TV_CHANNELS.get(ra.tv_channel, {})
        parts.append(f"TV: {ch.get('label', ra.tv_channel)}")
    if ra.minibar_tab > 0:
        parts.append(f"Minibar tab: {fmt_chips(ra.minibar_tab)}")
    if ra.phone_calls:
        parts.append(f"{len(ra.phone_calls)} call(s) logged")
    if ra.unlocked_events:
        parts.append(f"{len(ra.unlocked_events)} event(s) unlocked")
    return " · ".join(parts) if parts else "The room awaits your bad decisions."
