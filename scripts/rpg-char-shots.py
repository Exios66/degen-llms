#!/usr/bin/env python3
"""Render individual RPG character textures at high zoom for close inspection."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from smoke_test_helpers import free_port, serve  # noqa: E402

OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "/tmp/rpg-char-shots")
TAG = sys.argv[1] if len(sys.argv) > 1 else "shot"

KEYS = ["player_fair_black_tuxedo_down", "npc_pink", "npc_gold", "npc_teal"]


def main() -> int:
    from playwright.sync_api import sync_playwright

    OUT.mkdir(parents=True, exist_ok=True)
    port = free_port()
    httpd = serve(port)
    base = f"http://127.0.0.1:{port}"
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 360, "height": 500}, device_scale_factor=1)
        page.goto(f"{base}/rpg/index.html?guest=1&chips=250000&archetype=high_roller", wait_until="load")
        page.wait_for_function("window.__rpgReady === true", timeout=20000)
        page.wait_for_timeout(500)
        for key in KEYS:
            ok = page.evaluate(
                """(key) => {
                    const scene = window.__rpg.scene;
                    if (!scene || !scene.textures.exists(key)) return false;
                    const src = scene.textures.get(key).getSourceImage();
                    const c = document.createElement('canvas');
                    const zoom = 10;
                    c.width = src.width * zoom;
                    c.height = src.height * zoom;
                    c.id = '__shot_canvas__';
                    c.style.position = 'fixed';
                    c.style.left = '0';
                    c.style.top = '0';
                    c.style.zIndex = '999999';
                    c.style.imageRendering = 'pixelated';
                    c.style.background = '#39c5cf';
                    document.body.appendChild(c);
                    const ctx = c.getContext('2d');
                    ctx.imageSmoothingEnabled = false;
                    ctx.fillStyle = '#39c5cf';
                    ctx.fillRect(0, 0, c.width, c.height);
                    ctx.drawImage(src, 0, 0, c.width, c.height);
                    return true;
                }""",
                key,
            )
            if not ok:
                print(f"MISSING texture {key}")
                continue
            el = page.query_selector("#__shot_canvas__")
            out_path = OUT / f"{TAG}_{key}.png"
            el.screenshot(path=str(out_path))
            page.evaluate("() => document.getElementById('__shot_canvas__')?.remove()")
            print(f"wrote {out_path}")
        browser.close()
    httpd.shutdown()
    return 0


if __name__ == "__main__":
    sys.exit(main())
