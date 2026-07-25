# Save Slots

The Mandalay Bay persists your progress across sessions using a **save library** with up to **5 slots**.

## Save library location

### CLI

```
~/.mandalay_bay/saves/
├── library.json      # Index + recent-play order
├── slot_1.json
├── slot_2.json
...
```

Override with `--save-dir /path/to/saves` or the `MANDALAY_BAY_SAVE_DIR` environment variable.

### Browser

`localStorage` key `mandalay-bay-library` — shared between the web terminal and pixel RPG.

## Entering the casino

On launch, you see the **Save Library** screen before the casino floor:

```
Save options:
  1) Load a save slot
  2) Create new save in empty slot
  3) Delete a save slot
  4) Refresh library
  5) Exit without playing
```

Occupied slots show player name, chip balance, and last played time. **Most recently played saves appear first.**

## What is saved

| Data | Saved |
|------|-------|
| Player name | Yes |
| Chip balance | Yes |
| Transaction ledger | Yes |
| Activity stats (visits, net) | Yes |
| Save label & slot number | Yes |
| Display preferences | Yes |
| Progressive jackpots | Yes |
| RPG position & quest flags | Yes, when present |
| Hotel state & room amenities | Yes |
| Pool complex progress | Yes |
| Shopping / bar purchases | Yes |
| MGM Rewards tier progress | Yes |
| Open sports book tickets | No (settle before saving) |

## RPG state (browser pixel mode)

When present, `rpg` on a save slot includes:

```json
{
  "mapId": "main_resort",
  "x": 15,
  "y": 26,
  "playerSprite": "weekend_warrior",
  "archetype": "weekend_warrior",
  "quests": {
    "shark_photos": { "stage": 2, "target": 5 }
  },
  "flags": { "tutorial_complete": true },
  "playTimeMinutes": 12,
  "worldTime": 720,
  "reputation": { "whales": 0, "staff": 1, "tourists": 0 }
}
```

Archetypes: `weekend_warrior`, `high_roller`, `convention_goer`, `local`.

## Hotel save schema

When present, `hotel` includes reservation code, room type, nights remaining, minibar tab, unlocked vignettes, and checkout state. See [[Resort-Hotel]].

## World cycle

**2 hours real time = 1 in-game resort day.** Each rollover posts daily charges and rotates check-in requirements. Eviction state persists if charges cannot be paid.

## Auto-save

Progress saves automatically when:

- You **leave the casino**
- You return to the lobby after **any floor activity**
- You press **Ctrl+C** (CLI interrupt)

Manual save anytime via lobby **Save Game**.

## CLI reference

```bash
python3 -m mandalay_bay --list-saves
python3 -m mandalay_bay --slot 2
python3 -m mandalay_bay --slot 3 --new-save --name "Lucky" --chips 2500
python3 -m mandalay_bay --save-dir ./my_casino_saves
python3 -m mandalay_bay --no-save --chips 5000   # ephemeral session
```

## Tips

- Use descriptive save labels ("High Roller", "Weekend Trip")
- Delete old slots to free space for new runs
- `--list-saves` is safe to run anytime to check progress
- Browser and CLI saves are **not** interchangeable
