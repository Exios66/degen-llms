#!/usr/bin/env python3
"""Render and publish the degen-llms Quarto site to JackJBurleson Posit Connect Cloud.

Creates a NEW content instance on first run (records id in ``_publish.yml``).
Later runs update that same id. Never publishes to the PSYCH 755 content id.

Auth:
  - env POSIT_CONNECT_CLOUD_ACCESS_TOKEN (+ REFRESH_TOKEN, ACCOUNT_ID), or
  - device-code OAuth (prints URL + code; polls until approved)
"""

from __future__ import annotations

import argparse
import io
import json
import os
import shutil
import subprocess
import sys
import tarfile
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

ACCOUNT_NAME = "jackjburleson"
# PSYCH 755 manuscript — never overwrite.
FORBIDDEN_CONTENT_ID = "019f9a10-ebb9-d1d5-839f-97e794bfd0ca"
DEFAULT_TITLE = "The Mandalay Bay — degen-llms"
API = "https://api.connect.posit.cloud/v1"
AUTH_HOST = "login.posit.cloud"
CLIENT_ID = "quarto-cli"
SCOPE = "vivid"
PUBLISH_YML = ROOT / "_publish.yml"


def _log(msg: str) -> None:
    print(msg, flush=True)


def run(cmd: list[str], *, cwd: Path = ROOT) -> None:
    _log("$ " + " ".join(cmd))
    subprocess.run(cmd, cwd=cwd, check=True)


def ensure_quarto() -> None:
    if shutil.which("quarto") is None:
        raise SystemExit("quarto not on PATH; install Quarto ≥ 1.10")
    out = subprocess.check_output(["quarto", "--version"], text=True).strip()
    _log(f"quarto {out}")


def render_site() -> Path:
    ensure_quarto()
    env = os.environ.copy()
    env["PYTHONPATH"] = str(ROOT) + os.pathsep + env.get("PYTHONPATH", "")
    _log("$ PYTHONPATH=… quarto render")
    subprocess.run(["quarto", "render"], cwd=ROOT, check=True, env=env)
    site = ROOT / "_site"
    if not (site / "index.html").is_file():
        raise SystemExit("quarto render did not produce _site/index.html")
    return site


def post_form(url: str, data: dict[str, str]) -> dict:
    body = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode())


def device_auth() -> dict:
    auth = post_form(
        f"https://{AUTH_HOST}/oauth/device/authorize",
        {"scope": SCOPE, "client_id": CLIENT_ID},
    )
    _log("=" * 72)
    _log("AUTHORIZE NOW (Posit Connect Cloud / JackJBurleson)")
    _log("=" * 72)
    _log(f"URL:  {auth['verification_uri_complete']}")
    _log(f"CODE: {auth['user_code']}")
    _log("=" * 72)
    interval = max(int(auth.get("interval", 5)), 5)
    expires = int(auth.get("expires_in", 1800))
    start = time.time()
    while True:
        if time.time() - start > expires:
            raise SystemExit("Device authorization timed out.")
        try:
            tok = post_form(
                f"https://{AUTH_HOST}/oauth/token",
                {
                    "scope": SCOPE,
                    "client_id": CLIENT_ID,
                    "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
                    "device_code": auth["device_code"],
                },
            )
            _log(f"Authorized after {time.time() - start:.0f}s")
            Path("/tmp/posit-tokens.json").write_text(json.dumps(tok, indent=2), encoding="utf-8")
            return tok
        except urllib.error.HTTPError as e:
            raw = e.read().decode()
            try:
                code = json.loads(raw).get("error", raw)
            except Exception:
                code = raw.strip()
            if code == "authorization_pending":
                time.sleep(interval)
                continue
            if code == "slow_down":
                interval += 5
                time.sleep(interval)
                continue
            raise SystemExit(f"OAuth error: {code}")


