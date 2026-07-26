"""In-game and documentation help content for The Mandalay Bay."""

CASINO_OVERVIEW = """
THE MANDALAY BAY — PLAYER OVERVIEW
===================================
Explore the casino floor freely. Your chip wallet follows you everywhere.
Visit the Cashier to buy more chips or review your transaction history.

Main lobby options:
  1) Table Games       — Blackjack, Texas Hold'em, Roulette, Craps
  2) Slot Machines     — Mandalay Bay slots (Megabucks, Wheel of Fortune, and more)
  3) Lottery Counter   — Pick 3/4, Mega draws, scratchers
  4) Sports Book       — Stored scenario board, parlays/futures, prediction markets
  5) Trading Floor     — Futures & call/put options (NYSE, commodities, crypto)
  6) Arcade Alley      — CRT cabinet overlays (web) — Frogger, Invaders, Breakout, rhythm
  7) Racing Pavilion   — Thoroughbred win / place / show
  8) Equestrian Arena  — Dressage competition & Show Jumping
  9) Cashier           — Buy chips, cash out, view ledger
 10) Player Stats      — Visits, bets, net winnings per activity
 11) Save Game         — Write progress to your save slot
 12) Casino Guide      — Rules and controls reference
 13) Leave Casino      — Auto-saves and exits

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
Your last spin amount stays selected as the default for the next pull.

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
1) Sports board — pages of 125+ stored scenarios (NFL, NBA, MLB, MLS, NHL, NCAA, UFC, Tennis, Golf)
2) Prediction markets — 125+ stored YES/NO contracts (History Desk, headlines, Vegas, sentiment, easter eggs)
3) Next scenario slate advances the stored DB cursor (boards cycle and wrap)
4) Settle all open positions when ready for simulated finals and market resolutions

Sports bet types:
  Moneyline — Pick the outright winner
  Spread    — Pick a team to cover the point spread
  Total     — Over/under the combined score line
  Props     — Side bets tied to the same simulated outcome
  Outright  — UFC, tennis, and golf winner markets
  Futures   — Season / tournament winner markets from the scenario book
  Parlay    — 2–4 legs (ML or totals), American odds combined

Prediction markets:
  Buy YES or NO at displayed cent prices (e.g. 35¢ YES → high upside if correct)
  History Desk — realistic historical claims that settle to recorded truth
  Easter Eggs — ludicrous longshot contracts for the chaotic visitor
  Filter the board by category; Refresh prices drifts quotes; Next slate pages the DB

American odds examples:
  +150  — Win $150 profit on a $100 bet
  -110  — Bet $110 to win $100 profit

Open positions appear in the unified bet slip.
"""

TRADING_DESK_HELP = """
TRADING FLOOR — MANDALAY MARKETS
================================
Long-only futures and call/put options on NYSE equities, commodities, and crypto.

1) Browse / filter the stored contract catalog (700+ listings)
2) Buy futures (margin stub) or pay premium for calls/puts
3) Settle / expire — spot drifts from the mark, options settle to intrinsic

Instrument notes:
  Future — margin ≈ 10% of notional; PnL tracks mark → exit spot
  Call   — pays max(0, spot − strike) × multiplier × qty
  Put    — pays max(0, strike − spot) × multiplier × qty

Minimum trade: 25 chips. No naked shorts.
"""

HOLDEM_HELP = """
TEXAS HOLD'EM — RULES & HAND RANKINGS
=====================================
Hand categories follow the UCI / Kaggle poker-hands dataset (CLASS 0–9):
  0 High card   1 One pair      2 Two pair       3 Three of a kind
  4 Straight    5 Flush         6 Full house     7 Four of a kind
  8 Straight flush   9 Royal flush

Gameplay:
  • 5-handed no-limit table: you + 4 AI opponents
  • Buy in once; your stack carries across hands with wins and losses
  • Blinds post automatically each hand
  • Full street flow: pre-flop → flop → turn → river → showdown
  • Each street has a betting round; bots fold, call, or raise
  • Raise to any amount from the minimum up to your stack (no-limit)
  • Best five-card hand from your two hole cards + five community cards
  • Cash out when you leave — remaining stack returns to your wallet
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
A live spin history strip shows recent results (newest first) as you play.
"""

