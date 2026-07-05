"""Mandalay Bay lobby guest directory — hardcoded roster + persistent signatures."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from mandalay_bay.vegas_time import format_vegas_signed_at

_DATA_DIR = Path(__file__).resolve().parent / "data"
_REGISTRY_PATH = _DATA_DIR / "guest_directory.json"


def _default_signatures_path() -> Path:
    return Path.home() / ".mandalay_bay" / "guest_directory_signatures.json"


@dataclass(frozen=True)
class GuestEntry:
    name: str
    signed_at: str
    note: str | None = None
    seed: bool = False


@dataclass
class SignResult:
    ok: bool
    message: str
    entry: GuestEntry | None = None


def _normalize_name(name: str) -> str:
    return " ".join(name.strip().split())


def _names_match(a: str, b: str) -> bool:
    return _normalize_name(a).casefold() == _normalize_name(b).casefold()


def load_registry() -> tuple[str, str, list[GuestEntry]]:
    """Load the hardcoded guest roster bundled with the project."""
    if not _REGISTRY_PATH.is_file():
        return "Mandalay Bay Guest Directory", "", []
    data = json.loads(_REGISTRY_PATH.read_text(encoding="utf-8"))
    title = str(data.get("title", "Mandalay Bay Guest Directory"))
    subtitle = str(data.get("subtitle", ""))
    guests: list[GuestEntry] = []
    for raw in data.get("guests", []):
        if not isinstance(raw, dict):
            continue
        name = str(raw.get("name", "")).strip()
        signed_at = str(raw.get("signedAt", "")).strip()
        if not name or not signed_at:
            continue
        note = raw.get("note")
        guests.append(
            GuestEntry(
                name=name,
                signed_at=signed_at,
                note=str(note).strip() if note else None,
                seed=True,
            )
        )
    return title, subtitle, guests


def load_stored_signatures(path: Path | None = None) -> list[GuestEntry]:
    """Load visitor signatures persisted on disk."""
    sig_path = path or _default_signatures_path()
    if not sig_path.is_file():
        return []
    try:
        data = json.loads(sig_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []
    if not isinstance(data, list):
        return []
    entries: list[GuestEntry] = []
    for raw in data:
        if not isinstance(raw, dict):
            continue
        name = str(raw.get("name", "")).strip()
        signed_at = str(raw.get("signedAt", "")).strip()
        if not name or not signed_at:
            continue
        note = raw.get("note")
        entries.append(
            GuestEntry(
                name=name,
                signed_at=signed_at,
                note=str(note).strip() if note else None,
                seed=False,
            )
        )
    return entries


def write_stored_signatures(entries: list[GuestEntry], path: Path | None = None) -> None:
    sig_path = path or _default_signatures_path()
    sig_path.parent.mkdir(parents=True, exist_ok=True)
    payload = [
        {
            "name": e.name,
            "signedAt": e.signed_at,
            **({"note": e.note} if e.note else {}),
        }
        for e in entries
    ]
    sig_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def list_all_guests(signatures_path: Path | None = None) -> list[GuestEntry]:
    """Merge hardcoded roster with persisted signatures, oldest first."""
    _, _, seed = load_registry()
    stored = load_stored_signatures(signatures_path)
    merged = seed + stored
    merged.sort(key=lambda g: g.signed_at)
    return merged


def has_signed(name: str, signatures_path: Path | None = None) -> bool:
    normalized = _normalize_name(name)
    if not normalized:
        return False
    return any(_names_match(g.name, normalized) for g in load_stored_signatures(signatures_path))


def sign_guest_directory(
    name: str,
    note: str = "",
    *,
    signatures_path: Path | None = None,
) -> SignResult:
    trimmed = _normalize_name(name)
    if not trimmed:
        return SignResult(False, "Enter a name to sign the guest book.")
    if len(trimmed) > 64:
        return SignResult(False, "Name must be 64 characters or fewer.")
    note_trimmed = " ".join(note.strip().split())[:160] or None
    path = signatures_path or _default_signatures_path()
    stored = load_stored_signatures(path)
    if any(_names_match(g.name, trimmed) for g in stored):
        return SignResult(False, f'"{trimmed}" has already signed the guest directory.')
    entry = GuestEntry(
        name=trimmed,
        signed_at=datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        note=note_trimmed,
    )
    stored.append(entry)
    write_stored_signatures(stored, path)
    return SignResult(True, f'"{trimmed}" signed the guest directory.', entry)


def format_signed_at(iso: str) -> str:
    try:
        return format_vegas_signed_at(iso)
    except ValueError:
        return iso
