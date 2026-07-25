# Testing

## Running tests

```bash
python3 -m pytest -v           # All tests
python3 -m pytest tests/test_casino_chips.py -v
python3 -m pytest -k navigation -v
```

## Test structure

| File | Coverage |
|------|----------|
| `test_cards.py` | Shoe, shuffle, dealing |
| `test_hand.py` | Hand valuation |
| `test_rules.py` | Blackjack rules, payouts |
| `test_table.py` | End-to-end blackjack round |
| `test_casino_chips.py` | ChipWallet, session stats |
| `test_casino_activities.py` | Slots paytable, registry |
| `test_sportsbook.py` | Odds calculation, spread resolution |
| `test_casino_navigation.py` | Hub menus, help, cashier |

## Deterministic RNG in tests

Blackjack tests inject a seeded RNG:

```python
class SeededRandom:
    def __init__(self, seed: int) -> None:
        self._rng = random.Random(seed)

    def randrange(self, start: int, stop: int) -> int:
        return self._rng.randrange(start, stop)
```

Production code always uses `secrets.SystemRandom()`.

## Navigation integration tests

`test_casino_navigation.py` uses a `ScriptedUI` that feeds predetermined inputs to verify menu flows without manual interaction.

## Writing new tests

1. Prefer unit tests for pure logic (payouts, odds, hand values)
2. Use scripted I/O for menu navigation
3. Keep tests fast — no network, no filesystem side effects
4. Run the full suite before committing

## Manual smoke test checklist

- [ ] Launch casino, complete welcome screen
- [ ] Visit each floor and return with `0`
- [ ] Play one hand of blackjack, verify wallet updates
- [ ] Spin slots, verify debit/credit
- [ ] Place and settle a sports wager
- [ ] Buy chips at Cashier, view ledger
- [ ] Read Casino Guide sections
- [ ] Leave casino
