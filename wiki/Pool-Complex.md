# Pool Complex

The **11-acre pool expansion** — wave pool, cabanas, Shark Reef, and beach club.

## Zones

| Zone | Highlights |
|------|------------|
| **Wave pool** | Timed wave cycles — catch the swell for mini-game bonuses |
| **Hot tubs** | Relaxation vignettes |
| **Private cabanas** | Bookable with chip spend |
| **Shark Reef Aquarium** | Species collection quest (photograph 5 species in RPG) |
| **Topless beach club** | Gated area with narrative events |
| **Beach rave** | Night-event vignettes |

## Features

- Unlockable pool vignettes that chain into hotel room events
- Cross-system requirements via `resort_bridge` (pool visits unlock hotel content)
- Day/night tint affects pool atmosphere
- Integration with MGM Rewards perks

## Shark Reef collection (RPG)

Quest: photograph 5 shark species across the aquarium map. Progress tracked in `rpg.quests.shark_photos`.

## Access

- **Web:** Pool hub from resort menu
- **RPG:** West lobby → Mandalay Beach; warp to Shark Reef from beach map

## Implementation

| Path | Role |
|------|------|
| `mandalay_bay/pool_complex.py` | Zone definitions & events |
| `mandalay_bay/pool_experience.py` | CLI flows |
| `docs/js/pool-complex.js` / `docs/js/pool-complex-ui.js` | Browser mirror |
| `docs/js/pool-complex-ui.js` → `buildPoolRenderers(ctx)` | Screens the RPG mounts too |

See [[Resort-Hotel]] for vignette chains and [[Pixel-RPG-Simulator]] for map access.
