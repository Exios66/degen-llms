"""Resort dining — venue catalogs, capacity minigame, drink-scaled encounters (CLI)."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Any, Callable

from mandalay_bay.intoxication import get_intoxication_level, is_heightened_intoxication, record_consumption
from mandalay_bay.session import PlayerSession

FULLNESS_MAX = 100
COMPOSURE_MAX = 100
DINING_CUTOFF_INTOX = 85

DINING_VENUES: tuple[dict[str, Any], ...] = (
    {
        "id": "aureole",
        "name": "Aureole",
        "chef": "Charlie Palmer",
        "type": "American fine dining",
        "price_range": "$$$$$",
        "hours": "Dinner nightly",
        "location": "Mandalay Bay Resort — east lobby",
        "blurb": (
            "Four-story wine tower staffed by harness-rigged 'wine angels.' "
            "Seasonal tasting menus and dry-aged beef."
        ),
        "menu": (
            {"id": "aur_amuse", "name": "Amuse-Bouche Flight", "price": 28, "kind": "food", "satiation": 6, "prestige": 2},
            {"id": "aur_tasting", "name": "Seasonal Tasting Menu", "price": 185, "kind": "food", "satiation": 28, "prestige": 5},
            {"id": "aur_steak", "name": "Dry-Aged Ribeye", "price": 96, "kind": "food", "satiation": 22, "prestige": 4},
            {"id": "aur_tower_pour", "name": "Wine Angel Tower Pour", "price": 65, "kind": "drink", "satiation": 2, "prestige": 5, "potency_id": "dining_aureole_cab"},
            {"id": "aur_champagne", "name": "Krug Grande Cuvée Glass", "price": 48, "kind": "drink", "satiation": 1, "prestige": 4, "potency_id": "dining_aureole_krug"},
            {"id": "aur_dessert", "name": "Chocolate Sphere Spectacle", "price": 32, "kind": "extra", "satiation": 10, "prestige": 3},
        ),
    },
    {
        "id": "border_grill",
        "name": "Border Grill",
        "chef": "Mary Sue Milliken & Susan Feniger",
        "type": "Modern Mexican",
        "price_range": "$$$$",
        "hours": "Brunch & dinner daily",
        "location": "Mandalay Bay Resort — poolside",
        "blurb": "Bold chef-driven Mexican poolside — famous for Border Brunch.",
        "menu": (
            {"id": "bg_guacamole", "name": "Tableside Guacamole", "price": 18, "kind": "food", "satiation": 8, "prestige": 1},
            {"id": "bg_ceviche", "name": "Ceviche Trio", "price": 24, "kind": "food", "satiation": 10, "prestige": 2},
            {"id": "bg_brunch", "name": "Border Brunch Feast", "price": 55, "kind": "food", "satiation": 26, "prestige": 3},
            {"id": "bg_enchiladas", "name": "Chicken Enchiladas Suizas", "price": 32, "kind": "food", "satiation": 20, "prestige": 2},
            {"id": "bg_margarita", "name": "House Margarita", "price": 16, "kind": "drink", "satiation": 2, "prestige": 1, "potency_id": "dining_border_marg"},
            {"id": "bg_mezcal", "name": "Mezcal Flight", "price": 28, "kind": "drink", "satiation": 1, "prestige": 3, "potency_id": "dining_border_mezcal"},
            {"id": "bg_bottomless", "name": "Bottomless Brunch Pour", "price": 22, "kind": "extra", "satiation": 3, "prestige": 2, "potency_id": "dining_border_bottomless"},
        ),
    },
    {
        "id": "stripsteak",
        "name": "Stripsteak",
        "chef": "Michael Mina",
        "type": "Contemporary steakhouse",
        "price_range": "$$$$$",
        "hours": "Dinner nightly",
        "location": "Mandalay Bay Resort — casino level",
        "blurb": "USDA prime and wagyu, duck-fat fries, craft cocktails.",
        "menu": (
            {"id": "ss_oysters", "name": "Oysters on Ice", "price": 42, "kind": "food", "satiation": 8, "prestige": 3},
            {"id": "ss_wagyu", "name": "A5 Wagyu Strip", "price": 145, "kind": "food", "satiation": 24, "prestige": 5},
            {"id": "ss_prime", "name": "USDA Prime Bone-In Ribeye", "price": 89, "kind": "food", "satiation": 22, "prestige": 4},
            {"id": "ss_fries", "name": "Duck-Fat Fries Tower", "price": 18, "kind": "extra", "satiation": 14, "prestige": 2},
            {"id": "ss_old_fashioned", "name": "Barrel-Aged Old Fashioned", "price": 26, "kind": "drink", "satiation": 1, "prestige": 3, "potency_id": "dining_strip_of"},
            {"id": "ss_martini", "name": "Dirty Martini", "price": 22, "kind": "drink", "satiation": 1, "prestige": 2, "potency_id": "dining_strip_martini"},
            {"id": "ss_cheesecake", "name": "Basque Cheesecake", "price": 16, "kind": "food", "satiation": 12, "prestige": 2},
        ),
    },
)

DINING_ENCOUNTERS: tuple[dict[str, Any], ...] = (
    {
        "id": "stranger_crypto",
        "category": "stranger",
        "weight": 3,
        "min_drinks": 0,
        "title": "Crypto Bro at Two O'Clock",
        "body": "A stranger slides over with an NFT dinner pitch, then tips you for listening.",
        "choices": (
            {"id": "listen", "label": "Humor him", "effect": {"chips": 40, "composure": 5}},
            {"id": "block", "label": "Signal the waiter", "effect": {"composure": 10}},
        ),
    },
    {
        "id": "stranger_wedding",
        "category": "stranger",
        "weight": 2,
        "min_drinks": 1,
        "title": "Wedding Crashers",
        "body": "A bridal party mistakes your table for the rehearsal dinner.",
        "choices": (
            {"id": "toast", "label": "Join the toast", "effect": {"chips": -25, "score": 15, "composure": -5}},
            {"id": "photo", "label": "Pose for the photo", "effect": {"egg": "dining_wedding_photo", "score": 20}},
        ),
    },
    {
        "id": "escort_champagne",
        "category": "escort",
        "weight": 2,
        "min_drinks": 2,
        "title": "Champagne Upsell Ambush",
        "body": "A glamorous stranger and a $400 bottle appear. You may decline.",
        "choices": (
            {"id": "decline", "label": "Decline politely", "effect": {"composure": 15, "score": 5}},
            {"id": "split", "label": "Split a glass, nothing more", "effect": {"chips": -60, "drink_boost": 1, "score": 15}},
            {"id": "comp", "label": "Ask Betty to bail you out", "effect": {"egg": "dining_betty_bailout", "composure": 10}},
        ),
    },
    {
        "id": "escort_pit_boss",
        "category": "escort",
        "weight": 1,
        "min_drinks": 3,
        "title": "Pit Boss in Disguise",
        "body": "Your dinner companion flashes a pit badge. Surveillance liked your composure.",
        "choices": (
            {"id": "marker", "label": "Take the marker", "effect": {"chips": 120, "egg": "dining_pit_marker"}},
            {"id": "laugh", "label": "Laugh it off", "effect": {"score": 20, "composure": 5}},
        ),
    },
    {
        "id": "celeb_fries",
        "category": "celebrity",
        "weight": 2,
        "min_drinks": 1,
        "title": "Celebrity Fry Theft",
        "body": "A recognizable face steals a duck-fat fry. Paparazzi flash.",
        "choices": (
            {"id": "share", "label": "Share the tower", "effect": {"score": 30, "egg": "dining_celeb_fries"}},
            {"id": "autograph", "label": "Trade fries for an autograph", "effect": {"chips": 50, "score": 15}},
        ),
    },
    {
        "id": "celeb_cameo",
        "category": "celebrity",
        "weight": 2,
        "min_drinks": 2,
        "title": "Absurd Cameo",
        "body": "A reality star needs an extra. You are available and slightly shiny.",
        "choices": (
            {"id": "cameo", "label": "Do the cameo", "effect": {"chips": 75, "egg": "dining_reality_cameo", "composure": -10}},
            {"id": "pass", "label": "Stay mysterious", "effect": {"score": 10, "composure": 10}},
        ),
    },
    {
        "id": "staff_wine_angel",
        "category": "staff",
        "weight": 1,
        "min_drinks": 1,
        "title": "Wine Angel Interlude",
        "body": "A harnessed wine angel offers a secret pour on the house.",
        "choices": (
            {"id": "accept", "label": "Accept the secret pour", "effect": {"drink_boost": 1, "score": 35, "egg": "dining_wine_angel"}},
            {"id": "tip", "label": "Tip extravagantly instead", "effect": {"chips": -80, "score": 40, "composure": 15}},
        ),
    },
    {
        "id": "staff_whale_host",
        "category": "staff",
        "weight": 1,
        "min_drinks": 2,
        "title": "Whale Host Drop-In",
        "body": "Your host appears with complimentary bites and a knowing look.",
        "choices": (
            {"id": "comp", "label": "Take the comps", "effect": {"chips": 60, "score": 15}},
            {"id": "intel", "label": "Ask for kitchen gossip", "effect": {"egg": "dining_kitchen_gossip", "score": 25}},
        ),
    },
)

DINING_EGGS: dict[str, str] = {
    "dining_wedding_photo": "Boutonniere banquet — wedding photo on your stats brag reel.",
    "dining_betty_bailout": "Betty bailed you out of a champagne ambush via text.",
    "dining_pit_marker": "Pit boss marker earned over duck-fat diplomacy.",
    "dining_celeb_fries": "You shared fries with someone who has a publicist.",
    "dining_reality_cameo": "Reality-TV cameo: Resort Extra #3 (hungry).",
    "dining_napkin_autograph": "Napkin autograph — grease optional.",
    "dining_wine_angel": "Secret pour from a harnessed wine angel.",
    "dining_kitchen_gossip": "Kitchen gossip unlocked — dealers quip differently tonight.",
    "dining_food_coma": "Food coma survivor — hallway zig when you should've zagged.",
    "dining_clean_sweep": "Cleared five courses in one sitting. Carmen is concerned.",
}


@dataclass
class DiningState:
    visits: int = 0
    lifetime_courses: int = 0
    lifetime_drinks: int = 0
    encounters_seen: list[str] = field(default_factory=list)
    venue_high_scores: dict[str, int] = field(default_factory=dict)
    unlocked_eggs: list[str] = field(default_factory=list)
    food_coma_hallway: bool = False


@dataclass
class DiningSitting:
    venue_id: str
    tab: int = 0
    courses_cleared: int = 0
    drinks_this_sitting: int = 0
    fullness: int = 0
    composure: int = 80
    ordered_ids: list[str] = field(default_factory=list)
    score: int = 0
    busted: bool = False
    closed: bool = False
    pending_encounter: dict[str, Any] | None = None
    encounter_log: list[dict[str, str]] = field(default_factory=list)
    last_message: str = "The host seats you. Menus arrive like a dare."


@dataclass(frozen=True, slots=True)
class DiningResult:
    ok: bool
    message: str
    busted: bool = False
    encounter: dict[str, Any] | None = None
    total: int = 0
    score: int = 0


_VENUES_BY_ID = {v["id"]: v for v in DINING_VENUES}
_ITEMS_BY_ID = {
    item["id"]: (item, venue["id"])
    for venue in DINING_VENUES
    for item in venue["menu"]
}


def default_dining_state() -> DiningState:
    return DiningState()


def ensure_dining(session: PlayerSession) -> DiningState:
    if not hasattr(session, "dining") or session.dining is None:
        session.dining = DiningState()
    return session.dining


def attach_dining_to_session(session: PlayerSession, data: dict | None = None) -> DiningState:
    raw = (data or {}).get("dining") or {}
    session.dining = DiningState(
        visits=int(raw.get("visits", 0)),
        lifetime_courses=int(raw.get("lifetime_courses", raw.get("lifetimeCourses", 0))),
        lifetime_drinks=int(raw.get("lifetime_drinks", raw.get("lifetimeDrinks", 0))),
        encounters_seen=list(raw.get("encounters_seen", raw.get("encountersSeen", []))),
        venue_high_scores=dict(raw.get("venue_high_scores", raw.get("venueHighScores", {}))),
        unlocked_eggs=list(raw.get("unlocked_eggs", raw.get("unlockedEggs", []))),
        food_coma_hallway=bool(raw.get("food_coma_hallway", raw.get("foodComaHallway", False))),
    )
    return session.dining


def get_venue(venue_id: str) -> dict[str, Any] | None:
    return _VENUES_BY_ID.get(venue_id)


def create_sitting(venue_id: str) -> DiningSitting:
    return DiningSitting(venue_id=venue_id)


def can_enter_dining(session: PlayerSession) -> DiningResult:
    if get_intoxication_level(session) >= DINING_CUTOFF_INTOX:
        return DiningResult(
            ok=False,
            message="Security and the maître d' agree: you're cut off. Text Betty for a roast, not a reservation.",
        )
    return DiningResult(ok=True, message="")


def encounter_chance(sitting: DiningSitting, session: PlayerSession) -> float:
    intox = get_intoxication_level(session)
    base = 0.06
    drink_factor = sitting.drinks_this_sitting * 0.12
    intox_factor = intox * 0.003
    heightened = 0.08 if is_heightened_intoxication(session) else 0.0
    return min(0.78, base + drink_factor + intox_factor + heightened)


def _unlock_egg(session: PlayerSession, egg_id: str | None) -> str | None:
    if not egg_id or egg_id not in DINING_EGGS:
        return None
    dining = ensure_dining(session)
    if egg_id not in dining.unlocked_eggs:
        dining.unlocked_eggs.append(egg_id)
        return egg_id
    return None


def _apply_effect(session: PlayerSession, sitting: DiningSitting, effect: dict[str, Any]) -> list[str]:
    notes: list[str] = []
    chips = effect.get("chips")
    if chips:
        if chips > 0:
            session.wallet.credit(chips, "dining", "Dining encounter tip")
            notes.append(f"+{chips} chips")
        else:
            cost = abs(int(chips))
            if session.wallet.debit(cost, "dining", "Dining encounter expense"):
                sitting.tab += cost
                notes.append(f"-{cost} chips")
            else:
                notes.append("Could not cover the expense")
    if "composure" in effect:
        sitting.composure = max(0, min(COMPOSURE_MAX, sitting.composure + int(effect["composure"])))
    if "score" in effect:
        sitting.score += int(effect["score"])
    if effect.get("drink_boost"):
        sitting.drinks_this_sitting += int(effect["drink_boost"])
        record_consumption(session, "dining_encounter_pour", source="dining")
        notes.append("Another pour hits the table")
    if effect.get("egg"):
        unlocked = _unlock_egg(session, effect["egg"])
        if unlocked:
            notes.append(f"Egg: {DINING_EGGS[unlocked]}")
    return notes


def _pick_encounter(sitting: DiningSitting, rng: Callable[[], float]) -> dict[str, Any] | None:
    pool = [e for e in DINING_ENCOUNTERS if sitting.drinks_this_sitting >= e["min_drinks"]]
    if not pool:
        return None
    total = sum(e["weight"] for e in pool)
    roll = rng() * total
    for enc in pool:
        roll -= enc["weight"]
        if roll <= 0:
            return enc
    return pool[-1]


def order_and_consume(
    session: PlayerSession,
    sitting: DiningSitting,
    item_id: str,
    pace: str = "pace",
    rng: Callable[[], float] | None = None,
) -> DiningResult:
    rng = rng or random.random
    if sitting.busted or sitting.closed:
        return DiningResult(ok=False, message="This sitting is over — settle the tab.")
    gate = can_enter_dining(session)
    if not gate.ok:
        return gate

    entry = _ITEMS_BY_ID.get(item_id)
    if not entry or entry[1] != sitting.venue_id:
        return DiningResult(ok=False, message="That isn't on tonight's menu.")
    item = entry[0]
    venue = get_venue(sitting.venue_id)
    assert venue is not None
    if not session.wallet.debit(item["price"], "dining", f"{item['name']} @ {venue['name']}"):
        return DiningResult(ok=False, message=f"Insufficient chips — {item['name']} is ${item['price']:,}.")

    sitting.tab += item["price"]
    sitting.ordered_ids.append(item_id)

    satiation = int(item.get("satiation", 8))
    composure_delta = 0
    score_gain = int(item.get("prestige", 1))

    if pace == "pace":
        satiation = round(satiation * 0.7)
        composure_delta = 5
        message = f"You pace yourself through {item['name']}."
    elif pace == "clean_plate":
        satiation = round(satiation * 1.05)
        score_gain += int(item.get("prestige", 1)) * 2
        composure_delta = -3
        message = f"You clean the plate — {item['name']} doesn't stand a chance."
    else:  # chase_shots
        satiation = round(satiation * 0.55)
        composure_delta = -10
        score_gain += 5
        sitting.drinks_this_sitting += 1
        record_consumption(session, "dining_chase_shot", source="dining")
        message = f"You chase {item['name']} with something stronger."

    sitting.fullness = min(FULLNESS_MAX, sitting.fullness + satiation)
    sitting.composure = max(0, min(COMPOSURE_MAX, sitting.composure + composure_delta))
    sitting.score += score_gain
    sitting.courses_cleared += 1

    if item["kind"] == "drink" or item.get("potency_id"):
        sitting.drinks_this_sitting += 1
        if item.get("potency_id"):
            record_consumption(session, item["potency_id"], source="dining")

    sitting.last_message = message
    dining = ensure_dining(session)

    if sitting.fullness >= FULLNESS_MAX or sitting.composure <= 0:
        sitting.busted = True
        sitting.last_message = (
            "Composure gone. The maître d' suggests a graceful exit."
            if sitting.composure <= 0
            else "Food coma incoming. The room tilts like a craps table."
        )
        _unlock_egg(session, "dining_food_coma")
        dining.food_coma_hallway = True
        return DiningResult(ok=True, busted=True, message=sitting.last_message)

    encounter = None
    if rng() < encounter_chance(sitting, session):
        picked = _pick_encounter(sitting, rng)
        if picked:
            encounter = {
                "id": picked["id"],
                "title": picked["title"],
                "body": picked["body"],
                "category": picked["category"],
                "choices": list(picked["choices"]),
            }
            sitting.pending_encounter = encounter

    if sitting.courses_cleared >= 5:
        _unlock_egg(session, "dining_clean_sweep")

    return DiningResult(ok=True, message=sitting.last_message, encounter=encounter, score=sitting.score)


def resolve_encounter(session: PlayerSession, sitting: DiningSitting, choice_id: str) -> DiningResult:
    pending = sitting.pending_encounter
    if not pending:
        return DiningResult(ok=False, message="No encounter in progress.")
    enc = next((e for e in DINING_ENCOUNTERS if e["id"] == pending["id"]), None)
    choices = enc["choices"] if enc else pending["choices"]
    choice = next((c for c in choices if c["id"] == choice_id), choices[0])
    notes = _apply_effect(session, sitting, choice.get("effect", {}))
    dining = ensure_dining(session)
    if pending["id"] not in dining.encounters_seen:
        dining.encounters_seen.append(pending["id"])
    sitting.encounter_log.append({"id": pending["id"], "choice": choice["id"]})
    sitting.pending_encounter = None
    sitting.last_message = f"{pending['title']}: {choice['label']}. {' · '.join(notes) or 'Moment passes.'}"
    return DiningResult(ok=True, message=sitting.last_message)


def settle_sitting(session: PlayerSession, sitting: DiningSitting, tip_percent: int = 18) -> DiningResult:
    if sitting.closed:
        return DiningResult(ok=True, message="Tab already closed.", total=sitting.tab, score=sitting.score)
    tip = max(0, round(sitting.tab * (min(30, max(0, tip_percent)) / 100)))
    if tip > 0 and session.wallet.debit(tip, "dining", "Dining tip"):
        sitting.tab += tip
    dining = ensure_dining(session)
    dining.visits += 1
    dining.lifetime_courses += sitting.courses_cleared
    dining.lifetime_drinks += sitting.drinks_this_sitting
    prev = dining.venue_high_scores.get(sitting.venue_id, 0)
    if sitting.score > prev:
        dining.venue_high_scores[sitting.venue_id] = sitting.score
    session.record_visit("dining")
    session.record_result("dining", -sitting.tab, max(1, sitting.courses_cleared))
    sitting.closed = True
    venue = get_venue(sitting.venue_id)
    name = venue["name"] if venue else "the restaurant"
    return DiningResult(
        ok=True,
        message=f"Closed out at {name} — tab ${sitting.tab:,}, score {sitting.score}.",
        total=sitting.tab,
        score=sitting.score,
    )


def consume_food_coma_flag(session: PlayerSession) -> bool:
    dining = ensure_dining(session)
    if not dining.food_coma_hallway:
        return False
    dining.food_coma_hallway = False
    return True


def dining_summary(session: PlayerSession) -> dict[str, Any]:
    d = ensure_dining(session)
    return {
        "visits": d.visits,
        "lifetime_courses": d.lifetime_courses,
        "lifetime_drinks": d.lifetime_drinks,
        "eggs": len(d.unlocked_eggs),
        "egg_total": len(DINING_EGGS),
        "encounters": len(d.encounters_seen),
        "high_scores": dict(d.venue_high_scores),
    }
