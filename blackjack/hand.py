from __future__ import annotations

from dataclasses import dataclass, field

from blackjack.cards import Card, Rank


@dataclass
class Hand:
    cards: list[Card] = field(default_factory=list)
    bet: int = 0
    is_doubled: bool = False
    is_surrendered: bool = False
    is_finished: bool = False
    is_from_split_aces: bool = False
    split_count: int = 0

    def add_card(self, card: Card) -> None:
        self.cards.append(card)

    @property
    def value(self) -> int:
        total = sum(card.value for card in self.cards)
        aces = sum(1 for card in self.cards if card.is_ace)
        while total > 21 and aces > 0:
            total -= 10
            aces -= 1
        return total

    @property
    def is_soft(self) -> bool:
        total = sum(card.value for card in self.cards)
        return any(card.is_ace for card in self.cards) and total <= 21

    @property
    def is_bust(self) -> bool:
        return self.value > 21

    @property
    def is_blackjack(self) -> bool:
        return len(self.cards) == 2 and self.value == 21 and self.split_count == 0

    @property
    def is_pair(self) -> bool:
        if len(self.cards) != 2:
            return False
        return self.cards[0].value == self.cards[1].value

    @property
    def is_pair_of_aces(self) -> bool:
        return self.is_pair and self.cards[0].rank == Rank.ACE

    def can_split(self, max_splits: int = 3) -> bool:
        return self.is_pair and self.split_count < max_splits and not self.is_finished

    def clone_for_split(self) -> Hand:
        return Hand(
            cards=[self.cards[1]],
            bet=self.bet,
            split_count=self.split_count + 1,
            is_from_split_aces=self.cards[0].rank == Rank.ACE,
        )

    def display_value(self, hide_hole: bool = False) -> str:
        if hide_hole and len(self.cards) >= 2:
            visible = self.cards[0].value
            suffix = "+" if self.cards[0].is_ace else ""
            return f"{visible}{suffix}"
        if self.is_soft and not self.is_bust and self.value != 21:
            return f"{self.value} (soft)"
        return str(self.value)
