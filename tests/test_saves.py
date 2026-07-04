from pathlib import Path

import pytest

from mandalay_bay.chips import ChipWallet
from mandalay_bay.saves import (
    SaveLibrary,
    create_new_session,
    load_session,
    save_session,
    session_from_dict,
    session_to_dict,
)
from mandalay_bay.session import ActivityStats, PlayerSession


@pytest.fixture
def save_dir(tmp_path: Path) -> Path:
    return tmp_path / "saves"


def test_library_initializes_five_empty_slots(save_dir: Path) -> None:
    library = SaveLibrary.load(save_dir)
    assert len(library.slots) == 5
    assert all(s.is_empty for s in library.slots.values())
    assert library.index_path.exists()


def test_create_and_load_roundtrip(save_dir: Path) -> None:
    library = SaveLibrary.load(save_dir)
    session = create_new_session(
        library,
        2,
        player_name="Tester",
        starting_chips=1500,
        slot_label="My Run",
    )
    session.record_visit("slots")
    session.record_result("slots", 200, bets=5)
    save_session(library, session)

    loaded = load_session(library, 2)
    assert loaded.player_name == "Tester"
    assert loaded.wallet.balance == 1500
    assert loaded.slot_label == "My Run"
    assert loaded.stat_for("slots").visits == 1
    assert loaded.stat_for("slots").net_winnings == 200


def test_recent_order_updates_on_save(save_dir: Path) -> None:
    library = SaveLibrary.load(save_dir)
    create_new_session(library, 1, player_name="A", starting_chips=100)
    create_new_session(library, 3, player_name="B", starting_chips=100)
    create_new_session(library, 1, player_name="A", starting_chips=500)

    library = SaveLibrary.load(save_dir)
    assert library.recent_order[0] == 1
    assert 3 in library.recent_order


def test_delete_slot(save_dir: Path) -> None:
    library = SaveLibrary.load(save_dir)
    create_new_session(library, 4, player_name="X", starting_chips=100)
    library.delete_slot(4)
    assert library.slots[4].is_empty
    assert not library.slot_path(4).exists()


def test_session_serialization_preserves_transactions(save_dir: Path) -> None:
    session = PlayerSession(
        player_name="Ledger",
        wallet=ChipWallet(balance=1000),
        slot_id=1,
        slot_label="Test",
        created_at="2026-01-01T00:00:00+00:00",
        updated_at="2026-01-01T00:00:00+00:00",
    )
    session.wallet.debit(100, "blackjack", "bet")
    session.wallet.credit(250, "blackjack", "win")

    data = session_to_dict(session)
    restored = session_from_dict(data)
    assert restored.wallet.balance == 1150
    assert len(restored.wallet.transactions) == 2


def test_ordered_summaries_recent_first(save_dir: Path) -> None:
    library = SaveLibrary.load(save_dir)
    create_new_session(library, 2, player_name="Second", starting_chips=100)
    create_new_session(library, 5, player_name="Fifth", starting_chips=100)
    create_new_session(library, 2, player_name="Second", starting_chips=200)

    summaries = library.ordered_summaries()
    occupied = [s for s in summaries if not s.is_empty]
    assert occupied[0].slot_id == 2
    assert occupied[1].slot_id == 5
