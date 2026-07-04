import random

from blackjack.cards import Card, Rank, Shoe, Suit
from blackjack.config import GameConfig
from blackjack.display import Display
from blackjack.hand import Hand
from blackjack.player import SimulatedPlayer
from blackjack.table import Table


class SeededRandom:
    def __init__(self, seed: int) -> None:
        self._rng = random.Random(seed)

    def randrange(self, start: int, stop: int) -> int:
        return self._rng.randrange(start, stop)


def c(rank: Rank, suit: Suit = Suit.SPADES) -> Card:
    return Card(rank, suit)


class ScriptedShoe(Shoe):
    """Shoe that deals predetermined cards for deterministic tests."""

    def __init__(self, cards: list[Card]) -> None:
        super().__init__(num_decks=1, rng=SeededRandom(0))
        self._cards = list(reversed(cards))
        self._cut_index = 0


class AutoHuman:
    """Minimal stand-in for scripted human betting/actions."""

    def __init__(self, bet: int = 10) -> None:
        self.name = "You"
        self.seat = 1
        self.bankroll = 500
        self.bet = bet
        self.round_state = None  # set by table

    def reset_round(self):
        from blackjack.player import PlayerHandState

        self.round_state = PlayerHandState()

    def place_bet(self, config):
        from blackjack.player import PlayerHandState
        from blackjack.hand import Hand

        if self.round_state is None:
            self.round_state = PlayerHandState()
        self.round_state.hands = [Hand(bet=self.bet)]
        return self.bet

    def decide_insurance(self, config):
        return False

    def decide_action(self, hand, state, config, *, is_first_action):
        from blackjack.rules import Action

        return Action.STAND


def test_player_wins_when_dealer_busts(monkeypatch) -> None:
    config = GameConfig(starting_bankroll=500, min_bet=10, max_bet=100, num_decks=1, num_bots=0)
    display = Display(config)
    cards = [
        c(Rank.TEN),
        c(Rank.NINE),
        c(Rank.TEN),
        c(Rank.SIX),
        c(Rank.KING),
        c(Rank.FIVE),
    ]
    shoe = ScriptedShoe(cards)
    table = Table.from_config(config, display, shoe)

    auto = AutoHuman(bet=50)
    auto.round_state = table.human().round_state
    table.players = [auto]

    outcome = table.play_round()
    assert auto.bankroll == 550
    assert any("WIN" in line for line in outcome.result_lines)


def test_simulated_player_bets_within_limits() -> None:
    config = GameConfig(min_bet=10, max_bet=100, starting_bankroll=500)
    bot = SimulatedPlayer("Alex", 1, 500)
    bet = bot.place_bet(config)
    assert 10 <= bet <= 100
