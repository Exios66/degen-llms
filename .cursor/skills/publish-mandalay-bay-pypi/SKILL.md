---
name: publish-mandalay-bay-pypi
description: >-
  Build and upload the mandalay-bay Python package to PyPI. Use when the user
  asks to publish/release mandalay-bay on PyPI, run twine upload, build the
  wheel/sdist via scripts/build_mandalay_bay_package.sh, or invoke
  /publish-mandalay-bay-pypi.
disable-model-invocation: true
---

# Publish mandalay-bay to PyPI

Build the dedicated pip package from `mandalay-bay.toml`, then upload with Twine.

**Package:** `mandalay-bay` (bundles `mandalay_bay` + `blackjack`)  
**Artifacts:** `dist/mandalay-bay/*.whl` and `dist/mandalay-bay/*.tar.gz`

## When to use

- User runs `/publish-mandalay-bay-pypi`
- User asks to publish/release/upload `mandalay-bay` to PyPI
- User mentions `twine upload` or `scripts/build_mandalay_bay_package.sh`

## Required behavior

1. **Confirm intent** — Twine uploads to **production PyPI** by default. Do not upload unless the user explicitly asked to publish/release.

2. **Pre-flight**
   - From the repository root.
   - Version in `mandalay-bay.toml` must be new (PyPI rejects re-uploads of the same version).
   - Prefer a clean working tree for the files being packaged (`mandalay_bay/`, `blackjack/`, `mandalay-bay.toml`).
   - Auth: `TWINE_USERNAME` + `TWINE_PASSWORD` (or API token as password with `__token__` username), or a configured `~/.pypirc`.
   - Tooling: `twine>=6` and `packaging>=24` (older packaging rejects modern `license` metadata).

3. **Build + upload** (preferred — one entry point):

   ```bash
   bash .cursor/skills/publish-mandalay-bay-pypi/scripts/run-publish.sh
   ```

   Or the explicit two-step flow:

   ```bash
   bash scripts/build_mandalay_bay_package.sh
   twine upload dist/mandalay-bay/*
   ```

   TestPyPI only when the user asks:

   ```bash
   bash .cursor/skills/publish-mandalay-bay-pypi/scripts/run-publish.sh --test
   # or: twine upload --repository testpypi dist/mandalay-bay/*
   ```

4. **Verify**
   - Report uploaded filenames and the PyPI project URL: https://pypi.org/project/mandalay-bay/
   - Optional smoke: `pip index versions mandalay-bay` or `pip install mandalay-bay==<version>` in a throwaway venv.

## Do not

- Upload without an explicit publish/release request
- Point Twine at a different directory than `dist/mandalay-bay/`
- Bump the version or edit `mandalay-bay.toml` unless the user asks
- Confuse this with Posit Connect (`posit-connect-publish`) or GitHub Pages (`gh-pages-deploy-loop`)

## Related paths

- Build script: [`scripts/build_mandalay_bay_package.sh`](../../../scripts/build_mandalay_bay_package.sh)
- Publish manifest: [`mandalay-bay.toml`](../../../mandalay-bay.toml)
- Package README: [`mandalay_bay/README.md`](../../../mandalay_bay/README.md)
- Output dir: `dist/mandalay-bay/` (gitignored)
