#!/usr/bin/env python3
"""Headless walk of the web terminal and the pixel RPG.

Serves docs/ on a throwaway port, opens every terminal view via its deep link,
boots the RPG, and fails if the browser logged an error or a screen failed to
render. Run with: python3 scripts/smoke-test-web.py [--rpg-only|--terminal-only]
"""
from __future__ import annotations

import argparse
import functools
import http.server
import socket
import socketserver
import sys
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"

TERMINAL_VIEWS = [
    "hub", "floor", "cashier", "cashier-buy", "cashier-cashout", "cashier-ledger",
    "bank-account", "bank-deposit", "bank-expense", "bank-rename", "bank-ledger",
    "staff-manifest", "stats", "leave", "slots-menu", "sportsbook",
    "sportsbook-prediction", "sportsbook-settle", "high-limit-salon", "foundation-room",
    "blackjack-menu", "blackjack-custom", "holdem-menu", "roulette",
    "horse-racing", "horse-racing-names", "horse-stables", "horse-stables-pasture",
    "horse-stables-stalls", "dressage", "jumper",
    "hotel-lobby", "hotel-front-desk", "hotel-dining", "casino-floor", "pool-complex",
]

IGNORED = (
    "favicon",
    "ERR_CONNECTION",
    "Failed to load resource: net::ERR",
    "AudioContext",
)

# Interaction walks: (name, entry view, [selectors to click in order]).
# Each selector is clicked if present; the walk fails on a browser error.
TERMINAL_FLOWS = [
    ("slots", "slots-menu", [".slot-machine-card", ".slot-spin-btn, .btn.primary"]),
    ("blackjack", "blackjack-menu", [".menu-list li:nth-child(1) .menu-btn"]),
    ("holdem", "holdem-menu", [".menu-list li:nth-child(1) .menu-btn"]),
    ("roulette", "roulette", [".menu-list li:nth-child(1) .menu-btn"]),
    ("sportsbook", "sportsbook", [".menu-list li:nth-child(1) .menu-btn"]),
    ("horse-racing", "horse-racing", [".menu-list li:nth-child(1) .menu-btn"]),
    ("cashier", "cashier", [".menu-list li:nth-child(1) .menu-btn", ".btn.primary"]),
    ("hotel", "hotel-front-desk", [".menu-list li:nth-child(1) .menu-btn"]),
    ("pool", "pool-complex", [".menu-list li:nth-child(1) .menu-btn"]),
    ("amenities", "casino-floor", [".menu-list li:nth-child(1) .menu-btn"]),
    ("stake-tier", "floor", [".menu-list li:nth-child(1) .menu-btn", ".menu-list li:nth-child(2) .menu-btn"]),
]


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def serve(port: int) -> socketserver.TCPServer:
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(DOCS))
    httpd = socketserver.ThreadingTCPServer(("127.0.0.1", port), handler)
    httpd.daemon_threads = True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--terminal-only", action="store_true")
    parser.add_argument("--rpg-only", action="store_true")
    args = parser.parse_args()

    from playwright.sync_api import sync_playwright

    port = free_port()
    httpd = serve(port)
    base = f"http://127.0.0.1:{port}"
    failures: list[str] = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page()
        errors: list[str] = []
        page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}")
                if m.type == "error" and not any(i in m.text for i in IGNORED) else None)
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))

        if not args.rpg_only:
            for view in TERMINAL_VIEWS:
                errors.clear()
                page.goto(f"{base}/index.html?guest=1&chips=250000&view={view}", wait_until="load")
                page.wait_for_function("window.__casinoReady === true", timeout=15000)
                body = page.inner_text("#app")
                if "WRONG FLOOR" in body:
                    failures.append(f"{view}: rendered 404 screen")
                if len(body.strip()) < 20:
                    failures.append(f"{view}: rendered empty screen")
                for err in errors:
                    failures.append(f"{view}: {err}")
                print(f"  terminal/{view:<26} {'FAIL' if errors else 'ok'}")

        if not args.rpg_only:
            for name, view, selectors in TERMINAL_FLOWS:
                errors.clear()
                page.goto(f"{base}/index.html?guest=1&chips=250000&view={view}", wait_until="load")
                page.wait_for_function("window.__casinoReady === true", timeout=15000)
                for selector in selectors:
                    node = page.query_selector(selector)
                    if node:
                        node.click()
                        page.wait_for_timeout(400)
                for err in errors:
                    failures.append(f"flow:{name}: {err}")
                print(f"  flow/{name:<30} {'FAIL' if errors else 'ok'}")

        if not args.terminal_only:
            errors.clear()
            page.goto(f"{base}/rpg/index.html?guest=1&chips=250000", wait_until="load")
            try:
                page.wait_for_function("window.__rpgReady === true", timeout=20000)
                print("  rpg/boot                          ok")
            except Exception as exc:  # noqa: BLE001
                failures.append(f"rpg boot: {exc}")
            for err in errors:
                failures.append(f"rpg: {err}")

        browser.close()
    httpd.shutdown()

    if failures:
        print("\nFAILURES:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nAll smoke checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
