# Save Slots

The Mandalay Bay persists your progress across sessions using a **save library** with up to **5 slots**.

## Save library location

Default path:

```
~/.mandalay_bay/saves/
├── library.json      # Index + recent-play order
├── slot_1.json
├── slot_2.json
...
```

Override with `--save-dir /path/to/saves` or the `MANDALAY_BAY_SAVE_DIR` environment variable.

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
| Open sports book tickets | No (settle before saving) |

## Auto-save

Progress saves automatically when:

- You **leave the casino** (option 8)
- You return to the lobby after **any floor activity**
- You press **Ctrl+C** (interrupt)

Manual save anytime via lobby **Save Game** (option 6).

## CLI reference

### List saves

```bash
python3 -m mandalay_bay --list-saves
```

Output:

```
Save Library (most recent first):

  Slot 2: High Roller — Ace, 4,250 chips (last played 2026-07-04 17:30)
  Slot 1: [Empty]
  ...
```

### Load a slot directly

```bash
python3 -m mandalay_bay --slot 2
```

Skips the save library menu and loads slot 2 immediately.

### Create a new save in a slot

```bash
python3 -m mandalay_bay --slot 3 --new-save --name "Lucky" --chips 2500 --save-label "Vegas Trip"
```

Creates (or overwrites with confirmation) a new game in slot 3.

### Custom save directory

```bash
python3 -m mandalay_bay --save-dir ./my_casino_saves
python3 -m mandalay_bay --list-saves --save-dir ./my_casino_saves
```

Useful for backups, multiple profiles, or testing.

## In-game

The lobby shows your active slot:

```
Save slot 2: High Roller
Chips: $4,250
```

Lobby option **6) Save Game** writes progress immediately without leaving.

## File format

Save files use JSON (version 1). The library index tracks metadata for quick listing; full session data lives in `slot_N.json` (where N is 1–5).

## Tips

- Use descriptive save labels ("High Roller", "Weekend Trip")
- Delete old slots to free space for new runs
- `--list-saves` is safe to run anytime to check progress
