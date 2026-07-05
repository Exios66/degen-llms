#!/usr/bin/env bash
# Post-deploy HTTP checks for the live GitHub Pages site (branch deploy /docs).
set -euo pipefail

LIB_DIR="$(cd "$(dirname "$0")" && pwd)"
if [[ -f "$LIB_DIR/gh-pages-build-log.sh" ]]; then
  # shellcheck source=scripts/lib/gh-pages-build-log.sh
  source "$LIB_DIR/gh-pages-build-log.sh"
else
  ROOT="$(cd "$LIB_DIR/.." && pwd)"
  # shellcheck source=scripts/lib/gh-pages-build-log.sh
  source "$ROOT/scripts/lib/gh-pages-build-log.sh"
fi

SITE_URL="${SITE_URL:-https://exios66.github.io/degen-llms/}"
BASE="${SITE_URL%/}/"
TIMEOUT="${VERIFY_TIMEOUT:-20}"
CONTEXT_ONLY="${GBP_VERIFY_CONTEXT_ONLY:-0}"
DEBUG_CODES=()
VERIFY_FAILED=0

curl_check() {
  local label="$1"
  local path="$2"
  local debug_ok="$3"
  local expect_pattern="${4:-}"

  local url="${BASE}${path#\/}"
  local tmp
  tmp="$(mktemp)"
  local http_code
  local latency_ms

  local start end
  start="$(date +%s%3N)"
  http_code="$(curl -sS -L --max-time "$TIMEOUT" -o "$tmp" -w "%{http_code}" "$url" || echo "000")"
  end="$(date +%s%3N)"
  latency_ms=$((end - start))

  gh_pages_build_log_set "http_${label}" "$http_code"
  gh_pages_build_log_set "latency_${label}_ms" "$latency_ms"

  if [[ "$http_code" != "200" ]]; then
    VERIFY_FAILED=1
    gh_pages_build_log_set "verify_fail_${label}" "http_${http_code}"
    rm -f "$tmp"
    return 1
  fi

  if [[ -n "$expect_pattern" ]] && ! grep -qE "$expect_pattern" "$tmp"; then
    VERIFY_FAILED=1
    gh_pages_build_log_set "verify_fail_${label}" "pattern_mismatch"
    rm -f "$tmp"
    return 1
  fi

  DEBUG_CODES+=("$debug_ok")
  rm -f "$tmp"
  return 0
}

curl_check "index" "index.html" "$GBP_DEBUG_VERIFY_INDEX" '<script type="module" src="js/app\.js' || true
curl_check "app_js" "js/app.js" "$GBP_DEBUG_VERIFY_APP_JS" 'createHorseSpriteCanvas' || true
curl_check "horse_sprites_js" "js/horse-sprites.js" "$GBP_DEBUG_VERIFY_HORSE_SPRITES" 'HORSE_SPRITE_ROSTER' || true
curl_check "casino_css" "css/casino.css" "$GBP_DEBUG_VERIFY_CSS" 'horse-sprite-canvas' || true

tmp_index="$(mktemp)"
curl -sS -L --max-time "$TIMEOUT" -o "$tmp_index" "${BASE}index.html" || true
if grep -qE 'app\.js\?v=[0-9a-f]{7}' "$tmp_index"; then
  DEBUG_CODES+=("$GBP_DEBUG_VERIFY_CACHE_BUST")
  gh_pages_build_log_set "cache_bust" "stamped"
elif grep -q '__ASSET_SHA__' "$tmp_index"; then
  DEBUG_CODES+=("$GBP_DEBUG_VERIFY_CACHE_BUST")
  gh_pages_build_log_set "cache_bust" "placeholder"
else
  gh_pages_build_log_set "cache_bust" "none"
fi
rm -f "$tmp_index"

tmp_app="$(mktemp)"
curl -sS -L --max-time "$TIMEOUT" -o "$tmp_app" "${BASE}js/app.js" || true
if grep -qE '<<<<<<|>>>>>>|======' "$tmp_app"; then
  VERIFY_FAILED=1
  gh_pages_build_log_set "verify_fail_app_js" "merge_markers"
else
  DEBUG_CODES+=("$GBP_DEBUG_VERIFY_NO_MERGE_MARKERS")
fi
rm -f "$tmp_app"

debug_joined="$(IFS=,; echo "${DEBUG_CODES[*]}")"
gh_pages_build_log_set "verify_debug" "$debug_joined"

if [[ "$CONTEXT_ONLY" == "1" ]]; then
  exit "$VERIFY_FAILED"
fi

if [[ "$VERIFY_FAILED" -eq 1 ]]; then
  gh_pages_build_log_append "failure" "$GBP_CODE_VERIFY_FAILED" "${debug_joined},${GBP_DEBUG_FAIL_VERIFY}" "Live site verification failed"
  exit 1
fi

gh_pages_build_log_append "success" "$GBP_CODE_SUCCESS" "$debug_joined"
exit 0
