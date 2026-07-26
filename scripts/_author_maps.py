#!/usr/bin/env python3
"""One-shot authoring tool: emits docs/rpg/js/data/maps/*.json and npcs.json.

The JSON it writes is the source of truth; this script exists so the 28 rooms
could be written as readable Python literals instead of by hand.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAPS = ROOT / "docs/rpg/js/data/maps"
DATA = ROOT / "docs/rpg/js/data"

W, H = 30, 30


def rect(tile, x, y, w, h):
    return {"tile": tile, "x": x, "y": y, "w": w, "h": h}


def points(tile, pts):
    return {"tile": tile, "points": [list(p) for p in pts]}


def door(x, y, to, to_x, to_y, message, **extra):
    d = {"x": x, "y": y, "to": to, "toX": to_x, "toY": to_y, "message": message}
    d.update(extra)
    return d


def room(floor, x=2, y=2, w=26, h=26):
    """A walled room: WALL everywhere, floor in the middle."""
    return [rect(floor, x, y, w, h)]


def trim_ring(x, y, w, h):
    """A one-tile TRIM border around a zone, so floors read as separate rooms."""
    return [
        rect("TRIM", x, y, w, 1),
        rect("TRIM", x, y + h - 1, w, 1),
        rect("TRIM", x, y + 1, 1, h - 2),
        rect("TRIM", x + w - 1, y + 1, 1, h - 2),
    ]


def sign(x, y, text, color="#ffe890", stroke="#684810"):
    """Floating floor signage. Placed in tile coords; fractions nudge it."""
    return {"x": x, "y": y, "text": text, "color": color, "stroke": stroke}


COOL_SIGN = {"color": "#a8e8ff", "stroke": "#184868"}
FELT_SIGN = {"color": "#b8ffd0", "stroke": "#0a5028"}


# Every map is 30x30. Doorways sit on the outermost walkable ring so the warp
# fires as the player steps onto it.
MAPS_SPEC: list[dict] = [
    {
        "id": "strip_sidewalk",
        "label": "Las Vegas Blvd",
        "bgm": "lobby",
        "spawn": {"x": 15, "y": 26},
        "base": "WALL",
        # Sidewalk south, the Boulevard across the middle, porte-cochère north.
        "rects": [
            rect("LOBBY", 2, 23, 26, 5),
            rect("ROAD", 1, 17, 28, 6),
            rect("LOBBY", 5, 3, 20, 14),
            rect("ROAD", 12, 1, 6, 4),
            rect("SAND", 14, 17, 3, 6),
        ],
        "decor": [
            points("PLANT", [
                (5, 5), (24, 5), (5, 15), (24, 15),
                (5, 24), (24, 24), (9, 27), (20, 27),
            ]),
            rect("SCREEN", 8, 3, 2, 1),
            rect("SCREEN", 20, 3, 2, 1),
            rect("BAR", 11, 26, 4, 1),
        ],
        "signs": [
            sign(15, 3.4, "MANDALAY BAY \u2191"),
            sign(4.5, 24.5, "\u2190 VALET", **COOL_SIGN),
            sign(25, 19.5, "TRAM \u2192", **COOL_SIGN),
        ],
        "doors": [
            door(15, 3, "registration_lobby", 15, 27, "Through the gold doors — Mandalay Bay."),
            door(2, 24, "valet_garage", 26, 15, "Valet ramp, level P1."),
            door(28, 19, "tram_station", 3, 17, "The free tram, north end of the property."),
        ],
    },
    {
        "id": "valet_garage",
        "label": "Valet & Parking",
        "bgm": "lobby",
        "spawn": {"x": 26, "y": 15},
        "base": "WALL",
        "rects": [rect("ROAD", 2, 2, 26, 26)],
        "decor": [
            rect("SCREEN", 4, 4, 1, 8),
            rect("SCREEN", 25, 4, 1, 8),
            rect("BAR", 12, 6, 6, 1),
            points("PLANT", [(8, 24), (21, 24)]),
        ],
        "clear": [rect("ROAD", 26, 14, 2, 3), rect("ROAD", 14, 26, 3, 2)],
        "doors": [
            door(27, 15, "strip_sidewalk", 3, 24, "Back out to the Boulevard."),
            door(15, 27, "registration_lobby", 15, 4, "Elevator up to registration."),
        ],
    },
    {
        "id": "registration_lobby",
        "label": "Registration Lobby",
        "bgm": "lobby",
        "spawn": {"x": 15, "y": 26},
        "base": "WALL",
        "rects": [
            rect("LOBBY", 2, 2, 26, 26),
            rect("CARPET", 8, 10, 14, 10),
            # Two gold walkways, each three wide, crossing at the middle of the
            # room. Every door sits on one of them, so no arrival ever has to
            # pick its way around the furniture to reach another exit.
            rect("PATH", 14, 3, 3, 23),
            rect("PATH", 3, 14, 24, 3),
            rect("PATH", 8, 9, 14, 1),
        ],
        "decor": [
            # Reception is two counters with the walkway running between them,
            # rather than one bar sealing off the casino doors.
            rect("BAR", 9, 7, 5, 1),
            rect("BAR", 17, 7, 5, 1),
            points("PLANT", [(4, 6), (25, 6), (4, 21), (25, 21), (11, 23), (18, 23)]),
        ],
        "signs": [
            sign(11.5, 6.2, "CHECK IN", color="#fff8e8", stroke="#8a6a28"),
            sign(19.5, 6.2, "CONCIERGE", color="#fff8e8", stroke="#8a6a28"),
            sign(15, 3.4, "CASINO \u2191"),
            sign(4.5, 12.5, "\u2190 VALET", **COOL_SIGN),
            sign(25.5, 12.5, "TOWER \u2192"),
            sign(15, 26.2, "BLVD \u2193", **COOL_SIGN),
            sign(8, 4.5, "GUEST FLOOR \u2191", **COOL_SIGN),
            sign(21, 4.5, "ROOM 24-118 \u2191"),
        ],
        "clear": [
            rect("LOBBY", 14, 2, 3, 3),
            rect("LOBBY", 14, 26, 3, 3),
            rect("LOBBY", 2, 14, 3, 3),
            rect("LOBBY", 25, 14, 3, 3),
            rect("LOBBY", 7, 2, 3, 3),
            rect("LOBBY", 20, 2, 3, 3),
        ],
        "doors": [
            door(15, 27, "strip_sidewalk", 15, 4, "Out to the Boulevard."),
            door(15, 3, "main_resort", 15, 26, "Casino floor — north."),
            door(2, 15, "valet_garage", 15, 26, "Down to the garage."),
            door(27, 15, "hotel_tower", 15, 26, "Gold elevators to the tower."),
            door(8, 3, "guest_corridor", 3, 15, "Guest elevators — 24th floor."),
            door(21, 3, "guest_room", 15, 26, "Express lift — Room 24-118.",
                 requiresRoomKey=True),
        ],
    },
    {
        "id": "main_resort",
        "label": "Casino Floor North",
        "bgm": "casino",
        "spawn": {"x": 15, "y": 26},
        "base": "WALL",
        # Zones read as separate rooms: trim rings the pit, and a gold walkway
        # spine connects the entrance, the aisles, and every door.
        "rects": [
            rect("CARPET", 2, 2, 26, 26),
            rect("FELT", 9, 8, 13, 9),
            *trim_ring(8, 7, 15, 11),
            rect("VIP", 13, 2, 5, 4),
            rect("LOBBY", 3, 20, 24, 7),
            rect("PATH", 3, 18, 24, 2),
            rect("PATH", 6, 8, 2, 11),
            rect("PATH", 22, 8, 2, 11),
            rect("PATH", 14, 19, 3, 7),
            rect("PATH", 14, 6, 3, 2),
            rect("PATH", 4, 19, 2, 5),
        ],
        "decor": [
            # Slot banks run across the east wall in two blocks with a two-tile
            # aisle between them. As single columns they left one-tile gaps that
            # a player could wedge into on the way to the south floor.
            rect("SLOT", 24, 8, 4, 2),
            rect("SLOT", 24, 12, 4, 2),
            rect("SCREEN", 4, 10, 1, 8),
            rect("BAR", 19, 23, 3, 1),
            points("PLANT", [(7, 6), (7, 19), (25, 21)]),
        ],
        "signs": [
            sign(15, 7.4, "TABLE PIT", **FELT_SIGN),
            sign(25.5, 6.6, "SLOTS"),
            sign(5, 8.6, "SPORTS", **COOL_SIGN),
            sign(15, 4, "HIGH LIMIT"),
            sign(15, 22, "LOBBY", color="#fff8e8", stroke="#8a6a28"),
            sign(26, 6, "SOUTH \u2192", **COOL_SIGN),
        ],
        # Kept off the wall columns: a planter hard against the wall leaves a
        # one-tile slot behind it that players walk into and stop.
        "scatter": [{"tile": "PLANT", "mod": 11, "on": ["LOBBY"], "bounds": rect("LOBBY", 5, 21, 20, 4)}],
        "clear": [
            rect("VIP", 14, 1, 3, 5),
            rect("CARPET", 14, 26, 3, 3),
            rect("CARPET", 2, 14, 3, 3),
            rect("CARPET", 25, 14, 3, 3),
            rect("LOBBY", 3, 22, 3, 3),
            rect("LOBBY", 24, 22, 3, 3),
        ],
        "doors": [
            door(15, 27, "registration_lobby", 15, 4, "Back to registration."),
            door(15, 2, "high_limit_salon", 15, 26, "High Limit Salon — velvet rope.",
                 venueGate="high_limit_salon"),
            door(15, 1, "staff_corridor", 15, 26, "STAFF ONLY — you found the back room.",
                 requiresFlag="hint_north_wall"),
            door(2, 15, "race_sports_book", 26, 15, "Race & Sports Book."),
            door(27, 15, "casino_floor_south", 15, 3, "Casino floor — south."),
            door(4, 23, "betty_bar", 15, 26, "Betty's Bar, west lobby."),
        ],
    },
    {
        "id": "casino_floor_south",
        "label": "Casino Floor South",
        "bgm": "casino",
        "spawn": {"x": 15, "y": 3},
        "base": "WALL",
        "rects": [
            rect("CARPET", 2, 2, 26, 26),
            rect("FELT", 10, 10, 11, 8),
            *trim_ring(9, 9, 13, 10),
            rect("LOBBY", 3, 21, 24, 6),
            rect("PATH", 3, 19, 24, 1),
            rect("PATH", 14, 5, 3, 5),
            rect("PATH", 14, 20, 3, 7),
            rect("PATH", 5, 19, 2, 5),
            rect("PATH", 23, 19, 2, 5),
        ],
        "decor": [
            rect("SLOT", 5, 5, 1, 12),
            rect("SLOT", 8, 5, 1, 12),
            rect("SLOT", 24, 5, 1, 12),
            points("PLANT", [(13, 6), (18, 6), (13, 20), (18, 20)]),
        ],
        "signs": [
            sign(15, 9.4, "TABLE PIT", **FELT_SIGN),
            sign(6.5, 3.6, "SLOTS"),
            sign(15, 3.4, "NORTH \u2191", **COOL_SIGN),
            sign(5, 22.5, "\u2190 SHOPPES"),
            sign(25, 22.5, "HOB \u2192"),
            sign(15, 26.2, "POOL \u2193", **COOL_SIGN),
            sign(4.5, 12.5, "\u2190 ONE", **COOL_SIGN),
        ],
        "clear": [
            rect("CARPET", 14, 1, 3, 4),
            rect("LOBBY", 2, 22, 3, 3),
            rect("LOBBY", 25, 22, 3, 3),
            rect("CARPET", 25, 6, 3, 3),
            rect("LOBBY", 14, 26, 3, 3),
            rect("PATH", 2, 14, 7, 3),
        ],
        "doors": [
            door(15, 2, "main_resort", 15, 26, "Casino floor — north."),
            door(2, 23, "mandalay_place", 15, 26, "The Shoppes at Mandalay Place."),
            door(27, 23, "house_of_blues", 15, 26, "House of Blues stage door."),
            door(27, 7, "ultra_arena", 15, 26, "Michelob ULTRA Arena concourse."),
            door(15, 27, "mandalay_beach", 15, 3, "Out to the eleven acres."),
            door(2, 15, "mj_one_theatre", 26, 15, "Michael Jackson ONE theatre doors."),
        ],
    },
    {
        "id": "race_sports_book",
        "label": "Race & Sports Book",
        "bgm": "casino",
        "spawn": {"x": 26, "y": 15},
        "base": "WALL",
        "rects": [
            rect("CARPET", 2, 2, 26, 26),
            rect("LOBBY", 6, 6, 18, 4),
        ],
        "decor": [
            rect("SCREEN", 5, 4, 20, 1),
            rect("BAR", 8, 12, 3, 1),
            rect("BAR", 14, 12, 3, 1),
            rect("BAR", 20, 12, 3, 1),
            rect("BAR", 8, 18, 3, 1),
            rect("BAR", 14, 18, 3, 1),
            rect("BAR", 20, 18, 3, 1),
            points("PLANT", [(4, 24), (25, 24)]),
        ],
        "clear": [rect("CARPET", 25, 14, 3, 3)],
        "doors": [door(27, 15, "main_resort", 3, 15, "Back to the casino floor.")],
    },
    {
        "id": "high_limit_salon",
        "label": "High Limit Salon",
        "bgm": "secret",
        "spawn": {"x": 15, "y": 26},
        "base": "WALL",
        "rects": [
            rect("VIP", 6, 3, 18, 25),
            rect("FELT", 9, 8, 12, 11),
            rect("PATH", 14, 19, 3, 8),
            rect("PATH", 14, 4, 3, 4),
        ],
        "decor": [
            rect("SLOT", 6, 10, 1, 8),
            rect("SLOT", 23, 10, 1, 8),
            rect("BAR", 8, 22, 3, 1),
            points("ROPE", [(13, 3), (17, 3)]),
        ],
        "clear": [rect("VIP", 14, 1, 3, 6), rect("VIP", 14, 26, 3, 3)],
        "doors": [
            door(15, 27, "main_resort", 15, 4, "Back to the main floor."),
            door(15, 2, "foundation_room", 15, 26, "Foundation Room — Noir members only.",
                 venueGate="foundation_room"),
        ],
    },
    {
        "id": "foundation_room",
        "label": "Foundation Room",
        "bgm": "secret",
        "spawn": {"x": 15, "y": 26},
        "base": "WALL",
        "rects": [
            rect("VIP", 3, 3, 24, 25),
            rect("FELT", 9, 9, 13, 10),
            rect("GLASS", 3, 3, 24, 1),
        ],
        "decor": [
            rect("BAR", 12, 6, 7, 1),
            points("PLANT", [(5, 12), (25, 12), (5, 22), (25, 22)]),
        ],
        "clear": [rect("VIP", 14, 26, 3, 3)],
        "doors": [door(15, 27, "high_limit_salon", 15, 4, "Back to the high limit salon.")],
    },
    {
        "id": "mandalay_place",
        "label": "The Shoppes at Mandalay Place",
        "bgm": "lobby",
        "spawn": {"x": 15, "y": 26},
        "base": "WALL",
        "rects": [
            rect("LOBBY", 2, 2, 26, 26),
            rect("CARPET", 11, 5, 8, 20),
        ],
        "decor": [
            rect("GLASS", 6, 6, 1, 6),
            rect("GLASS", 6, 16, 1, 6),
            rect("GLASS", 23, 6, 1, 6),
            rect("GLASS", 23, 16, 1, 6),
            rect("BAR", 8, 13, 2, 1),
            rect("BAR", 20, 13, 2, 1),
        ],
        "signs": [
            sign(15, 26.2, "CASINO \u2193", **COOL_SIGN),
            sign(15, 3.4, "SKY BRIDGE \u2191", **COOL_SIGN),
            sign(4.5, 12.5, "\u2190 DINING"),
            sign(25.5, 12.5, "ICEBAR \u2192", **COOL_SIGN),
        ],
        "clear": [
            rect("CARPET", 14, 26, 3, 3), rect("LOBBY", 14, 2, 3, 3),
            rect("LOBBY", 2, 14, 4, 3), rect("LOBBY", 24, 14, 4, 3),
        ],
        "doors": [
            door(15, 27, "casino_floor_south", 3, 23, "Back to the casino floor."),
            door(15, 2, "sky_bridge", 15, 26, "Sky bridge to the convention wing."),
            door(2, 15, "restaurant_row", 26, 15, "Restaurant row."),
            door(27, 15, "minus5_icebar", 26, 15, "Minus5 Icebar — parkas provided."),
        ],
    },
    {
        "id": "sky_bridge",
        "label": "Sky Bridge",
        "bgm": "lobby",
        "spawn": {"x": 15, "y": 26},
        "base": "WALL",
        "rects": [rect("LOBBY", 11, 2, 8, 26)],
        "decor": [
            rect("GLASS", 11, 4, 1, 20),
            rect("GLASS", 18, 4, 1, 20),
            points("PLANT", [(12, 14), (17, 14)]),
        ],
        "clear": [rect("LOBBY", 14, 1, 3, 3), rect("LOBBY", 14, 26, 3, 3)],
        "doors": [
            door(15, 27, "mandalay_place", 15, 3, "Back down to the Shoppes."),
            door(15, 2, "convention_center", 15, 26, "Convention center concourse."),
        ],
    },
    {
        "id": "convention_center",
        "label": "Convention Center",
        "bgm": "lobby",
        "spawn": {"x": 15, "y": 26},
        "base": "WALL",
        "rects": [
            rect("LOBBY", 2, 2, 26, 26),
            rect("CARPET", 5, 6, 20, 16),
        ],
        "decor": [
            rect("BAR", 7, 9, 4, 1),
            rect("BAR", 14, 9, 4, 1),
            rect("BAR", 20, 9, 4, 1),
            rect("BAR", 7, 15, 4, 1),
            rect("BAR", 14, 15, 4, 1),
            rect("BAR", 20, 15, 4, 1),
            rect("SCREEN", 13, 4, 4, 1),
        ],
        "signs": [
            sign(15, 26.2, "SKY BRIDGE \u2193", **COOL_SIGN),
            sign(4.5, 12.5, "\u2190 ARENA"),
            sign(15, 3.4, "TRAM \u2191", **COOL_SIGN),
        ],
        "clear": [
            rect("LOBBY", 14, 26, 3, 3), rect("LOBBY", 2, 14, 3, 3),
            rect("LOBBY", 14, 2, 3, 4),
        ],
        "doors": [
            door(15, 27, "sky_bridge", 15, 3, "Back across the sky bridge."),
            door(2, 15, "ultra_arena", 26, 15, "Arena service concourse."),
            door(15, 2, "tram_station", 15, 26, "Up to the tram platform."),
        ],
    },
    {
        "id": "betty_bar",
        "label": "Betty's Bar",
        "bgm": "lobby",
        "spawn": {"x": 15, "y": 26},
        "base": "WALL",
        "rects": [
            rect("CARPET", 5, 4, 20, 24),
            rect("LOBBY", 9, 8, 12, 8),
        ],
        "decor": [
            rect("BAR", 9, 6, 12, 1),
            points("PLANT", [(6, 20), (23, 20), (6, 10), (23, 10)]),
        ],
        "clear": [rect("CARPET", 14, 26, 3, 3)],
        "doors": [door(15, 27, "main_resort", 5, 23, "Back onto the carpet.")],
    },
    {
        "id": "skyfall_lounge",
        "label": "Skyfall Lounge",
        "bgm": "secret",
        "spawn": {"x": 15, "y": 26},
        "base": "WALL",
        "rects": [
            rect("VIP", 4, 4, 22, 24),
            rect("GLASS", 4, 4, 22, 1),
        ],
        "decor": [
            rect("BAR", 10, 8, 10, 1),
            points("PLANT", [(6, 14), (24, 14), (6, 22), (24, 22)]),
        ],
        "clear": [rect("VIP", 14, 26, 3, 3)],
        "doors": [door(15, 27, "hotel_tower", 26, 15, "Elevator back down.")],
    },
    {
        "id": "hotel_tower",
        "label": "Tower Elevator Lobby",
        "bgm": "lobby",
        "spawn": {"x": 15, "y": 26},
        "base": "WALL",
        "rects": [
            rect("LOBBY", 3, 3, 24, 25),
            rect("CARPET", 10, 10, 11, 12),
        ],
        "decor": [
            rect("BAR", 12, 7, 7, 1),
            points("PLANT", [(5, 6), (24, 6), (5, 24), (24, 24)]),
        ],
        "signs": [
            sign(15, 3.4, "GUEST FLOOR \u2191"),
            sign(21, 3.4, "ROOM 24-118 \u2191"),
            sign(15, 26.2, "REGISTRATION \u2193", **COOL_SIGN),
        ],
        "clear": [
            rect("LOBBY", 14, 26, 3, 3),
            rect("LOBBY", 14, 2, 3, 3),
            rect("LOBBY", 2, 14, 3, 3),
            rect("LOBBY", 25, 14, 3, 3),
            rect("LOBBY", 20, 2, 3, 3),
        ],
        "doors": [
            door(15, 27, "registration_lobby", 26, 15, "Down to registration."),
            door(15, 2, "guest_corridor", 15, 26, "Guest floor — 24th."),
            door(2, 15, "delano_wing", 26, 15, "Sky bridge to the Delano wing."),
            door(27, 15, "skyfall_lounge", 15, 26, "Skyfall Lounge, 43rd floor."),
            door(21, 2, "guest_room", 15, 26, "Express to Room 24-118 — key card.",
                 requiresRoomKey=True),
        ],
    },
    {
        "id": "guest_corridor",
        "label": "Guest Floor Corridor",
        "bgm": "lobby",
        "spawn": {"x": 15, "y": 26},
        "base": "WALL",
        "rects": [
            rect("CARPET", 9, 2, 12, 26),
            rect("CARPET", 3, 11, 7, 8),
            rect("CARPET", 20, 11, 7, 8),
            rect("CARPET", 5, 4, 5, 4),
            rect("CARPET", 20, 4, 5, 4),
        ],
        "decor": [
            points("PLANT", [(10, 8), (19, 8), (10, 22), (19, 22), (6, 15), (24, 15)]),
        ],
        "signs": [
            sign(15, 26.2, "ELEVATORS \u2193"),
            sign(15, 3.4, "ROOM 24-118 \u2191"),
            sign(5, 14.5, "\u2190 LOBBY", **COOL_SIGN),
            sign(24.5, 14.5, "SUITE WING \u2192"),
            sign(7, 5.5, "24-112"),
            sign(23, 5.5, "24-124"),
        ],
        "clear": [
            rect("CARPET", 14, 1, 3, 3),
            rect("CARPET", 6, 1, 3, 3),
            rect("CARPET", 22, 1, 3, 3),
            rect("CARPET", 2, 14, 3, 3),
            rect("CARPET", 14, 26, 3, 3),
        ],
        "doors": [
            door(15, 27, "hotel_tower", 15, 4, "Back to the elevators."),
            door(15, 2, "guest_room", 15, 26, "Room 24-118 — key card.",
                 requiresRoomKey=True),
            door(3, 15, "registration_lobby", 8, 4, "West elevators down to registration."),
        ],
    },
    {
        "id": "guest_room",
        "label": "Your Room",
        "bgm": "lobby",
        "spawn": {"x": 15, "y": 26},
        "base": "WALL",
        "rects": [
            rect("CARPET", 7, 6, 16, 22),
            rect("GLASS", 7, 6, 16, 1),
            rect("LOBBY", 8, 20, 6, 6),
        ],
        "decor": [
            rect("BAR", 9, 10, 3, 1),
            rect("SCREEN", 18, 10, 3, 1),
            rect("BAR", 16, 14, 5, 3),
            points("PLANT", [(21, 24)]),
        ],
        "clear": [rect("CARPET", 14, 26, 3, 3)],
        "doors": [door(15, 27, "guest_corridor", 15, 4, "Back into the corridor.")],
    },
    {
        "id": "delano_wing",
        "label": "Delano Wing",
        "bgm": "secret",
        "spawn": {"x": 26, "y": 15},
        "base": "WALL",
        "rects": [
            rect("LOBBY", 2, 2, 26, 26),
            rect("VIP", 8, 8, 14, 14),
        ],
        "decor": [
            points("PLANT", [(5, 5), (24, 5), (5, 24), (24, 24), (14, 5), (15, 24)]),
            rect("BAR", 12, 12, 6, 1),
        ],
        "clear": [rect("LOBBY", 25, 14, 3, 3), rect("LOBBY", 14, 26, 3, 3)],
        "doors": [
            door(27, 15, "hotel_tower", 3, 15, "Back to the Mandalay tower."),
            door(15, 27, "spa", 15, 3, "Bathhouse spa, lower level."),
        ],
    },
    {
        "id": "spa",
        "label": "Bathhouse Spa",
        "bgm": "title",
        "spawn": {"x": 15, "y": 3},
        "base": "WALL",
        "rects": [
            rect("SPA", 3, 2, 24, 26),
            rect("WATER", 9, 10, 12, 9),
        ],
        "decor": [
            points("PLANT", [(5, 6), (24, 6), (5, 22), (24, 22)]),
            rect("BAR", 12, 24, 6, 1),
        ],
        "clear": [rect("SPA", 14, 1, 3, 4)],
        "doors": [door(15, 2, "delano_wing", 15, 26, "Back up to the Delano wing.")],
    },
    {
        "id": "mandalay_beach",
        "label": "Mandalay Beach",
        "bgm": "lobby",
        "spawn": {"x": 15, "y": 3},
        "base": "WALL",
        "rects": [
            rect("SAND", 2, 2, 26, 26),
            rect("WATER", 9, 9, 13, 12),
            rect("PATH", 6, 6, 18, 2),
            rect("PATH", 6, 22, 18, 2),
            rect("PATH", 6, 6, 2, 18),
            rect("PATH", 22, 6, 2, 18),
            rect("PATH", 14, 2, 3, 5),
            rect("PATH", 14, 23, 3, 5),
            rect("PATH", 2, 14, 5, 3),
            rect("PATH", 23, 14, 5, 3),
        ],
        "decor": [
            points("PLANT", [(4, 4), (25, 4), (4, 25), (25, 25)]),
            rect("BAR", 19, 25, 5, 1),
        ],
        "scatter": [{"tile": "PLANT", "mod": 17, "on": ["SAND"],
                     "bounds": rect("SAND", 4, 4, 22, 22)}],
        "clear": [
            rect("SAND", 14, 1, 3, 4),
            rect("SAND", 2, 14, 3, 3),
            rect("SAND", 25, 14, 3, 3),
            rect("SAND", 14, 26, 3, 3),
        ],
        "doors": [
            door(15, 2, "casino_floor_south", 15, 26, "Back inside to the casino."),
            door(2, 15, "reef_tunnel", 26, 15, "Shark Reef Aquarium entrance."),
            door(27, 15, "cabana_row", 3, 15, "Cabanas and hot tubs."),
            door(15, 27, "beach_club", 15, 3, "Moorea Beach Club."),
        ],
    },
    {
        "id": "cabana_row",
        "label": "Cabanas & Hot Tubs",
        "bgm": "lobby",
        "spawn": {"x": 3, "y": 15},
        "base": "WALL",
        "rects": [
            rect("SAND", 2, 2, 26, 26),
            rect("WATER", 6, 6, 5, 5),
            rect("WATER", 19, 6, 5, 5),
            rect("WATER", 6, 19, 5, 5),
            rect("WATER", 19, 19, 5, 5),
        ],
        "decor": [
            rect("BAR", 13, 13, 4, 2),
            points("PLANT", [(14, 4), (4, 14), (25, 14)]),
        ],
        "signs": [
            sign(4.5, 12.5, "\u2190 WAVE POOL", **COOL_SIGN),
            sign(15, 26.2, "LAZY RIVER \u2193", **COOL_SIGN),
        ],
        "clear": [rect("SAND", 2, 14, 3, 3), rect("PATH", 14, 16, 3, 12)],
        "doors": [
            door(2, 15, "mandalay_beach", 26, 15, "Back to the wave pool."),
            door(15, 27, "lazy_river", 15, 3, "Down to the lazy river."),
        ],
    },
    {
        "id": "beach_club",
        "label": "Moorea Beach Club",
        "bgm": "encounter",
        "spawn": {"x": 15, "y": 3},
        "base": "WALL",
        "rects": [
            rect("SAND", 2, 2, 26, 26),
            rect("STAGE", 10, 8, 11, 8),
        ],
        "decor": [
            rect("BAR", 6, 22, 6, 1),
            rect("BAR", 18, 22, 6, 1),
            points("PLANT", [(4, 5), (25, 5), (4, 25), (25, 25)]),
        ],
        "signs": [
            sign(15, 2.4, "BEACH \u2191", **COOL_SIGN),
            sign(25.5, 12.5, "RAVE \u2192"),
            sign(4.5, 12.5, "\u2190 LAZY RIVER", **COOL_SIGN),
        ],
        "clear": [
            rect("SAND", 14, 1, 3, 4), rect("SAND", 25, 14, 3, 3),
            rect("SAND", 2, 14, 3, 3),
        ],
        "doors": [
            door(15, 2, "mandalay_beach", 15, 26, "Back to the beach."),
            door(27, 15, "rave_stage", 15, 26, "The rave stage, after dark."),
            door(2, 15, "lazy_river", 26, 15, "Round to the lazy river."),
        ],
    },
    {
        "id": "rave_stage",
        "label": "Moonlight Rave Stage",
        "bgm": "encounter",
        "spawn": {"x": 15, "y": 26},
        "base": "WALL",
        "rects": [
            rect("STAGE", 3, 3, 24, 25),
            rect("SAND", 10, 20, 11, 8),
        ],
        "decor": [
            rect("SCREEN", 8, 5, 14, 1),
            rect("BAR", 5, 12, 2, 4),
            rect("BAR", 23, 12, 2, 4),
        ],
        "clear": [rect("SAND", 14, 26, 3, 3)],
        "doors": [door(15, 27, "beach_club", 26, 15, "Back to the beach club.")],
    },
    {
        "id": "reef_tunnel",
        "label": "Shark Reef Tunnel",
        "bgm": "title",
        "spawn": {"x": 26, "y": 15},
        "base": "WALL",
        "rects": [
            rect("AQUA", 2, 11, 26, 8),
            rect("WATER", 4, 11, 22, 2),
            rect("WATER", 4, 17, 22, 2),
        ],
        "decor": [
            points("PLANT", [(6, 14), (14, 14), (22, 14)]),
        ],
        "clear": [rect("AQUA", 25, 14, 3, 3), rect("AQUA", 2, 14, 3, 3)],
        "doors": [
            door(27, 15, "mandalay_beach", 3, 15, "Back to the pool deck."),
            door(2, 15, "shark_reef", 26, 15, "Into the exhibit hall."),
        ],
    },
    {
        "id": "shark_reef",
        "label": "Shark Reef Exhibit Hall",
        "bgm": "title",
        "spawn": {"x": 26, "y": 15},
        "base": "WALL",
        "rects": [
            rect("AQUA", 2, 2, 26, 26),
            rect("WATER", 8, 7, 15, 12),
        ],
        "decor": [
            points("PLANT", [(7, 8), (7, 17), (23, 8), (23, 17)]),
            rect("SCREEN", 13, 23, 4, 1),
        ],
        "clear": [rect("AQUA", 25, 14, 3, 3)],
        "doors": [door(27, 15, "reef_tunnel", 3, 15, "Back through the tunnel.")],
    },
    {
        "id": "house_of_blues",
        "label": "House of Blues",
        "bgm": "encounter",
        "spawn": {"x": 15, "y": 26},
        "base": "WALL",
        "rects": [
            rect("CARPET", 4, 4, 22, 24),
            rect("STAGE", 9, 6, 13, 8),
        ],
        "decor": [
            rect("BAR", 5, 22, 4, 1),
            rect("BAR", 21, 22, 4, 1),
            rect("SCREEN", 12, 5, 7, 1),
        ],
        "clear": [rect("CARPET", 14, 26, 3, 3), rect("CARPET", 2, 14, 3, 3)],
        "doors": [
            door(15, 27, "casino_floor_south", 26, 23, "Back to the casino."),
            door(2, 15, "hob_green_room", 26, 15, "Green room — badge only.",
                 requiresFlag="hob_backstage"),
        ],
    },
    {
        "id": "hob_green_room",
        "label": "HOB Green Room",
        "bgm": "secret",
        "spawn": {"x": 26, "y": 15},
        "base": "WALL",
        "rects": [rect("CARPET", 6, 8, 18, 14)],
        "decor": [
            rect("BAR", 9, 11, 5, 1),
            rect("BAR", 17, 11, 5, 1),
            points("PLANT", [(7, 20), (22, 20)]),
        ],
        "clear": [rect("CARPET", 24, 14, 4, 3)],
        "doors": [door(27, 15, "house_of_blues", 3, 15, "Back to the stage.")],
    },
    {
        "id": "ultra_arena",
        "label": "ULTRA Arena Concourse",
        "bgm": "lobby",
        "spawn": {"x": 15, "y": 26},
        "base": "WALL",
        "rects": [
            rect("LOBBY", 2, 2, 26, 26),
            rect("FELT", 8, 8, 15, 12),
        ],
        "decor": [
            rect("SCREEN", 9, 6, 4, 1),
            rect("SCREEN", 18, 6, 4, 1),
            rect("BAR", 4, 23, 5, 1),
            rect("BAR", 21, 23, 5, 1),
        ],
        "clear": [rect("LOBBY", 14, 26, 3, 3), rect("LOBBY", 25, 14, 3, 3)],
        "doors": [
            door(15, 27, "casino_floor_south", 26, 7, "Back to the casino floor."),
            door(27, 15, "convention_center", 3, 15, "Convention concourse."),
        ],
    },
    {
        "id": "staff_corridor",
        "label": "Back of House",
        "bgm": "secret",
        "spawn": {"x": 15, "y": 26},
        "base": "WALL",
        "rects": [
            rect("CARPET", 12, 4, 6, 24),
            rect("CARPET", 4, 12, 22, 5),
        ],
        "decor": [
            rect("BAR", 5, 14, 2, 1),
            rect("BAR", 23, 14, 2, 1),
            rect("SCREEN", 14, 5, 2, 1),
        ],
        "clear": [rect("CARPET", 14, 26, 3, 3)],
        "doors": [door(15, 27, "main_resort", 15, 3, "Slip back onto the floor.")],
    },
    {
        "id": "mj_one_theatre",
        "label": "Michael Jackson ONE Theatre",
        "bgm": "encounter",
        "spawn": {"x": 26, "y": 15},
        "base": "WALL",
        # A raked house: stage north, two seating blocks, and a gold aisle
        # running down the middle so the walk to a seat is never a maze.
        "rects": [
            rect("CARPET", 2, 2, 26, 26),
            rect("STAGE", 7, 3, 17, 7),
            *trim_ring(6, 2, 19, 9),
            rect("VIP", 8, 13, 6, 8),
            rect("VIP", 17, 13, 6, 8),
            rect("PATH", 14, 11, 3, 16),
            rect("PATH", 3, 14, 24, 3),
        ],
        "decor": [
            rect("SCREEN", 12, 2, 7, 1),
            rect("BAR", 4, 24, 5, 1),
            rect("BAR", 22, 24, 5, 1),
            points("PLANT", [(4, 12), (26, 12), (4, 20), (26, 20)]),
        ],
        "signs": [
            sign(15, 10.4, "ONE STAGE"),
            sign(11, 12.4, "ORCHESTRA", **COOL_SIGN),
            sign(20, 12.4, "ORCHESTRA", **COOL_SIGN),
            sign(4.5, 12.5, "LOBBY", **COOL_SIGN),
            sign(25.5, 12.5, "CASINO \u2192"),
        ],
        "clear": [rect("CARPET", 25, 14, 3, 3), rect("CARPET", 14, 25, 3, 3)],
        "doors": [
            door(27, 15, "casino_floor_south", 4, 15, "Back onto the casino floor."),
        ],
    },
    {
        "id": "minus5_icebar",
        "label": "Minus5 Icebar",
        "bgm": "secret",
        "spawn": {"x": 26, "y": 15},
        "base": "WALL",
        # Everything is carved ice, so the floor is ICE and the sculptures are
        # GLASS. A single warm gold aisle keeps the room readable.
        "rects": [
            rect("ICE", 4, 4, 22, 22),
            rect("PATH", 4, 14, 22, 3),
            rect("PATH", 14, 4, 3, 22),
        ],
        "decor": [
            rect("BAR", 9, 8, 12, 1),
            rect("GLASS", 6, 6, 1, 4),
            rect("GLASS", 23, 6, 1, 4),
            rect("GLASS", 6, 20, 1, 4),
            rect("GLASS", 23, 20, 1, 4),
            rect("GLASS", 10, 21, 1, 3),
            rect("GLASS", 19, 21, 1, 3),
        ],
        "signs": [
            sign(15, 7.4, "ICE BAR", **COOL_SIGN),
            sign(15, 24.4, "\u2212 5 \u00b0 C", **COOL_SIGN),
            sign(25.5, 12.5, "SHOPPES \u2192"),
        ],
        "clear": [rect("ICE", 25, 14, 3, 3)],
        "doors": [
            door(27, 15, "mandalay_place", 26, 15, "Back out into the warm."),
        ],
    },
    {
        "id": "restaurant_row",
        "label": "Restaurant Row",
        "bgm": "lobby",
        "spawn": {"x": 26, "y": 15},
        "base": "WALL",
        # Four counters facing a single concourse: the row reads at a glance
        # instead of making the player check every doorway.
        "rects": [
            rect("LOBBY", 2, 2, 26, 26),
            rect("CARPET", 4, 6, 9, 7),
            rect("CARPET", 17, 6, 9, 7),
            rect("CARPET", 4, 18, 9, 7),
            rect("CARPET", 17, 18, 9, 7),
            rect("PATH", 3, 14, 24, 3),
            rect("PATH", 14, 3, 3, 24),
        ],
        "decor": [
            rect("BAR", 5, 8, 6, 1),
            rect("BAR", 19, 8, 6, 1),
            rect("BAR", 5, 22, 6, 1),
            rect("BAR", 19, 22, 6, 1),
            points("PLANT", [(13, 5), (18, 5), (13, 26), (18, 26)]),
        ],
        # Placards sit below each counter so an NPC's name plate never lands
        # on top of the restaurant they work for.
        "signs": [
            sign(8, 11.6, "BORDER GRILL", **FELT_SIGN),
            sign(22, 11.6, "STRIPSTEAK"),
            sign(8, 23.6, "KUMI", **COOL_SIGN),
            sign(22, 23.6, "LIBERTINE"),
            sign(25.5, 12.5, "SHOPPES \u2192"),
        ],
        "clear": [rect("LOBBY", 25, 14, 3, 3)],
        "doors": [
            door(27, 15, "mandalay_place", 3, 15, "Back to the Shoppes."),
        ],
    },
    {
        "id": "lazy_river",
        "label": "The Lazy River",
        "bgm": "lobby",
        "spawn": {"x": 26, "y": 15},
        "base": "WALL",
        # A ring of water around a sand island, with two plank bridges so the
        # tube stand in the middle is reachable from either bank. The deck is a
        # full loop, so both doors stay reachable whichever way you walk.
        "rects": [
            rect("SAND", 2, 2, 26, 26),
            rect("WATER", 6, 6, 18, 18),
            rect("SAND", 10, 10, 10, 10),
            rect("PATH", 14, 2, 3, 9),
            rect("PATH", 14, 19, 3, 9),
            rect("PATH", 2, 14, 4, 3),
            rect("PATH", 24, 14, 4, 3),
        ],
        "decor": [
            rect("BAR", 12, 12, 6, 1),
            points("PLANT", [(11, 17), (18, 17), (4, 4), (25, 4), (4, 25), (25, 25)]),
        ],
        "signs": [
            sign(15, 5.4, "LAZY RIVER", **COOL_SIGN),
            sign(15, 11.4, "TUBE RENTAL"),
            sign(15, 2.4, "CABANAS \u2191", **COOL_SIGN),
            sign(25.5, 12.5, "BEACH CLUB \u2192", **COOL_SIGN),
        ],
        "clear": [rect("PATH", 14, 2, 3, 3), rect("SAND", 25, 14, 3, 3)],
        "doors": [
            door(15, 2, "cabana_row", 15, 26, "Back up to the cabanas."),
            door(27, 15, "beach_club", 3, 15, "Round to Moorea Beach Club."),
        ],
    },
    {
        "id": "tram_station",
        "label": "Mandalay Bay Tram Station",
        "bgm": "lobby",
        "spawn": {"x": 15, "y": 26},
        "base": "WALL",
        # Two platforms either side of a track, joined by a gold concourse.
        # The tram itself is the shortcut back to the front of the property.
        "rects": [
            rect("LOBBY", 2, 2, 26, 26),
            rect("ROAD", 3, 9, 24, 5),
            rect("PATH", 14, 14, 3, 13),
            rect("PATH", 3, 16, 24, 3),
            rect("PATH", 3, 5, 24, 3),
        ],
        "decor": [
            rect("GLASS", 3, 8, 10, 1),
            rect("GLASS", 17, 8, 10, 1),
            rect("GLASS", 3, 14, 10, 1),
            rect("GLASS", 17, 14, 10, 1),
            rect("SCREEN", 13, 4, 4, 1),
            rect("SCREEN", 13, 20, 4, 1),
            rect("BAR", 6, 22, 5, 1),
            rect("BAR", 19, 22, 5, 1),
            points("PLANT", [(4, 21), (25, 21), (4, 25), (25, 25)]),
        ],
        "signs": [
            sign(15, 6.4, "NORTHBOUND", **COOL_SIGN),
            sign(15, 17.4, "SOUTHBOUND", **COOL_SIGN),
            sign(15, 26.2, "CONVENTION \u2193"),
            sign(4.5, 17.5, "\u2190 BLVD TRAM", **COOL_SIGN),
        ],
        "clear": [rect("LOBBY", 14, 26, 3, 3), rect("LOBBY", 2, 16, 3, 3)],
        "doors": [
            door(15, 27, "convention_center", 15, 3, "Down to the convention concourse."),
            door(2, 17, "strip_sidewalk", 26, 19, "Tram to the front of the property."),
        ],
    },
]

# Which part of the property each room belongs to. Kept out of the specs above
# so the groupings read as one list; injected into every record on write.
WINGS: dict[str, str] = {
    "strip_sidewalk": "Arrival",
    "valet_garage": "Arrival",
    "registration_lobby": "Arrival",
    "main_resort": "Casino",
    "casino_floor_south": "Casino",
    "race_sports_book": "Casino",
    "high_limit_salon": "Casino",
    "foundation_room": "Casino",
    "mandalay_place": "Retail",
    "sky_bridge": "Retail",
    "convention_center": "Retail",
    "tram_station": "Retail",
    "betty_bar": "Bars",
    "skyfall_lounge": "Bars",
    "minus5_icebar": "Bars",
    "restaurant_row": "Dining",
    "hotel_tower": "Hotel",
    "guest_corridor": "Hotel",
    "guest_room": "Hotel",
    "delano_wing": "Hotel",
    "spa": "Hotel",
    "mandalay_beach": "Pool",
    "cabana_row": "Pool",
    "beach_club": "Pool",
    "rave_stage": "Pool",
    "lazy_river": "Pool",
    "reef_tunnel": "Attractions",
    "shark_reef": "Attractions",
    "house_of_blues": "Attractions",
    "hob_green_room": "Attractions",
    "ultra_arena": "Attractions",
    "mj_one_theatre": "Attractions",
    "staff_corridor": "Back of house",
}

# NPC rosters per map. Positions are validated by scripts/smoke-test-rpg.mjs.
NPCS: dict[str, list[dict]] = {
    "strip_sidewalk": [
        {"id": "doorman_dante", "name": "Doorman Dante", "x": 15, "y": 6, "sprite": "npc_red",
         "dialogueId": "doorman_dante_greet", "direction": "down"},
        {"id": "cab_line_carl", "name": "Cab Line Carl", "x": 9, "y": 25, "sprite": "npc_silver",
         "dialogueId": "cab_line_carl_greet", "direction": "up",
         "schedule": {"late": {"x": 21, "y": 25}}},
    ],
    "valet_garage": [
        {"id": "valet_vic", "name": "Valet Vic", "x": 15, "y": 8, "sprite": "npc_orange",
         "dialogueId": "valet_vic_greet", "direction": "down",
         "sight": {"dir": "down", "range": 4}, "challengeDialogueId": "valet_vic_challenge"},
    ],
    "registration_lobby": [
        {"id": "chip_chandler", "name": "Chip Chandler", "x": 15, "y": 22, "sprite": "npc_gold",
         "dialogueId": "chip_chandler_intro", "direction": "down"},
        {"id": "lobby_statue", "name": "Golden Statue", "x": 15, "y": 15, "sprite": "npc_gold",
         "dialogueId": "lobby_statue", "direction": "down"},
        {"id": "tourist_tina", "name": "Tourist Tina", "x": 9, "y": 18, "sprite": "npc_silver",
         "dialogueId": "tourist_tina", "direction": "right",
         "schedule": {"dawn": {"x": 20, "y": 22}, "dusk": {"x": 21, "y": 12},
                      "late": {"x": 6, "y": 22}}},
        {"id": "bell_desk_bruno", "name": "Bell Desk Bruno", "x": 12, "y": 8, "sprite": "npc_teal",
         "dialogueId": "bell_desk_bruno_greet", "direction": "down"},
    ],
    "main_resort": [
        {"id": "pit_blackjack", "name": "Blackjack Pit", "x": 15, "y": 11, "sprite": "npc_green",
         "dialogueId": "pit_blackjack_greet", "zone": "blackjack", "encounter": "blackjack",
         "direction": "down", "sight": {"dir": "down", "range": 5}},
        {"id": "pit_holdem", "name": "Hold'em Pit", "x": 11, "y": 14, "sprite": "npc_teal",
         "dialogueId": "pit_holdem_greet", "zone": "holdem", "encounter": "holdem",
         "direction": "down"},
        {"id": "pit_roulette", "name": "Roulette Pit", "x": 19, "y": 14, "sprite": "npc_red",
         "dialogueId": "pit_roulette_greet", "zone": "roulette", "encounter": "roulette",
         "direction": "down"},
        {"id": "stickman_stan", "name": "Stickman Stan", "x": 11, "y": 10, "sprite": "npc_green",
         "dialogueId": "stickman_stan_greet", "challengeDialogueId": "stickman_stan_challenge",
         "encounter": "craps", "direction": "left", "sight": {"dir": "left", "range": 4}},
        {"id": "spinster_sal", "name": "Spinster Sal", "x": 24, "y": 14, "sprite": "npc_pink",
         "dialogueId": "spinster_sal_greet", "challengeDialogueId": "spinster_sal_challenge",
         "encounter": "slots_fortune", "direction": "left",
         "sight": {"dir": "left", "range": 4}, "schedule": {"dawn": {"x": 24, "y": 17}}},
        {"id": "cashier_carmen", "name": "Cashier Carmen", "x": 20, "y": 24, "sprite": "npc_gold",
         "dialogueId": "cashier_carmen_greet", "encounter": "cashier", "direction": "down"},
        {"id": "security_sam", "name": "Security Sam", "x": 15, "y": 6, "sprite": "npc_red",
         "dialogueId": "security_sam_greet", "direction": "down",
         "schedule": {"dawn": {"x": 11, "y": 6}, "midday": {"x": 20, "y": 19},
                      "dusk": {"x": 15, "y": 6}, "late": {"x": 8, "y": 22}}},
        {"id": "high_limit_host", "name": "High Limit Host", "x": 15, "y": 5, "sprite": "npc_gold",
         "dialogueId": "high_limit_host_greet", "encounter": "high_limit_salon",
         "direction": "down"},
        {"id": "shop_clerk", "name": "Shop Clerk", "x": 10, "y": 22, "sprite": "npc_pink",
         "dialogueId": "shop_clerk_greet", "encounter": "amenities", "direction": "down"},
    ],
    "casino_floor_south": [
        {"id": "pavilion_paula", "name": "Pavilion Paula", "x": 20, "y": 6, "sprite": "npc_pink",
         "dialogueId": "pavilion_paula_greet", "encounter": "horse_racing", "direction": "down"},
        {"id": "arena_alex", "name": "Arena Alex", "x": 12, "y": 6, "sprite": "npc_teal",
         "dialogueId": "arena_alex_greet", "encounter": "dressage", "direction": "down"},
        {"id": "slot_tech_tessa", "name": "Slot Tech Tessa", "x": 6, "y": 12, "sprite": "npc_orange",
         "dialogueId": "slot_tech_tessa_greet", "encounter": "slots", "direction": "right",
         "sight": {"dir": "right", "range": 4},
         "challengeDialogueId": "slot_tech_tessa_challenge"},
        {"id": "cocktail_cora", "name": "Cocktail Cora", "x": 15, "y": 23, "sprite": "npc_pink",
         "dialogueId": "cocktail_cora_greet", "encounter": "bar", "direction": "down",
         "schedule": {"dawn": {"x": 7, "y": 23}}},
    ],
    "race_sports_book": [
        {"id": "bookie_blake", "name": "Bookie Blake", "x": 15, "y": 8, "sprite": "npc_silver",
         "dialogueId": "bookie_blake_greet", "challengeDialogueId": "bookie_blake_challenge",
         "encounter": "sportsbook", "direction": "down",
         "sight": {"dir": "down", "range": 5}, "schedule": {"late": {"x": 8, "y": 21}}},
        {"id": "stable_hand_stu", "name": "Stable Hand Stu", "x": 24, "y": 20, "sprite": "npc_green",
         "dialogueId": "stable_hand_stu_greet", "encounter": "horse_stables", "direction": "left"},
    ],
    "high_limit_salon": [
        {"id": "salon_pit_boss", "name": "Salon Pit Boss", "x": 15, "y": 21, "sprite": "npc_gold",
         "dialogueId": "salon_pit_boss_greet", "encounter": "high_limit_salon", "direction": "down"},
        {"id": "salon_dealer", "name": "Salon Dealer", "x": 15, "y": 12, "sprite": "npc_green",
         "dialogueId": "salon_dealer_greet", "challengeDialogueId": "salon_dealer_challenge",
         "zone": "blackjack", "encounter": "blackjack", "direction": "down",
         "sight": {"dir": "down", "range": 6}},
        {"id": "salon_cage", "name": "Salon Cage", "x": 9, "y": 21, "sprite": "npc_silver",
         "dialogueId": "salon_cage_greet", "encounter": "cashier", "direction": "right"},
    ],
    "foundation_room": [
        {"id": "whale_whitney", "name": "Whale Whitney", "x": 11, "y": 14, "sprite": "npc_gold",
         "dialogueId": "whale_whitney_greet", "direction": "right"},
        {"id": "whale_warren", "name": "Whale Warren", "x": 20, "y": 14, "sprite": "npc_gold",
         "dialogueId": "whale_warren_greet", "challengeDialogueId": "whale_warren_challenge",
         "encounter": "slots_high_roller", "direction": "left",
         "sight": {"dir": "left", "range": 5}},
        {"id": "host_alexandra", "name": "Host Alexandra", "x": 15, "y": 8, "sprite": "npc_pink",
         "dialogueId": "host_alexandra_greet", "direction": "down"},
    ],
    "mandalay_place": [
        {"id": "boutique_bianca", "name": "Boutique Bianca", "x": 8, "y": 9, "sprite": "npc_pink",
         "dialogueId": "boutique_bianca_greet", "encounter": "shops", "direction": "right"},
        {"id": "bag_check_bev", "name": "Bag Check Bev", "x": 21, "y": 19, "sprite": "npc_silver",
         "dialogueId": "bag_check_bev_greet", "encounter": "mall_bag", "direction": "left"},
        {"id": "lottery_lena", "name": "Lottery Lena", "x": 8, "y": 19, "sprite": "npc_orange",
         "dialogueId": "lottery_lena_greet", "encounter": "lottery", "direction": "right"},
    ],
    "sky_bridge": [
        {"id": "busker_bo", "name": "Busker Bo", "x": 15, "y": 14, "sprite": "npc_orange",
         "dialogueId": "busker_bo_greet", "direction": "down",
         "sight": {"dir": "down", "range": 4}, "challengeDialogueId": "busker_bo_challenge"},
    ],
    "convention_center": [
        {"id": "badge_barry", "name": "Badge Barry", "x": 15, "y": 12, "sprite": "npc_teal",
         "dialogueId": "badge_barry_greet", "direction": "down"},
        {"id": "vendor_val", "name": "Vendor Val", "x": 9, "y": 18, "sprite": "npc_orange",
         "dialogueId": "vendor_val_greet", "encounter": "shops", "direction": "down"},
    ],
    "betty_bar": [
        {"id": "barkeep_betty", "name": "Barkeep Betty", "x": 15, "y": 8, "sprite": "npc_orange",
         "dialogueId": "barkeep_betty_greet", "encounter": "bar", "direction": "down",
         "schedule": {"dawn": {"x": 10, "y": 20}}},
        {"id": "regular_reggie", "name": "Regular Reggie", "x": 11, "y": 10, "sprite": "npc_silver",
         "dialogueId": "regular_reggie_greet", "direction": "right"},
    ],
    "skyfall_lounge": [
        {"id": "sommelier_sy", "name": "Sommelier Sy", "x": 15, "y": 10, "sprite": "npc_gold",
         "dialogueId": "sommelier_sy_greet", "encounter": "bar", "direction": "down"},
    ],
    "hotel_tower": [
        {"id": "clerk_carmen", "name": "Clerk Carmen", "x": 12, "y": 9, "sprite": "npc_pink",
         "dialogueId": "clerk_carmen_greet", "encounter": "hotel_front_desk", "direction": "down"},
        {"id": "concierge_cleo", "name": "Concierge Cleo", "x": 21, "y": 12, "sprite": "npc_teal",
         "dialogueId": "concierge_cleo_greet", "encounter": "guest_directory", "direction": "left"},
    ],
    "guest_corridor": [
        {"id": "housekeeper_hana", "name": "Housekeeper Hana", "x": 18, "y": 14,
         "sprite": "npc_green", "dialogueId": "housekeeper_hana_greet", "direction": "down",
         "sight": {"dir": "down", "range": 5},
         "challengeDialogueId": "housekeeper_hana_challenge",
         "schedule": {"late": {"x": 15, "y": 22}}},
        {"id": "hotel_room_door", "name": "Room 24-118", "x": 15, "y": 3, "sprite": "npc_gold",
         "dialogueId": "hotel_room_door", "encounter": "hotel_hallway", "direction": "down"},
        {"id": "neighbor_ned", "name": "Neighbor Ned", "x": 7, "y": 5, "sprite": "npc_silver",
         "dialogueId": "tourist_tina", "direction": "right"},
        {"id": "neighbor_nora", "name": "Neighbor Nora", "x": 23, "y": 5, "sprite": "npc_pink",
         "dialogueId": "tourist_tina", "direction": "left"},
    ],
    "guest_room": [
        {"id": "room_console", "name": "Room Console", "x": 15, "y": 12, "sprite": "npc_gold",
         "dialogueId": "room_console_greet", "encounter": "hotel_room", "direction": "down"},
        {"id": "minibar", "name": "Minibar", "x": 10, "y": 11, "sprite": "npc_orange",
         "dialogueId": "minibar_greet", "encounter": "hotel_dining", "direction": "down"},
    ],
    "delano_wing": [
        {"id": "delano_dana", "name": "Delano Dana", "x": 15, "y": 15, "sprite": "npc_silver",
         "dialogueId": "delano_dana_greet", "direction": "down"},
    ],
    "spa": [
        {"id": "spa_attendant_ash", "name": "Attendant Ash", "x": 15, "y": 22,
         "sprite": "npc_teal", "dialogueId": "spa_attendant_ash_greet", "direction": "down"},
    ],
    "mandalay_beach": [
        {"id": "lifeguard_lou", "name": "Lifeguard Lou", "x": 15, "y": 22, "sprite": "npc_teal",
         "dialogueId": "lifeguard_lou_greet", "challengeDialogueId": "lifeguard_lou_challenge",
         "encounter": "pool_wave", "direction": "down",
         "sight": {"dir": "down", "range": 4}, "schedule": {"late": {"x": 22, "y": 23}}},
        {"id": "shark_reef_guide", "name": "Reef Guide", "x": 6, "y": 12, "sprite": "npc_green",
         "dialogueId": "shark_reef_guide_greet", "direction": "right"},
    ],
    "cabana_row": [
        {"id": "cabana_curtis", "name": "Cabana Curtis", "x": 15, "y": 17, "sprite": "npc_orange",
         "dialogueId": "cabana_curtis_greet", "encounter": "pool_cabanas", "direction": "down"},
        {"id": "hot_tub_hal", "name": "Hot Tub Hal", "x": 15, "y": 12, "sprite": "npc_red",
         "dialogueId": "hot_tub_hal_greet", "encounter": "pool_hot_tubs", "direction": "up"},
    ],
    "beach_club": [
        {"id": "beach_dj", "name": "Beach DJ", "x": 15, "y": 17, "sprite": "npc_orange",
         "dialogueId": "beach_dj_greet", "encounter": "pool_beach_club", "direction": "up"},
    ],
    "rave_stage": [
        {"id": "rave_dj", "name": "Moonlight DJ", "x": 15, "y": 15, "sprite": "npc_pink",
         "dialogueId": "rave_dj_greet", "encounter": "pool_rave", "direction": "down",
         "sight": {"dir": "down", "range": 5}, "challengeDialogueId": "rave_dj_challenge"},
    ],
    "reef_tunnel": [
        {"id": "photo_kiosk", "name": "Photo Kiosk", "x": 10, "y": 15, "sprite": "npc_teal",
         "dialogueId": "photo_kiosk", "encounter": "pool_reef", "direction": "down"},
    ],
    "shark_reef": [
        {"id": "reef_docent", "name": "Reef Docent", "x": 15, "y": 21, "sprite": "npc_green",
         "dialogueId": "reef_docent_greet", "encounter": "pool_reef", "direction": "down"},
        {"id": "reef_dj", "name": "Reef DJ", "x": 6, "y": 12, "sprite": "npc_orange",
         "dialogueId": "reef_dj_greet", "direction": "right"},
    ],
    "house_of_blues": [
        {"id": "hob_stage", "name": "Stage Manager", "x": 15, "y": 16, "sprite": "npc_orange",
         "dialogueId": "hob_stage_greet", "encounter": "house_of_blues", "direction": "up"},
        {"id": "hob_bouncer", "name": "HOB Bouncer", "x": 6, "y": 15, "sprite": "npc_red",
         "dialogueId": "hob_bouncer_greet", "direction": "left"},
    ],
    "hob_green_room": [
        {"id": "hob_headliner", "name": "The Headliner", "x": 15, "y": 15, "sprite": "npc_pink",
         "dialogueId": "hob_headliner_greet", "direction": "down"},
    ],
    "ultra_arena": [
        {"id": "arena_usher", "name": "Arena Usher", "x": 15, "y": 22, "sprite": "npc_silver",
         "dialogueId": "arena_usher_greet", "direction": "down"},
        {"id": "merch_marge", "name": "Merch Marge", "x": 6, "y": 22, "sprite": "npc_pink",
         "dialogueId": "merch_marge_greet", "encounter": "shops", "direction": "up"},
    ],
    "staff_corridor": [
        {"id": "janitor_joe", "name": "Janitor Joe", "x": 15, "y": 14, "sprite": "npc_silver",
         "dialogueId": "janitor_joe_greet", "direction": "down"},
        {"id": "count_room_cal", "name": "Count Room Cal", "x": 8, "y": 14, "sprite": "npc_gold",
         "dialogueId": "count_room_cal_greet", "encounter": "bank", "direction": "right"},
    ],
    "mj_one_theatre": [
        {"id": "one_usher_ora", "name": "Usher Ora", "x": 15, "y": 22, "sprite": "npc_silver",
         "dialogueId": "one_usher_ora_greet", "encounter": "guest_directory", "direction": "up",
         "schedule": {"late": {"x": 20, "y": 22}}},
        {"id": "one_aerialist", "name": "The Aerialist", "x": 15, "y": 11, "sprite": "npc_pink",
         "dialogueId": "one_aerialist_greet", "challengeDialogueId": "one_aerialist_challenge",
         "encounter": "one_show", "direction": "down", "sight": {"dir": "down", "range": 5}},
        {"id": "one_merch_milo", "name": "Merch Milo", "x": 6, "y": 24, "sprite": "npc_orange",
         "dialogueId": "one_merch_milo_greet", "encounter": "shops", "direction": "down"},
    ],
    "minus5_icebar": [
        {"id": "ice_bartender_bex", "name": "Bartender Bex", "x": 15, "y": 9, "sprite": "npc_teal",
         "dialogueId": "ice_bartender_bex_greet", "encounter": "bar", "direction": "down"},
        {"id": "parka_pam", "name": "Parka Pam", "x": 20, "y": 15, "sprite": "npc_silver",
         "dialogueId": "parka_pam_greet", "encounter": "shops", "direction": "left"},
    ],
    "restaurant_row": [
        {"id": "maitre_d_marco", "name": "Maitre d' Marco", "x": 15, "y": 12, "sprite": "npc_gold",
         "dialogueId": "maitre_d_marco_greet", "encounter": "hotel_dining", "direction": "down",
         "schedule": {"late": {"x": 15, "y": 19}}},
        {"id": "grill_chef_gabi", "name": "Chef Gabi", "x": 8, "y": 9, "sprite": "npc_green",
         "dialogueId": "grill_chef_gabi_greet", "encounter": "amenities", "direction": "down"},
        {"id": "sommelier_sabine", "name": "Sommelier Sabine", "x": 22, "y": 20,
         "sprite": "npc_red", "dialogueId": "sommelier_sabine_greet",
         "challengeDialogueId": "sommelier_sabine_challenge",
         "encounter": "bar", "direction": "up", "sight": {"dir": "up", "range": 4}},
    ],
    "lazy_river": [
        {"id": "tube_wrangler_tony", "name": "Tube Wrangler Tony", "x": 15, "y": 14,
         "sprite": "npc_orange", "dialogueId": "tube_wrangler_tony_greet",
         "encounter": "pool_wave", "direction": "down"},
        {"id": "river_guard_rae", "name": "Lifeguard Rae", "x": 4, "y": 15, "sprite": "npc_red",
         "dialogueId": "river_guard_rae_greet", "encounter": "pool", "direction": "right",
         "schedule": {"late": {"x": 26, "y": 15}}},
    ],
    "tram_station": [
        {"id": "tram_conductor_cy", "name": "Conductor Cy", "x": 15, "y": 20,
         "sprite": "npc_teal", "dialogueId": "tram_conductor_cy_greet",
         "encounter": "guest_directory", "direction": "down"},
        {"id": "platform_pete", "name": "Platform Pete", "x": 22, "y": 6, "sprite": "npc_silver",
         "dialogueId": "platform_pete_greet", "direction": "down"},
    ],
}


def with_wing(spec: dict) -> dict:
    """Return the record with its wing slotted in just after the label."""
    record: dict = {}
    for key, value in spec.items():
        record[key] = value
        if key == "label":
            record["wing"] = WINGS.get(spec["id"], "Unsorted")
    return record


def main() -> int:
    MAPS.mkdir(parents=True, exist_ok=True)
    for old in MAPS.glob("*.json"):
        old.unlink()
    ids = []
    for spec in MAPS_SPEC:
        ids.append(spec["id"])
        (MAPS / f"{spec['id']}.json").write_text(
            json.dumps(with_wing(spec), indent=2, ensure_ascii=False) + "\n")
    (MAPS / "index.json").write_text(
        json.dumps({"maps": ids}, indent=2) + "\n")
    (DATA / "npcs.json").write_text(
        json.dumps(NPCS, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {len(ids)} maps and {sum(len(v) for v in NPCS.values())} NPCs")
    missing = set(NPCS) - set(ids)
    if missing:
        print("WARNING: npcs for unknown maps:", missing)
    empty = set(ids) - set(NPCS)
    if empty:
        print("maps with no NPCs:", empty)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
