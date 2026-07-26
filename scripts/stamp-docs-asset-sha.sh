#!/usr/bin/env bash
# Replace __ASSET_SHA__ placeholders under a docs/ tree (HTML/JS/CSS).
# Used by sync-gh-pages so ES module imports and RPG entrypoints share one bust token.
set -euo pipefail

DOCS_ROOT="${1:?docs root required}"
SHA="${2:?asset sha required}"

if [[ ! -d "$DOCS_ROOT" ]]; then
  echo "stamp-docs-asset-sha: not a directory: $DOCS_ROOT" >&2
  exit 1
fi

# GNU vs BSD sed -i
if sed --version >/dev/null 2>&1; then
  SED_INPLACE=(sed -i)
else
  SED_INPLACE=(sed -i '')
fi

while IFS= read -r -d '' file; do
  if grep -q '__ASSET_SHA__' "$file"; then
    "${SED_INPLACE[@]}" "s/__ASSET_SHA__/${SHA}/g" "$file"
  fi
done < <(find "$DOCS_ROOT" -type f \( -name '*.html' -o -name '*.js' -o -name '*.css' \) -print0)
