# Strip Ride — Limo / Uber / Lyft

Chip-fare travel from Mandalay Bay to **themed away casinos** on the Las Vegas Strip. **Web terminal only** — not wired into the pixel RPG hub or CLI.

## How to unlock

Either path opens the same **Strip Ride — Limo / Uber / Lyft** dispatch UI:

1. **Room phone** → **Call limo / private driver** (after you have a room key)
2. **MGM Rewards Phone (P)** → **Connect → Call Uber / Lyft** (rideshare contact + multi-turn voice tree)

Return trips to Mandalay Bay are complimentary.

## Destinations

| Destination | Vibe | Fare | Exclusive slots (5) | Signature progressive |
|-------------|------|------|---------------------|------------------------|
| **Luxor** | Black pyramid / Egyptian gold | 85 | Obelisk, Sphinx, Scarab Stampede, Nile Nights, Beam of Ra | Beam of Ra (`luxor_ra`) |
| **Excalibur** | Castle crimson | 75 | Castle Jackpot, Joust, Dragon Keep, Round Table, Holy Grail Spin | Holy Grail (`excalibur_grail`) |
| **Bellagio** | Fountain elegance | 95 | Fountain Fortune, Conservatory, Lake Lights, Glass Garden, Prima Fontana | Prima Fontana (`bellagio_fontana`) |
| **Circa** | Downtown Fremont neon | 70 | Neon Stadium, Fremont Flash, Vegas Vamp, Stadium Swipe, Downtown Drop | Downtown Drop (`circa_downtown`) |

Away floors keep the eight-floor activity catalog but restyle it:

- **`activityBranding`** — destination display names (e.g. Sphinx Blackjack, Pyramid Slots)
- **`gameFlavor`** — short table/slot copy overlays
- **Destination-only cabinets** — five exclusives per property; Mandalay Fortune and other `homeOnly` machines stay at home
- **CSS theme tokens** — each property sets `--cyan`, `--bg-panel`, `--gold`, machine accents, and related chrome so menus and boards match the destination (#148)

## Destination menu themes

When you arrive, `data-destination` on the root plus token overrides restyle hub banners, tables, and slot cabinets:

| Property | Theme accent |
|----------|--------------|
| Mandalay Bay (home) | South Strip cyan / gold |
| Luxor | Desert gold on black pyramid panels |
| Excalibur | Castle crimson / heraldic gold |
| Bellagio | Fountain teal / elegant glass |
| Circa | Fremont neon magenta / stadium blue |

Board titles and activity pickers use the branded names from `getActivityBranding()`.

## Surface notes

| Surface | Strip Ride? |
|---------|-------------|
| Web terminal | Yes — limo UI + destination themes |
| Pixel RPG | No — walkable Strip overworld is separate (Luxor / Excalibur rooms) |
| CLI | No |

## Responsive chrome

Away and home floors share the terminal viewport tokens (`--app-vh`, safe-area insets, `--overlay-max-h`) so destination menus, overlays, and the Rewards Phone shell fit short mobile viewports (#145).

## Implementation

| Path | Role |
|------|------|
| `docs/js/strip-destinations.js` | Destination catalog, travel, branding, CSS tokens |
| `docs/js/strip-limo-ui.js` | Dispatch / fare UI |
| `docs/css/strip-destinations.css` | Per-property theme skins |
| `docs/js/slots.js` | `destinationOnly` / `homeOnly` cabinets |
| `docs/js/phone-contacts.js` / `phone-call-trees.js` | `rideshare_driver` Connect contact |

See also [Resort Hotel](hotel.md), [Slot Machines](slots.md), and [MGM Rewards](mgm-rewards.md).
