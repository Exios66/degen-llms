#!/usr/bin/env bash
# Mirror wiki/ from this repository to the GitHub wiki (.wiki.git remote).
# Manual / skill invocation only — no GitHub Actions automation.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WIKI_SRC="${ROOT}/wiki"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

if [[ ! -d "${WIKI_SRC}" ]]; then
  echo "Wiki source directory not found: ${WIKI_SRC}" >&2
  exit 1
fi

if ! compgen -G "${WIKI_SRC}/*.md" > /dev/null; then
  echo "No wiki pages found in ${WIKI_SRC}" >&2
  exit 1
fi

ORIGIN_URL="$(git -C "${ROOT}" remote get-url origin)"
WIKI_URL="${ORIGIN_URL//degen-llms/degen-llms.wiki}"
WIKI_DIR="${TMP_DIR}/wiki-repo"
GIT_NAME="${GIT_USER_NAME:-$(git -C "${ROOT}" config user.name || echo 'degen-llms maintainer')}"
GIT_EMAIL="${GIT_USER_EMAIL:-$(git -C "${ROOT}" config user.email || echo 'maintainer@users.noreply.github.com')}"

echo "Wiki source: ${WIKI_SRC}"
echo "Wiki remote: ${WIKI_URL}"

if git clone --depth 1 "${WIKI_URL}" "${WIKI_DIR}" 2>/dev/null; then
  echo "Cloned existing wiki repository."
else
  echo "Wiki repository not found — initializing ..."
  git -C "${TMP_DIR}" init -q wiki-repo
  cd "${WIKI_DIR}"
  git checkout -b main 2>/dev/null || git checkout -b master
  git remote add origin "${WIKI_URL}"
fi

cd "${WIKI_DIR}"

# Replace tracked wiki pages and images (authoritative mirror from repo).
find . -maxdepth 1 -type f -name '*.md' -delete
rm -rf images
cp "${WIKI_SRC}"/*.md .
if [[ -d "${WIKI_SRC}/images" ]]; then
  cp -r "${WIKI_SRC}/images" ./images
fi

git config user.name "${GIT_NAME}"
git config user.email "${GIT_EMAIL}"
git add -A

if git diff --cached --quiet; then
  echo "Wiki already up to date."
  exit 0
fi

MAIN_SHA="$(git -C "${ROOT}" rev-parse --short HEAD)"
git commit -m "Sync wiki from repository (${MAIN_SHA})"

BRANCH="$(git branch --show-current)"
if [[ -z "${BRANCH}" ]]; then
  BRANCH="main"
fi

echo "Pushing wiki to origin/${BRANCH} ..."
if git push -u origin "${BRANCH}"; then
  echo "Wiki sync complete: https://github.com/Exios66/degen-llms/wiki"
  exit 0
fi

echo "Standard push failed — retrying with force (first-time wiki init) ..."
git push -f -u origin "${BRANCH}"
echo "Wiki initialized: https://github.com/Exios66/degen-llms/wiki"
