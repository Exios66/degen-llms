from dataclasses import dataclass, field


@dataclass
class GameConfig:
    """Table and rule configuration."""

    starting_bankroll: int = 500
    min_bet: int = 10
    max_bet: int = 100
    num_decks: int = 6
    dealer_hits_soft_17: bool = True
    num_bots: int = 0
    human_seat: int = 1
    use_unicode: bool = True
    use_color: bool = True
    verbose_shuffle: bool = False
    bot_names: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        if self.min_bet <= 0:
            raise ValueError("min_bet must be positive")
        if self.max_bet < self.min_bet:
            raise ValueError("max_bet must be >= min_bet")
        if not 1 <= self.num_decks <= 8:
            raise ValueError("num_decks must be between 1 and 8")
        if not 0 <= self.num_bots <= 6:
            raise ValueError("num_bots must be between 0 and 6")
        if self.num_bots == 0:
            self.human_seat = 1
        elif not 1 <= self.human_seat <= self.num_bots + 1:
            raise ValueError("human_seat must be between 1 and num_bots + 1")

    @property
    def total_seats(self) -> int:
        return self.num_bots + 1

    @property
    def is_solo(self) -> bool:
        return self.num_bots == 0


DEFAULT_BOT_NAMES = ["Alex", "Sam", "Jordan", "Casey", "Riley", "Morgan"]


def quick_play_config() -> GameConfig:
    return GameConfig()


def make_bot_names(count: int) -> list[str]:
    return DEFAULT_BOT_NAMES[:count]
