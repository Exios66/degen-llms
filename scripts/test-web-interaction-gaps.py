#!/usr/bin/env python3
"""Browser regressions for interaction gaps the walkthrough suites leave open.

Covers three confirmed defects:
  * the Konami easter egg was unreachable because Phaser drops keydowns for
    captured arrow keys (the overworld now tracks it on the window event);
  * save creation accepted negative/huge starting chips and threw an uncaught
    ChipWallet error instead of rejecting the form;
  * the RPG's hosted High Limit Salon offered blackjack, hold'em, and roulette
    entries the host had no renderer for, so the screen closed instantly.

Run with: python3 scripts/test-web-interaction-gaps.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from smoke_test_helpers import free_port, serve  # noqa: E402

IGNORED = ("favicon", "ERR_CONNECTION", "Failed to load resource: net::ERR", "AudioContext")


def main() -> int:
    from playwright.sync_api import sync_playwright

    port = free_port()
    httpd = serve(port)
    base = f"http://127.0.0.1:{port}"
    failures: list[str] = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=["--disable-webgl"])

        def new_page():
            context = browser.new_context()
            page = context.new_page()
            errors: list[str] = []
            page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}")
                    if m.type == "error" and not any(i in m.text for i in IGNORED) else None)
            page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
            return context, page, errors

        def step(name: str, ok: bool, detail: str, errors: list[str]) -> None:
            for err in errors:
                failures.append(f"{name}: {err}")
            if not ok:
                failures.append(f"{name}: {detail}")
            print(f"  gap/{name:<28} {'FAIL' if not ok or errors else 'ok'}")
            errors.clear()

        # ── Konami egg: real arrow-key presses must reach the tracker ────────
        context, page, errors = new_page()
        page.goto(f"{base}/rpg/index.html?guest=1&chips=500000&archetype=high_roller", wait_until="load")
        page.wait_for_function("window.__rpgReady === true", timeout=20000)
        page.wait_for_timeout(1500)
        page.evaluate("() => { const d = window.__rpg.dialogue; if (d.isActive()) d.close(); }")
        for key in ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft",
                    "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"]:
            page.keyboard.press(key)
            page.wait_for_timeout(40)
        eggs = page.evaluate("() => Object.keys(window.__rpg.session.ensureRpgState().eggs ?? {})")
        step("konami-discovers-egg", "konami_mode" in eggs, f"eggs={eggs}", errors)
        page.evaluate("() => { window.__rpg.menu.close(); window.__rpg.menu.open('eggs'); }")
        page.wait_for_timeout(150)
        secrets = page.inner_text("#menu-overlay")
        step("konami-secrets-page", "Retro palette" in secrets, "Secrets page did not reveal the egg", errors)
        context.close()

        # ── Save creation rejects out-of-range starting chips ────────────────
        context, page, errors = new_page()
        dialogs: list[str] = []
        page.on("dialog", lambda d: (dialogs.append(d.message), d.dismiss()))
        page.goto(f"{base}/index.html?slot=5&new=1", wait_until="load")
        page.wait_for_function("window.__casinoReady === true")
        page.locator("input[type=number]").fill("-50")
        page.click("button:has-text('Create & enter casino')")
        page.wait_for_timeout(250)
        title = page.locator("#app .banner h1").inner_text()
        step("save-rejects-negative",
             title.startswith("New Save") and any("Starting chips" in d for d in dialogs),
             f"title={title!r} dialogs={dialogs}", errors)

        dialogs.clear()
        page.locator("input[type=number]").fill("999999999")
        page.click("button:has-text('Create & enter casino')")
        page.wait_for_timeout(250)
        title = page.locator("#app .banner h1").inner_text()
        step("save-rejects-infinite-roll",
             title.startswith("New Save") and bool(dialogs),
             f"title={title!r} dialogs={dialogs}", errors)

        dialogs.clear()
        page.locator("input[type=number]").fill("2500")
        page.click("button:has-text('Create & enter casino')")
        page.wait_for_timeout(350)
        text = page.inner_text("#app")
        step("save-accepts-valid-range",
             "Floor chips: $2,500" in text and not dialogs,
             f"dialogs={dialogs} text={text[:80]!r}", errors)
        page.evaluate("async () => { const core = await import('/js/core.js'); core.deleteSlot(5); }")
        context.close()

        # ── RPG hosted salon tables must render, not close the screen ───────
        context, page, errors = new_page()
        page.goto(f"{base}/rpg/index.html?guest=1&chips=500000&archetype=high_roller", wait_until="load")
        page.wait_for_function("window.__rpgReady === true", timeout=20000)
        page.wait_for_timeout(1500)
        page.evaluate("() => { const d = window.__rpg.dialogue; if (d.isActive()) d.close(); }")

        for index, label in [(1, "blackjack-menu"), (2, "holdem-menu"), (3, "roulette"), (4, "craps")]:
            page.evaluate("() => { const h = window.__rpg.terminalHost; if (h.isActive()) h.close(); }")
            page.evaluate("() => { window.__rpg.encounters.start('high_limit_salon', {}); }")
            page.wait_for_timeout(400)
            page.locator("#terminal-overlay .menu-list li").nth(index - 1).locator(".menu-btn").click()
            page.wait_for_timeout(400)
            active = page.evaluate("() => window.__rpg.terminalHost.isActive()")
            view = page.evaluate("() => window.__rpg.terminalHost.views.current()?.name")
            step(f"salon-{label}", active and view == label, f"host active={active} view={view!r}", errors)

        # Mid-hand EXIT settles teardown without leaving a live table behind.
        page.evaluate("() => { const h = window.__rpg.terminalHost; if (h.isActive()) h.close(); }")
        page.evaluate("() => { window.__rpg.encounters.start('high_limit_salon', {}); }")
        page.wait_for_timeout(400)
        page.locator("#terminal-overlay .menu-list li").nth(0).locator(".menu-btn").click()
        page.wait_for_timeout(400)
        if page.locator("#terminal-overlay button:has-text('Quick hand')").count():
            page.click("#terminal-overlay button:has-text('Quick hand')")
            page.wait_for_timeout(300)
        if page.locator("#terminal-overlay button:has-text('Deal')").count():
            page.click("#terminal-overlay button:has-text('Deal')")
            page.wait_for_timeout(250)
        page.click("#terminal-overlay .terminal-host-exit")
        page.wait_for_timeout(400)
        leftovers = page.evaluate(
            "() => ({ active: window.__rpg.terminalHost.isActive(),"
            " game: Boolean(window.__rpg.terminalHost.runtime.blackjackGame) })")
        step("salon-blackjack-teardown",
             leftovers == {"active": False, "game": False}, str(leftovers), errors)

        # Roulette mid-spin EXIT resolves the pending spin exactly once.
        page.evaluate("() => { window.__rpg.encounters.start('high_limit_salon', {}); }")
        page.wait_for_timeout(400)
        page.locator("#terminal-overlay .menu-list li").nth(2).locator(".menu-btn").click()
        page.wait_for_timeout(400)
        page.click("#terminal-overlay .action-bar .btn.primary")
        page.wait_for_timeout(80)
        page.click("#terminal-overlay .terminal-host-exit")
        page.wait_for_timeout(500)
        roulette = page.evaluate("""() => {
          const r = window.__rpg.terminalHost.runtime.roulette;
          return { spinning: r.spinning, pending: r.pendingSpin,
                   plays: window.__rpg.session.activityStats.roulette?.handsOrBets ?? 0 };
        }""")
        step("salon-roulette-teardown",
             roulette["spinning"] is False and roulette["pending"] is None and roulette["plays"] == 1,
             str(roulette), errors)

        # Hotel room phone must not navigate to the terminal-only Strip screen.
        page.evaluate("""async () => {
          const wc = await import('/js/world-cycle.js');
          wc.locateReservationViaPhone(window.__rpg.session);
          wc.confirmReservationAtDesk(window.__rpg.session);
          const hotel = window.__rpg.session.hotel;
          hotel.reachedRoom = true;
          hotel.roomKeyActive = true;
          window.__rpg.saveAdapter.persist();
        }""")
        page.evaluate("() => { window.__rpg.encounters.start('hotel_room', {}); }")
        page.wait_for_timeout(450)
        page.click("#terminal-overlay button:has-text('Room phone')")
        page.wait_for_timeout(300)
        page.click("#terminal-overlay button:has-text('Call limo / private driver')")
        page.wait_for_timeout(400)
        room_phone = page.evaluate("""() => ({
          active: window.__rpg.terminalHost.isActive(),
          view: window.__rpg.terminalHost.views.current()?.name,
          text: document.getElementById('terminal-overlay').innerText,
        })""")
        step("room-phone-limo-stays",
             room_phone["active"] and room_phone["view"] == "hotel-room-phone"
             and "Private driver" in room_phone["text"],
             f"active={room_phone['active']} view={room_phone['view']!r}", errors)
        page.evaluate("() => { const h = window.__rpg.terminalHost; if (h.isActive()) h.close(); }")

        browser.close()
        context.close()

    httpd.shutdown()
    if failures:
        print("\nFAILURES:")
        for failure in failures:
            print(f"  - {failure}")
        return 1
    print("\nAll interaction-gap regressions passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
