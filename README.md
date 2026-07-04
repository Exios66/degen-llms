# degen-llms

Casino-faithful **Blackjack CLI** for the terminal — solo or with simulated table players, adjustable stakes, and OS-backed secure shuffling.

## Quick start

Requires **Python 3.11+** (stdlib only at runtime).

```bash
python -m blackjack
```

Or with optional dev tools:

```bash
pip install -e ".[dev]"   # if dev extras added
pytest
```

## Game modes

| Mode | Description |
|------|-------------|
| **Quick play** | Solo vs dealer — $500 bankroll, $10–$100 bets, 6-deck shoe |
| **Custom game** | Configure bankroll, stakes, decks (1–8), H17/S17, bots (1–6), seat |
| **Table mode** | You plus 1–6 simulated players using basic strategy |

## Command-line flags

```bash
python -m blackjack --quick --bankroll 1000 --min-bet 25 --max-bet 200
python -m blackjack --bots 3 --seat 2 --decks 8
python -m blackjack --rounds 5 --no-color --ascii
python -m blackjack --verbose-shuffle --s17
```

| Flag | Purpose |
|------|---------|
| `--bankroll` | Starting chips |
| `--min-bet` / `--max-bet` | Table limits |
| `--decks` | Shoe size (1–8) |
| `--bots` | Simulated players (0–6) |
| `--seat` | Your seat at the table |
| `--s17` | Dealer stands on soft 17 (default: H17) |
| `--rounds N` | Auto-play N hands then exit |
| `--no-color` | Disable ANSI colors |
| `--ascii` | ASCII card symbols (`AS` instead of `A♠`) |
| `--verbose-shuffle` | Print audit hash when shoe is shuffled |

## Controls

- **Betting:** enter a dollar amount; `q` to leave the table
- **Actions:** `(h)it` `(s)tand` `(d)ouble` `(p)split` `(u)surrender`
- **Insurance:** `y` / `n` when dealer shows an Ace

## Rules (defaults)

- **Shoe:** 6 decks, reshuffled when ~25% of cards remain (cut card)
- **RNG:** Fisher–Yates shuffle via `secrets.SystemRandom()` (OS CSPRNG)
- **Dealer:** hits soft 17 (H17); stands on hard 17+
- **Blackjack:** natural 21 pays **3:2**
- **Double:** any two cards; double after split allowed
- **Split:** up to 3 times (4 hands); split aces get one card each
- **Insurance:** half of original bet max; pays 2:1
- **Late surrender:** forfeit half bet before other actions
- **Push:** ties return bet; both blackjacks push
- **Peek:** dealer checks for blackjack when showing Ace or 10-value card

## Example session

```
=== BLACKJACK ===
Bankroll: $500 | Min: $10 | Max: $100 | Shoe: 6 decks | Dealer: H17

Place bet ($10-$100, bankroll $500): 50

   Seat 1 You ($450): bet $50 — A♠ 8♥ (19)
   Dealer: 10♠ [?] (10+)

Your turn [19]: (h)it (s)tand (d)ouble (p)split → s

  DEALER DRAWS
   Dealer: 10♠ 7♣ (17)

  RESULTS
You: WIN (+$50) = +$50
```

## Project layout

```
blackjack/          # Game engine and CLI
tests/              # pytest suite (deterministic shoe injection for CI)
pyproject.toml
```

## License

MIT — see [LICENSE](LICENSE).
