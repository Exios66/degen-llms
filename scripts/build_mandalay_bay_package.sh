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
cp "$ROOT/LICENSE" "$STAGING/LICENSE" 2>/dev/null || true
cp "$ROOT/mandalay_bay/README.md" "$STAGING/README.md"

python3 -m pip install -q build
python3 -m build "$STAGING" -o "$ROOT/dist/mandalay-bay"

echo "Built mandalay-bay packages in dist/mandalay-bay/"
