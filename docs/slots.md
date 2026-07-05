# Slot Machines

Three-reel slot machines on the **Slot Machines** floor — modeled after the games found at MGM Mandalay Bay, from penny slots to linked progressives.

## Stake tiers

Before playing any machine or table game, choose a **stake tier**. Each tier sets the minimum and maximum wager for that session:

| Tier | Range | Notes |
|------|-------|-------|
| Penny & Low Limit | $1 – $25 | Micro stakes |
| Standard | $5 – $100 | Main floor |
| High Limit | $25 – $500 | High-limit room |
| **401K Contribution** | **$542 – $6,500** | Average U.S. employee deferral (~$542/mo, $6,500/yr cap) |
| **High Roller / No Limit** | **$2,500 – bankroll** | Salon stakes — no table maximum |

Salon tiers (401K and No Limit) apply across **every** machine and table on the floor. Progressive jackpots still require the **effective max bet** for your tier to qualify.

## Machines

| Machine | Min bet | Max bet | Type |
|---------|---------|---------|------|
| Mandalay Fortune | $5 | $50 | Classic |
| High Roller | $25 | $500 | High limit |
| **Megabucks** | $1 | $3 | Wide-area progressive |
| Wheel of Fortune | $1 | $25 | Video slot |
| Blazin' 7s | $1 | $25 | Classic progressive |
| Buffalo Gold | $1 | $50 | Video slot |
| Monte Carlo | $1 | $5 | Linked progressive |
| Super Spin | $1 | $5 | Linked progressive |
| Triple Red Hot 7s | $1 | $25 | Classic |
| Double Jackpot | $1 | $25 | Video slot |
| Spooky Link | $1 | $25 | Themed video |
| Wizard of Oz — I'll Get You My Pretty | $1 | $25 | Themed video |
| Emerald Guardian | $1 | $25 | Themed video |
| Tiger and Dragon — Super Bonus | $1 | $50 | Themed video |

Max bet is capped by your current chip balance. Progressive machines display the current jackpot in the machine picker.

## Game flow

```
Slot Machines → Mandalay Bay Slots → Choose stake tier → Pick machine → Spin loop → Leave
```

1. Choose a stake tier (Penny through High Roller / No Limit)
2. Select a machine from the full floor lineup
2. Paytable and jackpot (if progressive) are displayed
3. Enter spin amount (or `0` to leave)
4. Reels spin with secure weighted RNG
5. Payout applied immediately
6. Choose to spin again or leave

## Progressive jackpots

Three machines feed linked progressive pools:

| Pool | Machines | Seed | Qualification |
|------|----------|------|---------------|
| Megabucks | Megabucks | 250,000 chips | Three 💵 at max bet ($3) |
| Mandalay linked | Monte Carlo, Super Spin | 50,000 chips | Three 👑 or ⭐ at max bet ($5) |

Each qualifying spin contributes a small percentage of the bet to the pool. Jackpots persist in your save slot.

## Megabucks

The flagship wide-area progressive at Mandalay Bay and across MGM properties:

- **Bet range:** $1–$3 per spin (penny-slot style)
- **Jackpot trigger:** Three Megabucks symbols (💵 💵 💵) on the payline
- **Qualification:** Must bet the **maximum** ($3) to be eligible for the progressive
- **Base pays:** Triple 7s (80x), BAR×3 (20x), and partial Megabuck matches

## Mandalay Fortune (classic paytable)

| Result | Multiplier |
|--------|------------|
| 7 — 7 — 7 | 100x |
| 💎 — 💎 — 💎 | 50x |
| 🔔 — 🔔 — 🔔 | 25x |
| BAR — BAR — BAR | 15x |
| 🍒 — 🍒 — 🍒 | 10x |
| 🍒 — 🍒 (first two) | 2x |
| 🍒 (first reel only) | 1x (bet returned) |

Each machine has its own symbols, weights, and paytable. See the in-game paytable when you sit down at a machine.

## RNG

Each reel independently selects a symbol via `secrets.SystemRandom()` (CLI) or `crypto.getRandomValues()` (browser) from the weighted pool. Outcomes are not manipulated.

## ASCII mode

With `--ascii`, emoji symbols render as three-letter codes (CER, BEL, MEG, etc.).

## Implementation

- `mandalay_bay/activities/slots.py` — machine catalog, paytables, progressive logic
- `docs/js/slots.js` — browser mirror (keep in sync)
- Tests: `tests/test_casino_activities.py`
