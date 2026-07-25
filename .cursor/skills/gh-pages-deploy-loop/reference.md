# GitHub Pages deploy loop — reference

## Live site

- **URL:** https://exios66.github.io/degen-llms/
- **Source:** `gh-pages` branch, `/docs` folder
- **Content origin:** `main/docs/`

## Workflow triggers

| Event | Status | `trigger` in logs |
|-------|--------|-------------------|
| Skill / local wrapper | **Active** | `manual_run` |
| `workflow_dispatch` | **Active** (optional) | `workflow_dispatch` |
| `schedule` | **Disabled** | `schedule` (historical log lines only) |
| `push` | **Disabled** | `push` (historical log lines only) |

## Manual commands

```bash
# Preferred (skill wrapper — logs manual_run)
bash .cursor/skills/gh-pages-deploy-loop/scripts/run-manual.sh

# Actions UI alternative
gh workflow run deploy-gh-pages.yml

# Direct (only if you set SYNC_TRIGGER yourself)
SYNC_TRIGGER=manual_run bash scripts/sync-gh-pages.sh
```

## Outcome codes (summary)

| Code | Meaning |
|------|---------|
| `GBP-000` | Success |
| `GBP-002` | Dirty working tree |
| `GBP-003` | Push rejected |
| `GBP-006`–`007` | Live verification failed |
| `GBP-010` | Actions job failed (often billing lock) |

See [`logs/README.md`](../../../logs/README.md) for the full table.

## Verify without syncing

```bash
bash scripts/verify-gh-pages-live.sh
```

## Pages settings (one-time)

Repository **Settings → Pages → Deploy from branch → `gh-pages` → `/docs`**.
