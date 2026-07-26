# Repository logs

This directory holds append-only logs for GitHub Pages branch deploys. GitHub’s UI is oriented toward Actions-based Pages builds; this project publishes from the **`gh-pages` branch `/docs` folder**, so these logs are the source of truth for deploy health.

## Files

| File | Purpose |
|------|---------|
| [`gh-pages-sync.log`](gh-pages-sync.log) | Sync ping — whether `main/docs/` matched or was copied to `gh-pages` |
| [`gh-pages-build-status.log`](gh-pages-build-status.log) | **Build outcome** — success/failure, error codes, debug codes, HTTP checks |

## Build status log format

Each line in `gh-pages-build-status.log` is pipe-delimited:

```
timestamp=2026-07-05T07:28:38Z | outcome=success | code=GBP-000 | debug=GBP-SYNC-002,GBP-VERIFY-001,... | trigger=manual_run | deploy_method=gh-pages-branch-docs | main=8dd7e68 | gh-pages=6b80462 | ...
```

### Core fields

| Field | Values | Meaning |
|-------|--------|---------|
| `timestamp` | ISO-8601 UTC | When the build check completed |
| `outcome` | `success` \| `failure` | Overall result |
| `code` | `GBP-000` … `GBP-010` | Primary error/success code (see below) |
| `debug` | Comma-separated codes | Granular steps and failure hints |
| `trigger` | `manual_run`, `workflow_dispatch` (active); `push`, `schedule` (historical — automation disabled) | What started the run |
| `deploy_method` | `gh-pages-branch-docs` | Always branch deploy (not Actions artifact Pages) |
| `error` | Quoted string | Human-readable failure message (failures only) |

### Outcome codes (`code=`)

| Code | Meaning |
|------|---------|
| `GBP-000` | Success — sync (if needed) and live verification passed |
| `GBP-001` | Git fetch failed |
| `GBP-002` | Checkout blocked (dirty working tree) |
| `GBP-003` | Push to `gh-pages` rejected |
| `GBP-004` | `git archive` / extract failed |
| `GBP-005` | Commit on `gh-pages` failed |
| `GBP-006` | Live site verification failed (HTTP or content checks) |
| `GBP-007` | Live site unreachable |
| `GBP-008` | Asset validation failed |
| `GBP-009` | Unexpected script error (`set -e` / trap) |
| `GBP-010` | GitHub Actions job failed before sync completed |

### Debug codes (`debug=`)

| Code | Meaning |
|------|---------|
| `GBP-SYNC-001` | Docs already up to date (no push) |
| `GBP-SYNC-002` | Docs synced and pushed to `gh-pages` |
| `GBP-SYNC-003` | Partial fetch (`gh-pages` ref unavailable) |
| `GBP-VERIFY-001` | `index.html` HTTP 200 |
| `GBP-VERIFY-002` | `js/app.js` HTTP 200 and contains shell/racing renderer wiring |
| `GBP-VERIFY-003` | `js/horse-sprites.js` HTTP 200 with sprite roster / canvas helper |
| `GBP-VERIFY-004` | Cache-bust query param present on assets |
| `GBP-VERIFY-005` | No merge-conflict markers in `app.js` |
| `GBP-VERIFY-006` | `css/casino.css` HTTP 200 |
| `GBP-FAIL-PUSH-001` | Push non-fast-forward or permissions |
| `GBP-FAIL-TRAP-001` | Unhandled script error |
| `GBP-FAIL-WF-001` | Workflow job failure (billing, checkout, etc.) |
| `GBP-FAIL-VERIFY-001` | Verification step failed |

### Optional HTTP fields (on verify runs)

| Field | Example | Meaning |
|-------|---------|---------|
| `http_index` | `200` | Status code for `/index.html` |
| `http_app_js` | `200` | Status code for `/js/app.js` |
| `latency_app_js_ms` | `142` | Round-trip latency in ms |
| `cache_bust` | `stamped` \| `placeholder` \| `none` | Asset cache-bust state |

## Sync ping log format

See [`gh-pages-sync.log`](gh-pages-sync.log) — one line per run:

```
TIMESTAMP | trigger=… | main=SHA | gh-pages=SHA | status=up_to_date|synced | synced=yes|no | changed=N | docs_files=N | url=…
```

## Scripts

| Script | Role |
|--------|------|
| [`scripts/sync-gh-pages.sh`](../scripts/sync-gh-pages.sh) | Sync + both logs |
| [`scripts/verify-gh-pages-live.sh`](../scripts/verify-gh-pages-live.sh) | Live HTTP/content checks only |
| [`scripts/log-gh-pages-workflow-failure.sh`](../scripts/log-gh-pages-workflow-failure.sh) | Records Actions failures (`GBP-010`) |
| [`scripts/lib/gh-pages-build-log.sh`](../scripts/lib/gh-pages-build-log.sh) | Shared logging helpers and code constants |

## Live site

https://exios66.github.io/degen-llms/

Configured as **Deploy from branch → `gh-pages` → `/docs`**, not “GitHub Actions” as the Pages source.
