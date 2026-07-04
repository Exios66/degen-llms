# Blackjack

Full Vegas-style blackjack available in two modes:

1. **Casino mode** — via The Mandalay Bay → Table Games → Blackjack
2. **Standalone mode** — `python3 -m blackjack`

## Casino mode flow

```
Table Games → Blackjack → Quick hand / Custom setup → Play → Leave → Lobby
```

Your chip wallet is the source of funds. Session net is tracked in Player Stats.

## Standalone mode

```bash
python3 -m blackjack                  # Interactive menu
python3 -m blackjack --quick          # Skip menu, quick play
python3 -m blackjack --bots 3 --seat 2
python3 -m blackjack --rounds 10      # Auto-play 10 hands
```

### Standalone CLI flags

| Flag | Description |
|------|-------------|
| `--bankroll N` | Starting chips |
| `--min-bet` / `--max-bet` | Table limits |
| `--decks` | Shoe size (1–8) |
| `--bots` | Simulated players (0–6) |
| `--seat` | Your seat at table |
| `--s17` | Dealer stands on soft 17 |
| `--rounds N` | Play N hands then exit |
| `--no-color` / `--ascii` | Display options |
| `--verbose-shuffle` | Print shoe shuffle audit hash |

## Rules (defaults)

| Rule | Default |
|------|---------|
| Shoe | 6 decks (1–8 configurable) |
| Dealer | Hits soft 17 (H17) |
| Blackjack | Pays 3:2 |
| Double | Any two cards; after split allowed |
| Split | Up to 3 times (4 hands max) |
| Split aces | One card each, then stand |
| Insurance | When dealer shows Ace; pays 2:1; max half bet |
| Surrender | Late surrender (half bet forfeited) |
| Push | Tie returns bet; dual blackjacks push |
| Peek | Dealer checks for blackjack on Ace or 10-value up-card |

## Controls

| Action | Key |
|--------|-----|
| Hit | `h` |
| Stand | `s` (also default on empty input) |
| Double | `d` |
| Split | `p` |
| Surrender | `u` |
| Insurance yes/no | `y` / `n` |
| Leave table | `q` at bet prompt |

## Table modes

### Solo

You vs the dealer only.

### Full table

You plus 1–6 simulated players using **basic strategy**. Players act in seat order; you may pick your seat.

## RNG

The shoe is shuffled with **Fisher–Yates** using `secrets.SystemRandom()` (OS CSPRNG). Reshuffle occurs when ~25% of cards remain (cut card).

## Payout reference

| Outcome | Payout |
|---------|--------|
| Win | 1:1 (bet + equal profit) |
| Blackjack | 3:2 |
| Insurance win | 2:1 on insurance portion |
| Push | Bet returned |
| Surrender | Half bet lost |
| Bust | Full bet lost |

## Implementation

Engine code lives in `blackjack/`. Casino integration is in:

- `mandalay_bay/activities/blackjack.py` — activity wrapper
- `blackjack/runner.py` — wallet sync for casino mode
