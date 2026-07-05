"""In-game and documentation help content for The Mandalay Bay."""

CASINO_OVERVIEW = """
THE MANDALAY BAY — PLAYER OVERVIEW
===================================
Explore the casino floor freely. Your chip wallet follows you everywhere.
Visit the Cashier to buy more chips or review your transaction history.

Main lobby options:
  1) Table Games     — Blackjack, Texas Hold'em, Roulette
  2) Slot Machines   — Mandalay Bay slots (Megabucks, Wheel of Fortune, and more)
  3) Sports Book     — Moneyline and spread wagering
  4) Racing Pavilion — Thoroughbred win / place / show
  5) Cashier         — Buy chips, cash out, view ledger
  6) Player Stats    — Visits, bets, net winnings per activity
  7) Save Game       — Write progress to your save slot
  8) Casino Guide    — Rules and controls reference
  9) Leave Casino    — Auto-saves and exits

Save system:
  • Pick or create a save slot when entering the casino
  • Up to 5 slots; most recently played appear first in the library
  • Progress auto-saves when leaving or after each activity
  • CLI: --list-saves, --slot N, --slot N --new

Navigation tips:
  • Press 0 at sub-menus to return to the previous screen
  • Type q or quit during bet prompts to leave a table
  • Chip balance is shown before every wager
"""

BLACKJACK_HELP = """
BLACKJACK — CONTROLS & RULES
============================
Betting:  Enter chip amount (q to leave table)
Actions:  (h)it  (s)tand  (d)ouble  (p)split  (u)surrender
Insurance: y / n when dealer shows Ace

Rules (default):
  • 6-deck shoe, dealer hits soft 17 (H17)
  • Blackjack pays 3:2
  • Double on any two cards; split up to 4 hands
  • Split aces receive one card each
  • Late surrender available
  • Insurance pays 2:1 (max half your bet)
"""

SLOTS_HELP = """
SLOT MACHINES — MANDALAY BAY FLOOR
===================================
Penny slots to high-limit progressives — pick any machine on the floor.

Classic & high limit:
  Mandalay Fortune     5–50 chips per spin
  High Roller          25–500 chips per spin

Stake tiers (choose before playing any machine or table):
  Penny & Low Limit    $1–$25 per wager
  Standard             $5–$100 per wager
  High Limit           $25–$500 per wager
  401K Contribution    $542–$6,500 per wager (avg employee deferral)
  High Roller / No Limit  $2,500 minimum, no table maximum

Progressives (max bet required for jackpot):
  Megabucks            1–3 chips   — Three 💵 at max bet wins the pool
  Monte Carlo          1–5 chips   — Linked progressive (👑 x3)
  Super Spin           1–5 chips   — Linked progressive (⭐ x3)

Popular video & themed slots:
  Wheel of Fortune, Blazin' 7s, Buffalo Gold, Triple Red Hot 7s,
  Double Jackpot, Spooky Link, Wizard of Oz, Emerald Guardian,
  Tiger and Dragon — Super Bonus

Each machine has its own symbols and paytable (shown when you sit down).
Progressive jackpots grow with every spin and persist in your save slot.

Enter 0 as spin amount to leave the machine.
"""

SPORTSBOOK_HELP = """
SPORTS BOOK — HOW TO WAGER
==========================
1) Review the event board (NFL, NBA, MLB, Soccer)
2) Place a wager — pick moneyline or spread
3) Settle open bets when ready for simulated final scores

Moneyline: Pick the outright winner.
Spread:    Pick a team to cover the point spread.

American odds examples:
  +150  — Win $150 profit on a $100 bet
  -110  — Bet $110 to win $100 profit

Open tickets are listed in the Sports Book menu header.
"""

HOLDEM_HELP = """
TEXAS HOLD'EM — RULES & HAND RANKINGS
=====================================
Hand categories follow the UCI / Kaggle poker-hands dataset (CLASS 0–9):
  0 High card   1 One pair      2 Two pair       3 Three of a kind
  4 Straight    5 Flush         6 Full house     7 Four of a kind
  8 Straight flush   9 Royal flush

Gameplay:
  • Buy in at the table; blinds post automatically each hand
  • Pre-flop → flop → turn → river betting rounds
  • Actions: fold, check, call, raise (minimum raise = big blind)
  • Best five-card hand from your two hole cards + five community cards
  • Play vs AI opponents until you leave or bust
"""

ROULETTE_HELP = """
MANDALAY ROULETTE — EUROPEAN WHEEL
==================================
Single-zero wheel: 0 (green) plus 1–36.

Bet types:
  • Straight (35:1) — pick one number 0–36
  • Red / Black, Odd / Even, 1–18 / 19–36 (1:1)
  • Dozens 1–12, 13–24, 25–36 (2:1)

Zero wins only on straight-up bets; all outside bets lose on 0.
"""

HORSE_RACING_HELP = """
MANDALAY RACING — WIN / PLACE / SHOW
====================================
Each race card lists 5–6 horses with morning-line odds.

  Win   — horse must finish 1st (pays by odds)
  Place — horse finishes 1st or 2nd (pays 2× wager)
  Show  — horse finishes 1st, 2nd, or 3rd (pays 2× wager)

Place tickets, run the race to simulate results, then settle.
Refresh the card for a new field anytime.
"""

CHIP_ECONOMY_HELP = """
CHIP ECONOMY
============
• One wallet powers every activity on the floor
• Wagers debit your balance immediately
• Wins credit your balance automatically
• Buy-ins at the Cashier do not count as gambling profit/loss
• Player Stats shows net results per activity
• Full audit trail available at the Cashier ledger
"""

SAVES_HELP = """
SAVE SLOTS & LIBRARY
====================
• 5 save slots; most recently played listed first
• Saved data: player name, chips, stats, transaction ledger
• Auto-save: after each activity and when leaving the casino
• Manual save: lobby option "Save Game"

CLI:
  python3 -m mandalay_bay --list-saves
  python3 -m mandalay_bay --slot 2
  python3 -m mandalay_bay --slot 3 --new-save --name "Ace" --chips 2000
  python3 -m mandalay_bay --no-save
  python3 -m mandalay_bay --save-dir ./my_saves

Storage: ~/.mandalay_bay/saves/ (override with MANDALAY_BAY_SAVE_DIR or --save-dir)
Browser: localStorage per slot at https://exios66.github.io/degen-llms/
"""

SECTIONS = {
    "overview": CASINO_OVERVIEW,
    "blackjack": BLACKJACK_HELP,
    "holdem": HOLDEM_HELP,
    "roulette": ROULETTE_HELP,
    "slots": SLOTS_HELP,
    "sportsbook": SPORTSBOOK_HELP,
    "horse_racing": HORSE_RACING_HELP,
    "chips": CHIP_ECONOMY_HELP,
    "saves": SAVES_HELP,
}
