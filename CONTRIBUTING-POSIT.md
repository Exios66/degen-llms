---
title: "Posit Connect Cloud deploy notes"
subtitle: "New content instance for degen-llms (do not overwrite PSYCH 755)"
date: last-modified
---

# Posit Connect Cloud deploy notes

This repository publishes a **Quarto website** to the JackJBurleson Posit Connect Cloud account.

## Canonical targets

| Field | Value |
|-------|-------|
| Account | `jackjburleson` |
| Account id | `019f99e2-d77f-1f1d-7c50-e19abd9a0e5d` |
| Content | `019f9a67-d5c9-226b-b6b1-a86d1655be69` (see `_publish.yml`) |
| Public share | https://019f9a67-d5c9-226b-b6b1-a86d1655be69.share.connect.posit.cloud/ |
| Do **not** overwrite | PSYCH 755 content `019f9a10-ebb9-d1d5-839f-97e794bfd0ca` |

After the first successful publish, `_publish.yml` records the new content id and dashboard URL. Subsequent publishes update **that** id only.

## Cursor Cloud Agent secrets (recommended)

Add these as **Environment Secrets** on the degen-llms Cloud Agent environment so agents can publish without interactive OAuth:

| Secret name | Notes |
|-------------|--------|
| `POSIT_CONNECT_CLOUD_REFRESH_TOKEN` | Long-lived; obtain via device OAuth (`python scripts/publish_posit_degen_llms.py` or skill setup) |
| `POSIT_CONNECT_CLOUD_ACCOUNT_ID` | `019f99e2-d77f-1f1d-7c50-e19abd9a0e5d` |
| `POSIT_CONNECT_CLOUD_ACCESS_TOKEN` | Optional / short-lived; refresh token alone is enough |

Dashboard: [Cloud Agents → Exios66/degen-llms environment](https://cursor.com/dashboard/cloud-agents/environments/e/9678f00e-885d-11f1-b532-320a589b8025)

Never commit tokens to git. Session caches may live in `/tmp/posit-tokens.json` (gitignored).

## Local render

Requires Quarto ≥ 1.10 and a Python environment with the repo on `PYTHONPATH` (repo root) plus `jupyter` / `matplotlib` / `pandas` for executable cells in `index.qmd`.

```bash
export PATH="$HOME/.local/bin:$PATH"
quarto check
quarto render    # writes _site/
```

## Publish (create or update)

```bash
# First publish creates a NEW Connect Cloud content item:
python scripts/publish_posit_degen_llms.py

# Later revisions update the id stored in _publish.yml:
python scripts/publish_posit_degen_llms.py --skip-render
```

Auth options:

1. Environment variables: `POSIT_CONNECT_CLOUD_ACCESS_TOKEN`, `POSIT_CONNECT_CLOUD_REFRESH_TOKEN`, optional `POSIT_CONNECT_CLOUD_ACCOUNT_ID`
2. Device-code OAuth (script prints a URL + code; authorize as JackJBurleson)

Hard safety check: the helper **refuses** to publish to content id `019f9a10-ebb9-d1d5-839f-97e794bfd0ca`.

## Verify

Use the public share URL:

`https://<content-id>.share.connect.posit.cloud/`

Assert HTTP 200, title contains “Mandalay Bay”, and body includes activity / docs markers.

## Relationship to GitHub Pages

| Surface | Host | Source |
|---------|------|--------|
| Interactive web terminal + RPG | GitHub Pages (`gh-pages` branch `/docs`) | `main/docs/**` HTML/JS |
| Documentation manuscript | Posit Connect Cloud | Quarto (`index.qmd`, guides) |
| GitHub Wiki | github.com/Exios66/degen-llms/wiki | `wiki/` (manual sync) |

Do not replace the Pages deploy with this Quarto site — they serve different jobs.

**Pages publish:** Prefer `bash .cursor/skills/gh-pages-deploy-loop/scripts/run-manual.sh`. Automatic push/schedule Actions are disabled; optional `workflow_dispatch` remains. Pages source must be **Deploy from branch → `gh-pages` → `/docs`**. The legacy `sync-gh-pages` skill is manual-only.
