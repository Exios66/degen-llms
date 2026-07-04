"""Texas Hold'em support — hand evaluation aligned with the UCI / Kaggle poker-hands dataset."""

from poker.hand_eval import (
    HAND_CLASS_NAMES,
    HandScore,
    best_hand_from_cards,
    cards_from_uci_row,
    compare_scores,
    evaluate_five_uci,
)

__all__ = [
    "HAND_CLASS_NAMES",
    "HandScore",
    "best_hand_from_cards",
    "cards_from_uci_row",
    "compare_scores",
    "evaluate_five_uci",
]
