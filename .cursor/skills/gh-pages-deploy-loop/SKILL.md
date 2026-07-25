---
name: gh-pages-deploy-loop
description: >-
  Deploy or refresh the live GitHub Pages site (gh-pages branch) for The Mandalay
  Bay casino. Runs on a 12-hour GitHub Actions schedule or on demand. Use when the
  user asks to deploy, publish, sync, or update GitHub Pages; set up or change the
  deploy loop; mentions gh-pages, exios66.github.io/degen-llms, or wants the live
  casino/RPG site refreshed. Invoke via /gh-pages-deploy-loop.
disable-model-invocation: true
---

# GitHub Pages deploy loop

Keep **https://exios66.github.io/degen-llms/** in sync with `main/docs/`.

| Mode | How it runs | Log `trigger=` |
|------|-------------|----------------|
| **Manual** | This skill or Actions → Run workflow | `manual_run` or `workflow_dispatch` |
| **12-hour loop** | GitHub Actions cron (`0 */12 * * *` UTC) | `schedule` |
| **On push** | `docs/**` changes merged to `main` | `push` |

## Manual deploy (agent)

1. Ensure `main` is checked out and the working tree is clean (sync aborts on dirty tree).
2. Run:

   ```bash
   bash .cursor/skills/gh-pages-deploy-loop/scripts/run-manual.sh
   ```

3. Read the last lines of:
   - `logs/gh-pages-sync.log` — `status`, `changed`, SHAs
   - `logs/gh-pages-build-status.log` — `outcome`, `code`, `debug`
4. Confirm `trigger=manual_run` in both logs.
5. Report: synced vs up-to-date, changed file count, build code, live URL.

Do **not** call `scripts/sync-gh-pages.sh` directly from this skill — use the wrapper so logs show an explicit manual run.

## 12-hour automated loop

Configured in [`.github/workflows/deploy-gh-pages.yml`](../../../.github/workflows/deploy-gh-pages.yml):

```yaml
schedule:
  - cron: "0 */12 * * *"   # 00:00 and 12:00 UTC daily
```

The workflow calls `scripts/sync-gh-pages.sh` with `GITHUB_EVENT_NAME=schedule`. No agent action needed unless the user asks to change the interval.

### Change the interval

Edit the `cron` expression in `deploy-gh-pages.yml`, commit, push to `main`. Common patterns:

| Interval | Cron |
|----------|------|
| Every 12 hours | `0 */12 * * *` |
| Every 6 hours | `0 */6 * * *` |
| Daily at 06:00 UTC | `0 6 * * *` |

## What sync does

- Full replace of `gh-pages` branch `docs/` from `origin/main`
- Commits and pushes `gh-pages` only when the tree differs
- Stamps `__ASSET_SHA__` in `docs/index.html`
- Verifies live HTTP/content checks
- Appends outcome lines to `logs/gh-pages-sync.log` and `logs/gh-pages-build-status.log`
- Commits log updates back to `main` when they change

## Pre-flight

| Check | Why |
|-------|-----|
| Clean working tree | Script checks out `gh-pages` |
| Push access to `main` and `gh-pages` | Both branches are updated |
| Billing / Actions enabled | Scheduled and push triggers need Actions |

## Troubleshooting

| Problem | Action |
|---------|--------|
| `GBP-002` checkout blocked | Commit or stash local changes |
| `GBP-010` workflow failed (billing) | Run manual sync locally: `bash .cursor/skills/gh-pages-deploy-loop/scripts/run-manual.sh` |
| Site stale 1–3 min after sync | Normal GitHub Pages propagation delay |
| `up_to_date` but user expects changes | Confirm changes are on `origin/main` in `docs/` |

Full code reference: [reference.md](reference.md)

## Related

- [`.cursor/skills/sync-gh-pages/`](../sync-gh-pages/) — legacy manual-only skill (prefer this skill)
- [`scripts/sync-gh-pages.sh`](../../../scripts/sync-gh-pages.sh) — core sync logic
- [`logs/README.md`](../../../logs/README.md) — log field definitions
