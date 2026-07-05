#!/usr/bin/env bash
# HTTP verification for the live GitHub Pages site (branch deploy /docs/).
set -euo pipefail

SITE_URL="${SITE_URL:-https://exios66.github.io/degen-llms/}"
VERIFY_RETRIES="${VERIFY_RETRIES:-6}"
VERIFY_DELAY_SEC="${VERIFY_DELAY_SEC:-10}"

# Trim trailing slash for consistent path joining.
SITE_URL="${SITE_URL%/}"

VERIFY_PATHS=(
  "/"
  "/index.html"
  "/css/casino.css"
  "/js/app.js"
  "/rpg/index.html"
)

check_paths_once() {
  local path url http_code
  for path in "${VERIFY_PATHS[@]}"; do
    url="${SITE_URL}${path}"
    http_code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 30 "$url" 2>/dev/null || echo "000")"
    if [[ "$http_code" != "200" ]]; then
      echo "verify_fail path=${path} http=${http_code} url=${url}" >&2
      return 1
    fi
  done
  return 0
}

attempt=1
while [[ "$attempt" -le "$VERIFY_RETRIES" ]]; do
  echo "verify attempt=${attempt}/${VERIFY_RETRIES}" >&2
  if check_paths_once; then
    echo "verify_ok attempts=${attempt}"
    exit 0
  fi
  if [[ "$attempt" -lt "$VERIFY_RETRIES" ]]; then
    sleep "$VERIFY_DELAY_SEC"
  fi
  attempt=$((attempt + 1))
done

echo "verify_fail reason=max_retries_exceeded retries=${VERIFY_RETRIES}" >&2
exit 1
