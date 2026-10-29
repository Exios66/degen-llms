from __future__ import annotations

import json

import pytest

from blackjack import main as blackjack_main
from mandalay_bay import main as casino_main
from mandalay_bay.saves import SaveLibrary


def test_corrupt_slot_requires_overwrite_confirmation(tmp_path, monkeypatch):
    path = tmp_path / "slot_1.json"
    path.write_text("broken save")
    monkeypatch.setattr("builtins.input", lambda _: "n")
    with pytest.raises(SystemExit) as result:
        casino_main.main(["--slot", "1", "--new-save", "--save-dir", str(tmp_path), "--no-color"])
    assert result.value.code == 0
    assert path.read_text() == "broken save"


@pytest.mark.parametrize("error", [KeyboardInterrupt, EOFError])
def test_interruption_saves_active_session(tmp_path, monkeypatch, error):
    library = SaveLibrary(tmp_path)
    library.create_session(1, starting_chips=1000)

    def interrupted(session, ui, **kwargs):
        session.wallet.buy_in(500)
        raise error

    monkeypatch.setattr(casino_main, "run_hub", interrupted)
    with pytest.raises(SystemExit) as result:
        casino_main.main(["--slot", "1", "--save-dir", str(tmp_path), "--no-color"])
    assert result.value.code == 0
    assert json.loads((tmp_path / "slot_1.json").read_text())["wallet"]["balance"] == 1500


@pytest.mark.parametrize("entrypoint,args", [
    (casino_main.main, ["--no-save", "--no-intro"]),
    (blackjack_main.main, []),
    (blackjack_main.main, ["--quick"]),
])
def test_eof_exits_cleanly(entrypoint, args, tmp_path, monkeypatch, capsys):
    monkeypatch.setenv("MANDALAY_BAY_SAVE_DIR", str(tmp_path))
    monkeypatch.setattr("builtins.input", lambda _: (_ for _ in ()).throw(EOFError()))
    with pytest.raises(SystemExit) as result:
        entrypoint(args)
    assert result.value.code == 0
    assert "Traceback" not in capsys.readouterr().err


def test_custom_blackjack_default_max_respects_minimum(monkeypatch):
    answers = iter(["1", "500", "200", "", "", ""])
    monkeypatch.setattr("builtins.input", lambda _: next(answers))
    config = blackjack_main.custom_game_wizard()
    assert config.min_bet == config.max_bet == 200


@pytest.mark.parametrize("error", [KeyboardInterrupt, EOFError])
@pytest.mark.parametrize("slot", [1, 5])
def test_interrupted_corrupt_slot_overwrite_preserves_file(tmp_path, monkeypatch, error, slot):
    path = tmp_path / f"slot_{slot}.json"
    path.write_bytes(b"{incomplete save")

    def interrupt(_prompt):
        raise error

    monkeypatch.setattr("builtins.input", interrupt)
    with pytest.raises(SystemExit) as result:
        casino_main.main(["--slot", str(slot), "--new-save", "--save-dir", str(tmp_path)])
    assert result.value.code == 0
    assert path.read_bytes() == b"{incomplete save"


def test_confirmed_corrupt_slot_overwrite_creates_requested_session(tmp_path, monkeypatch):
    library = SaveLibrary(tmp_path)
    (tmp_path / "slot_5.json").write_text("broken save")
    library.create_session(1, player_name="Keep", starting_chips=777)
    untouched = (tmp_path / "slot_1.json").read_bytes()
    monkeypatch.setattr("builtins.input", lambda _prompt: "y")
    args = casino_main.build_parser().parse_args([
        "--slot", "5", "--new-save", "--name", "Replacement", "--chips", "1234",
        "--save-label", "Fresh visit", "--no-color", "--ascii",
    ])
    session = casino_main.resolve_session(args, casino_main.TerminalUI(use_color=False), library)
    assert session.slot_id == 5
    restored = library.load_slot(5)
    assert restored.player_name == "Replacement"
    assert restored.wallet.balance == 1234
    assert restored.slot_label == "Fresh visit"
    assert not session.use_color and not session.use_unicode
    assert (tmp_path / "slot_1.json").read_bytes() == untouched


@pytest.mark.parametrize("occupied,expected", [(False, "is empty"), (True, "may be damaged")])
def test_unloadable_slot_reports_empty_or_damaged(tmp_path, occupied, expected, capsys):
    path = tmp_path / "slot_1.json"
    if occupied:
        path.write_text("broken save")
    with pytest.raises(SystemExit) as result:
        casino_main.main(["--slot", "1", "--save-dir", str(tmp_path), "--no-color"])
    assert result.value.code == 0
    assert expected in capsys.readouterr().out
    assert path.exists() == occupied
    if occupied:
        assert path.read_text() == "broken save"


@pytest.mark.parametrize("error", [KeyboardInterrupt, EOFError])
def test_no_save_interruption_never_persists_progress(tmp_path, monkeypatch, error):
    def interrupted(session, ui, **kwargs):
        assert kwargs["library"] is None
        session.wallet.buy_in(500)
        raise error

    monkeypatch.setattr(casino_main, "run_hub", interrupted)
    with pytest.raises(SystemExit) as result:
        casino_main.main(["--no-save", "--save-dir", str(tmp_path), "--no-color"])
    assert result.value.code == 0
    assert not list(tmp_path.glob("slot_*.json"))


def test_blackjack_rules_returns_to_menu_without_invalid_choice(monkeypatch, capsys):
    answers = iter(["3", "3", "4"])
    monkeypatch.setattr("builtins.input", lambda _prompt: next(answers))
    config = blackjack_main.main_menu(blackjack_main.build_parser().parse_args([]))
    assert config is None
    output = capsys.readouterr().out
    assert output.count(blackjack_main.RULES_TEXT) == 2
    assert output.count("=== BLACKJACK ===") == 3
    assert "Invalid choice" not in output


@pytest.mark.parametrize("rounds", ["0", "-1", "-100"])
def test_invalid_round_count_is_rejected_before_menu(monkeypatch, capsys, rounds):
    def unexpected_menu(_args):
        pytest.fail("Invalid rounds must be rejected before entering the menu")

    monkeypatch.setattr(blackjack_main, "main_menu", unexpected_menu)
    with pytest.raises(SystemExit) as result:
        blackjack_main.main(["--rounds", rounds])
    assert result.value.code == 2
    assert "--rounds must be positive" in capsys.readouterr().err


@pytest.mark.parametrize("bankroll,minimum,maximum", [
    (50, 10, 50), (500, 10, 100), (500, 100, 100), (500, 500, 500),
])
def test_custom_blackjack_max_default_stays_within_limits(monkeypatch, bankroll, minimum, maximum):
    answers = iter(["1", str(bankroll), str(minimum), "", "", ""])
    monkeypatch.setattr("builtins.input", lambda _prompt: next(answers))
    config = blackjack_main.custom_game_wizard()
    assert config.max_bet == maximum
    assert config.min_bet <= config.max_bet <= config.starting_bankroll
