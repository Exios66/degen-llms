from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

from blackjack.rng import SECURE_RANDOM

_CATALOG: dict[str, Any] | None = None


def catalog_path() -> Path:
    return Path(__file__).resolve().parent / "data" / "sports_catalog.json"


def load_catalog() -> dict[str, Any]:
    global _CATALOG
    if _CATALOG is not None:
        return _CATALOG
    with catalog_path().open(encoding="utf-8") as f:
        _CATALOG = json.load(f)
    return _CATALOG


def get_sport_keys(catalog: dict[str, Any]) -> list[str]:
    return list(catalog["sports"].keys())


def _participants(sport_def: dict[str, Any]) -> list[dict[str, Any]]:
    return sport_def.get("teams") or sport_def.get("fighters") or sport_def.get("players") or []


def _short_name(full_name: str) -> str:
    return full_name.split()[-1]


def _gaussian_int(mean: float, std: float, min_val: int, max_val: int) -> int:
    total = sum(SECURE_RANDOM.random() for _ in range(6))
    z = (total - 3) / math.sqrt(0.5)
    val = round(mean + z * std)
    return max(min_val, min(max_val, val))


def _rating_diff_to_american_odds(diff: float) -> tuple[int, int]:
    if diff >= 80:
        return -200, 170
    if diff >= 40:
        return -150, 130
    if diff >= 15:
        return -130, 110
    if diff <= -80:
        return 170, -200
    if diff <= -40:
        return 130, -150
    if diff <= -15:
        return 110, -130
    return -110, -110


def _round_spread(value: float, step: float) -> float:
    if not step:
        return 0.0
    return round(value / step) * step


def _pick_matchup(sport_def: dict[str, Any], prefer_division: bool = True) -> tuple[dict[str, Any], dict[str, Any]]:
    pool = _participants(sport_def)[:]
    SECURE_RANDOM.shuffle(pool)
    if len(pool) < 2:
        return pool[0], pool[1]

    if prefer_division and SECURE_RANDOM.random() < 0.7:
        by_div: dict[str, list[dict[str, Any]]] = {}
        for p in pool:
            key = p.get("division") or p.get("weightClass") or p.get("tour") or "default"
            by_div.setdefault(key, []).append(p)
        viable = [g for g in by_div.values() if len(g) >= 2]
        if viable:
            SECURE_RANDOM.shuffle(viable)
            group = viable[0][:]
            SECURE_RANDOM.shuffle(group)
            return group[0], group[1]

    return pool[0], pool[1]


def generate_event(catalog: dict[str, Any], sport_key: str) -> dict[str, Any]:
    sport_def = catalog["sports"][sport_key]
    scoring_type = sport_def.get("scoringProfile", {}).get("type", "points")
    is_outright = scoring_type == "outright"

    if is_outright:
        pool = _participants(sport_def)[:]
        SECURE_RANDOM.shuffle(pool)
        field = pool[: min(4, len(pool))]
        favorite = max(field, key=lambda p: p["powerRating"])
        odds_map: dict[str, int] = {}
        for p in field:
            gap = favorite["powerRating"] - p["powerRating"]
            if gap == 0:
                odds_map[p["name"]] = sport_def.get("juice", 200)
            elif gap <= 20:
                odds_map[p["name"]] = 350
            elif gap <= 40:
                odds_map[p["name"]] = 600
            else:
                odds_map[p["name"]] = 900

        home = field[0]["name"]
        away = field[1]["name"] if len(field) > 1 else field[0]["name"]
        return {
            "eventId": f"{sport_key}-{SECURE_RANDOM.randrange(10000, 99999)}",
            "sport": sport_key,
            "sportLabel": sport_def["label"],
            "eventType": "outright",
            "home": home,
            "away": away,
            "field": [p["name"] for p in field],
            "outrightOdds": odds_map,
            "homeOdds": odds_map.get(home, 200),
            "awayOdds": odds_map.get(away, 350),
            "spread": 0.0,
            "total": 0.0,
            "spreadHomeOdds": sport_def.get("juice", -110),
            "spreadAwayOdds": sport_def.get("juice", -110),
            "totalOverOdds": -110,
            "totalUnderOdds": -110,
            "props": [],
            "homeScore": 0,
            "awayScore": 0,
            "winner": None,
            "propOutcomes": {},
            "status": "scheduled",
            "settled": False,
            "live": False,
            "label": f"{_short_name(away)} vs {_short_name(home)}",
        }

    away_team, home_team = _pick_matchup(sport_def)
    home_rating = home_team["powerRating"] + (sport_def.get("homeField") or 0) * 10
    away_rating = away_team["powerRating"]
    diff = home_rating - away_rating
    home_odds, away_odds = _rating_diff_to_american_odds(diff)
    spread = _round_spread((diff / 25) - (sport_def.get("homeField") or 0), sport_def.get("spreadStep") or 0.5)
    profile = sport_def["scoringProfile"]
    total = round((profile.get("meanTotal") or 44) * 2) / 2

    props: list[dict[str, Any]] = [
        {"id": "both-score", "label": "Both teams score", "yesOdds": -130, "noOdds": 110},
    ]
    if sport_key in ("NFL", "NCAAF"):
        props.append({"id": "over-tds", "label": "Combined TDs over 4.5", "yesOdds": -105, "noOdds": -115})

    return {
        "eventId": (
            f"{sport_key}-{_short_name(home_team['name'])}-"
            f"{_short_name(away_team['name'])}-{SECURE_RANDOM.randrange(1000, 9999)}"
        ),
        "sport": sport_key,
        "sportLabel": sport_def["label"],
        "eventType": "game",
        "home": home_team["name"],
        "away": away_team["name"],
        "homeOdds": home_odds,
        "awayOdds": away_odds,
        "spread": spread,
        "total": total,
        "spreadHomeOdds": sport_def.get("juice", -110),
        "spreadAwayOdds": sport_def.get("juice", -110),
        "totalOverOdds": -110,
        "totalUnderOdds": -110,
        "props": props,
        "homeScore": 0,
        "awayScore": 0,
        "winner": None,
        "propOutcomes": {},
        "status": "scheduled",
        "settled": False,
        "live": False,
        "label": f"{_short_name(away_team['name'])} @ {_short_name(home_team['name'])}",
    }


