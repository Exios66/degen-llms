#!/usr/bin/env bash
# Shared helpers for logs/gh-pages-build-status.log (GBP error/debug codes).

DEPLOY_METHOD="${DEPLOY_METHOD:-gh-pages-branch-docs}"
BUILD_STATUS_LOG="${BUILD_STATUS_LOG:-logs/gh-pages-build-status.log}"

# Outcome codes (code=GBP-NNN)
GBP_SUCCESS=000
GBP_FETCH=001
GBP_ARCHIVE=002
GBP_CHECKOUT=003
GBP_PUSH=004
GBP_MAIN_CHECKOUT=005
GBP_VERIFY=006
GBP_LOG_PUSH=007
GBP_UNEXPECTED=099

# Debug phase codes (debug=GBP-…,GBP-…)
DBG_START=GBP-SYNC-001
DBG_SYNCED=GBP-SYNC-002
DBG_UP_TO_DATE=GBP-SYNC-003
DBG_LOG_COMMITTED=GBP-SYNC-004
DBG_VERIFY_OK=GBP-SYNC-005
DBG_FAIL_FETCH=GBP-FAIL-FETCH-001
DBG_FAIL_ARCHIVE=GBP-FAIL-ARCHIVE-001
DBG_FAIL_CHECKOUT=GBP-FAIL-CHECKOUT-001
DBG_FAIL_PUSH=GBP-FAIL-PUSH-001
DBG_FAIL_MAIN=GBP-FAIL-MAIN-001
DBG_FAIL_LOG=GBP-FAIL-LOG-001
DBG_FAIL_VERIFY=GBP-FAIL-VERIFY-001

BUILD_DEBUG=()
BUILD_OUTCOME_WRITTEN=0
BUILD_LAST_ERROR=""

build_debug_add() {
  BUILD_DEBUG+=("$1")
}

build_debug_join() {
  local joined=""
  local code
  for code in "${BUILD_DEBUG[@]}"; do
    [[ -z "$code" ]] && continue
    if [[ -z "$joined" ]]; then
      joined="$code"
    else
      joined="$joined,$code"
    fi
  done
  printf '%s' "$joined"
}

build_code_for_debug() {
  local last="${BUILD_DEBUG[-1]:-}"
  case "$last" in
    "$DBG_FAIL_FETCH") printf 'GBP-%03d' "$GBP_FETCH" ;;
    "$DBG_FAIL_ARCHIVE") printf 'GBP-%03d' "$GBP_ARCHIVE" ;;
    "$DBG_FAIL_CHECKOUT") printf 'GBP-%03d' "$GBP_CHECKOUT" ;;
    "$DBG_FAIL_PUSH") printf 'GBP-%03d' "$GBP_PUSH" ;;
    "$DBG_FAIL_MAIN") printf 'GBP-%03d' "$GBP_MAIN_CHECKOUT" ;;
    "$DBG_FAIL_VERIFY") printf 'GBP-%03d' "$GBP_VERIFY" ;;
    "$DBG_FAIL_LOG") printf 'GBP-%03d' "$GBP_LOG_PUSH" ;;
    *) printf 'GBP-%03d' "$GBP_UNEXPECTED" ;;
  esac
}

# Escape double quotes for the error="…" field.
build_escape_error() {
  local msg="${1:-}"
  msg="${msg//\\/\\\\}"
  msg="${msg//\"/\\\"}"
  printf '%s' "$msg"
}

write_build_status_line() {
  local outcome="$1"
  local code="$2"
  local error_msg="${3:-}"
  local timestamp="${4:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
  local debug_chain
  debug_chain="$(build_debug_join)"

  mkdir -p "$(dirname "$BUILD_STATUS_LOG")"
  touch "$BUILD_STATUS_LOG"

  local line
  line="timestamp=${timestamp}"
  line+=" | outcome=${outcome}"
  line+=" | code=${code}"
  line+=" | debug=${debug_chain:-none}"
  if [[ -n "$error_msg" ]]; then
    line+=" | error=\"$(build_escape_error "$error_msg")\""
  fi
  line+=" | trigger=${TRIGGER:-unknown}"
  line+=" | deploy_method=${DEPLOY_METHOD}"
  line+=" | url=${SITE_URL:-}"
  line+=" | workflow_attempt=${GITHUB_RUN_ATTEMPT:-0}"
  line+=" | main=${MAIN_SHA_SHORT:-unknown}"
  line+=" | gh-pages_before=${GH_SHA_BEFORE_SHORT:-none}"
  line+=" | gh-pages_after=${GH_SHA_AFTER_SHORT:-none}"
  line+=" | sync_status=${STATUS:-unknown}"
  line+=" | synced=${SYNCED:-no}"
  line+=" | changed=${CHANGED_FILES:-0}"
  line+=" | docs_files=${MAIN_FILE_COUNT:-0}"

  echo "$line" >> "$BUILD_STATUS_LOG"
  echo "$line"
  BUILD_OUTCOME_WRITTEN=1
}

write_build_status_success() {
  write_build_status_line "success" "GBP-$(printf '%03d' "$GBP_SUCCESS")" "" "$1"
}

write_build_status_failure() {
  local error_msg="${1:-Build failed}"
  local code="${2:-$(build_code_for_debug)}"
  write_build_status_line "failure" "$code" "$error_msg" "$3"
}

commit_build_status_log() {
  [[ -f "$BUILD_STATUS_LOG" ]] || return 0
  git add "$BUILD_STATUS_LOG" 2>/dev/null || return 0
  if git diff --cached --quiet 2>/dev/null; then
    return 0
  fi
  local ts="${TIMESTAMP:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
  git commit -m "Log gh-pages build status ($ts)" || return 1
  git push origin "${SOURCE_BRANCH:-main}" || return 1
  build_debug_add "$DBG_LOG_COMMITTED"
  return 0
}
