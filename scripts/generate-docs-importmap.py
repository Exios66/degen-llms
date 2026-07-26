#!/usr/bin/env python3
"""Generate an inline ES module import map that cache-busts every docs/js file.

Import maps remap resolved module URLs so relative imports like `../venues.js`
fetch `venues.js?v=<sha>` even when the importer omitted a query string.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


IMPORTMAP_RE = re.compile(
    r'<script type="importmap"[^>]*>.*?</script>',
    re.DOTALL,
)


def collect_js(docs_js: Path) -> list[Path]:
    return sorted(p for p in docs_js.rglob("*.js") if p.is_file())


def build_imports(docs_root: Path, sha: str, *, prefix: str) -> dict[str, str]:
    """Map unresolved document-relative paths under docs/js to versioned URLs."""
    docs_js = docs_root / "js"
    imports: dict[str, str] = {}
    if not docs_js.is_dir():
        return imports
    for path in collect_js(docs_js):
        rel = path.relative_to(docs_root).as_posix()
        key = f"{prefix}{rel}"
        imports[key] = f"{key}?v={sha}"
    return imports


def inject_importmap(html_path: Path, imports: dict[str, str], *, merge_existing: bool = True) -> None:
    text = html_path.read_text(encoding="utf-8")
    existing: dict[str, str] = {}
    if merge_existing:
        match = IMPORTMAP_RE.search(text)
        if match:
            raw = re.sub(r"</?script[^>]*>", "", match.group(0)).strip()
            try:
                existing = json.loads(raw).get("imports", {})
            except json.JSONDecodeError:
                existing = {}

    merged = {**existing, **imports}
    block = (
        '<script type="importmap">\n'
        + json.dumps({"imports": merged}, indent=2, sort_keys=True)
        + "\n  </script>"
    )
    if IMPORTMAP_RE.search(text):
        text = IMPORTMAP_RE.sub(block, text, count=1)
    else:
        text = text.replace("</head>", f"  {block}\n</head>", 1)
    html_path.write_text(text, encoding="utf-8")


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: generate-docs-importmap.py <docs-root> <asset-sha>", file=sys.stderr)
        return 2
    docs_root = Path(sys.argv[1])
    sha = sys.argv[2]
    if not docs_root.is_dir():
        print(f"Not a directory: {docs_root}", file=sys.stderr)
        return 1

    terminal = docs_root / "index.html"
    if terminal.is_file():
        inject_importmap(terminal, build_imports(docs_root, sha, prefix="./"))

    rpg = docs_root / "rpg" / "index.html"
    if rpg.is_file():
        # RPG page lives one level deeper; shared terminal JS is ../js/...
        rpg_imports = build_imports(docs_root, sha, prefix="../")
        # Also bust RPG-local modules under ./js/
        rpg_js = docs_root / "rpg" / "js"
        if rpg_js.is_dir():
            for path in collect_js(rpg_js):
                rel = path.relative_to(docs_root / "rpg").as_posix()
                key = f"./{rel}"
                rpg_imports[key] = f"{key}?v={sha}"
        inject_importmap(rpg, rpg_imports, merge_existing=True)

    print(f"Import maps stamped with v={sha}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
