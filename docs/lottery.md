# Lottery Counter

State-lottery-style tickets at the **Lottery Counter** floor.

Stake tiers (Penny → No Limit) scale **ticket prices** and **fixed prize tables** using the same payout boosts as slots. Pick games already pay as a multiple of the charged price.

## Ticket types

| Ticket | Base cost | Description |
|--------|-----------|-------------|
| **Strip Pick 3** | 2 chips | 3-digit draw — straight or box |
| **Neon Pick 4** | 2 chips | 4-digit draw — straight or box |
| **Mandalay Mega** | 5 chips | 5 lucky numbers + Powerball |
| **Gold Rush Scratcher** | 5 chips | Instant-win scratch ticket |
| **Wild Card Scratcher** | 10 chips | Higher-stakes instant ticket |
| **High Limit Pick 3** | 25 chips | High-limit 3-digit draw |
| **High Limit Pick 4** | 25 chips | High-limit 4-digit draw |
| **High Limit Mega** | 50 chips | 10× Mega prize table |
| **Platinum Scratcher** | 50 chips | Premium instant ticket |
| **Salon Powerball** | 500 chips | 100× Mega prize table |
| **Diamond Scratcher** | 250 chips | Salon instant ticket |

## Pick 3 / Pick 4

### Play styles

| Style | Win condition |
|-------|---------------|
| **Straight** | Exact order match |
| **Box** | Any order match (lower payout) |

### Number entry

- **Lucky number selector** — tap digits 0–9 into slots
- **Quick Pick** — random digits generated

## Mandalay Mega / Powerball

Pick **5 lucky numbers (1–70)** plus a **Powerball (1–25)**. Use the on-screen ball grids or Quick Pick. Prizes scale with matches:

| Matches | Payout tier |
|---------|-------------|
| 5 + Powerball | Jackpot |
| 5 | Major |
| 4 + Powerball | Large |
| 4 / 3 + Powerball / 3 | Medium |
| 2 + Powerball / 1 + Powerball / Powerball only | Small |

High Limit Mega and Salon Powerball use the same draw with larger prize multipliers.

## Scratchers

Instant resolution with a foil reveal animation. Weighted prize tiers — Platinum and Diamond raise the top prizes.

## Game flow

```
Stake tier → Lottery Counter → Select ticket → Lucky numbers / Powerball (or Quick Pick) → Draw/scratch overlay → Results
```

## Pixel RPG

Talk to **Lottery Lena** at the counter in The Shoppes at Mandalay Place. The counter is the same screen the terminal shows, mounted in an encounter panel (stake tier picker first).

## Implementation

| Path | Role |
|------|------|
| `mandalay_bay/lottery.py` | Python engine |
| `docs/js/lottery.js` | Browser mirror |
| `mandalay_bay/activities/lottery.py` | CLI activity |
| `docs/js/ui/lottery-renderers.js` | Counter screen the RPG mounts too |
