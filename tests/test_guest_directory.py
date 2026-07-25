"""Tests for Mandalay Bay guest directory."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from mandalay_bay.guest_directory import (
    has_signed,
    list_all_guests,
    load_registry,
    sign_guest_directory,
)


@pytest.fixture
def signatures_file(tmp_path: Path) -> Path:
    return tmp_path / "signatures.json"


def test_load_registry_has_hardcoded_guests() -> None:
    title, subtitle, guests = load_registry()
    assert "Guest Directory" in title
    assert subtitle
    assert len(guests) >= 10
    assert guests[0].seed is True
    assert guests[0].name == "Chip Chandler"


def test_list_all_guests_includes_seed_and_stored(signatures_file: Path) -> None:
    sign_guest_directory("Test Visitor", "Weekend stay", signatures_path=signatures_file)
    merged = list_all_guests(signatures_file)
    names = [g.name for g in merged]
    assert "Chip Chandler" in names
    assert "Test Visitor" in names
    seed_idx = names.index("Chip Chandler")
    visitor_idx = names.index("Test Visitor")
    assert seed_idx < visitor_idx


def test_sign_guest_directory_persists(signatures_file: Path) -> None:
    result = sign_guest_directory("Jordan Lee", "Suite 3102", signatures_path=signatures_file)
    assert result.ok is True
    assert result.entry is not None
    assert result.entry.name == "Jordan Lee"
    assert has_signed("Jordan Lee", signatures_file)
    stored = json.loads(signatures_file.read_text(encoding="utf-8"))
    assert stored[0]["name"] == "Jordan Lee"
    assert stored[0]["note"] == "Suite 3102"


def test_sign_rejects_duplicate(signatures_file: Path) -> None:
    first = sign_guest_directory("Repeat Guest", signatures_path=signatures_file)
    second = sign_guest_directory("repeat guest", signatures_path=signatures_file)
    assert first.ok is True
    assert second.ok is False
    assert "already signed" in second.message.lower()


def test_sign_rejects_empty_name(signatures_file: Path) -> None:
    result = sign_guest_directory("   ", signatures_path=signatures_file)
    assert result.ok is False
