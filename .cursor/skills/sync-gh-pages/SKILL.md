---
name: sync-gh-pages
description: >-
  Sync main/docs/ to the gh-pages branch for GitHub Pages (The Mandalay Bay
  digital casino). Use when the user asks to deploy, publish, or sync the live
  site; mentions gh-pages, GitHub Pages, sync-gh-pages.sh, or wants casino/RPG
  assets pushed to https://exios66.github.io/degen-llms/. Always logs the run
  as trigger=manual_run (not schedule/push). Invoke via /sync-gh-pages.
disable-model-invocation: true
---

# Sync GitHub Pages (`gh-pages`)

Publish the full `docs/` tree from `main` to the **`gh-pages`** branch so the live site matches local casino CSS, slot skins, horse sprites, hotel/RPG assets, and worldbuilding content.

**Live URL:** https://exios66.github.io/degen-llms/

## When to use

- User runs `/sync-gh-pages` or asks to deploy/publish/sync GitHub Pages
- After large `docs/` changes and the user wants the live site updated immediately (do not wait for hourly cron)
- User reports stale assets on the published site

## Required behavior

1. **Run the skill wrapper** (sets `SYNC_TRIGGER=manual_run` so logs show an explicit manual run, not an automated schedule/push reaction):

   ```bash
   bash .cursor/skills/sync-gh-pages/scripts/run-sync.sh
   ```

   Do **not** call `scripts/sync-gh-pages.sh` without `SYNC_TRIGGER=manual_run` when using this skill.

2. **Pre-flight checks**
   - Working tree must be clean on `main`, or only contain changes already committed (the script checks out `gh-pages` and will abort if local edits block checkout).
   - `git fetch origin main gh-pages` happens inside the script.
   - Requires push access to `origin` for `main` and `gh-pages`.

3. **After the run**
   - Read the printed log lines (appended to [`logs/gh-pages-sync.log`](../../../logs/gh-pages-sync.log) and [`logs/gh-pages-build-status.log`](../../../logs/gh-pages-build-status.log)).
   - Confirm `trigger=manual_run` in the sync line.
   - Report to the user: sync `status` (`synced` vs `up_to_date`), build `outcome` (`success` vs `failure`), `code` (e.g. `GBP-000`), `changed` file count, and the live URL.

## Log format

Each run appends one line to [`logs/gh-pages-sync.log`](../../logs/gh-pages-sync.log):

```
TIMESTAMP | trigger=manual_run | main=SHA | gh-pages=SHA | status=… | synced=yes|no | changed=N | docs_files=N | url=…
```

| `trigger` | Meaning |
|-----------|---------|
| `manual_run` | This skill or `./scripts/sync-gh-pages.sh` locally |
| `push` | GitHub Actions after `docs/**` change on `main` |
| `schedule` | Hourly drift check (UTC) |
| `workflow_dispatch` | Manual run from Actions tab |

See [`logs/README.md`](../../../logs/README.md) for full details (sync log + build status codes).

## Build status log

Each run also appends one line to [`logs/gh-pages-build-status.log`](../../../logs/gh-pages-build-status.log) with `outcome`, `code` (GBP-NNN), and `debug` phase codes — useful when GitHub Actions shows green but the live site is stale or verification fails.

## What the sync does

- Full replace of `gh-pages` branch `docs/` from `origin/main` (add/update/delete)
- Commits and pushes `gh-pages` only when the tree differs
- Commits the new log line to `main` when the log file changes

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `would be overwritten by checkout` | Commit or stash local changes, then re-run |
| `diff` / permission errors | Ensure git credentials can push both branches |
| Site still stale after sync | GitHub Pages may take 1–3 minutes; verify `origin/gh-pages:docs/js/…` |

## Related files

- [`scripts/sync-gh-pages.sh`](../../../scripts/sync-gh-pages.sh) — core sync logic
- [`.github/workflows/deploy-gh-pages.yml`](../../../.github/workflows/deploy-gh-pages.yml) — automated push + hourly schedule
