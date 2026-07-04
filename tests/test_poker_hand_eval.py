"""Tests for poker hand evaluation (UCI / Kaggle poker-hands-dataset encoding)."""

from poker.hand_eval import (
    DATASET_FIXTURES,
    HAND_CLASS_NAMES,
    best_hand_from_cards,
    cards_from_uci_row,
    compare_scores,
    evaluate_five_cards,
    evaluate_five_uci,
)


def test_hand_class_names_match_dataset() -> None:
    assert len(HAND_CLASS_NAMES) == 10
    assert HAND_CLASS_NAMES[9] == "Royal flush"


def test_dataset_fixtures_all_classes() -> None:
    for row, expected_class in DATASET_FIXTURES:
        cards = cards_from_uci_row(row)
        score = evaluate_five_cards(cards)
        assert score.hand_class == expected_class, f"row {row} expected {expected_class}, got {score.hand_class}"


def test_royal_flush_beats_straight_flush() -> None:
    royal_row = DATASET_FIXTURES[9][0]
    sf_row = DATASET_FIXTURES[8][0]
    royal = evaluate_five_cards(cards_from_uci_row(royal_row))
    sf = evaluate_five_cards(cards_from_uci_row(sf_row))
    assert compare_scores(royal, sf) > 0


def test_best_hand_from_seven_cards() -> None:
    from poker.hand_eval import card_from_uci

    cards = [
        card_from_uci(1, 1), card_from_uci(2, 1),
        card_from_uci(3, 13), card_from_uci(4, 13), card_from_uci(1, 13),
        card_from_uci(2, 5), card_from_uci(3, 9),
    ]
    score, _ = best_hand_from_cards(cards)
    assert score.hand_class == 6


def test_evaluate_five_uci_api() -> None:
    score = evaluate_five_uci([4, 4, 4, 4, 4], [12, 1, 13, 11, 10])
    assert score.hand_class == 9
