#!/usr/bin/env python3
"""Thorough audit of the casino site: pages, terminal views, phones, RPG world.

Three modes:

    .venv/bin/python scripts/audit-site.py                # local docs/
    .venv/bin/python scripts/audit-site.py --stage        # local docs/ + bundles
    .venv/bin/python scripts/audit-site.py --base-url https://exios66.github.io/degen-llms/

Checks, in order:
  1. every HTML page and every internal href/src it references (HTTP status)
  2. every terminal view via its deep link
  3. every scripted terminal interaction flow
  4. the terminal Rewards Phone: tabs, Comps/Offers/Perks, contacts, thread
     choice, call screen, and close
  5. every RPG map (scene transition), every menu page, every encounter
  6. the RPG Rewards Phone on a desktop and a phone viewport

Fails on same-origin 4xx/5xx, page errors, console errors, or empty screens.
"""

from __future__ import annotations

import argparse
import importlib.util
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from smoke_test_helpers import free_port, serve  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

_spec = importlib.util.spec_from_file_location("smoke_web", ROOT / "scripts" / "smoke-test-web.py")
smoke = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(smoke)

# Deep links the smoke walk does not open: pool zones, save/title screens,
# and the themed not-found screen.
EXTRA_VIEWS = [
    "pool-wave", "pool-hot-tubs", "pool-cabanas", "pool-reef", "pool-beach-club",
    "pool-rave", "pool-events", "title-intro", "save-picker", "save-create",
    "save-delete", "not-found",
]
TERMINAL_VIEWS = smoke.TERMINAL_VIEWS + EXTRA_VIEWS
TERMINAL_FLOWS = smoke.TERMINAL_FLOWS
MENU_PAGES = smoke.MENU_PAGES
IGNORED = smoke.IGNORED
BASE_QUERY = "guest=1&chips=250000"

PAGES = ["index.html", "rpg/index.html", "404.html", "maintenance.html", "offline.html"]
PHONE_TABS = ["Home", "Connect", "Room", "Inbox", "Card"]

failures: list[str] = []
warnings: list[str] = []
checks = 0


def check(name: str, ok: bool, detail: str = "") -> None:
    global checks
    checks += 1
    print(f"  {'ok' if ok else 'FAIL'} {name}" + (f" — {detail}" if detail and not ok else ""), flush=True)
    if not ok:
        failures.append(f"{name}: {detail}" if detail else name)


class PageErrors:
    """Collect page errors, console errors, and same-origin request failures."""

    def __init__(self, page, origin: str):
        self.page = page
        self.origin = origin
        self.errors: list[str] = []
        page.on("pageerror", lambda e: self.errors.append(f"pageerror: {e}"))
        page.on(
            "console",
            lambda m: self.errors.append(f"console.{m.type}: {m.text}")
            if m.type == "error" and not any(i in m.text for i in IGNORED)
            else None,
        )
        page.on("requestfailed", self._request_failed)
        page.on("response", self._response)

    def _request_failed(self, request) -> None:
        if not request.url.startswith(self.origin):
            return
        self.errors.append(f"requestfailed: {request.url} ({request.failure})")

    def _response(self, response) -> None:
        if response.status >= 400 and response.url.startswith(self.origin):
            self.errors.append(f"http {response.status}: {response.url}")

    def clear(self) -> None:
        self.errors.clear()

    def drain(self, label: str) -> None:
        for error in self.errors:
            failures.append(f"{label}: {error}")
        self.errors.clear()


# --------------------------------------------------------------------------- HTTP


def http_status(url: str) -> int:
    for method in ("HEAD", "GET"):
        request = urllib.request.Request(url, method=method, headers={"User-Agent": "site-audit"})
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                return response.status
        except urllib.error.HTTPError as exc:
            if exc.code == 405 and method == "HEAD":
                continue
            return exc.code
        except (urllib.error.URLError, TimeoutError, OSError):
            if method == "GET":
                return 0
    return 0


LINK_RE = re.compile(r'(?:href|src)="([^"#]+)(?:#[^"]*)?"')
CSS_URL_RE = re.compile(r"url\(\s*['\"]?([^'\")]+)['\"]?\s*\)")


