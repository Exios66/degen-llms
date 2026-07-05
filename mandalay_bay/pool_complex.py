"""Mandalay Bay Pool Complex expansion — zones, minigames, unlockable events."""

from __future__ import annotations

import random
from dataclasses import dataclass, field

from mandalay_bay.hotel import fmt_chips, is_net_positive
from mandalay_bay.session import PlayerSession

POOL_ZONES = {
    "wave_pool": {"label": "Wave Pool", "description": "Eleven acres of artificial surf."},
    "hot_tubs": {"label": "Hot Tubs", "description": "Steaming circles of gossip and chlorine."},
    "cabanas": {"label": "Private Cabanas", "description": "Rope-off luxury and bottle service."},
    "shark_reef": {"label": "Shark Reef Aquarium", "description": "Sand tiger sharks behind acrylic."},
    "beach_club": {"label": "Topless Beach Club", "description": "21+ European-style pool deck."},
    "beach_rave": {"label": "Beach Rave", "description": "Neon after dark by the wave pool."},
}

SHARK_SPECIES = {
    "sand_tiger": {"label": "Sand tiger shark"},
    "green_sea_turtle": {"label": "Green sea turtle"},
    "sawfish": {"label": "Largetooth sawfish"},
    "golden_ray": {"label": "Golden cownose ray"},
    "jellyfish": {"label": "Pacific sea nettle"},
}

WAVE_TIMING = ["Jump early", "Ride the crest", "Bail late"]
RAVE_MOVES = ["Fist pump", "Shuffling", "Glow spin"]

POOL_EVENTS = {
    "first_splash": {
        "label": "First Splash",
        "narrative": "The wave catches you perfectly. Chlorinated triumph.",
        "requires": {"zones": ["wave_pool"]},
    },
    "steam_and_chips": {
        "label": "Steam & Chips",
        "narrative": "Hot tub gossip confirms your blackjack run.",
        "requires": {"zones": ["hot_tubs"], "net_positive": True},
    },
    "cabana_king": {
        "label": "Cabana King",
        "narrative": "Your cabana. Your rules.",
        "requires": {"flags": ["cabana_booked"]},
    },
    "reef_photographer": {
        "label": "Reef Photographer",
        "narrative": "Five species captured.",
        "requires": {"shark_photos": 5},
    },
    "beach_club_initiate": {
        "label": "Beach Club Initiate",
        "narrative": "You survived the rope line.",
        "requires": {"zones": ["beach_club"]},
    },
    "rave_til_dawn": {
        "label": "Rave Til Dawn",
        "narrative": "Glow sticks and bass drops until dawn.",
        "requires": {"zones": ["beach_rave"], "flags": ["rave_danced"]},
    },
    "eleven_acres": {
        "label": "Eleven Acres Conquered",
        "narrative": "Every zone in the complex.",
        "requires": {"zones": list(POOL_ZONES.keys())},
    },
    "steve_at_the_reef": {
        "label": "Steve at the Reef",
        "narrative": "Steve Harvey narrates the shark tunnel. Survey says… apex predator!",
        "requires": {"zones": ["shark_reef"], "flags": ["steve_reef_rumor"]},
    },
}


@dataclass
class PoolComplexState:
    visited_zones: list[str] = field(default_factory=list)
    action_log: list[str] = field(default_factory=list)
    unlocked_events: list[str] = field(default_factory=list)
    flags: dict[str, bool] = field(default_factory=dict)
    wave_wins: int = 0
    ring_toss_wins: int = 0
    shark_photos: list[str] = field(default_factory=list)
    hot_tub_soaks: int = 0
    wave_target: int | None = None
    rave_moves: list[int] = field(default_factory=list)
    rave_step: int = 0


@dataclass
class PoolResult:
    ok: bool
    message: str
    unlock: str | None = None


def default_pool_complex_state() -> PoolComplexState:
    return PoolComplexState()


def ensure_pool_complex(session: PlayerSession) -> PoolComplexState:
    if not hasattr(session, "pool_complex") or session.pool_complex is None:
        session.pool_complex = default_pool_complex_state()
    return session.pool_complex


def _has_all(haystack: list[str], needles: list[str]) -> bool:
    return all(n in haystack for n in needles)


def _requirements_met(session: PlayerSession, pc: PoolComplexState, event: dict) -> bool:
    req = event["requires"]
    if "zones" in req and not _has_all(pc.visited_zones, req["zones"]):
        return False
    if "shark_photos" in req and len(pc.shark_photos) < req["shark_photos"]:
        return False
    if "flags" in req and not all(pc.flags.get(f) for f in req["flags"]):
        return False
    if req.get("net_positive") and not is_net_positive(session):
        return False
    return True


