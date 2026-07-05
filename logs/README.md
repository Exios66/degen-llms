# GitHub Pages logs

This directory holds deploy logs for the **gh-pages branch /docs/** method (`deploy_method=gh-pages-branch-docs`). GitHub’s Actions UI only shows workflow pass/fail — it does not surface branch-deploy Pages propagation, verification, or structured error codes. Use these files for your own analysis.

## `gh-pages-sync.log` — operational sync history

Records every **Deploy GitHub Pages** workflow run:

- **push** — when `docs/` or the deploy workflow changes on `main`
- **schedule** — hourly check (`0 * * * *` UTC)
- **workflow_dispatch** — manual run from the Actions tab
- **manual_run** — explicit local or agent invocation (`/sync-gh-pages` skill, `./scripts/sync-gh-pages.sh`)

Each line is pipe-delimited:

```
TIMESTAMP | trigger=… | main=SHA | gh-pages=SHA | status=… | synced=yes|no | changed=N | docs_files=N | url=…
```

| `status` | Meaning |
|----------|---------|
| `up_to_date` | gh-pages already matched main; no publish |
| `synced` | docs were copied from main to the `gh-pages` branch |

## `gh-pages-build-status.log` — success & failure with codes

One line per run with outcome, error code, and a debug phase chain. Written by `scripts/sync-gh-pages.sh` on every run (including failures).

```
timestamp=ISO8601Z | outcome=success|failure | code=GBP-NNN | debug=GBP-…,GBP-… | error="…" | trigger=… | deploy_method=gh-pages-branch-docs | url=… | workflow_attempt=N | main=SHA | gh-pages_before=SHA | gh-pages_after=SHA | sync_status=synced|up_to_date | synced=yes|no | changed=N | docs_files=N
```

| Field | Meaning |
|-------|---------|
| `outcome` | `success` or `failure` |
| `code` | Primary GBP error/success code (see table below) |
| `debug` | Comma-separated phase codes showing how far the run progressed |
| `error` | Human-readable message on failure (omitted on success) |
| `deploy_method` | Pages source: branch `gh-pages` serving `/docs` |
| `workflow_attempt` | GitHub Actions run attempt (`0` for local runs) |
| `gh-pages_before` / `gh-pages_after` | Remote `gh-pages` tip before and after this run |

### Outcome codes (`code=GBP-NNN`)

| Code | Meaning |
|------|---------|
| `GBP-000` | Success — sync (if needed), verification, and log commit completed |
| `GBP-001` | Git fetch failed |
| `GBP-002` | Git archive / docs staging failed |
| `GBP-003` | `gh-pages` checkout failed |
| `GBP-004` | `gh-pages` commit or push failed |
| `GBP-005` | Return checkout to `main` failed |
| `GBP-006` | Live site HTTP verification failed |
| `GBP-007` | Sync/build log commit or push to `main` failed |
| `GBP-099` | Unexpected error |

### Debug phase codes (`debug=…`)

| Code | Phase |
|------|-------|
| `GBP-SYNC-001` | Run started |
| `GBP-SYNC-002` | Docs pushed to `gh-pages` |
| `GBP-SYNC-003` | Sync skipped (already up to date) |
| `GBP-SYNC-004` | Logs committed to `main` (failures only) |
| `GBP-SYNC-005` | Live site verification passed |
| `GBP-FAIL-FETCH-001` | Fetch failure |
| `GBP-FAIL-ARCHIVE-001` | Archive failure |
| `GBP-FAIL-CHECKOUT-001` | Checkout failure |
| `GBP-FAIL-PUSH-001` | Push failure |
| `GBP-FAIL-MAIN-001` | Main checkout failure |
| `GBP-FAIL-LOG-001` | Log commit/push failure |
| `GBP-FAIL-VERIFY-001` | Verification failure |

### Example success line

```
timestamp=2026-07-05T08:00:00Z | outcome=success | code=GBP-000 | debug=GBP-SYNC-001,GBP-SYNC-003,GBP-SYNC-005 | trigger=schedule | deploy_method=gh-pages-branch-docs | url=https://exios66.github.io/degen-llms/ | workflow_attempt=1 | main=abc1234 | gh-pages_before=def5678 | gh-pages_after=def5678 | sync_status=up_to_date | synced=no | changed=0 | docs_files=54
```

### Example failure line

```
timestamp=2026-07-05T08:05:00Z | outcome=failure | code=GBP-006 | debug=GBP-SYNC-001,GBP-SYNC-002,GBP-FAIL-VERIFY-001 | error="Live site verification failed after sync" | trigger=manual_run | deploy_method=gh-pages-branch-docs | url=https://exios66.github.io/degen-llms/ | workflow_attempt=1 | main=abc1234 | gh-pages_before=def5678 | gh-pages_after=999aaaa | sync_status=synced | synced=yes | changed=4 | docs_files=54
```

## Live site

Branch deploy from **`gh-pages`** (`/docs` folder):  
https://exios66.github.io/degen-llms/

Verification checks `/`, `/index.html`, `/css/casino.css`, `/js/app.js`, and `/rpg/index.html` with retries (Pages can lag 1–3 minutes after push). Set `SKIP_VERIFY=1` to skip checks locally.