def crawl_links(base: str) -> None:
    """Check every internal href/src reachable from the site's HTML pages."""
    print("\n[1/6] pages and linked assets")
    origin = urllib.parse.urlparse(base).netloc
    seen: set[str] = set()
    targets: dict[str, str] = {}  # url -> referring page
    for page_path in PAGES:
        page_url = urllib.parse.urljoin(base + "/", page_path)
        try:
            with urllib.request.urlopen(page_url, timeout=20) as response:
                status = response.status
                html = response.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as exc:
            check(f"page/{page_path}", False, f"HTTP {exc.code}")
            continue
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            check(f"page/{page_path}", False, str(exc))
            continue
        check(f"page/{page_path}", status == 200 and len(html) > 200, f"HTTP {status}, {len(html)} bytes")
        for raw in LINK_RE.findall(html):
            raw = raw.strip()
            if not raw or raw.startswith(("http://", "https://", "//", "mailto:", "tel:", "javascript:", "data:")):
                continue
            url = urllib.parse.urljoin(page_url, raw)
            parsed = urllib.parse.urlparse(url)
            if parsed.netloc != origin:
                continue
            clean = urllib.parse.urlunparse(parsed._replace(query="", fragment=""))
            if clean not in seen:
                seen.add(clean)
                targets[clean] = page_path
    for url, referrer in sorted(targets.items()):
        status = http_status(url)
        label = urllib.parse.urlparse(url).path.split("/degen-llms/")[-1] or "/"
        check(f"asset/{label}", status == 200, f"HTTP {status} (linked from {referrer})")


# ----------------------------------------------------------------------- terminal


def static_pages(browser, base: str) -> None:
    """Load the auxiliary HTML pages and check they render without errors."""
    print("\n[1b/6] auxiliary pages in the browser")
    page = browser.new_page()
    errors = PageErrors(page, base)
    for page_path in ("404.html", "maintenance.html", "offline.html"):
        errors.clear()
        page.goto(urllib.parse.urljoin(base + "/", page_path), wait_until="load")
        page.wait_for_timeout(500)
        body = page.inner_text("body")
        check(f"page-browser/{page_path}", len(body.strip()) >= 40,
              f"empty page ({len(body.strip())} chars)")
        errors.drain(f"page/{page_path}")
    page.close()


def terminal_views(browser, base: str) -> None:
    print("\n[2/6] terminal views")
    page = browser.new_page()
    errors = PageErrors(page, base)
    for view in TERMINAL_VIEWS:
        errors.clear()
        try:
            page.goto(f"{base}/index.html?{BASE_QUERY}&view={view}", wait_until="load")
            page.wait_for_function("window.__casinoReady === true", timeout=30000)
            body = page.inner_text("#app")
            if view == "not-found":
                check(f"view/{view}", "WRONG FLOOR" in body, "not-found view did not render")
            else:
                check(f"view/{view}", "WRONG FLOOR" not in body and len(body.strip()) >= 20,
                      "404 screen" if "WRONG FLOOR" in body
                      else f"empty screen ({len(body.strip())} chars)")
        except Exception as exc:  # noqa: BLE001
            check(f"view/{view}", False, str(exc)[:200])
        errors.drain(f"view/{view}")
    page.close()


def terminal_flows(browser, base: str) -> None:
    print("\n[3/6] terminal flows")
    page = browser.new_page()
    errors = PageErrors(page, base)
    for name, view, selectors in TERMINAL_FLOWS:
        errors.clear()
        try:
            page.goto(f"{base}/index.html?{BASE_QUERY}&view={view}", wait_until="load")
            page.wait_for_function("window.__casinoReady === true", timeout=30000)
            smoke.walk_terminal_flow(page, name, selectors)
            body = page.inner_text("#app")
            check(f"flow/{name}", len(body.strip()) >= 20, "empty screen after clicks")
        except Exception as exc:  # noqa: BLE001
            check(f"flow/{name}", False, str(exc)[:200])
        errors.drain(f"flow/{name}")
    page.close()


def click_selector(page, selector: str) -> bool:
    """Click a selector, retrying when the phone re-render detaches the node.

    While open, RewardsPhone.sync() can rebuild the LCD on the HUD's timer;
    a handle captured a moment earlier is then detached before the click. A
    real user waits and clicks again, so the audit does the same.
    """
    for _ in range(4):
        node = page.query_selector(selector)
        if node is None:
            return False
        try:
            node.click(timeout=1500)
            return True
        except Exception:  # noqa: BLE001 — detached mid-click; retry
            page.wait_for_timeout(150)
    return False


