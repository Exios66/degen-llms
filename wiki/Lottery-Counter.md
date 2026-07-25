# Lottery Counter

State-lottery-style tickets at the **Lottery Counter** floor.

## Ticket types

| Ticket | Cost | Description |
|--------|------|-------------|
| **Strip Pick 3** | 1 chip | 3-digit draw — straight or box |
| **Neon Pick 4** | 2 chips | 4-digit draw — straight or box |
| **Mandalay Mega** | 5 chips | 5 main numbers + Mega Ball |
| **Quick Scratcher** | 3 chips | Instant-win scratch ticket |
| **Gold Scratcher** | 10 chips | Premium instant-win ticket |

## Pick 3 / Pick 4

### Play styles

| Style | Win condition |
|-------|---------------|
| **Straight** | Exact order match |
| **Box** | Any order match (lower payout) |

### Number entry

- **Quick pick** — random digits generated
- **Manual entry** — type your numbers

## Mandalay Mega

Pick 5 numbers (1–70) plus a Mega Ball (1–25). Prizes scale with matches:

| Matches | Payout tier |
|---------|-------------|
| 5 + Mega | Jackpot |
| 5 | Major |
| 4 + Mega | Large |
| 4 / 3 + Mega / 3 | Medium |
| 2 + Mega / 1 + Mega / Mega only | Small |

## Scratchers

Instant resolution — scratch to reveal symbols. Match patterns for prizes. Gold scratchers have higher top prizes.

## Game flow

```
Lottery Counter → Select ticket type → Quick pick or enter numbers → Draw/scratch → Results
```

## Pixel RPG

Visit the lottery counter NPC in the RPG overworld. Tickets launch as a DOM overlay.

## Implementation

| Path | Role |
|------|------|
| `mandalay_bay/lottery.py` | Python engine |
| `docs/js/lottery.js` | Browser mirror |
| `mandalay_bay/activities/lottery.py` | CLI activity |
| `docs/rpg/js/systems/overlays/LotteryOverlay.js` | RPG overlay |
