#!/usr/bin/env bash
# Audit documentation surfaces for known stale claims and wiki/docs topic gaps.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

RED=$'\033[31m'
GRN=$'\033[32m'
YLW=$'\033[33m'
RST=$'\033[0m'

fail=0
SKILL_DIR=".cursor/skills/update-docs-parity"

echo "== Docs / wiki staleness audit =="
echo "Root: $ROOT"
echo

scan_paths=(
  README.md
  CONTRIBUTING-POSIT.md
  CHANGELOG.md
  pyproject.toml
  mandalay-bay.toml
  mandalay_bay/README.md
  index.qmd
  play.qmd
  rpg.qmd
  _quarto.yml
  docs
  wiki
  logs/README.md
  .cursor/skills/gh-pages-deploy-loop
  .cursor/skills/sync-gh-pages
  .cursor/skills/sync-github-wiki
  .cursor/skills/posit-connect-publish
  .cursor/skills/publish-mandalay-bay-pypi
)

echo "-- Stale phrase scan --"
patterns=(
  'digital casino CLI'
  'Five floors, eight activities'
  'Six floors, ten activities'
  'Seven floors, eleven activities'
  'Phase 1 pixel RPG'
  '16-bit JRPG'
  'Source: GitHub Actions'
  'hourly drift'
  'hourly cron'
  '12-hour GitHub Actions schedule'
  'EnvironmentTextures'
  'Ongoing — Craps, lottery'
  '180\+ tests'
)

tmp_hits="$(mktemp)"
trap 'rm -f "$tmp_hits"' EXIT

for pat in "${patterns[@]}"; do
  if command -v rg >/dev/null 2>&1; then
    rg -n --hidden \
      -g '!**/.git/**' -g '!**/_site/**' -g '!**/_freeze/**' -g '!**/node_modules/**' \
      -g "!${SKILL_DIR}/**" \
      -e "$pat" "${scan_paths[@]}" >>"$tmp_hits" 2>/dev/null || true
  else
    grep -RIn --exclude-dir=.git --exclude-dir=_site --exclude-dir=_freeze \
      --exclude-dir=update-docs-parity \
      -e "$pat" "${scan_paths[@]}" >>"$tmp_hits" 2>/dev/null || true
  fi
done

if [[ -s "$tmp_hits" ]]; then
  filtered="$(mktemp)"
  while IFS= read -r line; do
    if [[ "$line" =~ (no vendored|there is no|not.*assets/tiles|no.*assets/tiles|orphaned|dead modules|Removed) ]]; then
      continue
    fi
    if [[ "$line" =~ Phase\ 1\ —\ CLI ]]; then
      continue
    fi
    if [[ "$line" =~ (Disabled|disabled|historical|HISTORICAL|retired|no longer|Previously|FLOOR_ORDER) ]]; then
      continue
    fi
    if [[ "$line" =~ (never “digital casino|not “16-bit) ]]; then
      continue
    fi
    # Changelog / history may mention retired names when describing removals
    if [[ "$line" =~ ^CHANGELOG\.md: ]]; then
      continue
    fi
    printf '%s\n' "$line" >>"$filtered"
  done <"$tmp_hits"

  if [[ -s "$filtered" ]]; then
    echo "${RED}STALE HITS:${RST}"
    cat "$filtered"
    fail=1
  else
    echo "${GRN}No actionable stale phrase hits.${RST}"
  fi
  rm -f "$filtered"
else
  echo "${GRN}No stale phrase hits.${RST}"
fi
echo

echo "-- Wiki → docs topic parity --"
declare -A WIKI_TO_DOCS=(
  [About-The-Mandalay-Bay.md]=docs/about.md
  [Access-Points.md]=docs/access-points.md
  [Casino-Offerings.md]=docs/casino-offerings.md
  [Getting-Started.md]=docs/getting-started.md
  [Player-Guide.md]=docs/player-guide.md
  [Chip-Economy.md]=docs/chip-economy.md
  [Save-Slots.md]=docs/saves.md
  [Blackjack.md]=docs/blackjack.md
  [Table-Games.md]=docs/table-games.md
  [Slot-Machines.md]=docs/slots.md
  [Lottery-Counter.md]=docs/lottery.md
  [Sports-Book-and-Prediction-Markets.md]=docs/sportsbook.md
  [Trading-Floor.md]=docs/trading-floor.md
  [Arcade-Alley.md]=docs/arcade.md
  [Racing-and-Equestrian.md]=docs/racing.md
  [Resort-Hotel.md]=docs/hotel.md
  [Resort-Dining.md]=docs/dining.md
  [Pool-Complex.md]=docs/pool-complex.md
  [MGM-Rewards.md]=docs/mgm-rewards.md
  [Pixel-RPG-Simulator.md]=docs/pixel-rpg.md
  [Architecture.md]=docs/architecture.md
  [RNG-and-Fairness.md]=docs/rng.md
)

missing=0
for wiki_page in "${!WIKI_TO_DOCS[@]}"; do
  docs_page="${WIKI_TO_DOCS[$wiki_page]}"
  if [[ ! -f "wiki/$wiki_page" ]]; then
    echo "${RED}MISSING wiki page${RST}: wiki/$wiki_page (expected for $docs_page)"
    missing=1
    fail=1
    continue
  fi
  if [[ ! -f "$docs_page" ]]; then
    echo "${RED}MISSING docs counterpart${RST}: wiki/$wiki_page → $docs_page"
    missing=1
    fail=1
  fi
done
if [[ "$missing" -eq 0 ]]; then
  echo "${GRN}All mapped wiki topics have docs counterparts.${RST}"
fi
echo

echo "-- Quarto project.render coverage --"
if [[ ! -f _quarto.yml ]]; then
  echo "${RED}_quarto.yml missing${RST}"
  fail=1
else
  quarto_gap=0
  for docs_page in docs/*.md; do
    base="$(basename "$docs_page")"
    [[ "$base" == "README.md" ]] && continue
    if ! grep -qF "$docs_page" _quarto.yml; then
      echo "${RED}Not in _quarto.yml render/nav${RST}: $docs_page"
      quarto_gap=1
      fail=1
    fi
  done
  if [[ "$quarto_gap" -eq 0 ]]; then
    echo "${GRN}All docs/*.md guides referenced in _quarto.yml.${RST}"
  fi
fi
echo

echo "-- Floor catalog smoke (eight / twelve + Arcade Alley) --"
obsolete='Five floors, eight activities|Six floors, ten activities|Seven floors, eleven activities'
if rg -n "$obsolete" README.md docs wiki index.qmd 2>/dev/null; then
  echo "${RED}Found obsolete floor catalog count.${RST}"
  fail=1
elif rg -n 'Eight floors, twelve activities' README.md docs/casino-offerings.md wiki/Casino-Offerings.md >/dev/null 2>&1 \
  && rg -n 'Arcade Alley' README.md docs/casino-offerings.md wiki/Casino-Offerings.md wiki/Arcade-Alley.md >/dev/null 2>&1; then
  echo "${GRN}Canonical eight/twelve catalog + Arcade Alley present in key files.${RST}"
else
  echo "${YLW}WARN${RST}: could not confirm eight/twelve + Arcade Alley in key files"
  fail=1
fi
echo

if [[ "$fail" -ne 0 ]]; then
  echo "${RED}AUDIT FAILED${RST} — fix hits above before publishing."
  exit 1
fi
echo "${GRN}AUDIT PASSED${RST}"
exit 0
