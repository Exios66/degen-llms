# Access Points

Every way to play or read about **The Mandalay Bay**.

## Live surfaces

| Surface | URL / command | Saves |
|---------|---------------|-------|
| **Web terminal** | https://exios66.github.io/degen-llms/ | `localStorage` (`mandalay-bay-library`) |
| **Pixel RPG** | https://exios66.github.io/degen-llms/rpg/ | Same browser save library + RPG position |
| **CLI** | `python3 -m mandalay_bay` | `~/.mandalay_bay/saves/` |
| **Standalone blackjack** | `python3 -m blackjack` | Internal bankroll only |
| **Quarto docs** | https://019f9a67-d5c9-226b-b6b1-a86d1655be69.share.connect.posit.cloud/ | N/A (documentation) |
| **GitHub Wiki** | https://github.com/Exios66/degen-llms/wiki | N/A (documentation) |

## Web terminal deep links

| View | URL |
|------|-----|
| Casino floor | `https://exios66.github.io/degen-llms/` |
| Hotel lobby | `https://exios66.github.io/degen-llms/?view=hotel-lobby` |
| Pixel RPG | `https://exios66.github.io/degen-llms/rpg/` |

**Web-only highlights:** [Strip Ride](strip-ride.md) limo / Uber / Lyft to themed away casinos; Rewards Phone audio + Connect dial; dynamic viewport / safe-area chrome for overlays and the phone shell.

## CLI quick reference

```bash
git clone https://github.com/Exios66/degen-llms.git
cd degen-llms
python3 -m mandalay_bay                  # Save library → casino floor
python3 -m mandalay_bay --list-saves     # View save slots
python3 -m mandalay_bay --slot 1 --new-save --name "Ace"
python3 -m blackjack                     # Standalone blackjack
```

## Save portability

| Surface pair | Shared? |
|--------------|---------|
| CLI ↔ CLI | Yes (same save directory) |
| Web terminal ↔ Pixel RPG | Yes (same `localStorage` slot) |
| CLI ↔ Browser | **No** — different storage backends |

## Documentation mirrors

| Location | Content |
|----------|---------|
| **GitHub Wiki** (`wiki/` in repo) | Player guides, architecture, RPG design |
| **`docs/` in repo** | Markdown guides (source for Quarto + this site) |
| **Posit Connect Cloud** | Rendered Quarto website |
| **In-game Casino Guide** | Quick rules reference from the lobby |

## Deployment

- **GitHub Pages (interactive game):** `main/docs/` is mirrored to the **`gh-pages`** branch `/docs` folder. Pages source must be **Deploy from branch → `gh-pages` → `/docs`**. Automatic push/schedule deploy is **disabled** (billing limits); publish with the `gh-pages-deploy-loop` skill or optional Actions `workflow_dispatch`.
- **Posit Connect Cloud (docs site):** `quarto render` + `scripts/publish_posit_degen_llms.py`
- **GitHub Wiki:** `wiki/` → sync with `bash scripts/sync-github-wiki.sh` (manual; no Actions)

See [Adding Activities](adding-activities.md) and [CONTRIBUTING-POSIT.md](../CONTRIBUTING-POSIT.md) for maintainer workflows.
