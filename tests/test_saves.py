from pathlib import Path

from mandalay_bay.chips import ChipWallet
from mandalay_bay.saves import SaveLibrary
from mandalay_bay.session import PlayerSession


def test_library_initializes_five_slots(tmp_path: Path) -> None:
    library = SaveLibrary(save_dir=tmp_path / "saves")
    slots = library.list_slots()
    assert len(slots) == 5
    assert all(not s.occupied for s in slots)


def test_create_and_load_roundtrip(tmp_path: Path) -> None:
    library = SaveLibrary(save_dir=tmp_path / "saves")
    session = library.create_session(2, player_name="Tester", starting_chips=1500, label="My Run")
    session.record_visit("slots")
    session.record_result("slots", 200, bets=5)
    library.save_slot(session)

    loaded = library.load_slot(2)
    assert loaded is not None
    assert loaded.player_name == "Tester"
    assert loaded.wallet.balance == 1500
    assert loaded.slot_label == "My Run"
    assert loaded.stat_for("slots").visits == 1
    assert loaded.stat_for("slots").net_winnings == 200


def test_recent_order_updates_on_save(tmp_path: Path) -> None:
    library = SaveLibrary(save_dir=tmp_path / "saves")
    library.create_session(1, player_name="A", starting_chips=100)
    library.create_session(3, player_name="B", starting_chips=100)
    library.load_slot(1)

    reloaded = SaveLibrary(save_dir=tmp_path / "saves")
    assert reloaded.recent_slots()[0].slot_id == 1


def test_delete_slot(tmp_path: Path) -> None:
    library = SaveLibrary(save_dir=tmp_path / "saves")
    library.create_session(4, player_name="X", starting_chips=100)
    assert library.delete_slot(4)
    assert library.load_slot(4) is None


def test_session_serialization_preserves_transactions(tmp_path: Path) -> None:
    from mandalay_bay.saves import session_from_dict, session_to_dict

    session = PlayerSession(
        player_name="Ledger",
        wallet=ChipWallet(balance=1000),
        slot_id=1,
        slot_label="Test",
    )
    session.wallet.debit(100, "blackjack", "bet")
    session.wallet.credit(250, "blackjack", "win")

    data = session_to_dict(session)
    restored = session_from_dict(data)
    assert restored.wallet.balance == 1150
    assert len(restored.wallet.transactions) == 2
