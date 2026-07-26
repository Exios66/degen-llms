#!/usr/bin/env python3
"""Author the character sheet manifest the RPG uses to recolour Jephed sprites.

The vendored sheets (docs/rpg/assets/characters/staff/) are indexed pixel art:
each character is drawn from ~30 colours, and the same skin, denim and outline
colours recur across the pack. Sorting those colours into skin / hair / outfit /
legs ramps is what lets the game repaint a sheet at runtime, so one sheet can
serve as the player's customisable body and as several distinct guests.

The ramps below were read off the art (front frame for skin, back-of-head frame
for hair) and are checked against the PNGs on every run, so a typo or a swapped
asset fails here instead of silently leaving a character half-painted.

Usage: python3 scripts/_author_sprites.py
"""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parent.parent
ART = REPO / "docs/rpg/assets/characters/staff"
# A module rather than JSON: the title screen and dialogue portraits draw
# characters synchronously, before any fetch of js/data/ could have resolved.
OUT = REPO / "docs/rpg/js/data/character-sheets.js"

FRAME = {"w": 20, "h": 32, "cols": 3, "rows": 4}
ROW_FOR_DIR = {"down": 0, "left": 1, "right": 2, "up": 3}
IDLE_COL = 1
WALK_COLS = [0, 1, 2]

# Colours every sheet shares for outlines, eye whites and mouths. They stay put
# through a recolour so eyes keep reading as eyes whatever palette is applied.
FIXED = ["#0f0b00", "#ffffff", "#000000"]

