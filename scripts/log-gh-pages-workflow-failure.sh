#!/usr/bin/env bash
# Record a GitHub Actions workflow failure when sync-gh-pages.sh never completes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/lib/gh-pages-build-log.sh
source "$ROOT/scripts/lib/gh-pages-build-log.sh"

TRIGGER="${GITHUB_EVENT_NAME:-workflow_dispatch}"
RUN_ID="${GITHUB_RUN_ID:-local}"
RUN_ATTEMPT="${GITHUB_RUN_ATTEMPT:-1}"
JOB_STATUS="${1:-failure}"
ERROR_MSG="${2:-GitHub Actions job did not complete sync-gh-pages.sh}"

git config user.name "${GIT_USER_NAME:-github-actions[bot]}"
git config user.email "${GIT_USER_EMAIL:-github-actions[bot]@users.noreply.github.com}"

mkdir -p logs
touch "$GBP_BUILD_LOG_FILE"

gh_pages_build_log_set "trigger" "$TRIGGER"
gh_pages_build_log_set "workflow_run_id" "$RUN_ID"
gh_pages_build_log_set "workflow_attempt" "$RUN_ATTEMPT"
gh_pages_build_log_set "job_status" "$JOB_STATUS"
gh_pages_build_log_set "deploy_method" "gh-pages-branch-docs"

MAIN_SHA="unknown"
if git rev-parse "origin/main" >/dev/null 2>&1; then
  MAIN_SHA="$(git rev-parse "origin/main" | cut -c1-7)"
fi
gh_pages_build_log_set "main" "$MAIN_SHA"

if [[ -n "$RUN_ID" && "$RUN_ID" != "local" && -f "$GBP_BUILD_LOG_FILE" ]]; then
  if grep -q "workflow_run_id=${RUN_ID}" "$GBP_BUILD_LOG_FILE" 2>/dev/null; then
    echo "Build status already logged for workflow run ${RUN_ID}; skipping duplicate."
    exit 0
  fi
fi

gh_pages_build_log_append "failure" "$GBP_CODE_WORKFLOW_FAILED" "$GBP_DEBUG_FAIL_WORKFLOW" "$ERROR_MSG"

git checkout main 2>/dev/null || git checkout -B main origin/main
git pull origin main --rebase 2>/dev/null || true
gh_pages_build_log_commit_to_main main