def refresh_access(refresh_token: str) -> str | None:
    """Trade a refresh token for a live access token, or None if it is spent."""
    try:
        tok = post_form(
            f"https://{AUTH_HOST}/oauth/token",
            {
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": CLIENT_ID,
                "scope": SCOPE,
            },
        )
    except urllib.error.HTTPError as e:
        _log(f"Refresh token rejected ({e.code}); falling back")
        return None
    Path("/tmp/posit-tokens.json").write_text(json.dumps(tok, indent=2), encoding="utf-8")
    return tok.get("access_token")


def usable(access: str) -> bool:
    """Cheap probe — access tokens expire between runs, refresh tokens do not."""
    req = urllib.request.Request(
        f"{API}/accounts?has_user_role=true",
        headers={"Accept": "application/json", "Authorization": f"Bearer {access}"},
    )
    try:
        with urllib.request.urlopen(req):
            return True
    except urllib.error.HTTPError:
        return False


def load_tokens() -> str:
    cached = Path("/tmp/posit-tokens.json")
    access = os.environ.get("POSIT_CONNECT_CLOUD_ACCESS_TOKEN")
    if access and usable(access):
        _log("Using POSIT_CONNECT_CLOUD_ACCESS_TOKEN")
        return access
    for source, refresh in (
        ("POSIT_CONNECT_CLOUD_REFRESH_TOKEN", os.environ.get("POSIT_CONNECT_CLOUD_REFRESH_TOKEN")),
        ("/tmp/posit-tokens.json", _cached_refresh(cached)),
    ):
        if not refresh:
            continue
        fresh = refresh_access(refresh)
        if fresh:
            _log(f"Refreshed access token via {source}")
            return fresh
    if cached.is_file():
        tok = json.loads(cached.read_text(encoding="utf-8"))
        if tok.get("access_token") and usable(tok["access_token"]):
            _log("Using /tmp/posit-tokens.json")
            return tok["access_token"]
    return device_auth()["access_token"]


def _cached_refresh(cached: Path) -> str | None:
    if not cached.is_file():
        return None
    try:
        return json.loads(cached.read_text(encoding="utf-8")).get("refresh_token")
    except json.JSONDecodeError:
        return None


