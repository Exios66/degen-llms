# Adding Activities

This guide explains how to add a new game to The Mandalay Bay.

## Step 1: Create the activity module

Create `mandalay_bay/activities/your_game.py`:

```python
from mandalay_bay.activities.base import Activity, ActivityInfo
from mandalay_bay.session import PlayerSession

class YourGameActivity(Activity):
    info = ActivityInfo(
        id="your_game",
        name="Your Game Name",
        floor="Table Games",          # or new floor name
        description="Short description for the floor menu.",
        min_bet=10,
    )

    def run(self, session: PlayerSession, ui) -> None:
        session.record_visit(self.info.id)

        if not self.can_enter(session):
            ui.error(f"Minimum bet is {self.info.min_bet} chips.")
            ui.pause()
            return

        # Game loop — use session.wallet for all chip operations
        session.wallet.debit(bet, self.info.id, "Wager description")
        session.wallet.credit(win, self.info.id, "Win description")

        session.record_result(self.info.id, net, bets=1)
        ui.pause()
```

## Step 2: Register the activity

Add to `mandalay_bay/activities/registry.py`:

```python
from mandalay_bay.activities.your_game import YourGameActivity

ALL_ACTIVITIES: list = [
    BlackjackActivity(),
    SlotsActivity(),
    SportsbookActivity(),
    YourGameActivity(),   # add here
]
```

If using a new floor, add it to `FLOOR_ORDER` in the same file.

## Step 3: Add help text

Add a section to `mandalay_bay/help_text.py`:

```python
YOUR_GAME_HELP = """..."""
SECTIONS["your_game"] = YOUR_GAME_HELP
```

Update the help menu in `mandalay_bay/hub.py` if needed.

## Step 4: Write tests

```python
def test_your_game_can_enter():
    activity = YourGameActivity()
    session = PlayerSession(wallet=ChipWallet(balance=100))
    assert activity.can_enter(session)
```

## Step 5: Document

Add `docs/your-game.md` and link from `docs/README.md`.

## Wallet conventions

| Operation | Method |
|-----------|--------|
| Place bet | `wallet.debit(amount, activity_id, description)` |
| Pay winner | `wallet.credit(amount, activity_id, description)` |
| Net adjustment | `wallet.apply_delta(delta, activity_id, description)` |
| Refund/push | `wallet.credit(stake, activity_id, "Push", kind=TransactionKind.PUSH)` |

Always check `wallet.can_afford(amount)` or handle `debit()` returning `False`.

## UI conventions

- Show `ui.chip_line(session.wallet.balance)` before wagers
- Use `ui.menu_choice()` for menus (returns 0 on back)
- Use `ui.pause()` before returning to the lobby
- Use `ui.banner()` for section headers

## RNG requirements

Use `secrets.SystemRandom()` or `blackjack.rng.SECURE_RANDOM` for all random outcomes. Never use `random.seed()` in production code.

## Optional: standalone mode

If your game should also run outside the casino, create a separate entry module (like `blackjack/main.py`) and a runner that accepts an optional `ChipWallet`.
