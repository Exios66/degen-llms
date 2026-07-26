#!/usr/bin/env python3
"""Capture before/after RPG art screenshots across several representative rooms."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from smoke_test_helpers import free_port, serve  # noqa: E402

OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "/tmp/rpg-art-shots")
TAG = sys.argv[1] if len(sys.argv) > 1 else "shot"

ROOMS = [
    # (mapId, x, y) — spawn points chosen to frame the named surfaces.
    ("main_resort", 15, 26),      # carpet, felt, vip, lobby, path, trim, slot, screen, bar, plant
    ("mandalay_beach", 15, 10),   # sand, water
    ("spa", 15, 10),              # spa, water
    ("shark_reef", 20, 15),       # aqua, glass, water
    ("strip_sidewalk", 15, 15),   # road, sand
]


def main() -> int:
    from playwright.sync_api import sync_playwright

    OUT.mkdir(parents=True, exist_ok=True)
    port = free_port()
    httpd = serve(port)
    base = f"http://127.0.0.1:{port}"
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 960, "height": 720}, device_scale_factor=2)
        page.goto(f"{base}/rpg/index.html?guest=1&chips=250000&archetype=high_roller", wait_until="load")
        page.wait_for_function("window.__rpgReady === true", timeout=20000)
        page.wait_for_timeout(400)
        for mapId, x, y in ROOMS:
            page.evaluate(
                "([m,x,y]) => { window.__rpg.scene._transitionMap(m, x, y); }",
                [mapId, x, y],
            )
            page.wait_for_timeout(700)
            page.evaluate("() => { window.__rpg.scene.cameras.main.setZoom(2); }")
            page.wait_for_timeout(150)
            out_path = OUT / f"{TAG}_{mapId}.png"
            page.screenshot(path=str(out_path))
            print(f"wrote {out_path}")
        browser.close()
    httpd.shutdown()
    return 0


if __name__ == "__main__":
    sys.exit(main())
