import pytest

from mandalay_bay.arcade_games import play_high_roller_breakout, play_neon_invaders, play_strip_cross
from mandalay_bay.arcade_state import consume_arcade_slot_voucher
from mandalay_bay.chips import ChipWallet
from mandalay_bay.session import PlayerSession


class ScriptUI:
    def __init__(self, commands=()):
        self.commands = iter(commands)
        self.lines = []

    def print(self, value=""):
        self.lines.append(value)

    def prompt(self, *_):
        return next(self.commands, "q")

    def __getattr__(self, name):
        return lambda *args, **kwargs: None


def test_strip_cross_does_not_award_tickets_for_sidewalk_farming():
    score, cleared, mult = play_strip_cross(ScriptUI(["a", "d"] * 200 + ["q"]))
    assert score == 0 and not cleared and mult == 0


def test_invaders_reaching_the_ground_cannot_count_as_a_clear(monkeypatch):
    monkeypatch.setattr("mandalay_bay.arcade_games.SECURE_RANDOM.random", lambda: 0)
    score, cleared, mult = play_neon_invaders(ScriptUI(["a"] * 20))
    assert score == 0 and not cleared and mult == 0


def test_breakout_can_clear_every_row_with_paddle_following_ball():
    class TrackingUI(ScriptUI):
        paddle = 5
        turns = 0

        def prompt(self, *_):
            self.turns += 1
            if self.turns == 1:
                return "f"
            if self.turns > 1000:
                return "q"
            grid = [s[2:] for s in self.lines if len(s) == 13][-5:]
            ball = next((s.index("●") for s in grid if "●" in s), self.paddle)
            if ball > self.paddle:
                self.paddle += 1
                return "d"
            if ball < self.paddle:
                self.paddle -= 1
                return "a"
            return "f"

    ui = TrackingUI()
    score, cleared, mult = play_high_roller_breakout(ui)
    assert cleared and score == 27 * 20 + 100 and mult == 2.5


def test_slot_voucher_is_consumed_exactly_once():
    session = PlayerSession()
    session.web_only_state = {"rpg": {"flags": {"arcade_slot_voucher": True}}}
    assert consume_arcade_slot_voucher(session)
    assert not consume_arcade_slot_voucher(session)


def test_cli_slots_honors_arcade_voucher_without_charging(monkeypatch):
    from mandalay_bay.activities import slots
    from mandalay_bay.stakes import get_tier

    class UI(ScriptUI):
        def menu_choice(self, *args, **kwargs):
            return 1

        def prompt_int(self, *args, **kwargs):
            return 5

        def prompt_yes_no(self, *args, **kwargs):
            return False

    session = PlayerSession(wallet=ChipWallet(balance=100))
    session.web_only_state = {"rpg": {"flags": {"arcade_slot_voucher": True}}}
    machine = slots.MACHINES["fortune"]
    lemon = next(s for s in machine.symbols if s.name == "lemon")
    monkeypatch.setattr(slots, "pick_stake_tier", lambda *a, **k: get_tier("penny"))
    monkeypatch.setattr(slots.SlotsActivity, "_pick_catalog", lambda *a: "main_floor")
    monkeypatch.setattr(slots, "_spin_reels", lambda _: [lemon] * 3)
    monkeypatch.setattr(slots, "spin_pause", lambda _: None)
    monkeypatch.setattr(slots, "animate_reel_tease", lambda *a: None)
    slots.SlotsActivity().run(session, UI())
    assert session.wallet.balance == 100
    assert session.activity_stats["slots"].net_winnings == 0
    assert not consume_arcade_slot_voucher(session)


def test_mixed_slot_combos_are_visible_in_paytable():
    from mandalay_bay.activities.slots import MACHINES, format_paytable, _payout

    machine = MACHINES["tiger_and_dragon"]
    reels = [next(s for s in machine.symbols if s.name == name)
             for name in ("tiger", "tiger", "dragon")]
    payout, reason = _payout(reels, 2, machine)
    assert payout == 180 and "combo" in reason
    assert "tiger / tiger / dragon" in format_paytable(machine)


def test_dining_gifts_are_included_in_recorded_session_net():
    from mandalay_bay.dining import create_sitting, order_and_consume, resolve_encounter, settle_sitting

    session = PlayerSession(wallet=ChipWallet(balance=1000))
    sitting = create_sitting("stripsteak")
    order_and_consume(session, sitting, "ss_fries", rng=lambda: 1)
    # Use a small synthetic encounter so the ledger assertion is independent
    # of catalog wording and encounter RNG.
    sitting.pending_encounter = {"id": "test_gift", "title": "Gift", "choices": [
        {"id": "accept", "label": "Accept", "effect": {"chips": 50}}]}
    assert resolve_encounter(session, sitting, "accept").ok
    settle_sitting(session, sitting, tip_percent=0)
    assert session.activity_stats["dining"].net_winnings == session.wallet.balance - 1000 == 32
    settle_sitting(session, sitting, tip_percent=0)
    assert session.activity_stats["dining"].net_winnings == 32


def test_cli_slots_interrupt_during_reveal_keeps_the_spin_outcome(monkeypatch):
    """Ctrl+C while the reels are still animating must not void a settled spin."""
    from mandalay_bay.activities import slots
    from mandalay_bay.stakes import get_tier

    class UI(ScriptUI):
        def menu_choice(self, *args, **kwargs):
            return 1

        def prompt_int(self, *args, **kwargs):
            return 5

        def prompt_yes_no(self, *args, **kwargs):
            return False

    machine = slots.MACHINES["fortune"]
    monkeypatch.setattr(slots, "pick_stake_tier", lambda *a, **k: get_tier("penny"))
    monkeypatch.setattr(slots.SlotsActivity, "_pick_catalog", lambda *a: "main_floor")
    monkeypatch.setattr(slots, "_spin_reels", lambda _: list(machine.symbols[:3]))
    monkeypatch.setattr(slots, "_payout", lambda *a, **k: (50, "test win"))

    def interrupted(*args, **kwargs):
        raise KeyboardInterrupt

    monkeypatch.setattr(slots, "animate_reel_tease", interrupted)
    session = PlayerSession(wallet=ChipWallet(balance=100))
    with pytest.raises(KeyboardInterrupt):
        slots.SlotsActivity().run(session, UI())
    assert session.wallet.balance == 145  # 100 - 5 stake + 50 win
