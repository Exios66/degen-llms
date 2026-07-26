---
name: posit-connect-publish
description: >-
  Render the degen-llms Quarto documentation website and publish it to the
  JackJBurleson Posit Connect Cloud account as its own content instance. Use when
  the user asks to publish/render/deploy the Quarto site, update Posit Connect
  Cloud for Mandalay Bay / degen-llms, or refresh jackjburleson Connect content
  for this repo. Never overwrite the PSYCH 755 content id.
---

# Posit Connect Cloud publish (degen-llms / JackJBurleson)

End-to-end workflow: **update Quarto pages → `quarto render` → publish NEW or existing degen-llms content → verify**.

## Hard rule: never overwrite PSYCH 755

| Field | Value |
|---|---|
| Account | `jackjburleson` |
| This project | Content id recorded in `_publish.yml` after first publish |
| Forbidden id | `019f9a10-ebb9-d1d5-839f-97e794bfd0ca` (PSYCH 755 CA manuscript) |

`scripts/publish_posit_degen_llms.py` refuses the forbidden id. First run **creates** a new content instance.

## Workflow

### 1. Update content

Edit `index.qmd`, `play.qmd`, and/or docs linked from `_quarto.yml`. Add new pages to `project.render` plus navbar/sidebar when user-facing.

### 2. Render

```bash
export PATH="$HOME/.local/bin:$PATH"
export PYTHONPATH="$PWD${PYTHONPATH:+:$PYTHONPATH}"
quarto check
quarto render
```

Needs Jupyter + pandas/matplotlib for `index.qmd` executable cells.

### 3. Authenticate

Prefer Cursor Cloud **Environment Secrets** (or shell env):

| Name | Value |
|------|--------|
| `POSIT_CONNECT_CLOUD_REFRESH_TOKEN` | From device OAuth (required for unattended publish) |
| `POSIT_CONNECT_CLOUD_ACCOUNT_ID` | `019f99e2-d77f-1f1d-7c50-e19abd9a0e5d` |
| `POSIT_CONNECT_CLOUD_ACCESS_TOKEN` | Optional; script refreshes from the refresh token |

If secrets are missing, run device-code OAuth (authorize as **jackjburleson**):

```bash
python scripts/publish_posit_degen_llms.py --skip-render
# prints https://login.posit.cloud/oauth/device?user_code=…
# on success writes /tmp/posit-tokens.json
```

Then copy `refresh_token` + account id into the Cloud Agent environment secrets so future runs skip the browser step. See [`CONTRIBUTING-POSIT.md`](../../../CONTRIBUTING-POSIT.md).

### 4. Publish

```bash
python scripts/publish_posit_degen_llms.py
# or
python scripts/publish_posit_degen_llms.py --force-new   # brand-new instance
python scripts/publish_posit_degen_llms.py --skip-render # reuse _site/
```

### 5. Verify

Fetch `https://<content-id>.share.connect.posit.cloud/` (not only the dashboard SPA). Assert title/body markers (`The Mandalay Bay`, guide links). Screenshot to `/opt/cursor/artifacts/connect-cloud-degen-llms.png` when possible.

## Related paths

- Manuscript: `index.qmd`
- Site config: `_quarto.yml`
- Publish target: `_publish.yml` (created on first publish)
- Helper: `scripts/publish_posit_degen_llms.py`
- Notes: `CONTRIBUTING-POSIT.md`
