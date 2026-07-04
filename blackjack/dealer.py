from __future__ import annotations

from dataclasses import dataclass, field

from blackjack.cards import Card
from blackjack.config import GameConfig
from blackjack.hand import Hand


@dataclass
class Dealer:
    hand: Hand = field(default_factory=Hand)
    hole_revealed: bool = False

    def reset(self) -> None:
        self.hand = Hand()
        self.hole_revealed = False

    def receive(self, card: Card) -> None:
        self.hand.add_card(card)

    @property
    def up_card(self) -> Card | None:
        return self.hand.cards[0] if self.hand.cards else None

    @property
    def hole_card(self) -> Card | None:
        return self.hand.cards[1] if len(self.hand.cards) > 1 else None

    def reveal_hole(self) -> None:
        self.hole_revealed = True

    @property
    def has_blackjack(self) -> bool:
        return self.hole_revealed and self.hand.is_blackjack

    def peek_blackjack(self) -> bool:
        return len(self.hand.cards) == 2 and self.hand.is_blackjack
