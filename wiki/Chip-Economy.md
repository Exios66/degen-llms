# Chip Economy

The Mandalay Bay uses a **unified chip wallet** shared across every activity.

## Core concepts

| Concept | Description |
|---------|-------------|
| **Chip** | Single currency unit ($1 = 1 chip) |
| **Wallet** | Your balance everywhere on the floor |
| **Ledger** | Audit trail of every transaction |
| **Buy-in** | Purchase chips at the Cashier (not gambling) |
| **Cash-out** | Remove chips from your wallet at the Cashier |

## How wagers work

1. Player places a wager
2. Wallet is **debited** immediately
3. Activity resolves the outcome
4. Wins are **credited**; pushes refund the stake

### By activity

| Activity | When chips move |
|----------|-----------------|
| **Blackjack** | Bet at hand start; settlement after each hand; wallet synced to table rail |
| **Hold'em** | Blinds and bets per street; pot awarded at showdown |
| **Roulette** | Debited per spin; wins credited immediately |
| **Craps** | Debited per bet; resolved on each roll |
| **Slots** | Debited per spin; wins credited immediately |
| **Lottery** | Debited at ticket purchase; prizes on draw/scratch |
| **Sports Book** | Debited when ticket placed; credited on settlement |
| **Prediction markets** | Debited on contract purchase; credited on resolution |
| **Racing / Equestrian** | Debited on wager; credited on result |
| **Cashier** | Buy-in credits; cash-out debits |
| **Hotel** | Daily charges, minibar, room service debited from wallet |

## Transaction ledger

Every operation creates a ledger entry:

```
14:32:01 | blackjack    | -50  | bal 950  | Hand result
14:32:45 | blackjack    | +100 | bal 1050 | Hand result
14:35:10 | slots        | -25  | bal 1025 | Slot spin $25
14:35:10 | slots        | +50  | bal 1075 | Two cherries! 2x
14:40:00 | cashier      | +500 | bal 1575 | Purchased $500 in chips
```

View the last 20 entries at **Cashier → View transaction ledger**.

## Transaction types

| Type | Meaning |
|------|---------|
| `buy_in` | Cashier purchase |
| `cash_out` | Cashier withdrawal |
| `wager` | Bet placed or net loss recorded |
| `win` | Payout credited |

## Player Stats vs ledger

- **Player Stats** — aggregated net per activity (visits, bets, net winnings)
- **Session net** — sum of all gambling transactions (excludes buy-ins and cash-outs)
- **Ledger** — line-by-line audit trail

## Blackjack wallet sync

Blackjack maintains a **table rail** (in-hand balance) that mirrors your wallet:

1. On sit-down: rail = wallet balance
2. After each hand: wallet adjusted by net hand result
3. On stand-up: final reconciliation ensures wallet = rail

## Hold'em buy-in persistence

Your table stack carries across hands. Wins and losses accrue on the felt; leaving the table credits remaining chips back to the wallet.

## Off-strip bank account (web)

Park winnings outside the cage. Fund casino trips from external income without carrying full balance on the floor.

### Offshore spend tree

1. **Deposit outside funds** — symbolic personal wire ($50–$1M)
2. **Life & business expenses**
   - Personal lifestyle (dining, transport, shopping, lodging, entertainment)
   - Legal & obligations (legal fees, debt repayments)
   - Business affairs (operating expenses, contracts & retainers)
   - Miscellaneous
3. **Buy resort privileges** — in-world upgrades paid from offshore cash (floor floats, Betty welcome round, arcade vouchers, late-checkout credit, VIP host retainer, High Limit marker, recovery spa, lucky rail tip)
4. **Rename account** / **View bank ledger**

Expense and privilege spends respect MGM Rewards tier withdraw caps.

## Insufficient funds

Activities check balance before accepting wagers:

- Cannot spin slots below machine minimum
- Cannot sit at tables below minimum bet
- Cannot place sports wagers below $10 or above balance
- Cashier cash-out disabled at $0 balance
- Hotel overdue charges can lock room access

Visit the **Cashier** to buy more chips when low.

## MGM Rewards wagering

Lifetime chips wagered advance your tier. See [[MGM-Rewards]].
