# Player Guide

Complete navigation reference for **The Mandalay Bay** across CLI and web surfaces.

## Navigation model

The casino uses a **hub-and-spoke** pattern:

- **Main lobby** has no "Back" option — you are always at the root
- **Sub-menus** show `0) Back` to return to the previous screen
- **Chip balance** is displayed on every major screen
- Progress **auto-saves** after each floor activity and when leaving

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
  3) Explore Lottery Counter
  4) Explore Sports Book
  5) Explore Racing Pavilion
  6) Explore Equestrian Arena
  7) Cashier
  8) Player Stats
  9) Save Game
 10) Casino Guide
 11) Leave Casino
```

| Option | Action |
|--------|--------|
| 1–6 | Enter a casino floor and pick an activity |
| 7 | Buy/cash out chips, view ledger |
| 8 | Session statistics per activity |
| 9 | Manual save to your slot |
| 10 | In-game rules and controls reference |
| 11 | Auto-save and exit (confirmation required) |

### Low balance notice

If your balance drops below **$50**, a warning appears suggesting a Cashier visit.

---

## Save library (entry screen)

Before the casino floor, you manage save slots:

```
Save options:
  1) Load a save slot
  2) Create new save in empty slot
  3) Delete a save slot
  4) Refresh library
  5) Exit without playing
```

Most recently played saves appear first. Up to **5 slots** total.

See [[Save-Slots]] for CLI usage (`--slot`, `--new`, `--list-saves`).

---

## Table Games floor

Activities: Blackjack, Texas Hold'em, Mandalay Roulette, Craps.

See [[Blackjack]], [[Table-Games]].

---

## Slot Machines floor

Choose a **stake tier**, then pick from fourteen machines. Your **last spin amount** stays as the default for the next pull (web and CLI).

See [[Slot-Machines]].

---

## Lottery Counter

Pick 3, Pick 4, Mega draw, and scratchers. Quick pick or enter your own numbers.

See [[Lottery-Counter]].

---

## Sports Book floor

Two tabs: **Sports** (moneyline, spread, totals) and **Predictions** (binary contracts).

```
Sports Book:
  1) Place a wager
  2) Settle all open bets
  3) Refresh lines
  0) Back
```

See [[Sports-Book-and-Prediction-Markets]].

---

## Racing Pavilion & Equestrian Arena

Thoroughbred win/place/show and equestrian dressage/jumping competitions.

See [[Racing-and-Equestrian]].

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

See [[Chip-Economy]].

---

## Player Stats

Displays:

- Player name and current balance
- Session net (gambling only, excludes buy-ins)
- Per-activity: visits, total bets, net winnings

---

## Casino Guide

In-game help with sections for every activity:

1. Overview & navigation
2. Blackjack rules & controls
3. Hold'em, roulette, craps
4. Slot machine paytables
5. Lottery tickets
6. Sports book & prediction markets
7. Racing & equestrian
8. Chip economy

---

## Mandalay Bay Hotel Experience

Exit the casino floor to the **hotel lobby** (web: hub menu; deep link: `?view=hotel-lobby`).

### Hotel flow

1. **MGM Rewards (P)** → Reservation — locate your tower and floor
2. **Hallway mini-game** — three beats of directional choices
3. **Your room** — TV, minibar, phone, decisions, unlockable Vegas vignettes

### In-room amenities

| Amenity | Highlights |
|---------|------------|
| TV | Shark Reef (ch. 47), wave pool cam, ULTRA Arena boxing, House of Blues (Gold+) |
| Minibar | Sensor-enabled charges; concierge suggests items |
| Phone | Concierge, bookie, Foundation Room (Noir+), spa, Delano |
| Decisions | Balcony, sky bridge to Mandalay Place, suite/penthouse perks |

**17 unlockable room events** chain across pool visits, shopping, tier status, and bad decisions.

### World day/night cycle

**2 hours real time = 1 resort day.**

Each new day:
- **Daily charges** post (room rate + resort fee + parking)
- **Reservation requirement rotates:** phone → desk → both → net-positive whale
- **Insufficient chips** locks room access until charges are settled

See [[Resort-Hotel]].

---

## Global shortcuts & tips

| Context | Shortcut |
|---------|----------|
| Sub-menus | `0` — go back |
| Blackjack bet | `q`, `quit`, `leave` — leave table |
| Yes/no prompts | Enter = default; `y`/`n` |
| Web MGM Rewards phone | `P` |
| RPG Trainer Card | `T` |
| Interrupt (CLI) | `Ctrl+C` — exit with balance shown |

All menus accept numeric choices. Defaults are shown in `[brackets]` — press Enter to accept.