def _try_unlock_events(session: PlayerSession) -> list[dict]:
    pc = ensure_pool_complex(session)
    unlocked = []
    for event_id, event in POOL_EVENTS.items():
        if event_id in pc.unlocked_events:
            continue
        if not _requirements_met(session, pc, event):
            continue
        pc.unlocked_events.append(event_id)
        pc.action_log.append(event["narrative"])
        unlocked.append(event)
    return unlocked


def _visit_zone(session: PlayerSession, zone_id: str) -> list[dict]:
    pc = ensure_pool_complex(session)
    if zone_id not in pc.visited_zones:
        pc.visited_zones.append(zone_id)
    return _try_unlock_events(session)


def _finish(message: str, unlocked: list[dict]) -> PoolResult:
    if unlocked:
        labels = ", ".join(e["label"] for e in unlocked)
        message += f"\n\nUnlocked: {labels}"
    return PoolResult(True, message)


def enter_zone(session: PlayerSession, zone_id: str) -> PoolResult:
    zone = POOL_ZONES.get(zone_id)
    if not zone:
        return PoolResult(False, "That's a maintenance closet.")
    unlocked = _visit_zone(session, zone_id)
    return _finish(f"{zone['label']}\n{zone['description']}", unlocked)


def play_catch_wave(session: PlayerSession, timing_index: int) -> PoolResult:
    pc = ensure_pool_complex(session)
    _visit_zone(session, "wave_pool")
    if pc.wave_target is None:
        pc.wave_target = random.randint(0, len(WAVE_TIMING) - 1)
    if timing_index < 0 or timing_index >= len(WAVE_TIMING):
        return PoolResult(False, "Pick a timing.")
    pick = WAVE_TIMING[timing_index]
    correct = timing_index == pc.wave_target
    pc.wave_target = random.randint(0, len(WAVE_TIMING) - 1)
    if correct:
        pc.wave_wins += 1
        payout = 25
        session.wallet.credit(payout, "pool", "Wave pool ride")
        unlocked = _try_unlock_events(session)
        return _finish(f"{pick} — PERFECT! +{fmt_chips(payout)}.", unlocked)
    return PoolResult(True, f"{pick} — mistimed. Try again.")


def play_ring_toss(session: PlayerSession, bet: int, ring_index: int) -> PoolResult:
    pc = ensure_pool_complex(session)
    _visit_zone(session, "wave_pool")
    if bet < 10:
        return PoolResult(False, "Minimum $10 ring toss.")
    if not session.wallet.debit(bet, "pool", "Ring toss"):
        return PoolResult(False, f"Need {fmt_chips(bet)}.")
    rings = ["Inner tube", "Lifeguard tower", "Cabana post"]
    if ring_index < 0 or ring_index >= len(rings):
        return PoolResult(False, "Pick a target.")
    pick = rings[ring_index]
    roll = random.randint(1, 10)
    if roll >= 8:
        payout = bet * 3
        session.wallet.credit(payout, "pool", "Ring toss winner")
        pc.ring_toss_wins += 1
        unlocked = _try_unlock_events(session)
        return _finish(f"{pick} — RINGER! +{fmt_chips(payout)}.", unlocked)
    if roll >= 5:
        session.wallet.credit(bet, "pool", "Ring toss push")
        return PoolResult(True, f"{pick} — close! Bet returned.")
    return PoolResult(True, f"{pick} — splash. House keeps {fmt_chips(bet)}.")


def photograph_shark(session: PlayerSession, species_id: str) -> PoolResult:
    pc = ensure_pool_complex(session)
    _visit_zone(session, "shark_reef")
    species = SHARK_SPECIES.get(species_id)
    if not species:
        return PoolResult(False, "That species migrated.")
    if species_id in pc.shark_photos:
        return PoolResult(True, f"{species['label']} already photographed.")
    pc.shark_photos.append(species_id)
    unlocked = _try_unlock_events(session)
    return _finish(f"{species['label']} captured! ({len(pc.shark_photos)}/5)", unlocked)


def soak_hot_tub(session: PlayerSession, choice_id: str) -> PoolResult:
    _visit_zone(session, "hot_tubs")
    pc = ensure_pool_complex(session)
    pc.hot_tub_soaks += 1
    options = {
        "gossip": ("Steve Harvey was at the reef narrating sharks. Survey says… fish!", "steve_reef_rumor"),
        "relax": ("You soak until your chips feel lighter.", None),
        "challenge": ("You last four minutes without checking odds.", None),
    }
    opt = options.get(choice_id)
    if not opt:
        return PoolResult(False, "Pick a soak option.")
    message, flag = opt
    if flag:
        pc.flags[flag] = True
    unlocked = _try_unlock_events(session)
    return _finish(message, unlocked)


