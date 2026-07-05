#!/usr/bin/env bash
# Full sync of docs/ from main onto the gh-pages branch for GitHub Pages.
# Appends to logs/gh-pages-sync.log and logs/gh-pages-build-status.log on every run.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck source=lib/gh-pages-build-log.sh
source "$ROOT/scripts/lib/gh-pages-build-log.sh"

SOURCE_BRANCH="${SOURCE_BRANCH:-main}"
TARGET_BRANCH="${TARGET_BRANCH:-gh-pages}"
LOG_FILE="${LOG_FILE:-logs/gh-pages-sync.log}"
SITE_URL="${SITE_URL:-https://exios66.github.io/degen-llms/}"
TRIGGER="${SYNC_TRIGGER:-${GITHUB_EVENT_NAME:-manual_run}}"
SKIP_VERIFY="${SKIP_VERIFY:-0}"

git config user.name "${GIT_USER_NAME:-github-actions[bot]}"
git config user.email "${GIT_USER_EMAIL:-github-actions[bot]@users.noreply.github.com}"

mkdir -p logs
touch "$LOG_FILE" "$BUILD_STATUS_LOG"

MAIN_SHA=""
MAIN_SHA_SHORT=""
GH_SHA_BEFORE=""
GH_SHA_BEFORE_SHORT="none"
GH_SHA_AFTER=""
GH_SHA_AFTER_SHORT="none"
CHANGED_FILES=0
STATUS="unknown"
SYNCED="no"
MAIN_FILE_COUNT=0
TIMESTAMP=""
STAGING=""

fail_build() {
  local dbg="$1"
  local msg="$2"
  build_debug_add "$dbg"
  BUILD_LAST_ERROR="$msg"
  if [[ "$BUILD_OUTCOME_WRITTEN" -eq 0 ]]; then
    write_build_status_failure "$msg"
    commit_build_status_log || true
  fi
  exit 1
}

on_unexpected_err() {
  local exit_code=$?
  if [[ "$BUILD_OUTCOME_WRITTEN" -eq 0 ]]; then
    local msg="${BUILD_LAST_ERROR:-Unexpected error (exit $exit_code)}"
    local last_dbg="${BUILD_DEBUG[${#BUILD_DEBUG[@]}-1]:-}"
    case "$last_dbg" in
      GBP-FAIL-*) ;;
      *) build_debug_add "$DBG_FAIL_CHECKOUT" ;;
    esac
    write_build_status_failure "$msg"
    commit_build_status_log || true
  fi
  exit "$exit_code"
}

cleanup() {
  [[ -n "$STAGING" ]] && rm -rf "$STAGING" 2>/dev/null || true
}

trap cleanup EXIT
trap on_unexpected_err ERR

build_debug_add "$DBG_START"

if ! git fetch origin "$SOURCE_BRANCH" "$TARGET_BRANCH" 2>/dev/null; then
  if ! git fetch origin "$SOURCE_BRANCH" 2>/dev/null; then
    fail_build "$DBG_FAIL_FETCH" "Unable to fetch origin/$SOURCE_BRANCH (and $TARGET_BRANCH if present)"
  fi
fi

MAIN_SHA="$(git rev-parse "origin/$SOURCE_BRANCH")"
MAIN_SHA_SHORT="${MAIN_SHA:0:7}"

if git show-ref --verify --quiet "refs/remotes/origin/$TARGET_BRANCH"; then
  GH_SHA_BEFORE="$(git rev-parse "origin/$TARGET_BRANCH")"
  GH_SHA_BEFORE_SHORT="${GH_SHA_BEFORE:0:7}"
else
  GH_SHA_BEFORE="none"
  GH_SHA_BEFORE_SHORT="none"
fi

GH_SHA_AFTER="$GH_SHA_BEFORE"
GH_SHA_AFTER_SHORT="$GH_SHA_BEFORE_SHORT"

STAGING="$(mktemp -d)"

if ! git archive "origin/$SOURCE_BRANCH" docs | tar -x -C "$STAGING"; then
  fail_build "$DBG_FAIL_ARCHIVE" "Failed to archive docs/ from origin/$SOURCE_BRANCH"
