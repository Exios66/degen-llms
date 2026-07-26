---
name: sync-gh-pages
description: >-
  Legacy manual-only GitHub Pages sync. Prefer gh-pages-deploy-loop for all
  deploy tasks. Use only when the user explicitly invokes /sync-gh-pages or
  names this skill directly. Automatic push/schedule publish is disabled.
disable-model-invocation: true
---

# Sync GitHub Pages (`gh-pages`) — legacy

Publish the full `docs/` tree from `main` to the **`gh-pages`** branch so the live site matches local casino CSS, slot skins, horse sprites, hotel/RPG assets, and worldbuilding content.

**Prefer [`gh-pages-deploy-loop`](../gh-pages-deploy-loop/)** for new work.

**Live URL:** https://exios66.github.io/degen-llms/

## When to use

- User runs `/sync-gh-pages` or names this skill explicitly
- Otherwise use `/gh-pages-deploy-loop`

## Required behavior

1. **Run the skill wrapper** (sets `SYNC_TRIGGER=manual_run`):

   ```bash
   bash .cursor/skills/sync-gh-pages/scripts/run-sync.sh
   ```

   Do **not** call `scripts/sync-gh-pages.sh` without `SYNC_TRIGGER=manual_run` when using this skill.

2. **Pre-flight checks**
   - Working tree must be clean on `main`, or only contain changes already committed (the script checks out `gh-pages` and will abort if local edits block checkout).
   - Requires push access to `origin` for `main` and `gh-pages`.

3. **After the run**
   - Read the printed sync ping line (also appended to [`logs/gh-pages-sync.log`](../../../logs/gh-pages-sync.log)).
   - Read the build outcome line in [`logs/gh-pages-build-status.log`](../../../logs/gh-pages-build-status.log) — check `outcome`, `code`, and `debug`.
   - Confirm `trigger=manual_run` in both lines.
   - Report to the user: `status` (`synced` vs `up_to_date`), `changed` file count, build `code`/`debug`, and the live URL.

## Log format

Each run appends one line to [`logs/gh-pages-sync.log`](../../logs/gh-pages-sync.log):

```
TIMESTAMP | trigger=manual_run | main=SHA | gh-pages=SHA | status=… | synced=yes|no | changed=N | docs_files=N | url=…
```

| `trigger` | Meaning |
|-----------|---------|
| `manual_run` | This skill, deploy-loop, or local wrapper |
| `workflow_dispatch` | Manual run from Actions tab |
| `push` / `schedule` | **Historical only** — automation disabled in the workflow |

Build outcomes (success/failure, error codes, HTTP checks) are logged to [`logs/gh-pages-build-status.log`](../../../logs/gh-pages-build-status.log). Code reference: [`logs/README.md`](../../../logs/README.md).

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

- [`gh-pages-deploy-loop`](../gh-pages-deploy-loop/) — **preferred** skill
- [`scripts/sync-gh-pages.sh`](../../../scripts/sync-gh-pages.sh) — core sync logic
- [`.github/workflows/deploy-gh-pages.yml`](../../../.github/workflows/deploy-gh-pages.yml) — `workflow_dispatch` only
