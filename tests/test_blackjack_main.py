from unittest.mock import MagicMock, patch

from blackjack.config import GameConfig
from blackjack.main import run_game


def test_rounds_mode_auto_bets_minimum() -> None:
    config = GameConfig(starting_bankroll=500, min_bet=10, max_bet=100, num_decks=1, num_bots=0)

    with patch("blackjack.main.Table") as mock_table_cls, patch(
        "blackjack.main.Shoe"
    ) as mock_shoe_cls, patch("blackjack.main.Display") as mock_display_cls:
        mock_shoe = mock_shoe_cls.return_value
        mock_shoe.remaining = 52
        mock_shoe.shuffle_count = 1
        mock_shoe.last_shuffle_id = None

        mock_table = mock_table_cls.from_config.return_value
        mock_human = mock_table.human.return_value
        mock_human.bankroll = 500

        from blackjack.table import RoundOutcome

        mock_table.play_round.return_value = RoundOutcome()
        mock_display = mock_display_cls.return_value
        mock_display.prompt_continue.return_value = False

        run_game(config, max_rounds=5)

    prompt_bet = mock_human._prompt_bet
    assert prompt_bet(500, config) == 10
    assert mock_table.play_round.call_count == 1