fi
touch "$STAGING/docs/.nojekyll"

CHANGED_FILES=0
if [[ "$GH_SHA_BEFORE" != "none" ]]; then
  GH_STAGING="$(mktemp -d)"
  git archive "origin/$TARGET_BRANCH" docs 2>/dev/null | tar -x -C "$GH_STAGING" || true
  if [[ -d "$GH_STAGING/docs" ]]; then
    CHANGED_FILES="$(diff -rq "$STAGING/docs" "$GH_STAGING/docs" 2>/dev/null | wc -l | tr -d ' ' || true)"
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
  build_debug_add "$DBG_UP_TO_DATE"
else
  STATUS="synced"
  SYNCED="yes"

  if git show-ref --verify --quiet "refs/heads/$TARGET_BRANCH"; then
    git checkout "$TARGET_BRANCH" || fail_build "$DBG_FAIL_CHECKOUT" "Checkout local $TARGET_BRANCH failed"
  elif git show-ref --verify --quiet "refs/remotes/origin/$TARGET_BRANCH"; then
    git checkout -B "$TARGET_BRANCH" "origin/$TARGET_BRANCH" || fail_build "$DBG_FAIL_CHECKOUT" "Checkout origin/$TARGET_BRANCH failed"
  else
    git checkout --orphan "$TARGET_BRANCH" || fail_build "$DBG_FAIL_CHECKOUT" "Create orphan $TARGET_BRANCH failed"
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

  if ! git push origin "$TARGET_BRANCH"; then
    fail_build "$DBG_FAIL_PUSH" "Push to origin/$TARGET_BRANCH failed"
  fi

  GH_SHA_AFTER="$(git rev-parse HEAD)"
  GH_SHA_AFTER_SHORT="${GH_SHA_AFTER:0:7}"
  build_debug_add "$DBG_SYNCED"
  echo "Pushed full docs/ sync to origin/$TARGET_BRANCH ($GH_SHA_AFTER_SHORT)"
fi

if ! git checkout "$SOURCE_BRANCH" 2>/dev/null; then
  if ! git checkout -B "$SOURCE_BRANCH" "origin/$SOURCE_BRANCH"; then
    fail_build "$DBG_FAIL_MAIN" "Return checkout to $SOURCE_BRANCH failed"
  fi
fi

MAIN_FILE_COUNT="$(find docs -type f 2>/dev/null | wc -l | tr -d ' ')"
SYNC_LOG_LINE="$TIMESTAMP | trigger=$TRIGGER | main=$MAIN_SHA_SHORT | gh-pages=$GH_SHA_AFTER_SHORT | status=$STATUS | synced=$SYNCED | changed=$CHANGED_FILES | docs_files=$MAIN_FILE_COUNT | url=$SITE_URL"

echo "$SYNC_LOG_LINE" >> "$LOG_FILE"
echo "$SYNC_LOG_LINE"

if [[ "$SKIP_VERIFY" != "1" ]]; then
  if bash "$ROOT/scripts/verify-gh-pages.sh"; then
    build_debug_add "$DBG_VERIFY_OK"
  else
    fail_build "$DBG_FAIL_VERIFY" "Live site verification failed after sync"
  fi
else
  echo "Skipping live site verification (SKIP_VERIFY=1)"
  build_debug_add "$DBG_VERIFY_OK"
fi

write_build_status_success "$TIMESTAMP"

git add "$LOG_FILE" "$BUILD_STATUS_LOG"
if git diff --cached --quiet; then
  echo "Log files unchanged (already recorded)."
else
  if ! git commit -m "Log gh-pages sync and build status ($TIMESTAMP)"; then
    fail_build "$DBG_FAIL_LOG" "Commit sync/build logs to $SOURCE_BRANCH failed"
  fi
  if ! git push origin "$SOURCE_BRANCH"; then
    fail_build "$DBG_FAIL_LOG" "Push sync/build logs to origin/$SOURCE_BRANCH failed"
  fi
fi

trap - ERR
echo "Live site: $SITE_URL"
