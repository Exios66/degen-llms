from pathlib import Path

from mandalay_bay.activities.sportsbook import BetSlip, SportsbookActivity, SportsEvent
from mandalay_bay.chips import ChipWallet
from mandalay_bay.display import TerminalUI
from mandalay_bay.hub import run_cashier, run_help, run_hub
from mandalay_bay.save_menu import format_save_library, run_save_selector
from mandalay_bay.saves import SaveLibrary, create_new_session
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


def test_spread_push_returns_stake() -> None:
    activity = SportsbookActivity()
    event = SportsEvent(
        event_id="test",
        sport="NFL",
        home="Raiders",
        away="Chiefs",
        home_odds=-110,
        away_odds=-110,
        spread=-3.0,
        spread_home_odds=-110,
        spread_away_odds=-110,
        home_score=20,
        away_score=17,
    )
    slip = BetSlip(event=event, bet_type="spread", pick="Raiders", amount=100, odds=-110)
    won, payout, reason = activity._resolve_slip(slip)
    assert won is True
    assert payout == 100
    assert "Push" in reason


def test_hub_leave_casino_flow(tmp_path: Path) -> None:
    library = SaveLibrary.load(tmp_path / "saves")
    session = create_new_session(library, 1, player_name="Guest", starting_chips=500)
    ui = ScriptedUI(["8", "y"])
    run_hub(session, ui, library=library, show_intro=False)
    assert session.wallet.balance == 500
    assert not SaveLibrary.load(tmp_path / "saves").slots[1].is_empty


def test_cashier_buy_chips() -> None:
    session = PlayerSession(wallet=ChipWallet(balance=100))
    ui = ScriptedUI(["1"])
    run_cashier(session, ui)
    assert session.wallet.balance == 600


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
    library = SaveLibrary.load(tmp_path / "saves")
    session = create_new_session(library, 1, player_name="Guest", starting_chips=1000)
    ui = ScriptedUI(["8", "n", "8", "y"])
    run_hub(session, ui, library=library, show_intro=False)
    lobby_section = capsys.readouterr().out.split("Choose your adventure")[1].split("Choose:")[0]
    assert "0) Back" not in lobby_section


def test_create_save_via_selector(tmp_path: Path) -> None:
    library = SaveLibrary.load(tmp_path / "saves")
    ui = ScriptedUI(["2", "1", "Weekend Run", "Sam", "2000"])
    session = run_save_selector(ui, library, default_player_name="Guest")
    assert session is not None
    assert session.player_name == "Sam"
    assert session.wallet.balance == 2000
    assert session.slot_label == "Weekend Run"


def test_list_saves_format(tmp_path: Path) -> None:
    library = SaveLibrary.load(tmp_path / "saves")
    create_new_session(library, 1, player_name="Ace", starting_chips=900, slot_label="Main")
    text = format_save_library(library)
    assert "Ace" in text
    assert "900" in text
    assert "Slot 1" in text