PHONE_VISIBLE = """() => {
  const root = document.querySelector('.rewards-phone-root');
  const phone = document.querySelector('.rewards-phone');
  if (!root || !phone || phone.hidden) return null;
  const r = phone.getBoundingClientRect();
  return {
    open: root.classList.contains('is-open'),
    top: r.top, left: r.left, bottom: r.bottom, right: r.right,
    vw: window.innerWidth, vh: window.innerHeight,
    body: (phone.querySelector('.rewards-lcd-body')?.innerText || '').trim(),
  };
}"""


def drive_phone(page, label: str, errors: PageErrors) -> None:
    """Open the Rewards Phone and walk every screen it exposes."""
    check(f"{label}/fab", page.query_selector(".rewards-phone-fab") is not None)
    if not click_selector(page, ".rewards-phone-fab"):
        check(f"{label}/fab-click", False, "could not click the FAB")
        return
    page.wait_for_timeout(250)
    state = page.evaluate(PHONE_VISIBLE)
    check(f"{label}/opens", bool(state and state["open"]), f"phone state {state}")
    check(f"{label}/home-renders", bool(state and len(state["body"]) >= 20), "empty home screen")
    check(
        f"{label}/in-viewport",
        bool(state) and state["top"] >= -1 and state["left"] >= -1
        and state["bottom"] <= state["vh"] + 1 and state["right"] <= state["vw"] + 1,
        f"phone rect {state}",
    )

    for tab in PHONE_TABS:
        selector = f".rewards-lcd-nav .rewards-tab:text-is('{tab}')"
        check(f"{label}/tab-{tab.lower()}", page.query_selector(selector) is not None, "tab missing")
        if not click_selector(page, selector):
            check(f"{label}/tab-{tab.lower()}-click", False, "could not click the tab")
            continue
        page.wait_for_timeout(200)
        state = page.evaluate(PHONE_VISIBLE)
        check(f"{label}/tab-{tab.lower()}-renders", bool(state and len(state["body"]) >= 10),
              f"body {state['body'][:60] if state else None!r}")
        errors.drain(f"{label}/tab-{tab.lower()}")

    # Home shortcuts: Comps / Offers / Perks.
    home_tab = ".rewards-lcd-nav .rewards-tab:text-is('Home')"
    click_selector(page, home_tab)
    page.wait_for_timeout(150)
    for screen in ("Comps", "Offers", "Perks"):
        # Each shortcut leaves the home screen; return before querying the next.
        click_selector(page, home_tab)
        page.wait_for_timeout(120)
        selector = f".rewards-home-actions button:text-is('{screen}')"
        check(f"{label}/shortcut-{screen.lower()}", page.query_selector(selector) is not None,
              "shortcut missing")
        if not click_selector(page, selector):
            check(f"{label}/shortcut-{screen.lower()}-click", False, "could not click the shortcut")
            continue
        page.wait_for_timeout(200)
        state = page.evaluate(PHONE_VISIBLE)
        check(f"{label}/shortcut-{screen.lower()}-renders", bool(state and len(state["body"]) >= 10))
        errors.drain(f"{label}/shortcut-{screen.lower()}")

    # Sound controls should not throw (headless audio is muted at launch).
    click_selector(page, home_tab)
    page.wait_for_timeout(150)
    if page.query_selector(".rewards-sound-toggle"):
        click_selector(page, ".rewards-sound-toggle")
        page.wait_for_timeout(150)
        click_selector(page, ".rewards-sound-toggle")
        page.wait_for_timeout(150)
    check(f"{label}/sound-toggle", True)
    errors.drain(f"{label}/sound-toggle")

    # Connect → first contact → thread → a dialogue/text choice → call → leave.
    click_selector(page, ".rewards-lcd-nav .rewards-tab:text-is('Connect')")
    page.wait_for_timeout(200)
    contact = page.query_selector(".rewards-contact-row")
    if contact is None:
        warnings.append(f"{label}: no unlocked contacts in this session; thread/call walk skipped")
    else:
        click_selector(page, ".rewards-contact-row")
        page.wait_for_timeout(200)
        state = page.evaluate(PHONE_VISIBLE)
        check(f"{label}/thread-renders", bool(state and len(state["body"]) >= 10), "empty thread")
        if page.query_selector(".rewards-dialogue-choice"):
            click_selector(page, ".rewards-dialogue-choice")
            page.wait_for_timeout(250)
        if page.query_selector(".rewards-text-options button"):
            click_selector(page, ".rewards-text-options button")
            page.wait_for_timeout(250)
        check(f"{label}/thread-choice", True)
        errors.drain(f"{label}/thread")

        call_selector = ".rewards-thread-actions button:text-is('📞 Call')"
        if page.query_selector(call_selector):
            click_selector(page, call_selector)
            page.wait_for_timeout(600)
            state = page.evaluate(PHONE_VISIBLE)
            check(f"{label}/call-screen", bool(state and len(state["body"]) >= 5), "call screen empty")
            # Tab switch hangs the call up; use it as the real exit path.
            click_selector(page, ".rewards-lcd-nav .rewards-tab:text-is('Home')")
            page.wait_for_timeout(300)
            errors.drain(f"{label}/call")
        else:
            warnings.append(f"{label}: no call button on this contact; call walk skipped")

    click_selector(page, ".rewards-lcd-close button")
    page.wait_for_timeout(150)
    state = page.evaluate(PHONE_VISIBLE)
    check(f"{label}/closes", not state, f"phone still visible: {state}")


