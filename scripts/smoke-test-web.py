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
    "gentlemans-club", "gentlemans-club-bar", "bar-menu",
]

DINING_OVERLAY_READY = """() => {
  const root = document.getElementById('dining-overlay');
  return Boolean(root && window.__casinoReady);
}"""

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
    ("pool", "pool-complex", ["#pool-overlay .pool-zone-card"]),
    ("amenities", "casino-floor", [".menu-list li:nth-child(1) .menu-btn"]),
    ("dining", "hotel-dining", [".dining-card .btn.primary, .menu-list li:nth-child(1) .menu-btn"]),
    ("stake-tier", "floor", [".menu-list li:nth-child(1) .menu-btn", ".menu-list li:nth-child(2) .menu-btn"]),
]


SEED_SLOT = """async ([slotId, chips]) => {
  const core = await import('/js/core.js');
  const session = core.createSlot(slotId, { playerName: 'E2E', chips });
  session.ensureRpgState().archetype = 'high_roller';
  session.ensureRpgState().playerSprite = 'high_roller';
  core.saveSlot(session);
}"""

VISIBLE_OVERLAY_TEXT = """() => {
  const roots = ['terminal-overlay', 'blackjack-overlay', 'roulette-overlay',
                 'holdem-overlay', 'rhythm-overlay', 'vegas-strip-drive-overlay',
                 'dining-overlay', 'bar-overlay', 'pool-overlay'];
  for (const id of roots) {
    const el = document.getElementById(id);
    if (el && !el.hidden && el.getAttribute('aria-hidden') !== 'true') return el.innerText;
  }
  return '';
}"""

