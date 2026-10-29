#!/usr/bin/env python3
"""Runtime performance harness for docs/js and docs/rpg/js.

Serves the docs tree plus an in-memory harness page (no files added to docs/),
drives the real modules in Chromium, and prints a JSON report of the costs this
sweep targets:

  hud      — renderHud() cost and DOM churn per no-op update
  phone    — RewardsPhone.sync() cost and DOM churn while the phone is open
  animKey  — per-frame playerAnimKey() work in OverworldScene._applyPlayerAnim
  ticker   — market ticker interval cost and DOM churn per 700 ms tick
  intervals— live 20 Hz timers left behind by the Tip Cascade minigame
  saves    — localStorage write amplification per saveSlot() call

Every timing is the median of several trials of `n` calls, so the report is
stable enough to diff before/after a change.

Usage:
  python scripts/perf-runtime-check.py [--docs DIR] [--json OUT]
"""
from __future__ import annotations

import argparse
import functools
import http.server
import json
import socket
import socketserver
import threading
from pathlib import Path

HARNESS = """<!doctype html>
<html><head><meta charset="utf-8"><title>perf harness</title></head>
<body><div id="sandbox"></div></body></html>
"""


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def do_GET(self):  # noqa: N802
        if self.path.split("?")[0] == "/__perf.html":
            body = HARNESS.encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()


