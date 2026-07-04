# Player Guide

This guide documents every screen, menu, and dialog in **The Mandalay Bay** digital casino.

## Navigation model

The casino uses a **hub-and-spoke** pattern:

```mermaid
flowchart TD
    lobby[Main Lobby]
    lobby --> tableGames[Table Games]
    lobby --> slots[Slot Machines]
    lobby --> sports[Sports Book]
    lobby --> cashier[Cashier]
    lobby --> stats[Player Stats]
    lobby --> guide[Casino Guide]
    lobby --> exit[Leave Casino]

    tableGames --> blackjack[Blackjack]
    slots --> machinePick[Pick Machine]
    machinePick --> spinLoop[Spin Loop]
    sports --> bookMenu[Sports Book Menu]
    bookMenu --> wager[Place Wager]
    bookMenu --> settle[Settle Bets]
```

- **Main lobby** has no "Back" option — you are always at the root
- **Sub-menus** show `0) Back` to return to the previous screen
- **Chip balance** is displayed on every major screen

## Main lobby

```
══════════════════════════════════
  The Mandalay Bay
══════════════════════════════════
Welcome, Guest
Chips: $1,000

Choose your adventure:
  1) Explore Table Games
  2) Explore Slot Machines
  3) Explore Sports Book
  4) Cashier
  5) Player Stats
  6) Casino Guide
  7) Leave Casino
```

| Option | Action |
|--------|--------|
| 1–3 | Enter a casino floor and pick an activity |
| 4 | Buy/cash out chips, view ledger |
| 5 | Session statistics per activity |
| 6 | In-game rules and controls reference |
| 7 | Exit the casino (confirmation required) |

### Low balance notice

If your balance drops below **$50**, a warning appears suggesting a Cashier visit.

---

## Welcome screen

Shown once on launch (skip with `--no-intro`):

- Casino name and tagline
- Your player name and starting chips
- Tip about the Casino Guide

Press **Enter** to enter the lobby.

---

## Table Games floor

```
Table Games:
  1) Blackjack — Classic 21 with solo or full-table play... (min 10 chips)
  0) Back
```

### Blackjack table menu

```
Choose your table:
  1) Quick hand (solo, table minimums)
  2) Custom table setup
  0) Back
```

**Quick hand** — Solo vs dealer, $10–$100 bets (capped by balance), 6 decks, H17.

**Custom table setup** walks through:

| Step | Options |
|------|---------|
| Table mode | Solo vs dealer / Full table with AI players |
| Minimum bet | $1 – your balance |
| Maximum bet | min bet – your balance |
| Decks | 1–8 |
| Simulated players | 1–6 (table mode only) |
| Your seat | 1 to (bots + 1) |
| Dealer rule | H17 or S17 |

### At the blackjack table

| Prompt | Input |
|--------|-------|
| Place bet | Dollar amount; `q`/`quit`/`leave` to exit |
| Your turn | `h` hit, `s` stand, `d` double, `p` split, `u` surrender |
| Insurance | `y` / `n` |
| Another hand | `y` / `n` |

When you leave, chips sync to your casino wallet and a session net is shown.

---

## Slot Machines floor

```
Slot Machines:
  1) Mandalay Fortune Slots — Three-reel slots... (min 5 chips)
  0) Back
```

### Machine selection

| Machine | Bet range |
|---------|-----------|
| Mandalay Fortune | $5 – $50 |
| High Roller | $25 – $500 |

If your balance is below a machine's minimum, you cannot play that machine.

### Spin loop

```
Chips: $950
Spin amount (5-50, 0 to leave) [5]: 25

  [ 🍒 | 7 | 🍋 ]

No win this spin.
Spin again? (Y/n):
```

| Input | Result |
|-------|--------|
| Bet amount | Spin the reels |
| `0` | Leave the machine |
| `n` at "Spin again?" | End session |

---

## Sports Book floor

```
--- Today's Board ---
  1) [NFL] Chiefs @ Raiders
     ML: Chiefs +130 | Raiders -150
     Spread: Raiders -1.5 (-110) | Chiefs +1.5 (-110)
  ...

Sports Book:
  1) Place a wager (2 open ticket(s))
  2) Settle all open bets (2 ticket(s))
  3) Refresh lines
  0) Back
```

### Placing a wager

1. **Event number** — pick from the board
2. **Bet type** — Moneyline or Spread
3. **Pick** — Team or spread side
4. **Wager amount** — min $10 up to your balance

Chips are debited immediately when the ticket is placed.

### Settling bets

Select **Settle all open bets** to simulate final scores and resolve all pending tickets. Wins credit your wallet; losses are already debited.

### Refresh lines

Generates a new board of four events with updated odds.

---

## Cashier

```
Chip window:
  1) Buy chips ($500 bundle)
  2) Buy custom amount
  3) Cash out chips
  4) View transaction ledger
  0) Back
```

| Option | Behavior |
|--------|----------|
| $500 bundle | Instant $500 buy-in |
| Custom amount | $50 – $100,000 |
| Cash out | $1 – current balance (disabled at $0) |
| Ledger | Last 20 transactions with timestamps |

---

## Player Stats

Displays:

- Player name and current balance
- Session net (gambling only, excludes buy-ins)
- Per-activity: visits, total bets, net winnings

---

## Casino Guide

In-game help with six sections:

1. Overview & navigation
2. Blackjack rules & controls
3. Slot machine paytable
4. Sports book guide
5. Chip economy
6. View all sections

---

## Global shortcuts & tips

| Context | Shortcut |
|---------|----------|
| Sub-menus | `0` — go back |
| Blackjack bet | `q`, `quit`, `leave` — leave table |
| Yes/no prompts | Enter = default; `y`/`n` |
| Interrupt | `Ctrl+C` — exit with balance shown |

## Keyboard efficiency

All menus accept numeric choices. Defaults are shown in `[brackets]` — press Enter to accept.
