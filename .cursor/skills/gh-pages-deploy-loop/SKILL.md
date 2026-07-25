---
name: gh-pages-deploy-loop
description: >-
  Deploy or refresh the live GitHub Pages site (gh-pages branch) for The Mandalay
  Bay resort. Manual or optional Actions workflow_dispatch only — automatic
  push/schedule publish is disabled. Use when the user asks to deploy, publish,
  sync, or update GitHub Pages; mentions gh-pages, exios66.github.io/degen-llms,
  or wants the live casino/RPG site refreshed. Invoke via /gh-pages-deploy-loop.
disable-model-invocation: true
---

# GitHub Pages deploy loop

Keep **https://exios66.github.io/degen-llms/** in sync with `main/docs/`.

| Mode | How it runs | Log `trigger=` |
|------|-------------|----------------|
| **Manual** | This skill or local wrapper | `manual_run` |
| **Actions tab** | Optional `workflow_dispatch` | `workflow_dispatch` |

Automatic **push** and **schedule** triggers are **disabled** in [`.github/workflows/deploy-gh-pages.yml`](../../../.github/workflows/deploy-gh-pages.yml) (billing limits / error spam). Do not document them as live.

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
| Pages source = branch `gh-pages` / `/docs` | Not “GitHub Actions” artifact deploy |

## Troubleshooting

| Problem | Action |
|---------|--------|
| Dirty tree | Commit or stash, re-run |
| `GBP-010` / Actions billing | Use this skill locally; do not re-enable schedule |
| Site stale after sync | Wait 1–3 minutes; run `scripts/verify-gh-pages-live.sh` |

## Related

- [`reference.md`](reference.md) — triggers, codes, Pages settings
- [`scripts/sync-gh-pages.sh`](../../../scripts/sync-gh-pages.sh) — core sync (legacy direct call)
- [`.cursor/skills/sync-gh-pages/`](../sync-gh-pages/) — legacy skill; prefer this one