# region -> hex list, roughly light to dark (the runtime re-sorts by luminance).
# "player" marks sheets offered as a body in the wardrobe: they need a clean
# skin/hair split and clothing generic enough to take any colour.
SHEETS: dict[str, dict] = {
    "jennifer": {
        "file": "dealer_jennifer.png",
        "label": "Bob cut",
        "player": True,
        "skin": ["#fbd2bc", "#ebc1a8", "#c6a086", "#916443", "#7e695e", "#766054", "#5c432f"],
        "hair": ["#828282", "#5e5e5e", "#444444", "#262626"],
        "outfit": ["#8acad1", "#5f95b0", "#447086", "#24384f"],
        "legs": ["#70778d", "#656565", "#636280", "#555a6a", "#53556a", "#464646",
                 "#404553", "#373746", "#2c2d37", "#201d2e"],
    },
    "judi": {
        "file": "dealer_judi.png",
        "label": "Afro",
        "player": True,
        "skin": ["#ba8162", "#a56b4c", "#7f452d", "#682c24", "#5d4031", "#3f1b16"],
        "hair": ["#c8c8c8", "#8b8b8b", "#606060", "#2d2d2d"],
        "outfit": ["#ff6167", "#cc2d45", "#87172f"],
        "legs": ["#636280", "#53556a", "#373746", "#2c2d37", "#201d2e"],
    },
    "meryl": {
        "file": "dealer_meryl.png",
        "label": "Beard",
        "player": True,
        "skin": ["#fec7b6", "#f2b6a5", "#e58c7a", "#a94727", "#7f645b", "#795b52", "#80341c"],
        "hair": ["#d28a55", "#a26133", "#884013", "#571f00"],
        "outfit": ["#c9c9c9", "#989898", "#626262"],
        "legs": ["#5461bd", "#414c9a", "#242e72", "#1b224f",
                 "#70778d", "#555a6a", "#404553", "#2c2d37"],
    },
    "nicole": {
        "file": "dealer_nicole.png",
        "label": "Visitor",
        "player": False,
        "skin": ["#85d87f", "#6cba62", "#4ca561", "#2d7f4c", "#246840", "#163f2b"],
        "hair": ["#c8c8c8", "#8b8b8b", "#606060", "#2d2d2d"],
        "outfit": ["#4a4f5f", "#303238", "#000000"],
        "legs": ["#5461bd", "#414c9a", "#242e72", "#1b224f"],
    },
    "octavia": {
        "file": "dealer_octavia.png",
        "label": "Lab coat",
        "player": False,
        "skin": ["#fec7b6", "#f2b6a5", "#e58c7a", "#a94727", "#80341c",
                 "#7f645b", "#e3c6ac", "#c09c80", "#542414"],
        "hair": ["#85d2a5", "#49af73", "#24904e", "#036225"],
        "outfit": ["#c9c9c9", "#989898", "#626262"],
        "legs": ["#5461bd", "#414c9a", "#242e72", "#1b224f",
                 "#70778d", "#555a6a", "#404553", "#2c2d37"],
    },
    "sofia": {
        "file": "dealer_sofia.png",
        "label": "Shaved",
        "player": True,
        "skin": ["#ffd49b", "#e3ac7d", "#d59e61", "#b77f4f", "#8f563b", "#793125"],
        "hair": [],
        "outfit": ["#ededed", "#c9c9c9", "#989898", "#626262"],
        "legs": ["#bd5954", "#9a4441", "#722624", "#4f1d1b"],
    },
    "steve": {
        "file": "dealer_steve.png",
        "label": "Apron",
        "player": True,
        "skin": ["#e3ac7d", "#d59e61", "#b77f4f", "#793125", "#72563e"],
        "hair": ["#d28a55", "#a26133", "#884013", "#571f00", "#260711"],
        "outfit": ["#ff6167", "#cc2d45", "#87172f"],
        "legs": ["#636280", "#53556a", "#373746", "#2c2d37", "#201d2e"],
    },
    "gold": {
        "file": "npc_gold.png",
        "label": "Curls",
        "player": True,
        "skin": ["#ba8162", "#a56b4c", "#7f452d", "#682c24", "#3f1b16"],
        "hair": ["#6c4f40", "#5e5e5e", "#5d4031", "#523626", "#444444",
                 "#402216", "#341612", "#262626"],
        "outfit": ["#ff6167", "#cc2d45", "#87172f", "#631212"],
        "legs": ["#a4aabc", "#70778d", "#555a6a", "#404553", "#2c2d37"],
    },
    "green": {
        "file": "npc_green.png",
        "label": "Monochrome",
        "player": False,
        "skin": ["#cfcfcf", "#b7b7b7", "#989898", "#737373"],
        "hair": ["#c8c8c8", "#8b8b8b", "#686868", "#606060", "#5c5c5c", "#4c4c4c", "#2d2d2d"],
        "outfit": ["#717584", "#4a4f5f", "#434343", "#303238"],
        "legs": ["#70778d", "#636280", "#555a6a", "#53556a",
                 "#404553", "#373746", "#2c2d37", "#201d2e", "#000000"],
    },
    "orange": {
        "file": "npc_orange.png",
        "label": "Peaked cap",
        "player": False,
        "skin": ["#ba8162", "#a56b4c", "#7f452d", "#682c24", "#3f1b16"],
        "hair": ["#5d4031", "#523626", "#402216", "#341612", "#200e0b", "#0b0b0b"],
        "outfit": ["#75759d", "#5d5d79", "#49495e", "#39384c"],
        "legs": ["#70778d", "#636280", "#555a6a", "#53556a",
                 "#404553", "#373746", "#2c2d37", "#201d2e"],
    },
    "pink": {
        "file": "npc_pink.png",
        "label": "Long hair",
        "player": True,
        "skin": ["#e3ac7d", "#d59e61", "#b77f4f", "#793125", "#72563e"],
        "hair": ["#e88ebf", "#cf408f", "#b80d70", "#6e0043"],
        "outfit": ["#717584", "#4a4f5f", "#303238"],
        "legs": ["#5461bd", "#414c9a", "#242e72", "#1b224f",
                 "#70778d", "#555a6a", "#404553", "#2c2d37", "#000000"],
    },
    "red": {
        "file": "npc_red.png",
        "label": "Jacket",
        "player": True,
        "skin": ["#ba8162", "#a56b4c", "#7f452d", "#682c24", "#5d4031", "#3f1b16", "#200e0b"],
        "hair": ["#828282", "#5e5e5e", "#523626", "#444444", "#413232",
                 "#402216", "#341612", "#262626", "#201919"],
        "outfit": ["#ff6167", "#cc2d45", "#87172f"],
        "legs": ["#636280", "#53556a", "#373746", "#2c2d37", "#201d2e"],
    },
    "silver": {
        "file": "npc_silver.png",
        "label": "Windbreaker",
        "player": True,
        "skin": ["#fbd2bc", "#ebc1a8", "#c6a086", "#916443", "#7e695e", "#5c432f"],
        "hair": ["#d68283", "#b44446", "#951f25", "#650008"],
        "outfit": ["#5f95b0", "#447086", "#24384f"],
        "legs": ["#636280", "#53556a", "#373746", "#2c2d37", "#201d2e"],
    },
    "teal": {
        "file": "npc_teal.png",
        "label": "Swim ring",
        "player": False,
        "skin": ["#e3ac7d", "#d59e61", "#b77f4f", "#793125", "#72563e", "#6a4f30", "#5c4028"],
        "hair": ["#d1d086", "#aeac4a", "#8f8a25", "#615a04"],
        "outfit": ["#ff6167", "#cc2d45", "#87172f"],
        "legs": ["#636280", "#53556a", "#373746", "#201d2e"],
    },
}

