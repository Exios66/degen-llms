#!/usr/bin/env bash
# Sync docs/ from main to the gh-pages branch for GitHub Pages hosting.
# Delegates to scripts/sync-gh-pages.sh (full replace + repository logs).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_BRANCH="${1:-main}"
export SOURCE_BRANCH
exec bash "$ROOT/scripts/sync-gh-pages.sh"
