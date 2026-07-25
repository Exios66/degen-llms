# Racing and Equestrian

Two dedicated floors for horse competition wagering.

## Racing Pavilion

Thoroughbred sim with animated race results.

| Bet type | Description |
|----------|-------------|
| **Win** | Horse finishes 1st |
| **Place** | Horse finishes 1st or 2nd |
| **Show** | Horse finishes 1st, 2nd, or 3rd |

### Features

- Real horse names from `mandalay_bay/data/horse_names.csv`
- Strength-based odds generation
- Sport-accurate race simulation
- Minimum wager: **5 chips**

### Game flow

```
Racing Pavilion → Select race → Choose horse → Win/Place/Show → Watch race → Results
```

## Equestrian Arena

| Event | Description | Min bet |
|-------|-------------|---------|
| **Dressage** | Scored routine competition | 10 chips |
| **Show Jumping** | Fault-counted round over fences | 10 chips |

Both events simulate competitor performance and resolve wagers based on final standings.

## Pixel RPG

Racing and equestrian encounters launch from pavilion and arena NPCs as DOM overlays.

## Implementation

| Path | Role |
|------|------|
| `mandalay_bay/activities/horse_racing.py` | Thoroughbred activity |
| `mandalay_bay/activities/equestrian.py` | Dressage & jumper |
| `docs/js/horse_racing.js` / `docs/js/equestrian.js` | Browser mirrors |
| `docs/rpg/js/systems/overlays/HorseRacingOverlay.js` | RPG overlays |
| `docs/rpg/js/systems/overlays/EquestrianOverlay.js` | RPG overlays |