def terminal_phone(browser, base: str) -> None:
    print("\n[4/6] terminal rewards phone (desktop + phone viewport)")
    for label, viewport in (("phone", {"width": 1280, "height": 900}),
                            ("phone-mobile", {"width": 390, "height": 844})):
        page = browser.new_page(viewport=viewport)
        errors = PageErrors(page, base)
        page.goto(f"{base}/index.html?{BASE_QUERY}&view=casino-floor", wait_until="load")
        page.wait_for_function("window.__casinoReady === true", timeout=30000)

        # The P shortcut is the casino-floor path to the phone.
        page.keyboard.press("p")
        page.wait_for_timeout(250)
        opened = page.evaluate(PHONE_VISIBLE)
        check(f"{label}/shortcut-p-opens", bool(opened and opened["open"]), f"state {opened}")
        if opened and opened["open"]:
            page.keyboard.press("p")
            page.wait_for_timeout(200)
            check(f"{label}/shortcut-p-closes", not page.evaluate(PHONE_VISIBLE))
        if page.evaluate("() => Boolean(document.querySelector('.rewards-phone-root.is-open'))"):
            page.evaluate("() => document.querySelector('.rewards-lcd-close button')?.click()")
            page.wait_for_timeout(150)

        drive_phone(page, label, errors)
        errors.drain(label)
        page.close()


# ---------------------------------------------------------------------------- RPG


def rpg_ready(page, base: str) -> bool:
    page.goto(f"{base}/rpg/index.html?{BASE_QUERY}&archetype=high_roller", wait_until="load")
    page.wait_for_function("window.__rpgReady === true", timeout=60000)
    return True


def rpg_maps(browser, base: str) -> None:
    print("\n[5/6] RPG maps, menus, encounters")
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    errors = PageErrors(page, base)
    try:
        rpg_ready(page, base)
        check("rpg/boot", True)
    except Exception as exc:  # noqa: BLE001
        check("rpg/boot", False, str(exc)[:200])
        page.close()
        return
    errors.drain("rpg/boot")

    map_ids = page.evaluate(
        """async () => (await (await fetch('js/data/maps/index.json')).json()).maps"""
    )
    for map_id in map_ids:
        errors.clear()
        try:
            page.evaluate(
                "(id) => window.__rpg.scene._transitionMap(id, 15, 20, null)", map_id
            )
            page.wait_for_timeout(700)
            current = page.evaluate("() => window.__rpg.scene?.currentMapId")
            canvas = page.query_selector("#phaser-root canvas")
            check(f"map/{map_id}", current == map_id and canvas is not None,
                  f"scene on {current}, canvas {bool(canvas)}")
        except Exception as exc:  # noqa: BLE001
            check(f"map/{map_id}", False, str(exc)[:200])
        errors.drain(f"map/{map_id}")

    for menu_id in MENU_PAGES:
        errors.clear()
        page.evaluate("(id) => { window.__rpg.menu.close(); window.__rpg.menu.open(id); }", menu_id)
        page.wait_for_timeout(200)
        text = page.inner_text("#menu-overlay")
        check(f"menu/{menu_id}", len(text.strip()) >= 10, f"{len(text.strip())} chars")
        errors.drain(f"menu/{menu_id}")
    page.evaluate("() => window.__rpg.menu.close()")

    encounters = page.evaluate("window.__rpg.encounters.knownEncounters()")
    for encounter in encounters:
        errors.clear()
        try:
            page.evaluate("(id) => { window.__rpg.encounters.start(id, {}); }", encounter)
            page.wait_for_timeout(300)
            text = page.evaluate(smoke.VISIBLE_OVERLAY_TEXT)
            if "Stake Tier" in text:
                page.click("#terminal-overlay .menu-list li:nth-child(1) .menu-btn")
                page.wait_for_timeout(400)
                text = page.evaluate(smoke.VISIBLE_OVERLAY_TEXT)
            # Venue-gated bars legitimately open no overlay without a stake.
            gated = {"bar_foundation", "bar_velvet", "bar_beach_club"}
            if len(text.strip()) < 10 and encounter in gated:
                check(f"encounter/{encounter}", True)
            else:
                check(f"encounter/{encounter}", len(text.strip()) >= 10, "nothing rendered")
        except Exception as exc:  # noqa: BLE001
            check(f"encounter/{encounter}", False, str(exc)[:200])
        page.evaluate(
            """() => {
                window.__rpg.terminalHost?.isActive() && window.__rpg.terminalHost.close();
                for (const key of ["diningOverlay", "barOverlay", "poolOverlay"]) {
                  const o = window.__rpg.encounters[key];
                  if (o?.active) o.close();
                }
                for (const o of Object.values(window.__rpg.encounters.overlays)) {
                  if (o?.isActive?.()) o.close();
                }
            }"""
        )
        page.wait_for_timeout(120)
        errors.drain(f"encounter/{encounter}")
    page.close()