PLAYER_TILE = """() => {
  const s = window.__rpg.scene;
  if (typeof s.playerTile === 'function') {
    const t = s.playerTile();
    return [t.x, t.y];
  }
  const size = s.tileSize;
  return [Math.floor(s.player.x / size), Math.floor(s.player.y / size)];
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

    # Casino door chain: strip → lobby → casino → lobby → strip (feet tiles).
    page.evaluate("""async () => {
      const s = window.__rpg.scene;
      const hops = [
        ['registration_lobby', 15, 26],
        ['main_resort', 15, 26],
        ['registration_lobby', 15, 4],
        ['strip_sidewalk', 15, 4],
      ];
      for (const [mapId, x, y] of hops) {
        s._transitionMap(mapId, x, y, null);
        await new Promise((r) => setTimeout(r, 400));
      }
    }""")
    page.wait_for_timeout(2200)
    chain_map = page.evaluate("() => window.__rpg.scene.currentMapId")
    chain_tile = page.evaluate(PLAYER_TILE)
    step("door_chain", chain_map == "strip_sidewalk" and tuple(chain_tile) == (15, 4),
         f"ended on {chain_map}@{chain_tile}, expected strip_sidewalk@(15,4)")

    # Valet garage chain: strip → garage → lobby elevators → garage → strip.
    page.evaluate("""async () => {
      const s = window.__rpg.scene;
      const hops = [
        ['valet_garage', 26, 15],
        ['registration_lobby', 15, 4],
        ['valet_garage', 15, 26],
        ['strip_sidewalk', 3, 22],
      ];
      for (const [mapId, x, y] of hops) {
        s._transitionMap(mapId, x, y, null);
        await new Promise((r) => setTimeout(r, 400));
      }
    }""")
    page.wait_for_timeout(2200)
    valet_map = page.evaluate("() => window.__rpg.scene.currentMapId")
    valet_tile = page.evaluate(PLAYER_TILE)
    step("valet_door_chain", valet_map == "strip_sidewalk" and tuple(valet_tile) == (3, 22),
         f"ended on {valet_map}@{valet_tile}, expected strip_sidewalk@(3,22)")

    # Walk onto the lobby door from spawn side and confirm the warp fires via feet.
    page.evaluate("""() => {
      const s = window.__rpg.scene;
      s._transitionMap('strip_sidewalk', 15, 26, null);
    }""")
    page.wait_for_timeout(500)
    page.evaluate("""() => {
      const s = window.__rpg.scene;
      const size = s.tileSize;
      // Stand on the authored north door tile (15,2) at feet.
      s.player.setPosition(15 * size + size / 2, 2 * size + size / 2);
      s._lastDoorTile = null;
    }""")
    page.wait_for_timeout(400)
    entered = page.evaluate("() => window.__rpg.scene.currentMapId")
    step("door_enter_lobby", entered == "registration_lobby",
         f"standing on strip door left map as {entered}")

    # Line-of-sight challenge: stand in Valet Vic's cone and let update() see us.
    page.evaluate("""() => {
      const s = window.__rpg.scene;
      s.saveAdapter.updatePosition(15, 12, 'valet_garage');
      s._transitionMap('valet_garage', 15, 12, null);
    }""")
    page.wait_for_timeout(900)
    page.evaluate("""() => {
      const s = window.__rpg.scene;
      const size = s.tileSize;
      s.player.setPosition(15 * size + size / 2, 11 * size + size / 2);
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

    # A checked-in guest must be able to reach the room from the hosted desk,
    # then leave it: "return to casino floor" closes the panel in the overworld.
    page.evaluate("() => { window.__rpg.encounters.start('hotel_front_desk', {}); }")
    page.wait_for_timeout(300)
    desk_actions = page.evaluate("""() => {
      const mount = document.querySelector('.terminal-host-mount');
      const labels = [...document.querySelectorAll('#terminal-overlay .menu-btn')]
        .map((b) => b.textContent.trim());
      const style = mount ? getComputedStyle(mount) : null;
      return {
        labels,
        canScroll: Boolean(mount && mount.scrollHeight > mount.clientHeight - 1),
        touchAction: style?.touchAction || '',
      };
    }""")
    needed = (
        "Locate reservation",
        "Settle overdue",
        "Upgrade to Panorama",
        "Review folio",
        "Standard checkout",
        "Resort dining",
        "Guest Directory",
    )
    missing = [n for n in needed if not any(n.lower() in lab.lower() for lab in desk_actions["labels"])]
    step("hotel_desk_actions", not missing,
         f"front desk missing interactions: {missing or desk_actions['labels']}")
    step("hotel_desk_scroll",
         "pan-y" in (desk_actions["touchAction"] or "")
         or desk_actions["canScroll"]
         or len(desk_actions["labels"]) >= 8,
         f"front desk not scroll-friendly: {desk_actions}")

    room_btn = page.query_selector(
        "#terminal-overlay .menu-btn:text-matches('Enter your room|Skip hallway')")
    if room_btn:
        room_btn.click()
        page.wait_for_timeout(300)
    desk_text = page.evaluate(VISIBLE_OVERLAY_TEXT)
    step("hotel_room_access", bool(room_btn) and "Front Desk" not in desk_text,
         "front desk never offered the room to a checked-in guest")

    page.evaluate("""() => {
      const btns = [...document.querySelectorAll('#terminal-overlay .menu-btn')];
      btns.find((b) => /return to casino floor/i.test(b.textContent))?.click();
    }""")
    page.wait_for_timeout(300)
    step("hotel_exit", page.evaluate("() => !window.__rpg.terminalHost.isActive()"),
         "leaving the hotel did not close the overworld panel")

    # Reload: position, map, and chips must all come back off the save slot.
    before = page.evaluate("""() => {
      const s = window.__rpg.scene;
      const size = s.tileSize;
      const tx = Math.floor(s.player.x / size);
      const ty = Math.floor(s.player.y / size);
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


def rpg_phone(browser, base, failures: list[str]) -> None:
    """The same overworld on a phone: thumb pad, tap-to-walk, tap-to-talk.

    Runs in its own touch context because touch support and viewport size are
    fixed when the context is created.
    """
    context = browser.new_context(
        viewport={"width": 390, "height": 844},
        device_scale_factor=3,
        is_mobile=True,
        has_touch=True,
    )
    page = context.new_page()
    errors: list[str] = []
    page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}")
            if m.type == "error" and not any(i in m.text for i in IGNORED) else None)
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))

    def step(name: str, ok: bool, detail: str = "") -> None:
        if not ok:
            failures.append(f"phone/{name}: {detail or 'failed'}")
        for err in errors:
            failures.append(f"phone/{name}: {err}")
        print(f"  phone/{name:<27} {'FAIL' if not ok or errors else 'ok'}")
        errors.clear()

    page.goto(f"{base}/rpg/index.html?guest=1&chips=250000&archetype=high_roller",
              wait_until="load")
    page.wait_for_function("window.__rpgReady === true", timeout=20000)

    # The canvas should own the screen, not sit in a letterbox.
    fill = page.evaluate("""() => {
      const canvas = document.querySelector('#phaser-root canvas');
      const r = canvas.getBoundingClientRect();
      return { w: r.width / window.innerWidth, h: r.height / window.innerHeight,
               tilesAcross: r.width / (window.__rpg.scene.tileSize
                 * window.__rpg.scene.cameras.main.zoom) };
    }""")
    step("fills_screen", fill["w"] > 0.9 and fill["h"] > 0.9,
         f"canvas covers {fill['w']:.0%}x{fill['h']:.0%} of the viewport")
    step("handheld_framing", 6 <= fill["tilesAcross"] <= 20,
         f"{fill['tilesAcross']:.1f} tiles across is not a handheld view")

    step("pad_mounted", page.is_visible("#touch-pad")
         and len(page.query_selector_all(".touch-btn")) == 7,
         "thumb controls did not mount on a touch device")

    # Every control has to be big enough to hit — 44px is the usual floor.
    small = page.eval_on_selector_all(
        ".touch-btn",
        """els => els.filter(e => { const r = e.getBoundingClientRect();
             return r.width < 40 || r.height < 40; }).map(e => e.ariaLabel)""")
    step("pad_tap_targets", not small, f"too small to hit: {small}")

    # Let the arrival message clear, then walk with the d-pad.
    page.wait_for_timeout(6500)
    page.evaluate("() => { const d = window.__rpg.dialogue; if (d.isActive()) d.close(); }")
    start = page.evaluate(PLAYER_TILE)
    pad = page.locator(".touch-btn--up").bounding_box()
    page.mouse.move(pad["x"] + pad["width"] / 2, pad["y"] + pad["height"] / 2)
    page.mouse.down()
    page.wait_for_timeout(700)
    page.mouse.up()
    page.wait_for_timeout(200)
    step("pad_walks", page.evaluate(PLAYER_TILE) != start, "d-pad did not move the player")

    # Tap a tile a few steps away: the route has to end where it was asked to.
    # Short hops keep the walk clear of the doors and zone triggers that would
    # legitimately interrupt it.
    target = page.evaluate("""() => {
      const s = window.__rpg.scene;
      const here = s.playerTile();
      for (let r = 2; r <= 4; r++) {
        for (const [dx, dy] of [[0, -r], [r, 0], [0, r], [-r, 0]]) {
          const t = { x: here.x + dx, y: here.y + dy };
          if (s.collisionGrid[t.y]?.[t.x] === 0 && s.walkTo(t.x, t.y)) return t;
        }
      }
      return null;
    }""")
    arrived = None
    if target:
        for _ in range(20):
            page.wait_for_timeout(250)
            if page.evaluate("() => window.__rpg.scene.movePath.length === 0"):
                break
        arrived = page.evaluate(
            "() => ({ ...window.__rpg.scene.playerTile(), map: window.__rpg.scene.currentMapId })")
    step("tap_walks", bool(arrived) and (arrived["x"], arrived["y"]) == (target["x"], target["y"]),
         f"tapping {target} ended at {arrived}")

    # Teleport next to the guest, let Arcade Physics sync the body, then walk
    # onto them. Setting the sprite and reading playerFoot() in the same tick
    # would still see the old body position and plan a long route.
    page.evaluate("""() => {
      const s = window.__rpg.scene;
      const npc = s.currentNpcs[0];
      s.player.setPosition((npc.x + 1) * s.tileSize + s.tileSize / 2, npc.y * s.tileSize);
    }""")
    page.wait_for_timeout(200)
    page.evaluate("""() => {
      const s = window.__rpg.scene;
      const npc = s.currentNpcs[0];
      s.walkTo(npc.x, npc.y);
    }""")
    for _ in range(20):
        page.wait_for_timeout(150)
        if page.evaluate("() => window.__rpg.dialogue.isActive()"):
            break
    page.wait_for_timeout(100)
    step("tap_talks", page.evaluate("() => window.__rpg.dialogue.isActive()"),
         "tapping a guest did not start a conversation")
    step("pad_yields", page.evaluate(
        "() => document.getElementById('touch-pad').classList.contains('touch-pad--hidden')"),
        "thumb controls stayed on screen under the dialogue box")

    before = page.inner_text("#dialogue-overlay")
    page.touchscreen.tap(195, 260)
    page.wait_for_timeout(400)
    page.touchscreen.tap(195, 260)
    page.wait_for_timeout(400)
    step("tap_advances", page.inner_text("#dialogue-overlay") != before
         or not page.evaluate("() => window.__rpg.dialogue.isActive()"),
         "tapping the screen did not move the conversation on")

    # Close dialogue so the Rewards Phone FAB is free, then open it. On a phone
    # viewport the flip shell must stay fully on-screen (not above the FAB).
    page.evaluate("() => { const d = window.__rpg.dialogue; if (d.isActive()) d.close(); }")
    page.wait_for_timeout(200)
    page.evaluate("() => window.__rpg.rewardsPhone.open('reservation')")
    page.wait_for_timeout(200)
    phone_box = page.evaluate("""() => {
      const root = document.querySelector('.rewards-phone-root');
      const phone = document.querySelector('.rewards-phone');
      if (!root || !phone || phone.hidden) return null;
      const r = phone.getBoundingClientRect();
      return {
        top: r.top, bottom: r.bottom, left: r.left, right: r.right,
        vw: window.innerWidth, vh: window.innerHeight,
        isOpen: root.classList.contains('is-open'),
        hasPad: document.body.classList.contains('has-touch-pad'),
      };
    }""")
    in_view = bool(phone_box) and phone_box["isOpen"] and phone_box["hasPad"] \
        and phone_box["top"] >= -1 and phone_box["left"] >= -1 \
        and phone_box["bottom"] <= phone_box["vh"] + 1 \
        and phone_box["right"] <= phone_box["vw"] + 1
    step("rewards_phone_in_view", in_view,
         f"rewards phone left the viewport: {phone_box}")
    page.evaluate("() => window.__rpg.rewardsPhone.close()")

    # Suite wing must be a real door off the guest corridor, with a return path.
    suite = page.evaluate("""async () => {
      const [corridor, delano] = await Promise.all([
        fetch('/rpg/js/data/maps/guest_corridor.json').then((r) => r.json()),
        fetch('/rpg/js/data/maps/delano_wing.json').then((r) => r.json()),
      ]);
      const east = (corridor.doors || []).find((d) => d.to === 'delano_wing');
      const back = (delano.doors || []).find((d) => d.to === 'guest_corridor');
      return { east, back };
    }""")
    step("suite_wing_door", bool(suite.get("east")) and bool(suite.get("back")),
         f"suite wing doors missing: {suite}")

    # Front desk on a phone: locate + core stay actions must be present and pan-able.
    page.evaluate("() => { window.__rpg.encounters.start('hotel_front_desk', {}); }")
    page.wait_for_timeout(300)
    mobile_desk = page.evaluate("""() => {
      const mount = document.querySelector('.terminal-host-mount');
      const labels = [...document.querySelectorAll('#terminal-overlay .menu-btn')]
        .map((b) => b.textContent.trim());
      return {
        labels,
        touchAction: mount ? getComputedStyle(mount).touchAction : '',
      };
    }""")
    step("mobile_desk_locate",
         any("locate reservation" in lab.lower() for lab in mobile_desk["labels"]),
         f"locate missing on mobile desk: {mobile_desk['labels']}")
    step("mobile_desk_touch",
         "pan-y" in (mobile_desk["touchAction"] or ""),
         f"terminal mount touch-action={mobile_desk['touchAction']!r}")

    context.close()


def ui_regressions(page, failures: list[str]) -> None:
    """Check input ownership, dialogue disposal/effects, and map autosaves."""
    checks = page.evaluate("""async () => {
      const [{el}, {RewardsPhone}, {PlayerSession}, {DialogueManager}, {EncounterBridge}] = await Promise.all([
        import('/js/ui/shell.js'), import('/js/RewardsPhone.js'), import('/js/core.js'),
        import('/rpg/js/systems/DialogueManager.js'), import('/rpg/js/systems/EncounterBridge.js'),
      ]);
      const checks = [];
      const check = (name, ok) => checks.push({name, ok: Boolean(ok)});
      check('unchecked_settings', el('input', {type: 'checkbox', checked: false}).checked === false);
      const session = new PlayerSession();
      session.playerName = '<b>A & B</b>';
      const root = document.createElement('div');
      document.body.append(root);
      const phone = new RewardsPhone(root, session);
      phone.open('card');
      const name = root.querySelector('.rewards-member-name');
      check('literal_member_name', name.textContent === session.playerName && !name.querySelector('b'));
      phone.destroy();
      check('phone_disposed', root.childElementCount === 0);
      root.remove();
      const injSession = new PlayerSession();
      injSession.staffOverrides = { dealers: {}, npcs: { chip_chandler: { name: '<img src=x onerror=1>' } } };
      const injRoot = document.createElement('div');
      document.body.append(injRoot);
      const injPhone = new RewardsPhone(injRoot, injSession);
      injPhone.open('connect');
      const injRow = injRoot.querySelector('.rewards-contact-row');
      check('contact_name_escaped', Boolean(injRow) && !injRow.querySelector('img') && injRow.textContent.includes('<img'));
      injPhone.destroy();
      injRoot.remove();
      const dialogueRoot = document.createElement('div');
      document.body.append(dialogueRoot);
      let items = 0, quests = 0;
      const d = new DialogueManager(dialogueRoot, {onItem: () => items++});
      d.setQuestManager({start: () => quests++});
      d.load({a: {text: 'First', setFlag: 'visited', giveItem: 'camera', startQuest: 'reef', next: 'b'},
              b: {text: 'Second', choices: [{label: 'Close', giveItem: 'card'}]}});
      const result = d.start('a');
      for (let i = 0; i < 3; i++) d._keyHandler(new KeyboardEvent('keydown', {key: 'Enter'}));
      await new Promise(r => setTimeout(r, 200));
      check('dialogue_intermediate_effects', d.flags.visited && items === 1 && quests === 1);
      check('dialogue_skip_single_choices', dialogueRoot.querySelectorAll('.dialogue-choices').length === 1);
      dialogueRoot.querySelector('button').click();
      await result;
      check('choice_effect_once', items === 2);
      check('dialogue_disposed', !d.isActive() && dialogueRoot.childElementCount === 0);
      dialogueRoot.remove();
      const nodeEncounterRoot = document.createElement('div');
      document.body.append(nodeEncounterRoot);
      const nd = new DialogueManager(nodeEncounterRoot, {});
      nd.load({go: {text: 'Go', reputation: {staff: 1}, encounter: 'slots'}});
      const nodeEncounterPromise = nd.start('go');
      nd._keyHandler(new KeyboardEvent('keydown', {key: 'Enter'}));
      nd._keyHandler(new KeyboardEvent('keydown', {key: 'Enter'}));
      const nodeEncounterResult = await nodeEncounterPromise;
      check('node_encounter_reputation',
        nodeEncounterResult?.encounter === 'slots' && nodeEncounterResult?.reputation?.staff === 1);
      nodeEncounterRoot.remove();
      const bouncerRoot = document.createElement('div');
      document.body.append(bouncerRoot);
      const bouncer = new DialogueManager(bouncerRoot, {});
      bouncer.load(await (await fetch('/rpg/js/data/dialogues.json')).json());
      const bouncerPromise = bouncer.start('hob_bouncer_greet');
      bouncer._keyHandler(new KeyboardEvent('keydown', {key: 'Enter'}));
      const backstageChoice = [...bouncerRoot.querySelectorAll('button')]
        .find((b) => b.textContent.includes("I'm with the headliner"));
      check('backstage_choice', Boolean(backstageChoice));
      if (backstageChoice) {
        backstageChoice.click();
        for (let i = 0; i < 4; i++) {
          bouncer._keyHandler(new KeyboardEvent('keydown', {key: 'Enter'}));
        }
        await bouncerPromise;
      } else {
        bouncer.close();
      }
      check('backstage_flag', bouncer.flags.hob_backstage === true);
      bouncerRoot.remove();
      const denied = {active: false, setSession() {}, open() {}, onceClosed(cb) {this.cb = cb;}};
      const bridge = new EncounterBridge({session, overlays: {}, barOverlay: denied, diningOverlay: denied, onPersist() {}});
      const deniedResult = await Promise.race([bridge.start('bar_foundation'), new Promise(r => setTimeout(() => r(null), 100))]);
      check('denied_encounter_resolves', deniedResult?.net === 0 && denied.cb === null);
      const [{buildSportsbookRenderers}, {SportsbookState}, shell] = await Promise.all([
        import('/js/ui/sportsbook-renderers.js'), import('/js/sportsbook.js'), import('/js/ui/shell.js'),
      ]);
      const book = new SportsbookState();
      const ctx = {session, runtime: shell.createRuntime({sportsbook: book}),
        render() {}, persist() {}, recordActivityResult() {}, recordActivityVisitOnce() {}, clearActivityVisit() {},
        pushView() {}, popView() {}, goBack() {}};
      Object.assign(ctx, shell.createShell(ctx));
      const sports = buildSportsbookRenderers(ctx);
      book.predictions.positions = [{marketId: 'orphan', question: 'Retired market', amount: 25, side: 'yes', priceCents: 50}];
      const balanceBeforeRefund = session.wallet.balance;
      const refundPanel = sports['sportsbook-settle']();
      check('orphan_prediction_refunded', session.wallet.balance === balanceBeforeRefund + 25 && refundPanel.textContent.includes('Retired market'));
      const event = {eventId: 'test-event', eventType: 'game', label: 'A at B', home: 'B', away: 'A',
        homeOdds: -110, awayOdds: -110, spread: 0, total: 200, settled: false};
      book.events = [event];
      const ticketPanel = sports['sportsbook-wager']();
      event.settled = true;
      const balanceBeforeRejectedTicket = session.wallet.balance;
      ticketPanel.querySelector('.primary').click();
      check('settled_ticket_not_debited', session.wallet.balance === balanceBeforeRejectedTicket && !book.pending.length);
      const market = {marketId: 'test-market', question: 'Will B win?', category: 'sports-pulse',
        yesPrice: 50, noPrice: 50, resolution: null, linkedEvent: {settled: false}};
      book.predictions.markets = [market];
      const predictionPanel = sports['sportsbook-prediction']();
      market.linkedEvent.settled = true;
      predictionPanel.querySelector('.primary').click();
      check('settled_linked_market_not_debited', session.wallet.balance === balanceBeforeRejectedTicket && !book.predictions.positions.length);
      const [{buildAmenitiesRenderers}, barMod, amenityShell] = await Promise.all([
        import('/js/casino-amenities-ui.js'), import('/js/bar.js'), import('/js/ui/shell.js'),
      ]);
      const bagCtx = { session, runtime: amenityShell.createRuntime(),
        render() {}, persist() {}, pushView() {}, goBack() {}, navigateTo() {}, showStatus() {} };
      Object.assign(bagCtx, amenityShell.createShell(bagCtx));
      bagCtx.el = el;
      const amenitiesUi = buildAmenitiesRenderers(bagCtx);
      const barRound = barMod.createBarRound("betty_bar");
      barMod.orderBarVenueDrink(session, "betty_bar", "betty_comp_marg", barRound);
      const bagText = amenitiesUi["mall-bag"]().textContent;
      check('bag_lists_generic_bar_order', bagText.includes("Comp Margarita") && bagText.includes("Betty's Bar"));
      const [{teardownHostedView}, {HoldemTable}, core] = await Promise.all([
        import('/js/activity-teardown.js'), import('/js/holdem/game.js'), import('/js/core.js'),
      ]);
      const holdemSession = new PlayerSession({chips: 1000});
      holdemSession.wallet.debit(200, 'holdem', 'test buy-in');
      const holdemRuntime = {holdem: {table: HoldemTable.quickTable(200, 4), buyIn: 200, sessionNet: 0, hands: 2, log: []}};
      holdemRuntime.holdem.table.human.stack = 250;
      let holdemResults = 0;
      const holdemCtx = {session: holdemSession, runtime: holdemRuntime,
        recordActivityResult() { holdemResults += 1; }, clearActivityVisit() {}, persist() {}};
      teardownHostedView(holdemCtx, 'holdem-play');
      check('holdem_exit_cashes_out', holdemSession.wallet.balance === 1050 && holdemRuntime.holdem === null && holdemResults === 1);
      teardownHostedView(holdemCtx, 'holdem-play');
      check('holdem_exit_idempotent', holdemSession.wallet.balance === 1050 && holdemResults === 1);
      core.deleteSlot(5);
      const escrowSession = core.createSlot(5, {playerName: 'Escrow', chips: 1000});
      escrowSession.wallet.debit(200, 'holdem', 'test buy-in');
      escrowSession.holdemEscrow = 240;
      core.saveSlot(escrowSession);
      const recovered = core.loadSlot(5);
      check('holdem_escrow_recovered', recovered?.wallet.balance === 1040 && recovered.holdemEscrow === 0);
      check('holdem_escrow_idempotent', core.loadSlot(5)?.wallet.balance === 1040);
      core.deleteSlot(5);
      const {HoldemOverlay} = await import('/rpg/js/systems/overlays/HoldemOverlay.js');
      const rpgHoldemSession = core.createSlot(5, {playerName: 'RPG Escrow', chips: 1000});
      const rpgHoldemRoot = document.createElement('div');
      document.body.append(rpgHoldemRoot);
      const rpgHoldem = new HoldemOverlay(rpgHoldemRoot, rpgHoldemSession, {});
      rpgHoldem.open({minBet: 100, maxBet: 1000});
      rpgHoldemRoot.querySelector('input').value = '200';
      rpgHoldemRoot.querySelector('.primary').click();
      const feltStack = rpgHoldem.table?.human?.stack ?? -1;
      check('rpg_holdem_escrow', feltStack > 0 && rpgHoldemSession.holdemEscrow === feltStack);
      core.saveSlot(rpgHoldemSession);
      const recoveredRpgHoldem = core.loadSlot(5);
      check('rpg_holdem_escrow_recovered',
        recoveredRpgHoldem?.wallet.balance === 800 + feltStack && recoveredRpgHoldem.holdemEscrow === 0);
      rpgHoldem.close();
      check('rpg_holdem_cashout',
        rpgHoldemSession.wallet.balance === 800 + feltStack && rpgHoldemSession.holdemEscrow === 0);
      rpgHoldemRoot.remove();
      core.deleteSlot(5);
      const s = window.__rpg.scene;
      s._autosavePosition(2000);
      check('autosave_preserves_map', s.saveAdapter.rpg.mapId === s.currentMapId);
      if (window.__rpg.dialogue.isActive()) window.__rpg.dialogue.close();
      const staffBeforeChallenge = s.saveAdapter.rpg.reputation?.staff ?? 0;
      const realDialogueStart = s.dialogue.start;
      try {
        s.dialogue.start = async () => ({reputation: {staff: 2}});
        await s._runChallenge({id: 'regression_challenger', name: 'Regression',
          x: s.playerTile().x, y: s.playerTile().y});
      } finally {
        s.dialogue.start = realDialogueStart;
      }
      check('challenge_reputation',
        (s.saveAdapter.rpg.reputation?.staff ?? 0) === staffBeforeChallenge + 2);
      window.__rpg.rewardsPhone.open();
      check('phone_owns_world_input', s.isMenuOpen());
      window.__rpg.rewardsPhone.close();
      return checks;
    }""")
    for result in checks:
        print(f"  regression/{result['name']:<25} {'ok' if result['ok'] else 'FAIL'}")
        if not result["ok"]:
            failures.append(f"regression/{result['name']}: failed")


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
        # Headless SwiftShader can synchronously stall WebGL context creation.
        # Exercise Phaser AUTO's supported Canvas fallback here; WebGL visual
        # verification uses the collaborative browser with its normal GPU.
        browser = pw.chromium.launch(args=["--disable-webgl"])
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

            ui_regressions(page, failures)

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
                text = page.evaluate(VISIBLE_OVERLAY_TEXT)
                # Gambling encounters open on the shared stake picker. Taking a
                # tier is what proves the screen behind the gate renders too.
                if "Stake Tier" in text:
                    page.click("#terminal-overlay .menu-list li:nth-child(1) .menu-btn")
                    page.wait_for_timeout(400)
                    text = page.evaluate(VISIBLE_OVERLAY_TEXT)
                    if "Stake Tier" in text:
                        failures.append(f"rpg encounter {encounter}: stuck on the stake picker")
                if len(text.strip()) < 10:
                    completed = page.evaluate("""async () => Promise.race([
                      window.__rpgEncounterPromise.then(() => true),
                      new Promise(r => setTimeout(() => r(false), 100)),
                    ])""")
                    gated_venues = {"bar_foundation", "bar_velvet", "bar_beach_club"}
                    if not completed or encounter not in gated_venues:
                        failures.append(f"rpg encounter {encounter}: nothing rendered (completed={completed})")
                if encounter == "predictions" and "Prediction Markets" not in text:
                    failures.append("rpg encounter predictions: did not open on the prediction tab")
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

            # The journey owns its saved profile and starts from a fresh browser
            # context instead of inheriting every overlay walk's storage/audio.
            page.close()
            journey_context = browser.new_context()
            journey_page = journey_context.new_page()
            journey_page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}")
                            if m.type == "error" and not any(i in m.text for i in IGNORED) else None)
            journey_page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
            rpg_journey(journey_page, base, failures, errors)
            journey_context.close()
            rpg_phone(browser, base, failures)

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
