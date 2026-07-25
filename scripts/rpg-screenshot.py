#!/usr/bin/env python3
"""Capture RPG screenshots (overworld + a hosted terminal screen) for review."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from smoke_test_helpers import free_port, serve  # noqa: E402

OUT = Path("/tmp/rpg-shots")


def main() -> int:
    from playwright.sync_api import sync_playwright

    OUT.mkdir(parents=True, exist_ok=True)
    port = free_port()
    httpd = serve(port)
    base = f"http://127.0.0.1:{port}"
    shots = [
        ("overworld", None),
        ("hotel", "hotel"),
        ("slots", "slots_fortune"),
        ("sportsbook", "sportsbook"),
        ("menu", "__menu__"),
    ]
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1100, "height": 800})
        page.goto(f"{base}/rpg/index.html?guest=1&chips=250000&archetype=high_roller", wait_until="load")
        page.wait_for_function("window.__rpgReady === true", timeout=20000)
        for name, encounter in shots:
            if encounter == "__menu__":
                page.evaluate("() => { window.__rpg.menu?.open(); }")
            elif encounter:
                page.evaluate("(id) => { window.__rpg.encounters.start(id, {}); }", encounter)
            page.wait_for_timeout(900)
            page.screenshot(path=str(OUT / f"{name}.png"))
            page.evaluate(
                """() => {
                    window.__rpg.menu?.isActive?.() && window.__rpg.menu.close();
                    window.__rpg.terminalHost?.isActive() && window.__rpg.terminalHost.close();
                }"""
            )
            page.wait_for_timeout(200)
            print(f"wrote {OUT / f'{name}.png'}")
        browser.close()
    httpd.shutdown()
    return 0


if __name__ == "__main__":
    sys.exit(main())
