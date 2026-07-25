#!/usr/bin/env bash
# Wrapper for agent/skill invocations — always logs trigger=manual_run.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"
export SYNC_TRIGGER=manual_run
exec bash "$ROOT/scripts/sync-gh-pages.sh"
