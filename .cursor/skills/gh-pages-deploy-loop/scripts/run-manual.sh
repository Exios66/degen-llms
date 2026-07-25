#!/usr/bin/env bash
# Manual GitHub Pages deploy — logs trigger=manual_run.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"
export SYNC_TRIGGER=manual_run
exec bash "$ROOT/scripts/sync-gh-pages.sh"
