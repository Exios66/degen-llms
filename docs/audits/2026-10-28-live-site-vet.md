# Live site vet — October 28, 2026

Browser audit of the deployed GitHub Pages casino
(<https://exios66.github.io/degen-llms/>) against the same tree served from a
staged, bundled build of `main` + the pending perf branch.

## What was tested

`scripts/audit-site.py` drives a headless Chromium through:

- every HTML page (`index.html`, `rpg/index.html`, `404.html`,
  `maintenance.html`, `offline.html`) and every same-origin `href`/`src` they
  reference, including CSS/JS/data/assets
- all 54 terminal deep links, including the pool zones, save/title screens,
  and the themed not-found screen
- all 14 scripted terminal interaction flows (slots, blackjack, Hold'em,
  roulette, craps, lottery, sportsbook, racing, cashier, hotel, pool, dining,
  amenities, stake tiers)
- the terminal Rewards Phone on desktop and a 390 × 844 phone viewport: Home,
  Connect, Room, Inbox, and Card tabs, the Comps/Offers/Perks shortcuts, sound
  toggles, a contact thread, a dialogue/text choice, the call screen, and close
- all 34 RPG maps via real scene transitions, all menu pages, and every
  registered encounter
- the RPG Rewards Phone on desktop and phone viewports, with the same screen,
  shortcut, thread, choice, call, and close walk

Same-origin 4xx/5xx responses, failed requests, console errors, page errors,
empty screens, and phones outside the viewport all fail the audit.

## Results

| Target | Checks | Failures |
|---|---|---|
| Deployed site (`gh-pages`, synced from `f59ce31`) | 289 | 2 (same defect) |
| Staged `main` + perf branch, bundled | 286 | 0 |

The only live failure is `?view=gentlemans-club-bar`: the screen renders empty
and throws `Maximum call stack size exceeded`. The deployed renderer opens the
Velvet Ledger bar overlay during render, which re-enters the terminal render
loop. Commit `40f3aef` (merged in #158) replaces that with a gated "Open The
Ledger Bar" button; the same deep link passes on the staged build.

Everything else on the live site passes, including every phone interaction and
all RPG maps/encounters. The live site is not broken broadly — it is old.

## Deployment drift

The Pages branch was last synced from `f59ce31` (sync commit `9f76faf`), while
`main` is at `87e6011` (merge of #158): **90 files behind, +2,194/−709 lines**.
The bundled entry points (`site/js/app.js`, `site/rpg/js/main.js`,
`site/css/*-combined.css`) return 404 on the live host because the bundling
step only runs during a sync.

## Boot cost

Measured on the staged build with Chromium, same asserts as the audit:

| Page | Before (unbundled) | After (bundled) |
|---|---|---|
| Terminal | 109 resources / 99 scripts | **5 resources / 1 script** |
| RPG | 161 resources / 112 scripts | **44 resources / 1 script** |

The RPG remains data-heavy (34 map records plus dialogues); those fetches are
unchanged and now start at HTML parse via preload hints. Phaser is still
loaded from jsDelivr, with `preconnect` + `modulepreload` added.

## How to reproduce

```bash
# deployed site
.venv/bin/python scripts/audit-site.py --base-url https://exios66.github.io/degen-llms/

# local source tree
.venv/bin/python scripts/audit-site.py

# staged build: bundles + combined CSS
.venv/bin/python scripts/audit-site.py --stage
```

The bundled-site boot properties are also pinned by
`scripts/smoke-test-site-bundle.py` (entry rewiring, combined stylesheets,
mirrored runtime data, ready on both pages, script-request ceilings).

## Recommendation

Publish `main` through the manual Pages deploy (`gh-pages-deploy-loop`), then
re-run the live audit. This was done on October 29, 2026. That ships the #158 fixes, including the Ledger Bar
crash, and the bundling that cuts the module waterfall from ~100 requests per
page to one. The perf branch (#159) adds the combined stylesheet, save write-amplification
and idle-autosave fixes, and this audit script; it was merged and deployed in
the same pass as this report.
