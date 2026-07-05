# Legacy Horse Sprites (Pre-Redesign Archive)

These files preserve the **original procedural horse sprites** used in the Racing Pavilion before the July 2026 equestrian redesign.

## Contents

| File | Description |
|------|-------------|
| [`legacy-horse-sprites.js`](legacy-horse-sprites.js) | Frozen copy of the pre-redesign `docs/js/horse-sprites.js` module (46 chibi/kawaii variants with fantasy styling) |
| [`roster-contact-sheet.png`](roster-contact-sheet.png) | All 46 variants — idle frame |
| [`roster-contact-sheet-trot.png`](roster-contact-sheet-trot.png) | All 46 variants — trot frame |
| [`individual/`](individual/) | Per-variant PNG exports (`<id>-idle.png`, `<id>-trot.png`) |

## Context

The legacy system drew horses procedurally on canvas at 40×32 px with:

- Chibi side-view proportions (Mana Seed / Hardy Horse inspired)
- 46 coat variants including fantasy entries (unicorn, galaxy, neon, etc.)
- Kawaii marks (hearts, stars, crowns) and blush tones
- 3-frame idle tail swish and 4-frame trot cycle

These were replaced by 8 realistic RPG Maker-style equestrian sprites with 4-direction walk cycles.

## Re-exporting PNGs

From the repository root (requires Node.js and the `canvas` npm package):

```bash
npm install canvas
node scripts/export-legacy-horse-sprites.mjs
```

Output is written to this directory.
