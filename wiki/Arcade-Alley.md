# Arcade Alley

Vegas-styled **classic arcade** cabinets on the web terminal — skill minigames in a fullscreen CRT overlay, without entering the pixel RPG.

## Cabinets

| Game | Classic DNA | Cost | Goal |
|------|-------------|------|------|
| **Strip Cross** | Frogger | 5 chips | Cross Las Vegas Blvd to the neon marquee |
| **Neon Invaders** | Space Invaders | 10 chips | Clear the neon-sign wave |
| **High-Roller Breakout** | Breakout | 10 chips | Smash the card-suit brick wall |
| **Showgirl Beat** | Rhythm | 15 chips | Match kick / snare / hat for 5 rounds |

## Overlay

Selecting a cabinet opens a fixed **CRT arcade overlay** (chrome bezel, neon marquee, scanlines, coin insert, LED footer). Keyboard or on-screen controls; **ESC** / EXIT returns to the alley.

Playfields render at **720×840** (2× the CRT aspect) with procedural pixel sprites, multi-frame animations, dithered surfaces, neon shading, and lightweight particle FX — no external image assets. Canvas sampling is nearest-neighbor so the CRT upscale stays crisp.

## Economy

- Play debit counts as a wager (MGM Rewards handle).
- Skill payouts scale ~0–3× the play cost.
- **Arcade tickets** from score (`score / 100`, +2 on clear) redeem for small chip packs, a free-spin voucher flag, or a welcome-drink refill.

## Persistence

Tickets, high scores, and redeem flags save in `session.arcade` / `arcadeData`.

## Related

Valet Vic's **Vegas Strip Drive** cabinet in the RPG valet garage is a separate OutRun-lite canvas arcade (no wager) — see [[Pixel-RPG-Simulator]].

## Implementation

| Path | Role |
|------|------|
| `docs/js/arcade/ArcadeCabinetOverlay.js` | CRT overlay shell |
| `docs/js/arcade/games/*.js` | Cabinet games |
| `docs/js/arcade/gfx/` | Shared display / pixel / anim / fx / sprites |
| `docs/js/ui/arcade-renderers.js` | Floor UI |
| `mandalay_bay/activities/arcade.py` | CLI lists cabinets |

See [[Casino-Offerings]] and [[Player-Guide]].
