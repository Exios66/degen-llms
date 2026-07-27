#!/usr/bin/env python3
"""Fetch GitHub PR metadata and write docs/assets/pr-graph/pr-data.json."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "assets" / "pr-graph" / "pr-data.json"
REPO = "Exios66/degen-llms"

AREA_RULES = [
    ("rpg", re.compile(r"\brpg\b|phaser|sprite|pixel|overworld|tiles?", re.I)),
    ("docs", re.compile(r"\bdocs?\b|wiki|readme|changelog|quarto|posit|contributing|skill", re.I)),
    ("hotel", re.compile(r"hotel|suite|hallway|front desk|carmen|room|folio|balcony|valet", re.I)),
    ("pool", re.compile(r"\bpool\b|beach|mandalay beach", re.I)),
    (
        "casino",
        re.compile(
            r"slot|blackjack|roulette|holdem|hold.?em|craps|lottery|casino|table game|"
            r"sportsbook|trading|arcade|racing|horse|equestrian|bar|dining|rewards|"
            r"phone|intox|overlay|minigame",
            re.I,
        ),
    ),
    ("infra", re.compile(r"gh-pages|ci|workflow|pypi|publish|deploy|cache|template|environment", re.I)),
]

STOP = {
    "add",
    "fix",
    "feat",
    "the",
    "a",
    "an",
    "and",
    "or",
    "to",
    "for",
    "of",
    "in",
    "on",
    "with",
    "from",
    "into",
    "by",
    "as",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "update",
    "docs",
    "chore",
    "prune",
    "restore",
    "wire",
    "enlarge",
    "settle",
    "expand",
}


def classify(title: str, labels: list[dict], body: str = "") -> str:
    text = f"{title} {' '.join(l.get('name', '') for l in labels)} {body or ''}"
    for area, rx in AREA_RULES:
        if rx.search(text):
            return area
    return "other"


def status_of(pr: dict) -> str:
    if pr.get("isDraft") and pr["state"] == "OPEN":
        return "DRAFT"
    if pr["state"] == "MERGED":
        return "MERGED"
    if pr["state"] == "OPEN":
        return "OPEN"
    return "CLOSED"


def fetch_prs() -> list[dict]:
    cmd = [
        "gh",
        "pr",
        "list",
        "--repo",
        REPO,
        "--state",
        "all",
        "--limit",
        "500",
        "--json",
        "number,title,state,mergedAt,createdAt,closedAt,url,author,isDraft,labels,body,headRefName",
    ]
    try:
        raw = subprocess.check_output(cmd, text=True)
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        print(f"Failed to fetch PRs via gh: {exc}", file=sys.stderr)
        if OUT.exists():
            print(f"Keeping existing {OUT}", file=sys.stderr)
            sys.exit(0)
        raise SystemExit(1) from exc
    return json.loads(raw)


def build_graph(raw: list[dict]) -> dict:
    nodes = []
    for pr in raw:
        when = pr.get("mergedAt") or pr.get("closedAt") or pr.get("createdAt")
        nodes.append(
            {
                "id": pr["number"],
                "number": pr["number"],
                "title": pr["title"],
                "state": status_of(pr),
                "url": pr["url"],
                "createdAt": pr["createdAt"],
                "mergedAt": pr.get("mergedAt"),
                "closedAt": pr.get("closedAt"),
                "when": when,
                "author": (pr.get("author") or {}).get("login") or "unknown",
                "area": classify(pr["title"], pr.get("labels") or [], pr.get("body") or ""),
                "branch": pr.get("headRefName") or "",
                "labels": [lab.get("name") for lab in (pr.get("labels") or [])],
            }
        )
    nodes.sort(key=lambda n: n["when"] or n["createdAt"])

    edges: list[dict] = []
    by_area: dict[str, list] = {}
    for node in nodes:
        by_area.setdefault(node["area"], []).append(node)
    for area, group in by_area.items():
        for left, right in zip(group, group[1:]):
            edges.append(
                {"source": left["id"], "target": right["id"], "kind": "area-flow", "area": area}
            )

    merged = sorted(
        [n for n in nodes if n["state"] == "MERGED"],
        key=lambda n: n["mergedAt"] or n["when"],
    )
    for left, right in zip(merged, merged[1:]):
        edges.append({"source": left["id"], "target": right["id"], "kind": "timeline"})

    token_map: dict[str, list[int]] = {}
    for node in nodes:
        for tok in re.findall(r"[a-z0-9']{4,}", node["title"].lower()):
            if tok in STOP:
                continue
            token_map.setdefault(tok, []).append(node["id"])

    related: set[tuple[int, int, str]] = set()
    for tok, ids in token_map.items():
        if not (2 <= len(ids) <= 8):
            continue
        for i in range(len(ids) - 1):
            a, b = ids[i], ids[i + 1]
            key = (min(a, b), max(a, b), "relates")
            if key in related:
                continue
            related.add(key)
            edges.append({"source": a, "target": b, "kind": "relates", "token": tok})

    return {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "repo": REPO,
        "repoUrl": f"https://github.com/{REPO}",
        "counts": {
            "nodes": len(nodes),
            "edges": len(edges),
            "merged": sum(1 for n in nodes if n["state"] == "MERGED"),
            "open": sum(1 for n in nodes if n["state"] == "OPEN"),
            "draft": sum(1 for n in nodes if n["state"] == "DRAFT"),
            "closed": sum(1 for n in nodes if n["state"] == "CLOSED"),
        },
        "areas": sorted({n["area"] for n in nodes}),
        "nodes": nodes,
        "edges": edges,
    }


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    graph = build_graph(fetch_prs())
    OUT.write_text(json.dumps(graph, indent=2) + "\n")
    print(f"Wrote {OUT} — {graph['counts']}")


if __name__ == "__main__":
    main()
