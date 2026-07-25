#!/usr/bin/env bash
# Build mandalay-bay and upload to PyPI (or TestPyPI with --test).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

REPO="pypi"
if [[ "${1:-}" == "--test" ]]; then
  REPO="testpypi"
fi

bash "$ROOT/scripts/build_mandalay_bay_package.sh"

python3 -m pip install -q 'twine>=6' 'packaging>=24'
twine check dist/mandalay-bay/*
ls -la dist/mandalay-bay/

if [[ "$REPO" == "testpypi" ]]; then
  twine upload --repository testpypi dist/mandalay-bay/*
else
  twine upload dist/mandalay-bay/*
fi

echo "Uploaded to ${REPO}. Project: https://pypi.org/project/mandalay-bay/"
