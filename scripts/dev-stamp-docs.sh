#!/usr/bin/env bash
# Stamp local docs/ with import maps + __ASSET_SHA__ for browser testing.
# Mirrors the staging step in scripts/sync-gh-pages.sh without touching gh-pages.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCS_ROOT="$ROOT/docs"

if [[ ! -d "$DOCS_ROOT" ]]; then
  echo "dev-stamp-docs: missing $DOCS_ROOT" >&2
  exit 1
fi

SHA="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo dev)"
echo "Stamping docs/ with asset sha: $SHA"

python3 "$ROOT/scripts/generate-docs-importmap.py" "$DOCS_ROOT" "$SHA"
bash "$ROOT/scripts/stamp-docs-asset-sha.sh" "$DOCS_ROOT" "$SHA"

echo "Done. Open docs/index.html via a local server (or smoke-test-web.py)."