def rpg_phone(browser, base: str) -> None:
    print("\n[6/6] RPG rewards phone (desktop + phone viewport)")
    for label, viewport in (("rpg-phone", {"width": 1280, "height": 900}),
                            ("rpg-phone-mobile", {"width": 390, "height": 844})):
        context = browser.new_context(viewport=viewport)
        page = context.new_page()
        errors = PageErrors(page, base)
        try:
            rpg_ready(page, base)
            errors.drain(f"{label}/boot")
            # Dismiss the intro overlay so the phone FAB is free.
            page.evaluate(
                """() => {
                  window.__rpg.dialogue?.close?.();
                  document.getElementById('intro-overlay')?.remove?.();
                  document.getElementById('touch-pad')?.classList.remove('touch-pad--hidden');
                }"""
            )
            page.wait_for_timeout(200)
            drive_phone(page, label, errors)
            errors.drain(label)
        except Exception as exc:  # noqa: BLE001
            check(label, False, str(exc)[:200])
        context.close()


# --------------------------------------------------------------------------- main


def stage_docs() -> tuple[Path, tempfile.TemporaryDirectory]:
    temp = tempfile.TemporaryDirectory(prefix="site-audit-")
    staged = Path(temp.name) / "docs"
    shutil.copytree(ROOT / "docs", staged)
    subprocess.run(
        ["bash", str(ROOT / "scripts" / "build-site-bundles.sh"), str(staged)],
        check=True, capture_output=True, text=True,
    )
    return staged, temp


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", help="audit a deployed site instead of a local tree")
    parser.add_argument("--stage", action="store_true", help="build the Pages bundles and audit them")
    parser.add_argument("--terminal-only", action="store_true")
    parser.add_argument("--rpg-only", action="store_true")
    args = parser.parse_args()

    httpd = None
    temp = None
    if args.base_url:
        base = args.base_url.rstrip("/")
    else:
        docs = ROOT / "docs"
        if args.stage:
            docs, temp = stage_docs()
        port = free_port()
        httpd = serve(port, docs)
        base = f"http://127.0.0.1:{port}"

    print(f"Auditing {base}")
    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=["--disable-webgl", "--mute-audio"])
        if not args.rpg_only:
            crawl_links(base)
            static_pages(browser, base)
            terminal_views(browser, base)
            terminal_flows(browser, base)
            terminal_phone(browser, base)
        if not args.terminal_only:
            rpg_maps(browser, base)
            rpg_phone(browser, base)
        browser.close()

    if httpd is not None:
        httpd.shutdown()
    if temp is not None:
        temp.cleanup()

    print(f"\n{checks} checks, {len(failures)} failure(s), {len(warnings)} warning(s)")
    for warning in warnings:
        print(f"  ! {warning}")
    if failures:
        print("\nFAILURES:")
        for failure in failures:
            print(f"  - {failure}")
        return 1
    print("Site audit passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
