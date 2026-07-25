#!/usr/bin/env bash
# Shared build-status logging for gh-pages branch deploys.
# Append-only log: logs/gh-pages-build-status.log

# Outcome codes (code= field)
export GBP_CODE_SUCCESS="GBP-000"
export GBP_CODE_FETCH_FAILED="GBP-001"
export GBP_CODE_CHECKOUT_BLOCKED="GBP-002"
export GBP_CODE_PUSH_REJECTED="GBP-003"
export GBP_CODE_ARCHIVE_FAILED="GBP-004"
export GBP_CODE_COMMIT_FAILED="GBP-005"
export GBP_CODE_VERIFY_FAILED="GBP-006"
export GBP_CODE_SITE_UNREACHABLE="GBP-007"
export GBP_CODE_ASSET_INVALID="GBP-008"
export GBP_CODE_SCRIPT_ERROR="GBP-009"
export GBP_CODE_WORKFLOW_FAILED="GBP-010"

# Debug codes (debug= field, comma-separated)
export GBP_DEBUG_SYNC_UP_TO_DATE="GBP-SYNC-001"
export GBP_DEBUG_SYNC_PUSHED="GBP-SYNC-002"
export GBP_DEBUG_SYNC_FETCH_PARTIAL="GBP-SYNC-003"
export GBP_DEBUG_VERIFY_INDEX="GBP-VERIFY-001"
export GBP_DEBUG_VERIFY_APP_JS="GBP-VERIFY-002"
export GBP_DEBUG_VERIFY_HORSE_SPRITES="GBP-VERIFY-003"
export GBP_DEBUG_VERIFY_CACHE_BUST="GBP-VERIFY-004"
export GBP_DEBUG_VERIFY_NO_MERGE_MARKERS="GBP-VERIFY-005"
export GBP_DEBUG_VERIFY_CSS="GBP-VERIFY-006"
export GBP_DEBUG_FAIL_PUSH_NFF="GBP-FAIL-PUSH-001"
export GBP_DEBUG_FAIL_TRAP="GBP-FAIL-TRAP-001"
export GBP_DEBUG_FAIL_WORKFLOW="GBP-FAIL-WF-001"
export GBP_DEBUG_FAIL_VERIFY="GBP-FAIL-VERIFY-001"

GBP_BUILD_LOG_FILE="${GBP_BUILD_LOG_FILE:-logs/gh-pages-build-status.log}"
GBP_BUILD_LOG_CONTEXT=()

gh_pages_build_log_set() {
  local key="$1"
  local value="$2"
  GBP_BUILD_LOG_CONTEXT+=("${key}=${value}")
}

gh_pages_build_log_append() {
  local outcome="$1"
  local code="$2"
  local debug="${3:-}"
  local error_msg="${4:-}"

  mkdir -p logs
  touch "$GBP_BUILD_LOG_FILE"

  local timestamp
  timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

  local parts=("timestamp=${timestamp}" "outcome=${outcome}" "code=${code}")
  if [[ -n "$debug" ]]; then
    parts+=("debug=${debug}")
  fi
  if [[ -n "$error_msg" ]]; then
    local escaped="${error_msg//\"/\"\"}"
    parts+=("error=\"${escaped}\"")
  fi
  if ((${#GBP_BUILD_LOG_CONTEXT[@]})); then
    parts+=("${GBP_BUILD_LOG_CONTEXT[@]}")
  fi

  local line=""
  local item
  for item in "${parts[@]}"; do
    if [[ -z "$line" ]]; then
      line="$item"
    else
      line="${line} | ${item}"
    fi
  done

  echo "$line" >> "$GBP_BUILD_LOG_FILE"
  echo "$line"
}

gh_pages_build_log_commit_to_main() {
  local source_branch="${1:-main}"
  git add "$GBP_BUILD_LOG_FILE"
  if git diff --cached --quiet; then
    return 0
  fi
  local timestamp
  timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  git commit -m "Log gh-pages build status ($timestamp)"
  git push origin "$source_branch"
}
