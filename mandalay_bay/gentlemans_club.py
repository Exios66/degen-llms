"""Gentleman's Club — Velvet Ledger (CLI parity for hotel amenity)."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Any

from mandalay_bay.rewards import tier_for_wagered
from mandalay_bay.rewards_perks import tier_index

CLUB_NAME = "The Velvet Ledger"
GENTLEMANS_CLUB_MIN_REWARDS_TIER_IDX = 2

RAIN_TIERS = [
    {"id": "drizzle", "label": "Drizzle", "amount": 100},
    {"id": "shower", "label": "Shower", "amount": 500},
    {"id": "storm", "label": "Storm", "amount": 2000},
    {"id": "monsoon", "label": "Monsoon", "amount": 10000},
]

CLUB_DRINKS = [
    {"id": "gc_club_soda", "name": "Club Soda with a Look", "price": 12},
    {"id": "gc_old_fashioned", "name": "Ledger Old Fashioned", "price": 28},
    {"id": "gc_martini", "name": "Membership Martini", "price": 32},
    {"id": "gc_negroni", "name": "Noir Negroni", "price": 30},
    {"id": "gc_champagne_coupe", "name": "Coupe of Ruinart", "price": 45},
    {"id": "gc_japanese_whisky", "name": "Yamazaki 12 Pour", "price": 65},
    {"id": "gc_tequila_anejo", "name": "Clase Azul Añejo", "price": 85},
    {"id": "gc_cognac", "name": "Hennessy Paradis Shot", "price": 120},
    {"id": "gc_bottle_dom", "name": "Bottle — Dom Pérignon", "price": 450},
    {"id": "gc_bottle_cristal", "name": "Bottle — Louis Roederer Cristal", "price": 650},
    {"id": "gc_bottle_ace_of_spades", "name": "Bottle — Armand de Brignac", "price": 900},
    {"id": "gc_bottle_louis_xiii", "name": "Bottle — Louis XIII Cognac", "price": 3500},
    {"id": "gc_bottle_rare_scotch", "name": "Bottle — Macallan 25", "price": 2800},
    {"id": "gc_velvet_flight", "name": "Velvet Flight (5 pours)", "price": 180},
]

CLUB_ENCOUNTERS = [
    {
        "id": "hostess_viva",
        "name": "Viva — Floor Hostess",
        "choices": [
            {"label": "Ask for a better table", "cost": 200, "message": "Viva moves you closer to the stage."},
            {
                "label": "Tip for the guest list whisper",
                "cost": 500,
                "egg": "egg_velvet_guest_list",
                "message": "She leans in: Row F coupe guy is still unpaid.",
            },
            {"label": "Just chat", "cost": 0, "message": "Viva talks weather and whale etiquette."},
        ],
    },
    {
        "id": "dealer_dante",
        "name": "Dante — Private Felt",
        "choices": [
            {"label": "Play a friendly hand ($250)", "cost": 250, "minigame": "felt_flip", "message": "Cards whisper across felt."},
            {"label": "Ask about the side bet", "cost": 100, "credit": 80, "message": "Side bet pays $80 in stories tonight."},
            {"label": "Walk away", "cost": 0, "message": "You leave the glass room intact."},
        ],
    },
    {
        "id": "bottle_blair",
        "name": "Blair — Bottle Captain",
        "choices": [
            {"label": "Request the sparkler parade", "cost": 300, "message": "Sparklers cut the dark."},
            {"label": "Challenge her bottle memory", "cost": 150, "minigame": "bottle_memory", "message": "Blair stacks the labels."},
            {
                "label": "Ask for the off-menu pour",
                "cost": 400,
                "egg": "egg_off_menu_pour",
                "message": "She pours something that isn't on any ledger.",
            },
        ],
    },
    {
        "id": "security_sasha",
        "name": "Sasha — Velvet Rope",
        "choices": [
            {
                "label": "Ask about the back hallway",
                "cost": 0,
                "requires_rain": 1,
                "egg": "egg_velvet_back_hall",
                "message": "A service door clicks — unclaimed coats and one gold umbrella.",
            },
            {"label": "Tip for the quiet booth", "cost": 350, "message": "You're steered to a booth where the bass is polite."},
            {"label": "Provoke nothing", "cost": 0, "message": "Sasha appreciates phones face-down."},
        ],
    },
]

BOTTLE_LABELS = ["Dom", "Cristal", "Ace", "Paradis", "Macallan"]


@dataclass
class GentlemansClubState:
    visits: int = 0
    rain_count: int = 0
    total_rained: int = 0
    drinks: list[str] = field(default_factory=list)
    encounters: list[str] = field(default_factory=list)
    minigames_played: int = 0
    eggs: list[str] = field(default_factory=list)


def ensure_club(session) -> GentlemansClubState:
    club = getattr(session, "gentlemans_club", None)
    if not isinstance(club, GentlemansClubState):
        if isinstance(club, dict):
            club = GentlemansClubState(
                visits=int(club.get("visits", 0)),
                rain_count=int(club.get("rain_count", club.get("rainCount", 0))),
                total_rained=int(club.get("total_rained", club.get("totalRained", 0))),
                drinks=list(club.get("drinks", [])),
                encounters=list(club.get("encounters", [])),
                minigames_played=int(club.get("minigames_played", club.get("minigamesPlayed", 0))),
                eggs=list(club.get("eggs", [])),
            )
        else:
            club = GentlemansClubState()
        session.gentlemans_club = club
    return club


def _discover_egg(session, flag: str | None) -> str | None:
    if not flag:
        return None
    club = ensure_club(session)
    if flag in club.eggs:
        return None
    club.eggs.append(flag)
    rpg = getattr(session, "web_only_state", None) or {}
    flags = rpg.get("rpg", {}).get("flags") if isinstance(rpg.get("rpg"), dict) else None
    if isinstance(flags, dict):
        flags[flag] = True
    return flag


def can_enter_gentlemans_club(session) -> dict[str, Any]:
    rewards = getattr(session, "rewards", None)
    wagered = getattr(rewards, "lifetime_wagered", 0) if rewards else 0
    tier = tier_for_wagered(int(wagered or 0))
    idx = tier_index(tier.id)
    hotel = getattr(session, "hotel", None)
    room_type = getattr(hotel, "room_type", None) if hotel else None
    suite = room_type in ("suite", "penthouse")
    ra = getattr(hotel, "room_amenities", None) if hotel else None
    calls = getattr(ra, "phone_calls", []) if ra else []
    called = "gentlemans_club" in (calls or [])
    club = ensure_club(session)
    prior = club.visits > 0 or club.rain_count > 0
    if idx >= GENTLEMANS_CLUB_MIN_REWARDS_TIER_IDX or suite or called or prior:
        return {"ok": True, "tier_label": tier.label}
    return {
        "ok": False,
        "reason": f"{tier.label} tier — The Velvet Ledger wants Gold+, a suite key, or the club phone line.",
    }


def make_it_rain(session, tier_id: str) -> dict[str, Any]:
    tier = next((t for t in RAIN_TIERS if t["id"] == tier_id), None)
    if not tier:
        return {"ok": False, "message": "Unknown rain tier."}
    if not session.wallet.debit(tier["amount"], "gentlemans_club", f"Make it rain — {tier['label']}"):
        return {"ok": False, "message": f"Need ${tier['amount']:,} chips."}
    club = ensure_club(session)
    club.rain_count += 1
    club.total_rained += tier["amount"]
    egg = None
    if tier["id"] == "monsoon" and club.rain_count >= 2:
        egg = _discover_egg(session, "egg_monsoon_receipt")
    if club.total_rained >= 5000:
        egg = egg or _discover_egg(session, "egg_velvet_ledger")
    session.record_visit("gentlemans_club")
    tip = ""
    if random.random() < 0.3:
        tip_back = random.randint(20, min(500, tier["amount"] // 4 or 20))
        session.wallet.credit(tip_back, "gentlemans_club", "Crowd tips back")
        tip = f" The crowd throws ${tip_back:,} back."
    egg_line = " Something in the ledger underlined your name." if egg else ""
    return {
        "ok": True,
        "egg": egg,
        "message": f"You make it {tier['label'].lower()} — ${tier['amount']:,} in the air.{tip}{egg_line}",
    }


def order_club_drink(session, drink_id: str) -> dict[str, Any]:
    drink = next((d for d in CLUB_DRINKS if d["id"] == drink_id), None)
    if not drink:
        return {"ok": False, "message": "Not on the ledger."}
    if not session.wallet.debit(drink["price"], "gentlemans_club", f"{drink['name']} @ {CLUB_NAME}"):
        return {"ok": False, "message": f"Need ${drink['price']:,} chips."}
    club = ensure_club(session)
    club.drinks.append(drink_id)
    egg = None
    if drink_id == "gc_bottle_louis_xiii":
        egg = _discover_egg(session, "egg_louis_toast")
    if len(club.drinks) >= 5:
        egg = egg or _discover_egg(session, "egg_velvet_bar_tab")
    session.record_visit("gentlemans_club")
    return {
        "ok": True,
        "egg": egg,
        "message": f"Ordered {drink['name']} for ${drink['price']:,}."
        + (" The bartender winks." if egg else ""),
    }


def run_club_encounter(session, encounter_id: str, choice_index: int) -> dict[str, Any]:
    enc = next((e for e in CLUB_ENCOUNTERS if e["id"] == encounter_id), None)
    if not enc:
        return {"ok": False, "message": "They're off the floor."}
    if choice_index < 0 or choice_index >= len(enc["choices"]):
        return {"ok": False, "message": "That option walked away."}
    choice = enc["choices"][choice_index]
    club = ensure_club(session)
    if choice.get("requires_rain", 0) and club.rain_count < choice["requires_rain"]:
        return {"ok": False, "message": "Sasha only talks after you've made it rain at least once."}
    cost = int(choice.get("cost", 0))
    if cost > 0 and not session.wallet.debit(cost, "gentlemans_club", f"{enc['name']} — {choice['label']}"):
        return {"ok": False, "message": f"Need ${cost:,} chips."}
    if choice.get("credit"):
        session.wallet.credit(int(choice["credit"]), "gentlemans_club", f"{enc['name']} payout")
    egg = _discover_egg(session, choice.get("egg"))
    if encounter_id not in club.encounters:
        club.encounters.append(encounter_id)
    session.record_visit("gentlemans_club")
    return {
        "ok": True,
        "minigame": choice.get("minigame"),
        "egg": egg,
        "message": choice["message"] + (" (Secret underlined.)" if egg else ""),
    }


def play_tip_cascade(session, stop_at: float) -> dict[str, Any]:
    ante = 100
    if not session.wallet.debit(ante, "gentlemans_club", "Tip Cascade ante"):
        return {"ok": False, "message": f"Need ${ante} to play Tip Cascade."}
    club = ensure_club(session)
    club.minigames_played += 1
    hit = 0.62 <= stop_at <= 0.78
    payout = 0
    if hit:
        payout = random.randint(180, 320)
        session.wallet.credit(payout, "gentlemans_club", "Tip Cascade win")
    egg = None
    if hit and abs(stop_at - 0.7) < 0.02:
        egg = _discover_egg(session, "egg_perfect_cascade")
    session.record_visit("gentlemans_club")
    return {
        "ok": True,
        "hit": hit,
        "payout": payout,
        "egg": egg,
        "message": (
            f"Cascade peaks — you bank ${payout}."
            + (" Perfect timing." if egg else "")
            if hit
            else "You mistime the rain. Ante dissolves into the fog machine."
        ),
    }


def play_bottle_memory(session, sequence: list[str], guess: list[str]) -> dict[str, Any]:
    ante = 150
    if not session.wallet.debit(ante, "gentlemans_club", "Bottle Memory ante"):
        return {"ok": False, "message": f"Need ${ante} to play Bottle Memory."}
    club = ensure_club(session)
    club.minigames_played += 1
    correct = sequence == guess
    payout = 0
    if correct:
        payout = random.randint(220, 400)
        session.wallet.credit(payout, "gentlemans_club", "Bottle Memory win")
    egg = None
    if correct and all(v == "Ace" for v in sequence):
        egg = _discover_egg(session, "egg_triple_ace")
    session.record_visit("gentlemans_club")
    return {
        "ok": True,
        "correct": correct,
        "payout": payout,
        "egg": egg,
        "message": (
            f"Blair nods. +${payout}." + (" Triple Ace." if egg else "")
            if correct
            else f"Wrong order. Correct was {' → '.join(sequence)}."
        ),
    }


def play_felt_flip(session, call: str) -> dict[str, Any]:
    ante = 250
    if not session.wallet.debit(ante, "gentlemans_club", "Felt Flip ante"):
        return {"ok": False, "message": f"Need ${ante} for Dante's felt."}
    club = ensure_club(session)
    club.minigames_played += 1
    card = random.randint(1, 13)
    is_high = card >= 8
    win = (call == "high" and is_high) or (call == "low" and not is_high)
    payout = 0
    if win:
        payout = ante * 2
        session.wallet.credit(payout, "gentlemans_club", "Felt Flip win")
    egg = None
    if win and card == 1:
        egg = _discover_egg(session, "egg_felt_ace")
    ranks = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
    session.record_visit("gentlemans_club")
    return {
        "ok": True,
        "win": win,
        "card": ranks[card],
        "payout": payout,
        "egg": egg,
        "message": (
            f"Dante flips {ranks[card]}. You called {call}. +${payout}."
            + (" Ace in the hole." if egg else "")
            if win
            else f"Dante flips {ranks[card]}. You called {call}. Ante gone."
        ),
    }


def _run_minigame_menu(session, ui, game_id: str | None = None) -> None:
    while True:
        if game_id is None:
            ui.banner("Club Minigames")
            pick = ui.menu_choice(
                ["Tip Cascade ($100)", "Bottle Memory ($150)", "Felt Flip ($250)", "Back"],
                title="Play:",
            )
            if pick == 0 or pick == 4:
                return
            game_id = ["tip_cascade", "bottle_memory", "felt_flip"][pick - 1]

        if game_id == "tip_cascade":
            stop = random.uniform(0.55, 0.85)
            ui.dim(f"You stop the cascade at {stop * 100:.0f}%.")
            res = play_tip_cascade(session, stop)
        elif game_id == "bottle_memory":
            seq = [random.choice(BOTTLE_LABELS) for _ in range(3)]
            ui.print(f"Blair flashes: {' → '.join(seq)}")
            ui.pause()
            # CLI auto-guesses correctly ~60% for playability
            guess = list(seq) if random.random() < 0.6 else [random.choice(BOTTLE_LABELS) for _ in range(3)]
            ui.dim(f"You answer: {' → '.join(guess)}")
            res = play_bottle_memory(session, seq, guess)
        elif game_id == "felt_flip":
            call = random.choice(["high", "low"])
            ui.dim(f"You call {call}.")
            res = play_felt_flip(session, call)
        else:
            return

        ui.success(res["message"]) if res["ok"] else ui.error(res["message"])
        ui.pause()
        game_id = None


def run_gentlemans_club(session, ui) -> None:
    gate = can_enter_gentlemans_club(session)
    if not gate["ok"]:
        ui.error(gate["reason"])
        ui.pause()
        return

    club = ensure_club(session)
    club.visits += 1
    session.record_visit("gentlemans_club")

    while True:
        ui.banner(f"{CLUB_NAME} — Gentleman's Club")
        ui.chip_line(session.wallet.balance)
        ui.dim("Private membership lounge — bottle service, tip storms, no photographs.")
        ui.print(
            f"Rains: {club.rain_count} · Drinks: {len(club.drinks)} · "
            f"Encounters: {len(club.encounters)} · Secrets: {len(club.eggs)}"
        )
        choice = ui.menu_choice(
            [
                "Make it rain",
                "Encounters — hosts, felt, bottle captain",
                "The Ledger Bar",
                "Minigames — cascade, bottles, felt",
                "Club ledger — stats & secrets",
                "Leave",
            ],
            title="Velvet Ledger:",
        )
        if choice == 0 or choice == 6:
            return
        if choice == 1:
            labels = [f"{t['label']} — ${t['amount']:,}" for t in RAIN_TIERS]
            pick = ui.menu_choice(labels, title="Make it rain:")
            if pick == 0:
                continue
            res = make_it_rain(session, RAIN_TIERS[pick - 1]["id"])
            ui.success(res["message"]) if res["ok"] else ui.error(res["message"])
            ui.pause()
        elif choice == 2:
            names = [e["name"] for e in CLUB_ENCOUNTERS]
            pick = ui.menu_choice(names + ["Back"], title="Who do you approach?")
            if pick == 0 or pick == len(names) + 1:
                continue
            enc = CLUB_ENCOUNTERS[pick - 1]
            opts = [c["label"] for c in enc["choices"]]
            c_pick = ui.menu_choice(opts + ["Back"], title=enc["name"])
            if c_pick == 0 or c_pick == len(opts) + 1:
                continue
            res = run_club_encounter(session, enc["id"], c_pick - 1)
            ui.success(res["message"]) if res["ok"] else ui.error(res["message"])
            ui.pause()
            if res.get("ok") and res.get("minigame"):
                _run_minigame_menu(session, ui, res["minigame"])
        elif choice == 3:
            labels = [f"{d['name']} — ${d['price']:,}" for d in CLUB_DRINKS]
            pick = ui.menu_choice(labels, title="Ledger Bar:")
            if pick == 0:
                continue
            res = order_club_drink(session, CLUB_DRINKS[pick - 1]["id"])
            ui.success(res["message"]) if res["ok"] else ui.error(res["message"])
            ui.pause()
        elif choice == 4:
            _run_minigame_menu(session, ui)
        elif choice == 5:
            ui.banner("Club Ledger")
            ui.print(f"Visits: {club.visits}")
            ui.print(f"Rains: {club.rain_count} · Total tipped: ${club.total_rained:,}")
            ui.print(
                f"Drinks: {len(club.drinks)} · Encounters: {len(club.encounters)} · "
                f"Minigames: {club.minigames_played}"
            )
            if club.eggs:
                ui.print("Secrets: " + ", ".join(club.eggs))
            else:
                ui.dim("No secrets underlined yet.")
            ui.pause()