MEASURE_JS = r"""
async () => {
  const out = {};
  const now = () => performance.now();
  const median = (xs) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  /** Median per-call cost across 5 trials of n calls. */
  const bench = (fn, n = 100) => {
    for (let i = 0; i < Math.min(n, 20); i++) fn();
    const trials = [];
    for (let t = 0; t < 5; t++) {
      const t0 = now();
      for (let i = 0; i < n; i++) fn();
      trials.push((now() - t0) / n);
    }
    return median(trials);
  };
  /** DOM churn caused by run(): mutation records and created/removed nodes. */
  const churn = (root, run) => {
    let records = 0;
    let nodes = 0;
    const tally = (list) => {
      for (const r of list) {
        records += 1;
        for (const n of r.addedNodes) if (n.nodeType === 1) nodes += 1;
        for (const n of r.removedNodes) if (n.nodeType === 1) nodes += 1;
      }
    };
    const obs = new MutationObserver(tally);
    obs.observe(root, { subtree: true, childList: true, characterData: true, attributes: true });
    run();
    tally(obs.takeRecords());
    obs.disconnect();
    return { records, nodes };
  };
  const sandbox = document.getElementById("sandbox");
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // --- renderHud -----------------------------------------------------------
  {
    const { renderHud } = await import("/rpg/js/scenes/TitleScreen.js");
    const { PlayerSession } = await import("/js/core.js");
    const session = new PlayerSession({ playerName: "Perf", chips: 12345 });
    session.ensureRpgState();
    let chips = "$12,345";
    const saveAdapter = {
      session,
      get rpg() { return session.rpg; },
      hudLines: () => ({ name: session.playerName, chips, slot: "Slot 1" }),
    };
    const questManager = { badges: () => [] };
    const root = document.createElement("div");
    root.id = "hud";
    sandbox.appendChild(root);
    renderHud(root, saveAdapter, questManager);
    const ms = bench(() => renderHud(root, saveAdapter, questManager));
    const noop = churn(root, () => renderHud(root, saveAdapter, questManager));
    // A real state change must still land.
    chips = "$999";
    renderHud(root, saveAdapter, questManager);
    out.hud = {
      msPerCall: +ms.toFixed(4),
      nodesPerNoOpCall: noop.nodes,
      recordsPerNoOpCall: noop.records,
      reflectsChange: root.textContent.includes("$999"),
    };
    root.remove();
  }

  // --- RewardsPhone.sync() -------------------------------------------------
  {
    const { RewardsPhone } = await import("/js/RewardsPhone.js");
    const { PlayerSession } = await import("/js/core.js");
    const session = new PlayerSession({ playerName: "Perf", chips: 5000 });
    session.slotId = 1;
    session.slotLabel = "Slot 1";
    const host = document.createElement("div");
    sandbox.appendChild(host);
    const phone = new RewardsPhone(host, session, {});
    phone.open("home");
    const lcd = host.querySelector(".rewards-lcd");
    const ms = bench(() => phone.sync(), 60);
    const noop = churn(lcd, () => phone.sync());
    out.phone = {
      msPerSync: +ms.toFixed(4),
      nodesPerNoOpSync: noop.nodes,
      recordsPerNoOpSync: noop.records,
      lcdNodes: lcd.querySelectorAll("*").length,
    };
    phone.destroy();
    host.remove();
  }

  // --- per-frame animation key work ---------------------------------------
  {
    // OverworldScene._applyPlayerAnim rebuilds the look + anim key on every
    // frame it runs while walking.
    const { playerAnimKey } = await import("/rpg/js/systems/TextureFactory.js");
    const { normalizeAppearance } = await import("/rpg/js/systems/CharacterAppearance.js");
    const appearance = normalizeAppearance({
      archetype: "high_roller",
      appearance: { skin: "fair", hair: "teal", outfit: "teal" },
    });
    const perCall = bench(() => playerAnimKey({ appearance }, "left", true), 5000);
    out.animKey = { msPerFrame: +perCall.toFixed(6), key: playerAnimKey({ appearance }, "left", true) };
  }

  // --- market ticker fixed-frequency work ----------------------------------
  {
    const { mountMarketTicker } = await import("/js/marketTicker.js");
    const { loadTradingCatalog } = await import("/js/tradingDesk.js");
    const shell = await import("/js/ui/shell.js");
    const catalog = await loadTradingCatalog();
    const host = document.createElement("div");
    host.className = "market-ticker-host";
    sandbox.appendChild(host);
    const realSet = window.setInterval.bind(window);
    const realClear = window.clearInterval.bind(window);
    let tickMs = 0;
    let tickCalls = 0;
    // Time only the 700 ms price tick; the 4.5 s chart rotation is a different
    // interval and would skew the average.
    window.setInterval = (fn, ms) => realSet(() => {
      const t0 = now();
      try { fn(); } finally {
        if (ms === 700) { tickMs += now() - t0; tickCalls += 1; }
      }
    }, ms);
    const ticker = mountMarketTicker(host, catalog, { el: shell.el, assetClass: "all" });
    const tape = host.querySelector(".market-ticker__tape");
    await sleep(2600);
    // Time the tick with no observer attached: a MutationObserver on 88 tape
    // items would itself cost more than the tick it is measuring.
    tickMs = 0;
    tickCalls = 0;
    await sleep(7000);
    const tickTime = tickCalls ? +(tickMs / tickCalls).toFixed(3) : null;
    // Second pass: count element churn per tick.
    tickCalls = 0;
    let records = 0;
    let nodes = 0;
    const obs = new MutationObserver((list) => {
      for (const r of list) {
        records += 1;
        for (const n of r.addedNodes) if (n.nodeType === 1) nodes += 1;
        for (const n of r.removedNodes) if (n.nodeType === 1) nodes += 1;
      }
    });
    obs.observe(tape, { subtree: true, childList: true, characterData: true, attributes: true });
    await sleep(2100);
    obs.disconnect();
    out.ticker = {
      tickMsPerCall: tickTime,
      ticks: tickCalls,
      nodesPerTick: tickCalls ? Math.round(nodes / tickCalls) : null,
      recordsPerTick: tickCalls ? Math.round(records / tickCalls) : null,
      tapeItems: tape.querySelectorAll(".market-ticker__item").length,
    };
    ticker.stop?.();
    window.setInterval = realSet;
    window.clearInterval = realClear;
    host.remove();
  }

  // --- Tip Cascade interval leak ------------------------------------------
  {
    const { buildGentlemansClubRenderers } = await import("/js/ui/gentlemans-club-renderers.js");
    const shell = await import("/js/ui/shell.js");
    const { PlayerSession } = await import("/js/core.js");
    const session = new PlayerSession({ playerName: "Perf", chips: 90000 });
    session.rewards = {
      tier: "gold", lifetimeWagered: 90000, unlockedComps: [], redeemedComps: [], notifications: [],
    };
    const realSet = window.setInterval.bind(window);
    const realClear = window.clearInterval.bind(window);
    const ids = new Set();
    window.setInterval = (fn, ms) => { const id = realSet(fn, ms); ids.add(id); return id; };
    window.clearInterval = (id) => { ids.delete(id); return realClear(id); };
    const ctx = {
      get session() { return session; },
      runtime: shell.createRuntime(),
      el: shell.el, banner: shell.banner, menu: shell.menu,
      chipLine: () => shell.el("div", {}),
      statusBanner: () => null,
      showStatus: () => {},
      persist: () => {}, render: () => {},
      pushView: () => {}, goBack: () => {}, navigateTo: () => {},
      recordActivityVisit: () => {},
    };
    const render = buildGentlemansClubRenderers(ctx)["gentlemans-club-minigame"];
    sandbox.appendChild(render({ gameId: "tip_cascade" }));
    const afterFirst = ids.size;
    // app.js render() replaces the whole view on any re-render (settings bar
    // toggle, status dismiss, online event…). The old view's timers must die.
    sandbox.replaceChildren();
    sandbox.appendChild(render({ gameId: "tip_cascade" }));
    await sleep(150); // the orphaned timer cancels itself on its next 50 ms tick
    const afterSecond = ids.size;
    sandbox.replaceChildren();
    await sleep(400);
    const afterLeaving = ids.size;
    window.setInterval = realSet;
    window.clearInterval = realClear;
    for (const id of ids) realClear(id);
    out.intervals = { afterFirst, afterSecond, afterLeaving };
  }

  // --- localStorage write amplification ------------------------------------
  {
    const core = await import("/js/core.js");
    const session = core.createSlot(3, { playerName: "Perf", chips: 1000 });
    for (let i = 0; i < 1500; i++) {
      session.wallet.debit(10, "slots", `spin ${i}`);
      session.wallet.credit(9, "slots", `win ${i}`);
    }
    core.saveSlot(session); // settle the big payload into storage
    const proto = Object.getPrototypeOf(window.localStorage);
    const realSet = proto.setItem;
    let writes = 0;
    let bigWrites = 0;
    let bytes = 0;
    proto.setItem = function (k, v) {
      writes += 1;
      bytes += String(v).length;
      if (String(v).length > 1024) bigWrites += 1;
      return realSet.call(this, k, v);
    };
    const trials = [];
    for (let i = 0; i < 5; i++) {
      writes = 0; bigWrites = 0; bytes = 0;
      const t0 = now();
      core.saveSlot(session);
      trials.push(now() - t0);
      if (i === 0) out.saves = { writesPerSave: writes, bigWritesPerSave: bigWrites, bytesPerSave: bytes };
    }
    proto.setItem = realSet;
    out.saves.msPerSave = +median(trials).toFixed(3);
    core.deleteSlot(3);
  }

  return out;
}
"""




