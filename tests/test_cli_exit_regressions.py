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


def test_eof_saves_active_session(tmp_path, monkeypatch):
    library = SaveLibrary(tmp_path)
    library.create_session(1, starting_chips=1000)

    def interrupted(session, ui, **kwargs):
        session.wallet.buy_in(500)
        raise EOFError

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


def test_blackjack_rejects_nonpositive_round_count(capsys):
    with pytest.raises(SystemExit) as result:
        blackjack_main.main(["--rounds", "0"])
    assert result.value.code == 2
    assert "--rounds must be positive" in capsys.readouterr().err


class StrictTerminalUI(casino_main.TerminalUI):
    """A real TerminalUI with scripted answers: unknown methods raise."""

    def __init__(self, choices):
        super().__init__(use_color=False)
        self._choices = iter(choices)

    def prompt(self, text):
        return str(next(self._choices))

    def prompt_int(self, prompt, low, high, default=None):
        return low

    def menu_choice(self, options, title=None, **kwargs):
        return next(self._choices)

    def pause(self):
        pass


def test_trading_desk_menu_paths_render_with_the_real_terminal_ui(monkeypatch, capsys):
    """The floor must not call UI helpers TerminalUI does not implement."""
    from mandalay_bay.activities import trading_desk as module
    from mandalay_bay.chips import ChipWallet
    from mandalay_bay.session import PlayerSession

    monkeypatch.setattr(module, "entry_cost_chips", lambda *args, **kwargs: 100)
    monkeypatch.setattr(module, "underlying_spot", lambda *args, **kwargs: 10.0)
    monkeypatch.setattr(
        module,
        "settle_position",
        lambda *args, **kwargs: {"payout": 125, "pnl": 25, "reason": "settled"},
    )
    session = PlayerSession(wallet=ChipWallet(1000))
    # Browse & buy, settle positions, show underlying quotes, leave.
    ui = StrictTerminalUI([1, 1, 2, 6, 0])

    module.TradingDeskActivity().run(session, ui)

    out = capsys.readouterr().out
    assert "— 100 chips ·" in out
    assert "settled (+25)" in out
    assert "Underlying spots" in out
    assert session.wallet.balance == 1025
    assert session.activity_stats["trading_desk"].net_winnings == 25


def test_save_dir_pointing_at_a_file_exits_with_a_message(tmp_path, capsys):
    target = tmp_path / "not-a-dir"
    target.write_text("x")

    with pytest.raises(SystemExit) as result:
        casino_main.main(["--list-saves", "--save-dir", str(target)])

    captured = capsys.readouterr()
    assert result.value.code == 2
    assert "Cannot use save directory" in captured.err
    assert "Traceback" not in captured.err
