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
| Content | **New instance** created by `scripts/publish_posit_degen_llms.py` (written into `_publish.yml`) |
| Do **not** overwrite | PSYCH 755 content `019f9a10-ebb9-d1d5-839f-97e794bfd0ca` |

After the first successful publish, `_publish.yml` records the new content id and dashboard URL. Subsequent publishes update **that** id only.

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
| Interactive web terminal + RPG | GitHub Pages (`gh-pages`) | `docs/**` HTML/JS |
| Documentation manuscript | Posit Connect Cloud | Quarto (`index.qmd`, guides) |

Do not replace the Pages deploy with this Quarto site — they serve different jobs.