def api(
    method: str,
    path: str,
    access: str,
    body: dict | None = None,
) -> dict | None:
    data = None if body is None else json.dumps(body).encode()
    headers = {"Accept": "application/json", "Authorization": f"Bearer {access}"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(f"{API}/{path}", data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return json.loads(raw.decode()) if raw else None
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{method} {path} → {e.code}: {e.read().decode()[:800]}") from e


def assert_writable_account(access: str) -> str:
    accounts = api("GET", "accounts?has_user_role=true", access) or {}
    rows = accounts.get("data") or []
    names = [a.get("name") for a in rows]
    _log(f"Authorized accounts: {names}")
    for a in rows:
        if a.get("name") == ACCOUNT_NAME:
            return a["id"]
    env_id = os.environ.get("POSIT_CONNECT_CLOUD_ACCOUNT_ID")
    if env_id:
        return env_id
    if not rows:
        raise SystemExit("No publishable Posit accounts for this login.")
    _log(f"WARNING: '{ACCOUNT_NAME}' not in account list; using {rows[0].get('name')}")
    return rows[0]["id"]


def read_publish_yml() -> str | None:
    if not PUBLISH_YML.is_file():
        return None
    text = PUBLISH_YML.read_text(encoding="utf-8")
    for line in text.splitlines():
        # The writer emits the id as a list item ("- id: …"), so accept both forms;
        # missing it here silently creates a duplicate content item.
        line = line.strip().lstrip("-").strip()
        if line.startswith("id:"):
            value = line.split(":", 1)[1].strip().strip('"').strip("'")
            if value:
                return value
    return None


def write_publish_yml(content_id: str, ui_url: str) -> None:
    PUBLISH_YML.write_text(
        (
            "- source: project\n"
            "  posit-connect-cloud:\n"
            f"    - id: {content_id}\n"
            f"      url: {ui_url}\n"
        ),
        encoding="utf-8",
    )
    _log(f"Wrote {PUBLISH_YML} → {content_id}")


def make_bundle(site: Path) -> bytes:
    buf = io.BytesIO()
    files = sorted(p for p in site.rglob("*") if p.is_file())
    manifest = {
        "version": 1,
        "locale": "en_US",
        "platform": "4.0.0",
        "metadata": {"appmode": "static", "primary_rmd": None, "primary_html": "index.html"},
        "packages": None,
        "files": {p.relative_to(site).as_posix(): {"checksum": ""} for p in files},
        "users": None,
    }
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        man = json.dumps(manifest).encode()
        info = tarfile.TarInfo("manifest.json")
        info.size = len(man)
        tar.addfile(info, io.BytesIO(man))
        for p in files:
            tar.add(p, arcname=p.relative_to(site).as_posix())
    return buf.getvalue()


def create_content(access: str, account_id: str, title: str) -> dict:
    body = {
        "account_id": account_id,
        "title": title,
        "next_revision": {
            "source_type": "bundle",
            "content_type": "static",
            "app_mode": "static",
            "primary_file": "index.html",
        },
        "secrets": [],
    }
    created = api("POST", "contents", access, body) or {}
    content_id = created.get("id")
    if not content_id:
        raise SystemExit(f"createContent returned no id: {created}")
    if content_id == FORBIDDEN_CONTENT_ID:
        raise SystemExit("Refusing to use forbidden PSYCH 755 content id")
    _log(f"Created NEW content id={content_id}")
    return created


def update_content_bundle(access: str, content_id: str) -> dict:
    if content_id == FORBIDDEN_CONTENT_ID:
        raise SystemExit(
            f"Refusing to publish to forbidden PSYCH 755 content id {FORBIDDEN_CONTENT_ID}"
        )
    updated = api(
        "PATCH",
        f"contents/{content_id}?new_bundle=true",
        access,
        {
            "secrets": [],
            "revision_overrides": {"primary_file": "index.html", "app_mode": "static"},
        },
    ) or {}
    return updated


def upload_and_publish(access: str, content: dict, site: Path) -> dict:
    content_id = content["id"]
    if content_id == FORBIDDEN_CONTENT_ID:
        raise SystemExit("Refusing forbidden content id")

    rev = content.get("next_revision") or content.get("current_revision") or {}
    upload_url = rev.get("source_bundle_upload_url")
    if not upload_url:
        # After create, next_revision should have the URL; after PATCH too.
        refreshed = api("GET", f"contents/{content_id}", access) or {}
        rev = refreshed.get("next_revision") or refreshed.get("current_revision") or {}
        upload_url = rev.get("source_bundle_upload_url")
    if not upload_url:
        raise SystemExit(f"No upload URL for content {content_id}: {rev}")

    bundle = make_bundle(site)
    _log(f"Uploading bundle ({len(bundle)} bytes)")
    req = urllib.request.Request(
        upload_url,
        data=bundle,
        method="POST",
        headers={"Content-Type": "application/gzip"},
    )
    with urllib.request.urlopen(req) as r:
        _log(f"upload_status {r.status}")

    req = urllib.request.Request(
        f"{API}/contents/{content_id}/publish",
        method="POST",
        headers={"Accept": "application/json", "Authorization": f"Bearer {access}"},
    )
    with urllib.request.urlopen(req) as r:
        _log(f"publish_http {r.status}")
        r.read()

    share_fallback = f"https://{content_id}.share.connect.posit.cloud/"
    ui_url = f"https://connect.posit.cloud/{ACCOUNT_NAME}/content/{content_id}"
    for i in range(60):
        content = api("GET", f"contents/{content_id}", access) or {}
        rev = content.get("current_revision") or {}
        result = rev.get("publish_result")
        status = rev.get("status") or rev.get("state")
        url = rev.get("url")
        _log(f"poll[{i}] status={status} result={result} url={url}")
        if result == "success" or status == "published":
            return {
                "content": content,
                "content_id": content_id,
                "share_url": url or share_fallback,
                "ui_url": ui_url,
            }
        if result and result not in {"success", "running", None}:
            raise SystemExit(
                f"Publish failed: {rev.get('publish_error_code')} {rev.get('publish_error_args')}"
            )
        time.sleep(3)
    raise SystemExit("Timed out waiting for publish success")


def verify_live(share_url: str, *, expect_substrings: list[str]) -> None:
    req = urllib.request.Request(share_url, headers={"User-Agent": "degen-llms-posit-publish/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        html = r.read().decode("utf-8", "replace")
        code = r.status
    if code != 200:
        raise SystemExit(f"Live verify HTTP {code}")
    missing = [s for s in expect_substrings if s not in html]
    if missing:
        raise SystemExit(f"Live page missing expected strings: {missing}")
    _log(f"Live verification OK ({len(html)} bytes): {share_url}")
    try:
        from playwright.sync_api import sync_playwright

        art = Path("/opt/cursor/artifacts")
        art.mkdir(parents=True, exist_ok=True)
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            page.goto(share_url, wait_until="networkidle", timeout=90000)
            page.screenshot(path=str(art / "connect-cloud-degen-llms.png"), full_page=False)
            browser.close()
        _log(f"Screenshot → {art / 'connect-cloud-degen-llms.png'}")
    except Exception as exc:  # noqa: BLE001
        _log(f"Screenshot skipped: {exc}")


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--skip-render", action="store_true", help="Publish existing _site/")
    p.add_argument("--title", default=DEFAULT_TITLE, help="Title for NEW content creation")
    p.add_argument(
        "--force-new",
        action="store_true",
        help="Always create a new content instance (ignore _publish.yml)",
    )
    p.add_argument(
        "--expect",
        action="append",
        default=[],
        help="Substring that must appear on the live share page (repeatable)",
    )
    args = p.parse_args(argv)

    if not args.skip_render:
        site = render_site()
    else:
        site = ROOT / "_site"
        if not (site / "index.html").is_file():
            raise SystemExit("_site/index.html missing; refuse --skip-render")

    access = load_tokens()
    account_id = assert_writable_account(access)
    _log(f"Using account_id={account_id}")

    existing_id = None if args.force_new else read_publish_yml()
    if existing_id == FORBIDDEN_CONTENT_ID:
        raise SystemExit("Refusing forbidden PSYCH 755 id found in _publish.yml")

    if existing_id:
        _log(f"Updating existing content {existing_id}")
        content = update_content_bundle(access, existing_id)
        content["id"] = existing_id
    else:
        content = create_content(access, account_id, args.title)

    result = upload_and_publish(access, content, site)
    write_publish_yml(result["content_id"], result["ui_url"])

    # Keep site-url in _quarto.yml discoverable after first publish (optional patch).
    quarto_yml = ROOT / "_quarto.yml"
    text = quarto_yml.read_text(encoding="utf-8")
    marker = "  # site-url is set after first Posit publish\n"
    site_line = f"  site-url: {result['ui_url']}\n"
    if "site-url:" in text:
        lines = []
        for line in text.splitlines(True):
            if line.strip().startswith("site-url:"):
                lines.append(site_line)
            else:
                lines.append(line)
        quarto_yml.write_text("".join(lines), encoding="utf-8")
    elif "repo-url:" in text:
        quarto_yml.write_text(text.replace("  repo-url:", site_line + "  repo-url:", 1), encoding="utf-8")
    elif marker in text:
        quarto_yml.write_text(text.replace(marker, site_line), encoding="utf-8")

    expect = list(args.expect) or ["The Mandalay Bay", "Chip Economy", "Pixel RPG"]
    verify_live(result["share_url"], expect_substrings=expect)

    out = {**result, "account": ACCOUNT_NAME}
    Path("/tmp/posit-publish-result.json").write_text(json.dumps(out, indent=2, default=str))
    _log("UI_URL " + result["ui_url"])
    _log("SHARE_URL " + result["share_url"])
    _log("CONTENT_ID " + result["content_id"])
    _log("DONE")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
