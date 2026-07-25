from mandalay_bay.dealers import get_dealer_by_id, get_session_dealer
from mandalay_bay.session import PlayerSession
from mandalay_bay.staff_manifest import (
    clear_staff_override,
    editable_staff_entries,
    resolve_dealer,
    resolve_npc,
    update_staff_override,
)


def test_resolve_dealer_applies_override() -> None:
    session = PlayerSession()
    steve = get_dealer_by_id("steve_harvey")
    assert steve is not None
    update_staff_override(
        session,
        category="dealers",
        staff_id="steve_harvey",
        fields={"name": "Steve H.", "tagline": "Custom tagline"},
    )
    resolved = resolve_dealer(session, steve)
    assert resolved.name == "Steve H."
    assert resolved.tagline == "Custom tagline"
    assert resolved.games == steve.games


def test_get_session_dealer_uses_manifest() -> None:
    session = PlayerSession()
    update_staff_override(
        session,
        category="dealers",
        staff_id="meryl_screech",
        fields={"name": "Meryl M."},
    )
    session.record_visit("blackjack")
    dealer = get_session_dealer(session, "blackjack")
    if dealer.id == "meryl_screech":
        assert dealer.name == "Meryl M."


def test_resolve_npc_applies_override() -> None:
    session = PlayerSession()
    update_staff_override(
        session,
        category="npcs",
        staff_id="chip_chandler",
        fields={"name": "Chip C.", "context": "My favorite host."},
    )
    npc = resolve_npc(session, "chip_chandler")
    assert npc["name"] == "Chip C."
    assert npc["context"] == "My favorite host."


def test_clear_override_restores_defaults() -> None:
    session = PlayerSession()
    update_staff_override(
        session,
        category="npcs",
        staff_id="barkeep_betty",
        fields={"name": "Betty B."},
    )
    clear_staff_override(session, category="npcs", staff_id="barkeep_betty")
    npc = resolve_npc(session, "barkeep_betty")
    assert npc["name"] == "Barkeep Betty"


def test_editable_staff_entries_include_dealers_and_npcs() -> None:
    entries = editable_staff_entries(PlayerSession())
    categories = {entry["category"] for entry in entries}
    assert "dealers" in categories
    assert "npcs" in categories
    assert any(entry["id"] == "steve_harvey" for entry in entries)
    assert any(entry["id"] == "chip_chandler" for entry in entries)
