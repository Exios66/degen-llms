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
- Fullscreen **Mandalay Beach** graphic overlay (sun, desert, turquoise water, zone FX)

## Shark Reef collection (RPG)

Quest: photograph 5 shark species across the aquarium map. Progress tracked in `rpg.quests.shark_photos`.

## Access

- **Web:** Hotel Lobby → Pool Complex opens the graphic overlay
- **RPG:** West lobby → Mandalay Beach; NPC encounters open the same overlay

## Implementation

| Path | Role |
|------|------|
| `mandalay_bay/pool_complex.py` | Zone definitions & events |
| `mandalay_bay/pool_experience.py` | CLI flows |
| `docs/js/pool-complex.js` | Browser game logic |
| `docs/js/PoolComplexOverlay.js` | Fullscreen graphic overlay |
| `docs/css/pool-overlay.css` | Atmosphere, zone motifs, FX |
| `docs/js/pool-complex-ui.js` → `buildPoolRenderers(ctx)` | Deep-link / fallback host screens |

See [[Resort-Hotel]] for vignette chains and [[Pixel-RPG-Simulator]] for map access.
