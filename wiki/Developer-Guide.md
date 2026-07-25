# Developer Guide

Guide for contributors extending **The Mandalay Bay**.

## Development setup

```bash
git clone https://github.com/Exios66/degen-llms.git
cd degen-llms
pip install -e ".[dev]"
python3 -m pytest -v    # 200+ tests
```

Requires **Python 3.11+**. Runtime uses stdlib only; dev deps add pytest.

## Adding a new activity

### Step 1: Create the activity module

Create `mandalay_bay/activities/your_game.py`:

```python
from mandalay_bay.activities.base import Activity, ActivityInfo
from mandalay_bay.session import PlayerSession

class YourGameActivity(Activity):
    info = ActivityInfo(
        id="your_game",
        name="Your Game Name",
        floor="Table Games",
        description="Short description for the floor menu.",
        min_bet=10,
    )

    def run(self, session: PlayerSession, ui) -> None:
        session.record_visit(self.info.id)

        if not self.can_enter(session):
            ui.error(f"Minimum bet is {self.info.min_bet} chips.")
            ui.pause()
            return

        session.wallet.debit(bet, self.info.id, "Wager description")
        session.wallet.credit(win, self.info.id, "Win description")
        session.record_result(self.info.id, net, bets=1)
        ui.pause()
```

### Step 2: Register the activity

Add to `mandalay_bay/activities/registry.py`:

```python
from mandalay_bay.activities.your_game import YourGameActivity

ALL_ACTIVITIES = [
    # ...existing...
    YourGameActivity(),
]
```

If using a new floor, add it to `FLOOR_ORDER`.

### Step 3: Add help text

Add a section to `mandalay_bay/help_text.py` and update the help menu in `mandalay_bay/hub.py`.

### Step 4: Browser mirror

Create `docs/js/your_game.js` mirroring Python logic. Wire into `docs/js/app.js` and optionally add an RPG overlay.

### Step 5: Write tests

```python
def test_your_game_can_enter():
    activity = YourGameActivity()
    session = PlayerSession(wallet=ChipWallet(balance=100))
    assert activity.can_enter(session)
```

### Step 6: Document

Add `docs/your-game.md`, link from `docs/README.md`, and add a wiki page.

## Wallet conventions

| Operation | Method |
|-----------|--------|
| Place bet | `wallet.debit(amount, activity_id, description)` |
| Pay winner | `wallet.credit(amount, activity_id, description)` |
| Net adjustment | `wallet.apply_delta(delta, activity_id, description)` |
| Refund/push | `wallet.credit(stake, activity_id, "Push", kind=TransactionKind.PUSH)` |

Always check `wallet.can_afford(amount)` or handle `debit()` returning `False`.

## UI conventions (CLI)

- Show `ui.chip_line(session.wallet.balance)` before wagers
- Use `ui.menu_choice()` for menus (returns 0 on back)
- Use `ui.pause()` before returning to the lobby
- Use `ui.banner()` for section headers

## RNG requirements

Use `secrets.SystemRandom()` or `blackjack.rng.SECURE_RANDOM` for all random outcomes. Never use `random.seed()` in production code.

See [[RNG-and-Fairness]].

## Testing

### Running tests

```bash
python3 -m pytest -v
python3 -m pytest tests/test_casino_chips.py -v
python3 -m pytest -k navigation -v
```

### Test structure

| File | Coverage |
|------|----------|
| `test_cards.py` | Shoe, shuffle, dealing |
| `test_hand.py` | Hand valuation |
| `test_rules.py` | Blackjack rules, payouts |
| `test_holdem_table.py` | Hold'em streets, raises, 5-player |
| `test_craps.py` | Craps resolution |
| `test_lottery.py` | Lottery tickets |
| `test_prediction_markets.py` | Market generation & resolution |
| `test_casino_chips.py` | ChipWallet, session stats |
| `test_casino_navigation.py` | Hub menus, help, cashier |

### Deterministic RNG in tests

Blackjack tests inject a seeded RNG. Production always uses `secrets.SystemRandom()`.

### Manual smoke test checklist

- [ ] Launch casino, complete welcome screen
- [ ] Visit each floor and return with `0`
- [ ] Play one hand of blackjack, verify wallet updates
- [ ] Spin slots, verify debit/credit and last-bet persistence
- [ ] Place and settle a sports wager
- [ ] Buy chips at Cashier, view ledger
- [ ] Play Hold'em through flop → turn → river
- [ ] Roll craps, buy lottery ticket
- [ ] Read Casino Guide sections
- [ ] Leave casino

## GitHub Pages deployment

```bash
./scripts/sync-gh-pages.sh      # Manual sync to gh-pages branch
./scripts/deploy-gh-pages.sh      # Full deploy
./scripts/verify-gh-pages-live.sh # Live verification
```

Workflow: `.github/workflows/deploy-gh-pages.yml`

## Posit Connect Cloud deployment

```bash
export PYTHONPATH="$PWD"
quarto render
python scripts/publish_posit_degen_llms.py
```

See `CONTRIBUTING-POSIT.md` in the repository. **Never overwrite** PSYCH 755 content id `019f9a10-ebb9-d1d5-839f-97e794bfd0ca`.

## Wiki maintenance

Wiki pages live in `wiki/` (reviewed in PRs). Publish to GitHub manually — **no Actions automation**:

```bash
bash scripts/sync-github-wiki.sh
# or invoke the Cursor skill: /sync-github-wiki
```

Requires push access to `Exios66/degen-llms.wiki.git`. See `.cursor/skills/sync-github-wiki/SKILL.md`.

## Project structure

See [[Architecture]] for the full package map.
