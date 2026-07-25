from __future__ import annotations

import json
from copy import deepcopy
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import TYPE_CHECKING, Any

from mandalay_bay.dealers import DEALER_ROSTER, DealerProfile, get_dealer_by_id

if TYPE_CHECKING:
    from mandalay_bay.session import PlayerSession

StaffOverride = dict[str, str]


@dataclass(frozen=True, slots=True)
class StaffNpcEntry:
    id: str
    name: str
    role: str
    context: str


def _manifest_path() -> Path:
    return Path(__file__).resolve().parent / "data" / "staff_manifest.json"


@lru_cache(maxsize=1)
def load_base_manifest() -> dict[str, Any]:
    data = json.loads(_manifest_path().read_text(encoding="utf-8"))
    return data


def base_npc_entries() -> tuple[StaffNpcEntry, ...]:
    entries: list[StaffNpcEntry] = []
    for raw in load_base_manifest().get("npcs", []):
        entries.append(
            StaffNpcEntry(
                id=raw["id"],
                name=raw["name"],
                role=raw.get("role", "staff"),
                context=raw.get("context", ""),
            )
        )
    return tuple(entries)


def base_npc_by_id(npc_id: str) -> StaffNpcEntry | None:
    for entry in base_npc_entries():
        if entry.id == npc_id:
            return entry
    return None


def get_staff_overrides(session: PlayerSession) -> dict[str, dict[str, StaffOverride]]:
    overrides = getattr(session, "staff_overrides", None)
    if not overrides:
        return {"dealers": {}, "npcs": {}}
    return {
        "dealers": dict(overrides.get("dealers", {})),
        "npcs": dict(overrides.get("npcs", {})),
    }


def set_staff_overrides(session: PlayerSession, overrides: dict[str, dict[str, StaffOverride]] | None) -> None:
    if overrides is None:
        session.staff_overrides = None
        return
    session.staff_overrides = {
        "dealers": dict(overrides.get("dealers", {})),
        "npcs": dict(overrides.get("npcs", {})),
    }


def update_staff_override(
    session: PlayerSession,
    *,
    category: str,
    staff_id: str,
    fields: StaffOverride,
) -> None:
    current = get_staff_overrides(session)
    bucket = dict(current.get(category, {}))
    merged = dict(bucket.get(staff_id, {}))
    for key, value in fields.items():
        cleaned = value.strip()
        if cleaned:
            merged[key] = cleaned
        else:
            merged.pop(key, None)
    if merged:
        bucket[staff_id] = merged
    else:
        bucket.pop(staff_id, None)
    current[category] = bucket
    if not current["dealers"] and not current["npcs"]:
        set_staff_overrides(session, None)
    else:
        set_staff_overrides(session, current)


def clear_staff_override(session: PlayerSession, *, category: str, staff_id: str) -> None:
    current = get_staff_overrides(session)
    bucket = dict(current.get(category, {}))
    bucket.pop(staff_id, None)
    current[category] = bucket
    if not current["dealers"] and not current["npcs"]:
        set_staff_overrides(session, None)
    else:
        set_staff_overrides(session, current)


def resolve_dealer(session: PlayerSession | None, dealer: DealerProfile) -> DealerProfile:
    if session is None:
        return dealer
    override = get_staff_overrides(session)["dealers"].get(dealer.id, {})
    if not override:
        return dealer
    return DealerProfile(
        id=dealer.id,
        name=override.get("name", dealer.name),
        games=dealer.games,
        tagline=override.get("tagline", dealer.tagline),
        quips=dealer.quips,
    )


def resolve_npc(session: PlayerSession | None, npc_id: str, *, fallback_name: str = "", fallback_context: str = "") -> dict[str, str]:
    base = base_npc_by_id(npc_id)
    name = base.name if base else fallback_name
    context = base.context if base else fallback_context
    role = base.role if base else "staff"
    if session is not None:
        override = get_staff_overrides(session)["npcs"].get(npc_id, {})
        name = override.get("name", name)
        context = override.get("context", context)
    return {"id": npc_id, "name": name, "context": context, "role": role}


def editable_staff_entries(session: PlayerSession | None = None) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    overrides = get_staff_overrides(session) if session is not None else {"dealers": {}, "npcs": {}}
    for dealer in DEALER_ROSTER:
        resolved = resolve_dealer(session, dealer)
        entries.append(
            {
                "category": "dealers",
                "id": dealer.id,
                "name": resolved.name,
                "tagline": resolved.tagline,
                "context": overrides["dealers"].get(dealer.id, {}).get("context", dealer.tagline),
                "games": list(dealer.games),
                "customized": dealer.id in overrides["dealers"],
            }
        )
    for npc in base_npc_entries():
        resolved = resolve_npc(session, npc.id, fallback_name=npc.name, fallback_context=npc.context)
        entries.append(
            {
                "category": "npcs",
                "id": npc.id,
                "name": resolved["name"],
                "context": resolved["context"],
                "role": npc.role,
                "customized": npc.id in overrides["npcs"],
            }
        )
    return entries


def export_staff_overrides(session: PlayerSession) -> dict[str, dict[str, StaffOverride]] | None:
    overrides = getattr(session, "staff_overrides", None)
    if not overrides:
        return None
    return deepcopy(overrides)