def book_cabana(session: PlayerSession) -> PoolResult:
    _visit_zone(session, "cabanas")
    pc = ensure_pool_complex(session)
    if pc.flags.get("cabana_booked"):
        return PoolResult(True, "Your cabana awaits.")
    cost = 200
    if not session.wallet.debit(cost, "pool", "Cabana rental"):
        return PoolResult(False, f"Cabana requires {fmt_chips(cost)}.")
    pc.flags["cabana_booked"] = True
    unlocked = _try_unlock_events(session)
    return _finish(f"Cabana secured for {fmt_chips(cost)}.", unlocked)


def cabana_service(session: PlayerSession, service_id: str) -> PoolResult:
    pc = ensure_pool_complex(session)
    if not pc.flags.get("cabana_booked"):
        return PoolResult(False, "Book a cabana first.")
    services = {
        "bottle": (85, "Champagne arrives on ice."),
        "nap": (0, "You nap through the afternoon heat."),
        "people_watch": (0, "People-watching the wave pool."),
    }
    svc = services.get(service_id)
    if not svc:
        return PoolResult(False, "Unknown service.")
    price, message = svc
    if price and not session.wallet.debit(price, "pool", "Cabana service"):
        return PoolResult(False, f"Need {fmt_chips(price)}.")
    return PoolResult(True, message)


def enter_beach_club(session: PlayerSession) -> PoolResult:
    _visit_zone(session, "beach_club")
    pc = ensure_pool_complex(session)
    if pc.flags.get("beach_club_pass"):
        unlocked = _try_unlock_events(session)
        return _finish("Welcome back to the beach club.", unlocked)
    cover = 75
    if not session.wallet.debit(cover, "pool", "Beach club cover"):
        return PoolResult(False, f"Cover charge: {fmt_chips(cover)}.")
    pc.flags["beach_club_pass"] = True
    unlocked = _try_unlock_events(session)
    return _finish(f"Cover paid ({fmt_chips(cover)}). 21+ enforced.", unlocked)


def beach_club_action(session: PlayerSession, action_id: str) -> PoolResult:
    pc = ensure_pool_complex(session)
    if not pc.flags.get("beach_club_pass"):
        return enter_beach_club(session)
    actions = {
        "bar": (18, "Frozen cocktail acquired."),
        "sun_deck": (0, "You claim a lounger."),
        "vip_rope": (50, "VIP section accessed."),
    }
    act = actions.get(action_id)
    if not act:
        return PoolResult(False, "Pick an action.")
    price, message = act
    if price and not session.wallet.debit(price, "pool", "Beach club"):
        return PoolResult(False, f"Need {fmt_chips(price)}.")
    return PoolResult(True, message)


def start_rave_dance(session: PlayerSession) -> PoolResult:
    _visit_zone(session, "beach_rave")
    pc = ensure_pool_complex(session)
    pc.rave_moves = [random.randint(0, 2) for _ in range(3)]
    pc.rave_step = 0
    return PoolResult(True, "Match three moves: Fist pump, Shuffling, Glow spin.")


def submit_rave_move(session: PlayerSession, move_index: int) -> PoolResult:
    pc = ensure_pool_complex(session)
    if not pc.rave_moves:
        return start_rave_dance(session)
    if move_index < 0 or move_index > 2:
        return PoolResult(False, "Pick a move.")
    if pc.rave_moves[pc.rave_step] != move_index:
        pc.rave_moves.clear()
        pc.rave_step = 0
        return PoolResult(True, f"{RAVE_MOVES[move_index]} — off beat. Try again.")
    pc.rave_step += 1
    if pc.rave_step >= len(pc.rave_moves):
        pc.flags["rave_danced"] = True
        pc.rave_moves.clear()
        pc.rave_step = 0
        payout = 40
        session.wallet.credit(payout, "pool", "Beach rave")
        unlocked = _try_unlock_events(session)
        return _finish(f"Sequence hit! +{fmt_chips(payout)}.", unlocked)
    return PoolResult(True, f"{RAVE_MOVES[move_index]} — on beat! {pc.rave_step + 1}/3…")


def get_pool_summary(session: PlayerSession) -> str:
    pc = ensure_pool_complex(session)
    parts = []
    if pc.visited_zones:
        parts.append(f"{len(pc.visited_zones)}/6 zones")
    if pc.shark_photos:
        parts.append(f"{len(pc.shark_photos)}/5 reef photos")
    if pc.unlocked_events:
        parts.append(f"{len(pc.unlocked_events)} event(s)")
    if pc.flags.get("cabana_booked"):
        parts.append("cabana booked")
    return " · ".join(parts) if parts else "Eleven acres await."
