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
import re
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

LINK_RE = re.compile(r'<link rel="stylesheet" href="([^"]+)"(?: crossorigin)?(?:\s*/)?>')


def combine_stylesheets(html_path: pathlib.Path, out_name: str) -> None:
    """Merge the render-blocking stylesheet <link>s into one ordered file."""
    text = html_path.read_text()
    links = list(LINK_RE.finditer(text))
    if len(links) <= 1:
        return
    parts: list[str] = []
    for match in links:
        href = match.group(1)
        if href.startswith(("http://", "https://", "/")):
            return  # cross-origin or absolute: leave the original links alone
        css_path = (html_path.parent / href.split("?")[0]).resolve()
        try:
            parts.append(css_path.read_text().rstrip() + "\n")
        except OSError:
            return  # unresolvable stylesheet: leave the original links alone
    joined = "\n".join(parts)
    out_dir = docs / "site" / "css"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / out_name).write_text(joined)
    first, last = links[0].start(), links[-1].end()
    html_path.write_text(
        text[:first]
        + f'<link rel="stylesheet" href="{"../site/css/" if html_path.parent.name == "rpg" else "site/css/"}{out_name}?v=__ASSET_SHA__">'
        + text[last:]
    )
    print(f"build-site-bundles: combined {len(links)} stylesheets -> site/css/{out_name}")


combine_stylesheets(docs / "index.html", "casino-combined.css")
combine_stylesheets(docs / "rpg" / "index.html", "rpg-combined.css")
PY
