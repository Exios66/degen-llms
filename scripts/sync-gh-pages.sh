#!/usr/bin/env bash
# Full sync of docs/ from main onto the gh-pages branch for GitHub Pages.
# Appends to logs/gh-pages-sync.log (sync ping) and logs/gh-pages-build-status.log (outcome + codes).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/lib/gh-pages-build-log.sh
source "$ROOT/scripts/lib/gh-pages-build-log.sh"

SOURCE_BRANCH="${SOURCE_BRANCH:-main}"
TARGET_BRANCH="${TARGET_BRANCH:-gh-pages}"
LOG_FILE="${LOG_FILE:-logs/gh-pages-sync.log}"
SITE_URL="${SITE_URL:-https://exios66.github.io/degen-llms/}"
TRIGGER="${SYNC_TRIGGER:-${GITHUB_EVENT_NAME:-manual_run}}"
RUN_ID="${GITHUB_RUN_ID:-}"
RUN_ATTEMPT="${GITHUB_RUN_ATTEMPT:-1}"

BUILD_LOGGED=0
SYNC_DEBUG_CODES=()
SYNC_ERROR=""
VERIFY_FAILED=0

git config user.name "${GIT_USER_NAME:-github-actions[bot]}"
git config user.email "${GIT_USER_EMAIL:-github-actions[bot]@users.noreply.github.com}"

mkdir -p logs
touch "$LOG_FILE" "$GBP_BUILD_LOG_FILE"

commit_logs() {
  git add "$LOG_FILE" "$GBP_BUILD_LOG_FILE"
  if git diff --cached --quiet; then
    echo "Log files unchanged (already recorded)."
    return 0
  fi
  local log_timestamp
  log_timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  git commit -m "Log gh-pages sync and build status ($log_timestamp)"
  git push origin "$SOURCE_BRANCH"
}

