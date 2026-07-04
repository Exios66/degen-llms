#!/usr/bin/env bash
# Sync docs/ from main to the gh-pages branch for GitHub Pages hosting.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SOURCE_BRANCH="${1:-main}"
STAGING="$(mktemp -d)"
trap 'rm -rf "$STAGING"' EXIT

git fetch origin "$SOURCE_BRANCH" gh-pages 2>/dev/null || git fetch origin "$SOURCE_BRANCH" 2>/dev/null || true

if ! git rev-parse "origin/$SOURCE_BRANCH:docs/index.html" >/dev/null 2>&1; then
  echo "docs/index.html not found on origin/$SOURCE_BRANCH" >&2
  exit 1
fi

git archive "origin/$SOURCE_BRANCH" docs | tar -x -C "$STAGING"
touch "$STAGING/docs/.nojekyll"

if git show-ref --verify --quiet refs/heads/gh-pages; then
  git checkout gh-pages
else
  git checkout --orphan gh-pages
  git rm -rf . 2>/dev/null || true
fi

find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
cp -r "$STAGING/docs/." .

git add -A
if git diff --cached --quiet; then
  echo "gh-pages already up to date with origin/$SOURCE_BRANCH docs/"
else
  git commit -m "Sync gh-pages with docs/ from $SOURCE_BRANCH"
fi

git push -u origin gh-pages

git checkout "$SOURCE_BRANCH" 2>/dev/null || git checkout main

echo "Deployed docs/ from $SOURCE_BRANCH to gh-pages branch."