CRAPS_HELP = """
MANDALAY CRAPS — DICE TABLE
===========================
Come-out roll:
  • Pass Line wins on 7 or 11; loses on 2, 3, or 12; else a point is set
  • Don't Pass wins on 2 or 3; pushes on 12; loses on 7 or 11

Point phase:
  • Pass Line wins if the point repeats before a 7
  • Don't Pass wins on seven-out

One-roll sides: Field, Any Craps (7:1), Any Seven (4:1)
Hardways stay working until they hit hard or lose to a soft/seven.
"""

LOTTERY_HELP = """
MANDALAY LOTTERY — TICKET COUNTER
=================================
Stake tiers scale ticket prices and fixed prizes (same boosts as slots).

Strip Pick 3 / Neon Pick 4 (+ High Limit variants):
  • Straight (exact order) or Box (any order) prizes
  • Lucky-number digit pad or Quick Pick

Mandalay Mega / High Limit Mega / Salon Powerball:
  • 5 lucky numbers (1–70) + Powerball (1–25)
  • Tiered prizes for matches + Powerball

Scratchers:
  • Gold Rush, Wild Card, Platinum, and Diamond instant tickets
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

EQUESTRIAN_HELP = """
EQUESTRIAN ARENA — DRESSAGE & SHOW JUMPING
==========================================
The Equestrian Arena is a separate venue from the Racing Pavilion,
featuring scored discipline events rather than flat racing.

Dressage:
  Riders compete in Grand Prix-level tests judged on Technical and Artistic merit.
  Bet on any competitor to Win (1st), Place (top 2), or Show (top 3).
  Odds reflect combined score projections.

Show Jumping:
  Competitors navigate a 12-fence course. Faults are added for knockdowns (4)
  or refusals (1); ties broken by elapsed time.

  Win        — competitor finishes 1st
  Place      — top 2
  Show       — top 3
  Clear Round — horse completes the course with 0 faults (pays 3× wager)

Place tickets before the event runs, then settle to see results.
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

ARCADE_HELP = """
ARCADE ALLEY — CRT CABINETS (WEB)
=================================
Vegas-styled classic minigames in a fullscreen CRT overlay.
Play on the web terminal (CLI lists cabinets only).

Cabinets:
  Strip Cross      — 5 chips  — Frogger across Las Vegas Blvd
  Neon Invaders    — 10 chips — blast descending neon signs
  High-Roller Breakout — 10 chips — felt paddle vs card bricks
  Showgirl Beat    — 15 chips — kick / snare / hat rhythm

Earn arcade tickets from score; redeem for small chip packs,
a free-spin voucher flag, or a welcome-drink refill.
ESC or EXIT leaves the cabinet overlay.
"""

SECTIONS = {
    "overview": CASINO_OVERVIEW,
    "blackjack": BLACKJACK_HELP,
    "holdem": HOLDEM_HELP,
    "roulette": ROULETTE_HELP,
    "craps": CRAPS_HELP,
    "slots": SLOTS_HELP,
    "lottery": LOTTERY_HELP,
    "sportsbook": SPORTSBOOK_HELP,
    "trading_desk": TRADING_DESK_HELP,
    "arcade": ARCADE_HELP,
    "horse_racing": HORSE_RACING_HELP,
    "equestrian": EQUESTRIAN_HELP,
    "dressage": EQUESTRIAN_HELP,
    "jumper": EQUESTRIAN_HELP,
    "chips": CHIP_ECONOMY_HELP,
    "saves": SAVES_HELP,
}
