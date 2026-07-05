from pathlib import Path

from mandalay_bay.chips import ChipWallet
from mandalay_bay.display import TerminalUI
from mandalay_bay.hub import run_cashier, run_help, run_hub
from mandalay_bay.saves import SaveLibrary
from mandalay_bay.session import PlayerSession


class ScriptedUI(TerminalUI):
    """Feeds predetermined inputs for integration tests."""

    def __init__(self, responses: list[str], *, use_color: bool = False) -> None:
        super().__init__(use_color=use_color)
        self._responses = iter(responses)

    def _next(self, context: str) -> str:
        try:
            return next(self._responses)
        except StopIteration:
            raise AssertionError(f"Unexpected prompt: {context}")

    def prompt(self, text: str) -> str:
        return self._next(text)

    def prompt_yes_no(self, prompt: str, default: bool = True) -> bool:
        raw = self._next(prompt).lower()
        if not raw:
            return default
        return raw in {"y", "yes"}

    def prompt_int(self, prompt: str, low: int, high: int, default: int | None = None) -> int:
        raw = self._next(prompt)
        if not raw and default is not None:
            return default
        return int(raw)

    def pause(self) -> None:
        pass


def test_wallet_apply_delta_and_reconcile() -> None:
    wallet = ChipWallet(balance=1000)
    wallet.apply_delta(-50, "blackjack", "Hand loss")
    assert wallet.balance == 950
    wallet.reconcile(1050, "blackjack", "Exit sync")
    assert wallet.balance == 1050

def test_hub_leave_casino_flow(tmp_path: Path) -> None:
    library = SaveLibrary(save_dir=tmp_path / "saves")
    session = library.create_session(1, player_name="Guest", starting_chips=500)
    ui = ScriptedUI(["15", "y"])
    run_hub(session, ui, library=library, show_intro=False)
    assert session.wallet.balance == 500
    assert library.load_slot(1) is not None


def test_cashier_buy_chips() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=100))
    ui = ScriptedUI(["1"])
    run_cashier(session, ui)
    assert session.wallet.balance == 600


def test_cashier_cash_out_to_bank() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=500))
    ui = ScriptedUI(["3", "200"])
    run_cashier(session, ui)
    assert session.wallet.balance == 300
    assert session.bank.balance == 200


def test_cashier_cash_out_zero_balance() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=0))
    ui = ScriptedUI(["3"])
    run_cashier(session, ui)
    assert session.wallet.balance == 0


def test_help_menu_renders(capsys) -> None:
    ui = ScriptedUI(["1"])
    run_help(ui)
    assert "MANDALAY BAY" in capsys.readouterr().out


def test_main_lobby_has_no_back_option(capsys, tmp_path: Path) -> None:
    library = SaveLibrary(save_dir=tmp_path / "saves")
    session = library.create_session(1, player_name="Guest", starting_chips=1000)
    ui = ScriptedUI(["15", "n", "15", "y"])
    run_hub(session, ui, library=library, show_intro=False)
    lobby_section = capsys.readouterr().out.split("Choose your adventure")[1].split("Choose:")[0]
    assert "0) Back" not in lobby_section
