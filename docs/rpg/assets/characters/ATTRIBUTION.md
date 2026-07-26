# Character sprite credits

All assets below are used under permissive open licenses in The Mandalay Bay pixel RPG.

## Dealers and staff (unique sheets)

- **Files:** `staff/*.png` (14 unique characters — 7 dealers + 7 staff palette keys)
- **Author:** Jephed (Game Between The Lines)
- **Source:** https://gamebetweenthelines.itch.io/top-down-pixel-art-characters
- **License:** Free for commercial and non-commercial use (credit appreciated)

Top-down characters with 4-direction idle and walk cycles. Sheet metadata lives
in `js/data/character-sheets.js` / `CharacterSprites.js`. The live overworld
bakes player and NPC looks procedurally via `TextureFactory.js` (map floors and
decor are procedural as well — there is no vendored `assets/tiles/` tree).
