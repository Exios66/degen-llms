#!/usr/bin/env python3
"""Boot-smoke the staged, bundled GitHub Pages site (docs/ + site/ bundles).

Mirrors the bundling step that sync-gh-pages.sh applies to gh-pages, then boots
both entry pages from the staged tree and pins the two properties the bundles
are for: both pages reach ready, and the module-request waterfall is gone.

Run: .venv/bin/python scripts/smoke-test-site-bundle.py
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from smoke_test_helpers import free_port, serve  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

failures: list[str] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    print(f"  {'ok' if ok else 'FAIL'} {'site-bundle/' + name}" + (f" — {detail}" if detail else ""))
    if not ok:
        failures.append(name)


def main() -> int:
    npx = shutil.which("npx")
    if npx is None:
        print("skipped: bundle smoke requires npx (esbuild)")
        return 0

    staged = Path(tempfile.mkdtemp(prefix="site-bundle-smoke-"))
    try:
        shutil.copytree(ROOT / "docs", staged / "docs")
        result = subprocess.run(
            ["bash", str(ROOT / "scripts" / "build-site-bundles.sh"), str(staged / "docs")],
            capture_output=True, text=True, timeout=600,
        )
        if result.returncode != 0:
            print(f"FAIL site-bundle/build — {result.stdout}\n{result.stderr}")
            return 1
        index = (staged / "docs" / "index.html").read_text()
        rpg_index = (staged / "docs" / "rpg" / "index.html").read_text()
        check("terminal-entry-rewired", 'src="site/js/app.js' in index)
        check("rpg-entry-rewired", 'src="../site/rpg/js/main.js' in rpg_index)
        check(
            "stylesheets-combined",
            'site/css/casino-combined.css' in index
            and '<link rel="stylesheet" href="css/' not in index
            and '../site/css/rpg-combined.css' in rpg_index
            and '<link rel="stylesheet" href="../css/' not in rpg_index,
        )
        check(
            "runtime-data-mirrored",
            (staged / "docs" / "site" / "data" / "sports_scenarios.json").is_file()
            and (staged / "docs" / "site" / "assets").is_dir(),
        )

        port = free_port()
        serve(port, staged / "docs")
        base = f"http://127.0.0.1:{port}"
        with sync_playwright() as p:
            browser = p.chromium.launch(args=["--disable-webgl", "--mute-audio"])
            for label, url, ready, max_scripts in [
                ("terminal", f"{base}/index.html", "window.__casinoReady === true", 12),
                ("rpg", f"{base}/rpg/index.html?guest=1&chips=250000&archetype=high_roller",
                 "window.__rpgReady === true", 75),
            ]:
                page = browser.new_page()
                errors: list[str] = []
                page.on("pageerror", lambda e: errors.append(str(e)[:240]))
                script_requests: list[str] = []
                page.on(
                    "request",
                    lambda r, _reqs=script_requests: (_reqs.append(r.url) if r.resource_type == "script" else None),
                )
                page.goto(url, wait_until="load")
                page.wait_for_function(ready, timeout=60000)
                check(f"{label}-boot", len(errors) == 0, "; ".join(errors)[:240])
                check(
                    f"{label}-script-requests",
                    len(script_requests) <= max_scripts,
                    f"{len(script_requests)} script requests (limit {max_scripts})",
                )
                page.close()
            browser.close()
    finally:
        shutil.rmtree(staged, ignore_errors=True)

    if failures:
        print(f"site-bundle smoke FAILED: {', '.join(failures)}")
        return 1
    print("site-bundle smoke passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
