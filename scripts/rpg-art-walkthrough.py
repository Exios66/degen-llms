#!/usr/bin/env python3
"""Short walkthrough video: casino → beach (water anim) → strip."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from smoke_test_helpers import free_port, serve  # noqa: E402

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "/opt/cursor/artifacts/rpg_pixel_art_walkthrough.webm")


def tap(page, key: str, hold_ms: int = 130) -> None:
    page.keyboard.down(key)
    page.wait_for_timeout(hold_ms)
    page.keyboard.up(key)
    page.wait_for_timeout(40)


def main() -> int:
    from playwright.sync_api import sync_playwright

    OUT.parent.mkdir(parents=True, exist_ok=True)
    port = free_port()
    httpd = serve(port)
    base = f"http://127.0.0.1:{port}"
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        context = browser.new_context(
            viewport={"width": 960, "height": 720},
            device_scale_factor=2,
            record_video_dir=str(OUT.parent / "_vids"),
            record_video_size={"width": 960, "height": 720},
        )
        page = context.new_page()
        page.goto(f"{base}/rpg/index.html?guest=1&chips=250000&archetype=high_roller", wait_until="load")
        page.wait_for_function("window.__rpgReady === true", timeout=20000)
        page.wait_for_timeout(400)
        page.evaluate("() => { window.__rpg.scene.cameras.main.setZoom(1.6); }")
        page.wait_for_timeout(700)
        for _ in range(8):
            tap(page, "ArrowUp")
        page.wait_for_timeout(350)
        page.evaluate("() => { window.__rpg.scene._transitionMap('mandalay_beach', 15, 12); }")
        page.wait_for_timeout(1200)
        page.wait_for_timeout(2000)  # water frames cycle
        for key in ("ArrowRight", "ArrowRight", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowLeft"):
            tap(page, key, 150)
        page.wait_for_timeout(500)
        page.evaluate("() => { window.__rpg.scene._transitionMap('strip_sidewalk', 15, 12); }")
        page.wait_for_timeout(1200)
        for _ in range(6):
            tap(page, "ArrowDown")
        page.wait_for_timeout(700)
        video = page.video
        page.close()
        context.close()
        browser.close()
        if not video:
            print("no video captured", file=sys.stderr)
            httpd.shutdown()
            return 1
        src = Path(video.path())
        dest = OUT if OUT.suffix else OUT.with_suffix(".webm")
        src.replace(dest)
        print(f"wrote {dest}")
    httpd.shutdown()
    return 0


if __name__ == "__main__":
    sys.exit(main())