record_build_status() {
  local outcome="$1"
  local code="$2"
  local debug="$3"
  local error_msg="${4:-}"

  local merged_debug="$debug"
  if ((${#SYNC_DEBUG_CODES[@]})); then
    local sync_debug
    sync_debug="$(IFS=,; echo "${SYNC_DEBUG_CODES[*]}")"
    if [[ -n "$merged_debug" ]]; then
      merged_debug="${sync_debug},${merged_debug}"
    else
      merged_debug="$sync_debug"
    fi
  fi

  gh_pages_build_log_append "$outcome" "$code" "$merged_debug" "$error_msg"
  BUILD_LOGGED=1
}

on_script_error() {
  local exit_code=$?
  if [[ "$BUILD_LOGGED" -eq 1 ]]; then
    exit "$exit_code"
  fi
  local err="${SYNC_ERROR:-Unexpected error at line $1 (exit ${exit_code})}"
  record_build_status "failure" "$GBP_CODE_SCRIPT_ERROR" "$GBP_DEBUG_FAIL_TRAP" "$err"
  commit_logs || true
  exit "$exit_code"
}

trap 'on_script_error $LINENO' ERR

gh_pages_build_log_set "trigger" "$TRIGGER"
gh_pages_build_log_set "deploy_method" "gh-pages-branch-docs"
gh_pages_build_log_set "url" "$SITE_URL"
[[ -n "$RUN_ID" ]] && gh_pages_build_log_set "workflow_run_id" "$RUN_ID"
gh_pages_build_log_set "workflow_attempt" "$RUN_ATTEMPT"

if ! git diff --quiet || ! git diff --cached --quiet; then
  SYNC_ERROR="Local tracked changes would block gh-pages checkout; commit or stash before syncing"
  record_build_status "failure" "$GBP_CODE_CHECKOUT_BLOCKED" "" "$SYNC_ERROR"
  commit_logs || true
  exit 1
fi

git fetch origin "$SOURCE_BRANCH" "$TARGET_BRANCH" 2>/dev/null || {
  if ! git fetch origin "$SOURCE_BRANCH" 2>/dev/null; then
    SYNC_ERROR="git fetch failed for origin/${SOURCE_BRANCH}"
    record_build_status "failure" "$GBP_CODE_FETCH_FAILED" "$GBP_DEBUG_SYNC_FETCH_PARTIAL" "$SYNC_ERROR"
    commit_logs
    exit 1
  fi
  SYNC_DEBUG_CODES+=("$GBP_DEBUG_SYNC_FETCH_PARTIAL")
}

MAIN_SHA="$(git rev-parse "origin/$SOURCE_BRANCH")"
MAIN_SHA_SHORT="${MAIN_SHA:0:7}"
gh_pages_build_log_set "main" "$MAIN_SHA_SHORT"

if git show-ref --verify --quiet "refs/remotes/origin/$TARGET_BRANCH"; then
  GH_SHA="$(git rev-parse "origin/$TARGET_BRANCH")"
else
  GH_SHA="none"
fi
GH_SHA_SHORT="${GH_SHA:0:7}"
[[ "$GH_SHA" == "none" ]] && GH_SHA_SHORT="none"
gh_pages_build_log_set "gh-pages" "$GH_SHA_SHORT"

STAGING="$(mktemp -d)"
trap 'rm -rf "$STAGING"' EXIT

if ! git archive "origin/$SOURCE_BRANCH" docs | tar -x -C "$STAGING"; then
  SYNC_ERROR="git archive failed for origin/${SOURCE_BRANCH}:docs"
  record_build_status "failure" "$GBP_CODE_ARCHIVE_FAILED" "" "$SYNC_ERROR"
  commit_logs
  exit 1
fi
touch "$STAGING/docs/.nojekyll"

CHANGED_FILES=0
if [[ "$GH_SHA" != "none" ]]; then
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
gh_pages_build_log_set "changed" "$CHANGED_FILES"

TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
STATUS="up_to_date"
SYNCED="no"

if [[ "$CHANGED_FILES" == "0" ]]; then
  echo "docs/ already matches origin/$SOURCE_BRANCH on origin/$TARGET_BRANCH"
  SYNC_DEBUG_CODES+=("$GBP_DEBUG_SYNC_UP_TO_DATE")
else
  STATUS="synced"
  SYNCED="yes"
  SYNC_DEBUG_CODES+=("$GBP_DEBUG_SYNC_PUSHED")

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

  if [[ -f docs/index.html ]]; then
    sed -i "s/__ASSET_SHA__/${MAIN_SHA_SHORT}/g" docs/index.html
  fi

  git add -A docs/
  if ! git commit -m "Sync gh-pages/docs/ from $SOURCE_BRANCH ($MAIN_SHA_SHORT)

Casino CSS, slot skins, horse sprites, hotel/RPG assets, and worldbuilding
content mirrored from main docs/.

Triggered by: $TRIGGER"; then
    SYNC_ERROR="git commit failed on ${TARGET_BRANCH}"
    record_build_status "failure" "$GBP_CODE_COMMIT_FAILED" "" "$SYNC_ERROR"
    git checkout "$SOURCE_BRANCH" 2>/dev/null || git checkout -B "$SOURCE_BRANCH" "origin/$SOURCE_BRANCH"
    commit_logs
    exit 1
  fi

  if ! git push origin "$TARGET_BRANCH"; then
    SYNC_ERROR="git push rejected for origin/${TARGET_BRANCH} (non-fast-forward or permissions)"
    record_build_status "failure" "$GBP_CODE_PUSH_REJECTED" "$GBP_DEBUG_FAIL_PUSH_NFF" "$SYNC_ERROR"
    git checkout "$SOURCE_BRANCH" 2>/dev/null || git checkout -B "$SOURCE_BRANCH" "origin/$SOURCE_BRANCH"
    commit_logs
    exit 1
  fi

  GH_SHA="$(git rev-parse HEAD)"
  GH_SHA_SHORT="${GH_SHA:0:7}"
  gh_pages_build_log_set "gh-pages" "$GH_SHA_SHORT"
  echo "Pushed full docs/ sync to origin/$TARGET_BRANCH ($GH_SHA_SHORT)"
fi

git checkout "$SOURCE_BRANCH" 2>/dev/null || git checkout -B "$SOURCE_BRANCH" "origin/$SOURCE_BRANCH"

MAIN_FILE_COUNT="$(find docs -type f 2>/dev/null | wc -l | tr -d ' ')"
gh_pages_build_log_set "sync_status" "$STATUS"
gh_pages_build_log_set "synced" "$SYNCED"
gh_pages_build_log_set "docs_files" "$MAIN_FILE_COUNT"

LOG_LINE="$TIMESTAMP | trigger=$TRIGGER | main=$MAIN_SHA_SHORT | gh-pages=$GH_SHA_SHORT | status=$STATUS | synced=$SYNCED | changed=$CHANGED_FILES | docs_files=$MAIN_FILE_COUNT | url=$SITE_URL"
echo "$LOG_LINE" >> "$LOG_FILE"
echo "$LOG_LINE"

trap - ERR

GBP_VERIFY_CONTEXT_ONLY=1 bash "$ROOT/scripts/verify-gh-pages-live.sh" || VERIFY_FAILED=1

VERIFY_DEBUG=""
for ctx in "${GBP_BUILD_LOG_CONTEXT[@]}"; do
  if [[ "$ctx" == verify_debug=* ]]; then
    VERIFY_DEBUG="${ctx#verify_debug=}"
  fi
done

if [[ "$VERIFY_FAILED" -eq 1 ]]; then
  record_build_status "failure" "$GBP_CODE_VERIFY_FAILED" "${VERIFY_DEBUG},${GBP_DEBUG_FAIL_VERIFY}" "Live site verification failed after sync"
else
  record_build_status "success" "$GBP_CODE_SUCCESS" "$VERIFY_DEBUG" ""
fi

commit_logs
echo "Live site: $SITE_URL"
exit "$VERIFY_FAILED"
