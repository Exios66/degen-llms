---
name: update-docs-parity
description: >-
  Refresh The Mandalay Bay documentation across docs/, wiki/, Quarto, README,
  and agent skills to current product accuracy. Use when the user asks to update
  all documentation, fix stale docs/wiki references, bring docs into wiki parity,
  refresh Quarto guides, or invokes /update-docs-parity. Removes outdated deploy,
  branding, and feature claims; publishes wiki and Posit when requested.
disable-model-invocation: true
---

# Update docs / wiki parity (degen-llms)

Keep every documentation surface aligned with the **live product** and with each other.

Invoke via **`/update-docs-parity`**.

## Documentation surfaces (all required)

| Surface | Path / URL | Role |
|---------|------------|------|
| Repo guides | [`docs/*.md`](../../../docs/), [`docs/rpg/GDD.md`](../../../docs/rpg/GDD.md) | Quarto source + in-repo guides |
| Quarto site | [`_quarto.yml`](../../../_quarto.yml), `index.qmd`, `play.qmd`, `rpg.qmd` | Posit Connect manuscript |
| GitHub Wiki source | [`wiki/`](../../../wiki/) | PR-reviewed wiki pages |
| Live wiki | https://github.com/Exios66/degen-llms/wiki | Published via `/sync-github-wiki` |
| Root README | [`README.md`](../../../README.md) | Product identity + floor catalog |
| Package READMEs / manifests | [`mandalay_bay/README.md`](../../../mandalay_bay/README.md), [`mandalay-bay.toml`](../../../mandalay-bay.toml), [`pyproject.toml`](../../../pyproject.toml) | PyPI / monorepo blurbs |
| Agent skills | [`.cursor/skills/`](../) | Deploy/publish truth (no stale automation claims) |
| Deploy notes | [`CONTRIBUTING-POSIT.md`](../../../CONTRIBUTING-POSIT.md), [`logs/README.md`](../../../logs/README.md) | Posit vs Pages |

**Parity rule:** Every player/dev topic on the wiki must have a matching `docs/*.md` page (or an intentional pointer), and that page must be listed in `_quarto.yml` (`project.render` + navbar + sidebar). Wiki links use `[[Wiki-Title]]`; docs/Quarto use relative Markdown links.

Topic map and stale-phrase greps: [`reference.md`](reference.md).

## Canonical product facts (do not regress)

Use these unless code proves otherwise:

1. **Identity:** Full **resort simulator** (CLI + web terminal + pixel RPG) — never “digital casino CLI only.”
2. **Casino floor:** Match [`mandalay_bay/activities/registry.py`](../../../mandalay_bay/activities/registry.py) `FLOOR_ORDER` / `ALL_ACTIVITIES`. Current: **seven floors, eleven activities** — Table Games (blackjack, Hold'em, roulette, craps), slots, lottery, sports book (+ prediction markets), **Trading Floor**, racing, equestrian.
3. **Off-floor:** Hotel, resort dining (capacity overlay), pool complex, MGM Rewards, amenities/bars, VIP venues.
4. **RPG branding:** **Pokémon-style** pixel overworld (not “16-bit JRPG”).
5. **RPG art boot path:** Procedural via `TextureFactory.js` — **no** vendored `assets/tiles/` on the live path; tuxedo-style guest sprites + wardrobe.
6. **GitHub Pages:** Source = **Deploy from branch → `gh-pages` → `/docs`**. Automatic push/schedule is **disabled**. Prefer [`gh-pages-deploy-loop`](../gh-pages-deploy-loop/); `sync-gh-pages` is legacy.
7. **Wiki publish:** Manual only — [`sync-github-wiki`](../sync-github-wiki/).
8. **Posit:** Separate docs manuscript — [`posit-connect-publish`](../posit-connect-publish/). Never overwrite PSYCH 755 id `019f9a10-ebb9-d1d5-839f-97e794bfd0ca`.
9. **Tests:** Prefer “200+” (count `def test_` in `tests/` if unsure).
10. **History:** Craps, lottery, Hold'em, prediction markets, Trading Floor, and resort dining are **shipped** (Phases 5–7+). “Ongoing” must not list shipped games.

## Workflow

### 1. Audit

```bash
bash .cursor/skills/update-docs-parity/scripts/audit-docs-staleness.sh
```

Also compare:

- Live activity list: `mandalay_bay/activities/registry.py` / `docs/js/` modules
- Wiki sidebar vs `docs/README.md` vs `_quarto.yml` render/navbar
- RPG claims vs `docs/rpg/GDD.md` and `docs/rpg/js/` boot path

### 2. Fix content (full parity default)

Unless the user narrows scope:

1. Update or add **`docs/*.md`** for every wiki topic gap.
2. Mirror factual fixes into **`wiki/*.md`** (wiki may keep screenshots/`images/`).
3. Wire new docs pages into **`_quarto.yml`** (`project.render`, navbar menus, sidebar).
4. Refresh **`docs/README.md`**, root **`README.md`**, **`index.qmd` / `play.qmd` / `rpg.qmd`**.
5. Fix stale claims in **skills**, **CONTRIBUTING-POSIT.md**, **logs/README.md**, package manifests.
6. Keep **link style** correct per surface (wiki `[[Page]]` vs docs relative `.md`).

When adding a game/activity elsewhere in the repo, documentation step is mandatory: `docs/your-game.md` + `docs/README.md` + `_quarto.yml` + `wiki/` page (see `docs/adding-activities.md`).

### 3. Verify

```bash
# Stale phrases should be empty (allowlisted history “Phase 1” in About is OK)
bash .cursor/skills/update-docs-parity/scripts/audit-docs-staleness.sh

# Quarto (needs Quarto ≥ 1.10, venv with jupyter/pandas/matplotlib)
source .venv/bin/activate
export PATH="$HOME/.local/bin:$PATH" PYTHONPATH="$PWD"
quarto render
```

Confirm new HTML appears under `_site/docs/`.

### 4. Publish (when user asks to publish, or “publish all”)

| Step | Skill / command |
|------|-----------------|
| GitHub Wiki | `bash .cursor/skills/sync-github-wiki/scripts/run-sync.sh` |
| Posit Connect | Follow [`posit-connect-publish`](../posit-connect-publish/) |
| GitHub Pages (game) | Only if interactive `docs/` HTML/JS changed — [`gh-pages-deploy-loop`](../gh-pages-deploy-loop/) |

Report each surface URL and whether publish succeeded. If Posit needs device OAuth, print the URL/code and wait; do not invent tokens.

## Done checklist

- [ ] No stale deploy/branding/feature phrases (audit script clean)
- [ ] Wiki sidebar topics ⊆ docs + Quarto navbar
- [ ] Floor catalog matches registry (`FLOOR_ORDER` / activity count) everywhere it appears
- [ ] RPG = Pokémon-style + TextureFactory live path
- [ ] `quarto render` succeeds if Quarto pages changed
- [ ] Wiki synced if `wiki/` changed and publish requested
- [ ] Posit republished if Quarto changed and publish requested

## Related skills

- [`sync-github-wiki`](../sync-github-wiki/) — push `wiki/` live
- [`posit-connect-publish`](../posit-connect-publish/) — Quarto → Connect Cloud
- [`gh-pages-deploy-loop`](../gh-pages-deploy-loop/) — interactive game site
- [`sync-gh-pages`](../sync-gh-pages/) — legacy Pages helper