def generate_board(catalog: dict[str, Any], count: int | None = None) -> list[dict[str, Any]]:
    board_size = count or catalog.get("boardSize", 10)
    sport_keys = get_sport_keys(catalog)
    events: list[dict[str, Any]] = []
    used: set[str] = set()

    for _ in range(board_size):
        sport_key = sport_keys[SECURE_RANDOM.randrange(0, len(sport_keys))]
        attempts = 0
        while True:
            event = generate_event(catalog, sport_key)
            attempts += 1
            key = f"{event['sport']}:{event['home']}:{event['away']}"
            if event.get("eventType") != "game" or key not in used or attempts >= 8:
                if event.get("eventType") == "game":
                    used.add(key)
                break
        events.append(event)
    return events


def _simulate_game_score(catalog: dict[str, Any], event: dict[str, Any]) -> None:
    sport_def = catalog["sports"][event["sport"]]
    profile = sport_def["scoringProfile"]
    participants = {p["name"]: p for p in _participants(sport_def)}
    home_rating = participants.get(event["home"], {}).get("powerRating", 1450)
    away_rating = participants.get(event["away"], {}).get("powerRating", 1450)
    rating_diff = home_rating - away_rating + (sport_def.get("homeField") or 0) * 10

    mean_home = (profile.get("meanTotal") or 44) / 2 + rating_diff / 40
    mean_away = (profile.get("meanTotal") or 44) / 2 - rating_diff / 40
    std = profile.get("stdPerTeam") or 7

    home_score = _gaussian_int(mean_home, std, profile.get("minPerTeam", 0), profile.get("maxPerTeam", 50))
    away_score = _gaussian_int(mean_away, std, profile.get("minPerTeam", 0), profile.get("maxPerTeam", 50))

    if profile.get("type") in ("runs", "goals"):
        home_score = max(0, home_score)
        away_score = max(0, away_score)

    if profile.get("allowTie") and SECURE_RANDOM.random() < 0.22:
        draw = min(home_score, away_score)
        home_score = away_score = draw
    elif not profile.get("allowTie") and home_score == away_score:
        if rating_diff >= 0:
            home_score += 1
        else:
            away_score += 1

    event["homeScore"] = home_score
    event["awayScore"] = away_score
    event["winner"] = event["home"] if home_score > away_score else event["away"] if away_score > home_score else None
    event["propOutcomes"] = {
        "both-score": home_score > 0 and away_score > 0,
        "over-tds": home_score + away_score > 45,
    }


def _simulate_outright(catalog: dict[str, Any], event: dict[str, Any]) -> None:
    sport_def = catalog["sports"][event["sport"]]
    field_names = event.get("field") or [event["home"], event["away"]]
    pool = [p for p in _participants(sport_def) if p["name"] in field_names]
    weights = [max(1, p["powerRating"] - 1300) for p in pool]
    total = sum(weights)
    roll = SECURE_RANDOM.random() * total
    winner = pool[0]["name"]
    for i, w in enumerate(weights):
        roll -= w
        if roll <= 0:
            winner = pool[i]["name"]
            break
    event["winner"] = winner
    if len(field_names) == 2:
        event["homeScore"] = 1 if winner == event["home"] else 0
        event["awayScore"] = 1 if winner == event["away"] else 0


def simulate_event_outcome(catalog: dict[str, Any], event: dict[str, Any]) -> dict[str, Any]:
    sport_def = catalog["sports"][event["sport"]]
    if sport_def.get("scoringProfile", {}).get("type") == "outright":
        _simulate_outright(catalog, event)
    else:
        _simulate_game_score(catalog, event)
    event["status"] = "final"
    event["settled"] = True
    return event