REGIONS = ("skin", "hair", "outfit", "legs")


def sheet_colors(path: Path) -> Counter:
    im = Image.open(path).convert("RGBA")
    return Counter(im.getpixel((x, y))[:3]
                   for y in range(im.height)
                   for x in range(im.width)
                   if im.getpixel((x, y))[3] > 0)


def to_rgb(h: str) -> tuple[int, int, int]:
    return tuple(int(h[i : i + 2], 16) for i in (1, 3, 5))


def main() -> int:
    manifest = {
        "frame": FRAME,
        "rowForDir": ROW_FOR_DIR,
        "idleCol": IDLE_COL,
        "walkCols": WALK_COLS,
        "fixed": FIXED,
        "sheets": {},
    }
    problems: list[str] = []

    for sheet_id, spec in SHEETS.items():
        path = ART / spec["file"]
        if not path.exists():
            problems.append(f"{sheet_id}: missing art {path}")
            continue
        present = sheet_colors(path)
        seen: dict[str, str] = {}

        for region in REGIONS:
            for hexv in spec.get(region, []):
                rgb = to_rgb(hexv)
                if rgb not in present:
                    problems.append(f"{sheet_id}.{region}: {hexv} is not in {spec['file']}")
                if hexv in seen:
                    problems.append(
                        f"{sheet_id}: {hexv} claimed by both {seen[hexv]} and {region}"
                    )
                seen[hexv] = region

        manifest["sheets"][sheet_id] = {
            "file": f"staff/{spec['file']}",
            "label": spec["label"],
            "player": spec["player"],
            **{region: list(spec.get(region, [])) for region in REGIONS},
        }

    if problems:
        for p in problems:
            print(f"ERROR {p}")
        return 1

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        "// Generated by scripts/_author_sprites.py — do not edit by hand.\n"
        "// Colour ramps for the vendored Jephed character sheets, used to\n"
        "// repaint a sheet into the player's chosen look or a distinct guest.\n"
        "export const CHARACTER_SHEETS = "
        + json.dumps(manifest, indent=2)
        + ";\n"
    )

    bodies = [s for s, v in SHEETS.items() if v["player"]]
    covered = sum(
        sum(len(v.get(r, [])) for r in REGIONS) for v in SHEETS.values()
    )
    print(f"wrote {OUT.relative_to(REPO)}")
    print(f"  {len(SHEETS)} sheets, {covered} classified colours, {len(bodies)} player bodies")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
