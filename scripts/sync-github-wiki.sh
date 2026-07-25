#!/usr/bin/env bash
# Sync wiki/ from the repository to the GitHub wiki git remote.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WIKI_SRC="${ROOT}/wiki"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

if [[ ! -d "${WIKI_SRC}" ]]; then
  echo "Wiki source directory not found: ${WIKI_SRC}" >&2
  exit 1
fi

ORIGIN_URL="$(git -C "${ROOT}" remote get-url origin)"
WIKI_URL="${ORIGIN_URL//degen-llms/degen-llms.wiki}"

echo "Cloning wiki from ${WIKI_URL} ..."
if ! git clone --quiet "${WIKI_URL}" "${TMP_DIR}/wiki" 2>/dev/null; then
  echo "Wiki repo empty or missing — initializing ..."
  git -C "${TMP_DIR}" init --quiet
  git -C "${TMP_DIR}" checkout -b main 2>/dev/null || git -C "${TMP_DIR}" checkout -b master
  mkdir -p "${TMP_DIR}/wiki"
  git -C "${TMP_DIR}/wiki" init --quiet
  WIKI_DIR="${TMP_DIR}/wiki"
  git -C "${WIKI_DIR}" remote add origin "${WIKI_URL}" 2>/dev/null || git -C "${WIKI_DIR}" remote set-url origin "${WIKI_URL}"
else
  WIKI_DIR="${TMP_DIR}/wiki"
fi

rsync -a --delete "${WIKI_SRC}/" "${WIKI_DIR}/" 2>/dev/null || {
  find "${WIKI_DIR}" -maxdepth 1 -type f -name '*.md' -delete
  cp -r "${WIKI_SRC}/." "${WIKI_DIR}/"
}

cd "${WIKI_DIR}"
git add -A
if git diff --cached --quiet; then
  echo "Wiki already up to date."
  exit 0
fi

git -c user.name="Cursor Agent" -c user.email="agent@cursor.com" \
  commit -m "Sync wiki from repository ($(date -u +%Y-%m-%dT%H:%M:%SZ))"

BRANCH="$(git branch --show-current)"
if [[ -z "${BRANCH}" ]]; then
  BRANCH="master"
fi

echo "Pushing wiki to origin/${BRANCH} ..."
git push -u origin "${BRANCH}"
echo "Wiki sync complete."
