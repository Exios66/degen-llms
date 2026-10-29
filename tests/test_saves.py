from pathlib import Path
from unittest.mock import Mock

import pytest

from mandalay_bay.bank_account import fund_bank_from_outside
from mandalay_bay.chips import ChipWallet
from mandalay_bay.display import TerminalUI
from mandalay_bay.saves import SaveLibrary, run_save_picker
from mandalay_bay.session import PlayerSession
from mandalay_bay.staff_manifest import update_staff_override


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
    fund_bank_from_outside(session, 400)
    update_staff_override(
        session,
        category="dealers",
        staff_id="steve_harvey",
        fields={"name": "Steve H."},
    )

    data = session_to_dict(session)
    restored = session_from_dict(data)
    assert restored.wallet.balance == 1150
    assert len(restored.wallet.transactions) == 2
    assert restored.bank.balance == 400
    assert restored.staff_overrides["dealers"]["steve_harvey"]["name"] == "Steve H."


def test_web_only_state_cannot_override_modeled_save_sections() -> None:
    from mandalay_bay.rewards import ensure_rewards
    from mandalay_bay.saves import session_from_dict, session_to_dict

    session = PlayerSession(player_name="Ledger", wallet=ChipWallet(balance=1000), slot_id=1)
    ensure_rewards(session).lifetime_wagered = 12_345
    session.web_only_state = {
        "rpg": {"mapId": "sky_bridge"},
        "rewards": {"unlockedComps": ["welcome_drink"], "redeemedComps": []},
    }

    data = session_to_dict(session)

    assert data["rpg"] == {"mapId": "sky_bridge"}
    assert data["rewards"]["lifetime_wagered"] == 12_345
    restored = session_from_dict(data)
    assert restored.rewards.lifetime_wagered == 12_345
    assert restored.web_only_state["rpg"] == {"mapId": "sky_bridge"}


@pytest.mark.parametrize("requested,expected", [
    (-1, 100), (99, 100), (100, 100), (500, 500),
    (1_000_000, 1_000_000), (1_000_001, 1_000_000),
])
def test_save_picker_clamps_and_explains_starting_chip_default(tmp_path, requested, expected):
    library = SaveLibrary(tmp_path)
    ui = Mock(spec=TerminalUI)
    ui.menu_choice.return_value = 1
    ui.prompt.return_value = ""
    ui.prompt_int.side_effect = lambda *args, **kwargs: kwargs["default"]

    session = run_save_picker(ui, library, default_chips=requested)

    ui.prompt_int.assert_called_once_with("Starting chips", 100, 1_000_000, default=expected)
    assert session.wallet.balance == expected
    assert library.load_slot(1).wallet.balance == expected
    if requested != expected:
        ui.dim.assert_called_once()
        message = ui.dim.call_args.args[0]
        assert f"--chips {requested:,}" in message
        assert f"defaulting to {expected:,}" in message
    else:
        ui.dim.assert_not_called()


def test_save_picker_allows_overriding_clamped_default(tmp_path):
    ui = Mock(spec=TerminalUI)
    ui.menu_choice.return_value = 1
    ui.prompt.return_value = ""
    ui.prompt_int.return_value = 250
    library = SaveLibrary(tmp_path)

    session = run_save_picker(ui, library, default_chips=2_000_000)

    ui.prompt_int.assert_called_once_with("Starting chips", 100, 1_000_000, default=1_000_000)
    assert session.wallet.balance == library.load_slot(1).wallet.balance == 250
