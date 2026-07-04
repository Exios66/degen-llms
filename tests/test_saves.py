import json
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import pytest

from mandalay_bay.chips import ChipWallet, TransactionKind
from mandalay_bay.saves import (
    MAX_SLOTS,
    SaveLibrary,
    session_from_dict,
    session_to_dict,
)
from mandalay_bay.session import ActivityStats, PlayerSession


@pytest.fixture
def save_dir(tmp_path: Path) -> Path:
    return tmp_path / "saves"


@pytest.fixture
def library(save_dir: Path) -> SaveLibrary:
    return SaveLibrary(save_dir)


def test_create_and_load_slot(library: SaveLibrary) -> None:
    session = library.create_session(1, player_name="Alice", starting_chips=2500, label="High Roller")
    assert session.slot_id == 1
    assert session.player_name == "Alice"
    assert session.wallet.balance == 2500

    loaded = library.load_slot(1)
    assert loaded is not None
    assert loaded.player_name == "Alice"
    assert loaded.wallet.balance == 2500
    assert loaded.slot_label == "High Roller"


def test_recent_order(library: SaveLibrary) -> None:
    library.create_session(1, player_name="One")
    library.create_session(2, player_name="Two")
    library.create_session(3, player_name="Three")
    library.load_slot(1)
    recent = library.recent_slots()
    assert [s.slot_id for s in recent] == [1, 3, 2]


def test_delete_slot(library: SaveLibrary) -> None:
    library.create_session(2, player_name="Temp")
    assert library.delete_slot(2)
    assert library.load_slot(2) is None
    assert not any(s.occupied for s in library.list_slots() if s.slot_id == 2)


def test_session_round_trip() -> None:
    session = PlayerSession(
        player_name="Bob",
        wallet=ChipWallet(balance=800),
        slot_id=4,
        slot_label="Weekend",
    )
    session.wallet.debit(50, "slots", "spin")
    session.record_visit("slots")
    session.record_result("slots", 100, bets=3)

    data = session_to_dict(session)
    restored = session_from_dict(data)
    assert restored.player_name == "Bob"
    assert restored.slot_id == 4
    assert restored.wallet.balance == 750
    assert restored.stat_for("slots").visits == 1
    assert restored.stat_for("slots").net_winnings == 100


def test_list_slots_shows_empty(library: SaveLibrary) -> None:
    slots = library.list_slots()
    assert len(slots) == MAX_SLOTS
    assert all(not s.occupied for s in slots)


def test_save_persists_to_disk(save_dir: Path) -> None:
    lib = SaveLibrary(save_dir)
    lib.create_session(1, player_name="Persist")
    lib.save_slot(lib.load_slot(1))  # type: ignore[arg-type]

    lib2 = SaveLibrary(save_dir)
    loaded = lib2.load_slot(1)
    assert loaded is not None
    assert loaded.player_name == "Persist"
    assert lib2.library_path.exists()


def test_session_from_dict_transactions() -> None:
    data = {
        "player_name": "Tx",
        "slot_id": 1,
        "slot_label": "S1",
        "wallet": {
            "balance": 900,
            "transactions": [
                {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "kind": TransactionKind.WAGER.value,
                    "amount": -100,
                    "activity": "blackjack",
                    "description": "bet",
                    "balance_after": 900,
                }
            ],
        },
        "activity_stats": {},
    }
    session = session_from_dict(data)
    assert session.wallet.balance == 900
    assert len(session.wallet.transactions) == 1
