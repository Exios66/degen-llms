#!/usr/bin/env bash
# Build mandalay-bay wheel + sdist using mandalay-bay.toml (dedicated publish manifest).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGING="$(mktemp -d)"
trap 'rm -rf "$STAGING"' EXIT

mkdir -p "$ROOT/dist/mandalay-bay"
cp "$ROOT/mandalay-bay.toml" "$STAGING/pyproject.toml"
cp -a "$ROOT/mandalay_bay" "$STAGING/mandalay_bay"
cp -a "$ROOT/blackjack" "$STAGING/blackjack"
cp -a "$ROOT/poker" "$STAGING/poker"
cp "$ROOT/LICENSE" "$STAGING/LICENSE" 2>/dev/null || true
cp "$ROOT/mandalay_bay/README.md" "$STAGING/README.md"

PYTHON_BIN="${PYTHON_BIN:-python3}"
if ! "$PYTHON_BIN" -c 'import build' 2>/dev/null; then
  echo 'Install the build prerequisite in your Python environment: python -m pip install build' >&2
  exit 1
fi
"$PYTHON_BIN" -m build "$STAGING" -o "$ROOT/dist/mandalay-bay"

echo "Built mandalay-bay packages in dist/mandalay-bay/"