RPG_IDLE_JS = r"""
() => {
  const proto = Object.getPrototypeOf(window.localStorage);
  const real = proto.setItem;
  window.__perfWrites = {};
  window.__perfBytes = 0;
  proto.setItem = function (k, v) {
    window.__perfWrites[k] = (window.__perfWrites[k] || 0) + 1;
    window.__perfBytes += String(v).length;
    return real.call(this, k, v);
  };
  window.__perfReset = () => { window.__perfWrites = {}; window.__perfBytes = 0; };
  window.__perfRead = () => ({
    saves: window.__perfWrites["mandalay-bay-library"] || 0,
    writes: Object.values(window.__perfWrites).reduce((a, b) => a + b, 0),
    bytes: window.__perfBytes,
  });
}
"""


def measure_rpg(page, base: str) -> dict:
    """Overworld autosave cost: how many full saves an idle guest triggers."""
    page.goto(f"{base}/index.html?guest=1", wait_until="domcontentloaded")
    page.evaluate(
        """async () => {
            // A slot with RPG progress boots straight into the overworld;
            // a casino-only slot stops at the character-creator prompt.
            const core = await import('/js/core.js');
            const s = core.createSlot(1, { playerName: 'Perf', chips: 5000 });
            Object.assign(s.ensureRpgState(), {
                archetype: 'high_roller',
                playerSprite: 'high_roller',
                appearance: { skin: 'fair', hair: 'teal', outfit: 'teal' },
                mapId: 'strip_sidewalk',
                x: 15,
                y: 26,
            });
            core.saveSlot(s);
        }"""
    )
    page.goto(f"{base}/rpg/index.html?slot=1&archetype=high_roller", wait_until="domcontentloaded")
    page.wait_for_function("window.__rpgReady === true", timeout=40000)
    page.evaluate(RPG_IDLE_JS)

    page.evaluate("window.__perfReset()")
    page.wait_for_timeout(12000)
    idle = page.evaluate("window.__perfRead()")

    page.evaluate("window.__perfReset()")
    page.keyboard.down("ArrowLeft")
    page.wait_for_timeout(6000)
    page.keyboard.up("ArrowLeft")
    walking = page.evaluate("window.__perfRead()")

    return {
        "idleSaves12s": idle["saves"],
        "idleWrites12s": idle["writes"],
        "walkSaves6s": walking["saves"],
        "walkWrites6s": walking["writes"],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--docs", default=str(Path(__file__).resolve().parent.parent / "docs"))
    parser.add_argument("--json", default=None)
    parser.add_argument("--no-rpg", action="store_true", help="skip the overworld autosave measurement")
    args = parser.parse_args()

    from playwright.sync_api import sync_playwright

    docs = Path(args.docs).resolve()
    port = free_port()
    handler = functools.partial(Handler, directory=str(docs))
    httpd = socketserver.ThreadingTCPServer(("127.0.0.1", port), handler)
    httpd.daemon_threads = True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{port}"

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            page = browser.new_page()
            page.goto(f"{base}/__perf.html", wait_until="domcontentloaded")
            report = page.evaluate(MEASURE_JS)
            if not args.no_rpg:
                try:
                    report["rpgAutosave"] = measure_rpg(page, base)
                except Exception as exc:  # noqa: BLE001 — needs the Phaser CDN
                    report["rpgAutosave"] = {"error": str(exc).splitlines()[0][:200]}
            browser.close()
    finally:
        httpd.shutdown()

    text = json.dumps(report, indent=2)
    print(text)
    if args.json:
        Path(args.json).write_text(text + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
