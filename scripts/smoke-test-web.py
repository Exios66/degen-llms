#!/usr/bin/env python3
"""Headless walk of the web terminal and the pixel RPG.

Serves docs/ on a throwaway port, opens every terminal view via its deep link,
boots the RPG, and fails if the browser logged an error or a screen failed to
render. Run with: python3 scripts/smoke-test-web.py [--rpg-only|--terminal-only]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from smoke_test_helpers import free_port, serve  # noqa: E402

TERMINAL_VIEWS = [
    "hub", "floor", "cashier", "cashier-buy", "cashier-cashout", "cashier-ledger",
    "bank-account", "bank-deposit", "bank-expense", "bank-rename", "bank-ledger",
    "staff-manifest", "stats", "leave", "slots-menu", "sportsbook",
    "sportsbook-prediction", "sportsbook-settle", "high-limit-salon", "foundation-room",
    "blackjack-menu", "blackjack-custom", "holdem-menu", "roulette", "craps", "lottery",
    "horse-racing", "horse-racing-names", "horse-stables", "horse-stables-pasture",
    "horse-stables-stalls", "dressage", "jumper",
    "hotel-lobby", "hotel-front-desk", "hotel-dining", "casino-floor", "pool-complex",
]

MENU_PAGES = ["root", "trainer", "quests", "dex", "bag", "eggs", "completion", "options"]

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
    ("craps", "craps", [".action-bar .btn.primary"]),
    ("lottery", "lottery", [".lottery-ticket-card", ".action-bar .btn.primary"]),
    ("sportsbook", "sportsbook", [".menu-list li:nth-child(1) .menu-btn"]),
    ("horse-racing", "horse-racing", [".menu-list li:nth-child(1) .menu-btn"]),
    ("cashier", "cashier", [".menu-list li:nth-child(1) .menu-btn", ".btn.primary"]),
    ("hotel", "hotel-front-desk", [".menu-list li:nth-child(1) .menu-btn"]),
    ("pool", "pool-complex", [".menu-list li:nth-child(1) .menu-btn"]),
    ("amenities", "casino-floor", [".menu-list li:nth-child(1) .menu-btn"]),
    ("stake-tier", "floor", [".menu-list li:nth-child(1) .menu-btn", ".menu-list li:nth-child(2) .menu-btn"]),
]


SEED_SLOT = """async ([slotId, chips]) => {
  const core = await import('/js/core.js');
  const session = core.createSlot(slotId, { playerName: 'E2E', chips });
  session.ensureRpgState().archetype = 'high_roller';
  session.ensureRpgState().playerSprite = 'high_roller';
  core.saveSlot(session);
}"""

PLAYER_TILE = """() => {
  const s = window.__rpg.scene;
  return [Math.floor(s.player.x / 16), Math.floor(s.player.y / 16)];
}"""


def rpg_journey(page, base, failures: list[str], errors: list[str]) -> None:
    """One continuous playthrough: boot, walk, get challenged, check in, reload.

    This is the check that the pieces work together rather than one at a time —
    the per-encounter walk above already proves each screen renders on its own.
    """
    def step(name: str, ok: bool, detail: str = "") -> None:
        if not ok:
            failures.append(f"journey/{name}: {detail or 'failed'}")
        for err in errors:
            failures.append(f"journey/{name}: {err}")
        print(f"  journey/{name:<25} {'FAIL' if not ok or errors else 'ok'}")
        errors.clear()

    page.goto(f"{base}/index.html?guest=1", wait_until="load")
    page.evaluate(SEED_SLOT, [1, 250000])
    errors.clear()

    page.goto(f"{base}/rpg/index.html?slot=1&skipIntro=1", wait_until="load")
    page.wait_for_function("window.__rpgReady === true", timeout=20000)
    step("boot", page.evaluate("window.__rpg.session.slotId") == 1, "did not load slot 1")

    # Walk: hold a direction long enough for the physics body to cross a tile.
    start = page.evaluate(PLAYER_TILE)
    page.keyboard.down("ArrowUp")
    page.wait_for_timeout(900)
    page.keyboard.up("ArrowUp")
    page.wait_for_timeout(200)
    moved = page.evaluate(PLAYER_TILE)
    step("movement", moved != start, f"player never left {start}")

    # Line-of-sight challenge: stand in Valet Vic's cone and let update() see us.
    page.evaluate("""() => {
      const s = window.__rpg.scene;
      s.saveAdapter.updatePosition(15, 12, 'valet_garage');
      s._transitionMap('valet_garage', 15, 12, null);
    }""")
    page.wait_for_timeout(900)
    page.evaluate("""() => {
      const s = window.__rpg.scene;
      s.player.setPosition(15 * 16 + 8, 11 * 16 + 8);
    }""")
    page.wait_for_timeout(1200)
    challenged = page.evaluate(
        "() => Boolean(window.__rpg.saveAdapter.hasFlag('challenged_valet_vic')"
        " || window.__rpg.dialogue.isActive())")
    step("line_of_sight", challenged, "Valet Vic never noticed the player")
    page.evaluate("() => window.__rpg.dialogue.isActive() && window.__rpg.dialogue.close()")
    page.wait_for_timeout(200)

    page.evaluate("() => window.__rpg.menu.open()")
    page.wait_for_timeout(250)
    menu_text = page.inner_text("#menu-overlay")
    step("start_menu", "Trainer Card" in menu_text, "START menu did not render")
    page.evaluate("() => window.__rpg.menu.close()")
    page.wait_for_timeout(200)

    # Hotel check-in through the hosted front desk, exactly as the terminal does.
    page.evaluate("""async () => {
      const wc = await import('/js/world-cycle.js');
      wc.locateReservationViaPhone(window.__rpg.session);
      wc.confirmReservationAtDesk(window.__rpg.session);
      window.__rpg.saveAdapter.persist();
    }""")
    checked_in = page.evaluate("""async () => {
      const wc = await import('/js/world-cycle.js');
      return wc.canAccessHotelRoom(window.__rpg.session);
    }""")
    step("hotel_checkin", checked_in, "room access still denied after check-in")

    # Reload: position, map, and chips must all come back off the save slot.
    before = page.evaluate("""() => {
      const s = window.__rpg.scene;
      const tx = Math.floor(s.player.x / 16);
      const ty = Math.floor(s.player.y / 16);
      s.saveAdapter.updatePosition(tx, ty, s.currentMapId);
      s.saveAdapter.persist();
      return { x: tx, y: ty, mapId: s.currentMapId,
               chips: window.__rpg.session.wallet.balance };
    }""")
    page.goto(f"{base}/rpg/index.html?slot=1&skipIntro=1", wait_until="load")
    page.wait_for_function("window.__rpgReady === true", timeout=20000)
    after = page.evaluate("""() => {
      const rpg = window.__rpg.saveAdapter.rpg;
      return { x: rpg.x, y: rpg.y, mapId: rpg.mapId,
               chips: window.__rpg.session.wallet.balance };
    }""")
    step("reload", after == before, f"{before} restored as {after}")


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
            page.goto(
                f"{base}/rpg/index.html?guest=1&chips=250000&archetype=weekend_warrior",
                wait_until="load",
            )
            try:
                page.wait_for_function("window.__rpgReady === true", timeout=20000)
                print("  rpg/boot                          ok")
            except Exception as exc:  # noqa: BLE001
                failures.append(f"rpg boot: {exc}")
            for err in errors:
                failures.append(f"rpg: {err}")

            encounters = page.evaluate("window.__rpg.encounters.knownEncounters()")
            for encounter in encounters:
                errors.clear()
                page.evaluate(
                    """(id) => {
                        window.__rpgEncounterPromise = window.__rpg.encounters.start(id, {});
                    }""",
                    encounter,
                )
                page.wait_for_timeout(250)
                text = page.evaluate(
                    """() => {
                        const roots = ['terminal-overlay', 'blackjack-overlay', 'roulette-overlay',
                                       'holdem-overlay', 'rhythm-overlay'];
                        for (const id of roots) {
                          const el = document.getElementById(id);
                          if (el && !el.hidden) return el.innerText;
                        }
                        return '';
                    }"""
                )
                if len(text.strip()) < 10:
                    failures.append(f"rpg encounter {encounter}: nothing rendered")
                page.evaluate(
                    """() => {
                        window.__rpg.terminalHost?.isActive() && window.__rpg.terminalHost.close();
                        for (const o of Object.values(window.__rpg.encounters.overlays)) {
                          if (o?.isActive?.()) o.close();
                        }
                    }"""
                )
                page.wait_for_timeout(120)
                for err in errors:
                    failures.append(f"rpg encounter {encounter}: {err}")
                print(f"  rpg/encounter/{encounter:<24} {'FAIL' if errors else 'ok'}")

            for page_id in MENU_PAGES:
                errors.clear()
                page.evaluate("(p) => { window.__rpg.menu.close(); window.__rpg.menu.open(p); }", page_id)
                page.wait_for_timeout(150)
                text = page.inner_text("#menu-overlay")
                if len(text.strip()) < 10:
                    failures.append(f"rpg menu {page_id}: nothing rendered")
                for err in errors:
                    failures.append(f"rpg menu {page_id}: {err}")
                print(f"  rpg/menu/{page_id:<29} {'FAIL' if errors else 'ok'}")
            page.evaluate("() => window.__rpg.menu.close()")

            rpg_journey(page, base, failures, errors)

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
