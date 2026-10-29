#!/usr/bin/env bash
# Bundle docs/ entry points into site/ so the GitHub Pages site boots from a
# handful of requests instead of the full (~100 file) ES module graph.
#
# Used by scripts/sync-gh-pages.sh on the staged docs tree before stamping, and
# locally by scripts/smoke-test-site-bundle.py. Source modules stay canonical
# and still ship; the bundles are an additional fast-boot path that the HTML
# entry files point at.
#
# Runtime `new URL(..., import.meta.url)` data references (sports scenarios,
# guest directory, card sprites, ...) resolve relative to the bundle location,
# so docs/data and docs/assets are mirrored under site/ to keep those URLs
# valid wherever the bundle lives.
set -euo pipefail

DOCS_DIR="${1:?usage: build-site-bundles.sh <staged docs directory>}"
ESBUILD_VERSION="${ESBUILD_VERSION:-0.25.0}"

cd -- "$(dirname "$0")/.."

if [[ ! -f "$DOCS_DIR/js/app.js" || ! -f "$DOCS_DIR/rpg/js/main.js" ]]; then
  echo "build-site-bundles: missing entry points under $DOCS_DIR" >&2
  exit 1
fi

npx --yes "esbuild@$ESBUILD_VERSION" \
  "$DOCS_DIR/js/app.js" "$DOCS_DIR/rpg/js/main.js" \
  --bundle --format=esm --minify --target=es2020 \
  --alias:phaser="$DOCS_DIR/rpg/js/phaser-shim.js" \
  --outdir="$DOCS_DIR/site" --entry-names='[dir]/[name]' \
  --legal-comments=none --log-level=error

# Cart/quest/sports asset URLs inside the bundles are relative to the bundle
# itself, so mirror the runtime data next to the outputs.
rm -rf "$DOCS_DIR/site/data" "$DOCS_DIR/site/assets"
cp -R "$DOCS_DIR/data" "$DOCS_DIR/site/data"
cp -R "$DOCS_DIR/assets" "$DOCS_DIR/site/assets"

python3 - "$DOCS_DIR" <<'PY'
import pathlib
import sys

docs = pathlib.Path(sys.argv[1])
rewrites = [
    (docs / "index.html", 'src="js/app.js?v=__ASSET_SHA__"', 'src="site/js/app.js?v=__ASSET_SHA__"'),
    (docs / "rpg" / "index.html", 'src="js/main.js?v=__ASSET_SHA__"', 'src="../site/rpg/js/main.js?v=__ASSET_SHA__"'),
]
for html, old, new in rewrites:
    text = html.read_text()
    if old in text:
        html.write_text(text.replace(old, new, 1))
        print(f"build-site-bundles: rewired {html.name} -> {new}")
    elif new in text:
        print(f"build-site-bundles: {html.name} already rewired")
    else:
        print(f"build-site-bundles: WARNING no entry script tag in {html.name}", file=sys.stderr)
PY
