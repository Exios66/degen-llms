"""In-game and documentation help content for The Mandalay Bay."""

CASINO_OVERVIEW = """
THE MANDALAY BAY — PLAYER OVERVIEW
===================================
Explore the casino floor freely. Your chip wallet follows you everywhere.
Visit the Cashier to buy more chips or review your transaction history.

Main lobby options:
  1) Table Games     — Blackjack (solo or with AI players)
  2) Slot Machines   — Mandalay Fortune & High Roller reels
  3) Sports Book     — Moneyline and spread wagering
  4) Cashier         — Buy chips, cash out, view ledger
  5) Player Stats    — Visits, bets, net winnings per activity
  6) Casino Guide    — This help screen
  7) Leave Casino    — Exit with your remaining chips

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
SLOT MACHINES — PAYTABLE
========================
Mandalay Fortune:  5–50 chips per spin
High Roller:       25–500 chips per spin (requires sufficient balance)

  7-7-7       100x bet
  💎💎💎       50x bet
  🔔🔔🔔       25x bet
  BAR×3       15x bet
  🍒🍒🍒       10x bet
  Two cherries 2x bet
  One cherry   Bet returned (push)

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

SECTIONS = {
    "overview": CASINO_OVERVIEW,
    "blackjack": BLACKJACK_HELP,
    "slots": SLOTS_HELP,
    "sportsbook": SPORTSBOOK_HELP,
    "chips": CHIP_ECONOMY_HELP,
}
