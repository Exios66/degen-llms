#!/usr/bin/env bash
# Full sync of docs/ from main onto the gh-pages branch for GitHub Pages.
# Appends a line to logs/gh-pages-sync.log on every run (push or hourly ping).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SOURCE_BRANCH="${SOURCE_BRANCH:-main}"
TARGET_BRANCH="${TARGET_BRANCH:-gh-pages}"
LOG_FILE="${LOG_FILE:-logs/gh-pages-sync.log}"
SITE_URL="${SITE_URL:-https://exios66.github.io/degen-llms/}"
TRIGGER="${GITHUB_EVENT_NAME:-manual}"

git config user.name "${GIT_USER_NAME:-github-actions[bot]}"
git config user.email "${GIT_USER_EMAIL:-github-actions[bot]@users.noreply.github.com}"

mkdir -p logs
touch "$LOG_FILE"

git fetch origin "$SOURCE_BRANCH" "$TARGET_BRANCH" 2>/dev/null || git fetch origin "$SOURCE_BRANCH" 2>/dev/null || true

MAIN_SHA="$(git rev-parse "origin/$SOURCE_BRANCH")"
MAIN_SHA_SHORT="${MAIN_SHA:0:7}"

if git show-ref --verify --quiet "refs/remotes/origin/$TARGET_BRANCH"; then
  GH_SHA="$(git rev-parse "origin/$TARGET_BRANCH")"
else
  GH_SHA="none"
fi
GH_SHA_SHORT="${GH_SHA:0:7}"
[[ "$GH_SHA" == "none" ]] && GH_SHA_SHORT="none"

STAGING="$(mktemp -d)"
trap 'rm -rf "$STAGING"' EXIT

git archive "origin/$SOURCE_BRANCH" docs | tar -x -C "$STAGING"
touch "$STAGING/docs/.nojekyll"

# Compare main docs tree with current gh-pages docs (if branch exists).
CHANGED_FILES=0
if [[ "$GH_SHA" != "none" ]]; then
  GH_STAGING="$(mktemp -d)"
  git archive "origin/$TARGET_BRANCH" docs 2>/dev/null | tar -x -C "$GH_STAGING" || true
  if [[ -d "$GH_STAGING/docs" ]]; then
    CHANGED_FILES="$(diff -rq "$STAGING/docs" "$GH_STAGING/docs" 2>/dev/null | wc -l | tr -d ' ')"
  else
    CHANGED_FILES="all"
  fi
  rm -rf "$GH_STAGING"
else
  CHANGED_FILES="all"
fi

TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
STATUS="up_to_date"
SYNCED="no"

if [[ "$CHANGED_FILES" == "0" ]]; then
  echo "docs/ already matches origin/$SOURCE_BRANCH on origin/$TARGET_BRANCH"
else
  STATUS="synced"
  SYNCED="yes"

  if git show-ref --verify --quiet "refs/heads/$TARGET_BRANCH"; then
    git checkout "$TARGET_BRANCH"
  elif git show-ref --verify --quiet "refs/remotes/origin/$TARGET_BRANCH"; then
    git checkout -B "$TARGET_BRANCH" "origin/$TARGET_BRANCH"
  else
    git checkout --orphan "$TARGET_BRANCH"
    git rm -rf . 2>/dev/null || true
  fi

  rm -rf docs
  mkdir -p docs
  cp -a "$STAGING/docs/." docs/
  touch docs/.nojekyll

  git add -A docs/
  git commit -m "Sync gh-pages/docs/ from $SOURCE_BRANCH ($MAIN_SHA_SHORT)

Casino CSS, slot skins, horse sprites, hotel/RPG assets, and worldbuilding
content mirrored from main docs/.

Triggered by: $TRIGGER"
  git push origin "$TARGET_BRANCH"
  GH_SHA="$(git rev-parse HEAD)"
  GH_SHA_SHORT="${GH_SHA:0:7}"
  echo "Pushed full docs/ sync to origin/$TARGET_BRANCH ($GH_SHA_SHORT)"
fi

# Append ping log on main branch.
git checkout "$SOURCE_BRANCH" 2>/dev/null || git checkout -B "$SOURCE_BRANCH" "origin/$SOURCE_BRANCH"

MAIN_FILE_COUNT="$(find docs -type f 2>/dev/null | wc -l | tr -d ' ')"
LOG_LINE="$TIMESTAMP | trigger=$TRIGGER | main=$MAIN_SHA_SHORT | gh-pages=$GH_SHA_SHORT | status=$STATUS | synced=$SYNCED | changed=$CHANGED_FILES | docs_files=$MAIN_FILE_COUNT | url=$SITE_URL"

echo "$LOG_LINE" >> "$LOG_FILE"
echo "$LOG_LINE"

git add "$LOG_FILE"
if git diff --cached --quiet; then
  echo "Log file unchanged (already recorded)."
else
  git commit -m "Log gh-pages sync ping ($TIMESTAMP)"
  git push origin "$SOURCE_BRANCH"
fi

echo "Live site: $SITE_URL"
