# Resort Hotel

The **Mandalay Bay Hotel Experience** — check in, navigate hallways, and unlock in-room vignettes.

## Access

- **CLI:** Exit casino floor to hotel from the hub menu
- **Web:** Hub menu or `?view=hotel-lobby`
- **RPG:** East lobby → Hotel Tower (Clerk Carmen encounter)

## Room types

| Type | Description |
|------|-------------|
| **Deluxe King** | Standard tower room |
| **Panorama Suite** | Upgraded views and amenities |
| **Chairman Penthouse** | Top-tier fantasy suite |

MGM Rewards tier comps can cover upgrades and room nights. See [MGM Rewards](mgm-rewards.md).

## Hotel flow

1. **Front desk (Clerk Carmen)** — locate reservation, settle overdue charges, upgrade rooms, review folios, checkout, **resort dining**. Carmen's desk terminal can complete check-in for phone-only, desk-only, or two-step days (whale days still need a net-positive floor session). Her replies stay on-screen in the desk log.
2. **Room key** — activates as soon as check-in is satisfied. The key does **not** skip the hallway by itself — Carmen and the lobby still offer **Find my room** plus an optional **Use key — skip to door** courtesy
3. **Hallway mini-game** — three beats of directional choices to reach your door (wrong turns are comedic; a dining food coma forces one zig). Reaching the door sets `reachedRoom` and unlocks in-room amenities
4. **Suite / penthouse upgrades** — reprint a new room number on your MGM Rewards phone (Home, Card, Room tabs). You must re-locate / re-confirm check-in, then walk (or skip) to the new door
5. **Your room** — TV, minibar, phone, balcony decisions, unlockable Vegas vignettes. Foundation Room phone line unlocks from a suite or penthouse (Noir+). Gentleman's Club (**The Velvet Ledger**) opens from Gold+, a suite key, or the club phone line

## Resort dining

Carmen books the three tables that matter: **Aureole**, **Border Grill**, and **Stripsteak**. Opening dining launches the capacity overlay — order courses, pace yourself, and risk drink-scaled encounters (strangers, celebrities, satirical escort gags, wine angels).

→ [Resort Dining](dining.md)

## In-room amenities

| Amenity | Highlights |
|---------|------------|
| **TV** | Shark Reef (ch. 47), wave pool cam, ULTRA Arena boxing, House of Blues (Gold+ tier) |
| **Minibar** | Sensor-enabled charges; concierge suggests items |
| **Phone** | Concierge, bookie, Foundation Room (Noir+), Gentleman's Club / Velvet Ledger (Gold+), spa, Delano |
| **Gentleman's Club** | Hotel lobby amenity — make it rain, encounters, stocked bar, minigames, ledger easter eggs |
| **Decisions** | Balcony, sky bridge to Mandalay Place, suite/penthouse perks, wake-up roulette |
| **Suite balcony POV** | Fullscreen Strip vista smoke-break overlay (suite/penthouse) — take hits, savor the view, step inside |

### Suite balcony POV smoke break

From a **Panorama Suite** or **Chairman Penthouse**, stepping onto the balcony (room schematic, Room Decisions, or the dedicated POV option) opens a fullscreen first-person Strip overlook:

- Animated skyline, Luxor beam, traffic, fountains, glass railing, and joint ember/smoke
- **Take a hit** (up to 5) records suite-balcony intoxication and advances the haze
- **Savor the view** / **Step inside** (Esc) to close
- Web terminal + RPG hotel host; CLI offers a text POV loop with the same hit ledger

→ Overlay: `docs/js/BalconySmokeOverlay.js` · CSS: `docs/css/balcony-smoke-overlay.css`

### Unlockable vignettes

**17 unlockable room events** chain across:

- Pool visits
- Shopping (LUSH bath bomb at Mandalay Place)
- MGM Rewards tier status
- Bad decisions and easter eggs

Locked events show cryptic hints in the event log. Unlock all room events to auto-sign the guest directory.

## Guest Directory

Leather-bound lobby guest book with persistent signatures. Sign after completing resort milestones.

## World day/night cycle

**2 hours real time = 1 resort day.**

Phases within a day: dawn → midday → neon dusk → 2 AM clarity.

Each new day:

- **Daily charges** post automatically (room rate + resort fee + parking — higher for suites/penthouse)
- **Reservation requirement rotates:** phone only → desk only → phone + desk → net-positive whale check-in
- **Insufficient chips** locks room access until overdue charges are settled at the front desk or won on the casino floor

Platinum+ tiers reduce resort fees; Chairman tier waives them narratively.

## Stay lifecycle (Front Desk)

| Action | Behavior |
|--------|----------|
| **Review folio** | Minibar + room service + Mandalay Place deliveries |
| **Late checkout** | Comp if net-positive, else $75 |
| **Express checkout** | Pearl+ skips the line; Chairman waives the folio |
| **Standard checkout** | Decrements nights; at 0 nights Carmen offers extend-stay |

## Resort completion tracker

The hotel lobby and in-room hub show progress:

- Room vignettes unlocked
- Pool vignettes visited
- Dining encounter eggs
- TV channels sampled
- Guest book signed

## MGM Rewards phone

Press **P** in the web app for:

- Tier status and comps
- Reservation locate
- Textable staff contacts

## Implementation

| Path | Role |
|------|------|
| `mandalay_bay/hotel.py` | Hotel state machine |
| `mandalay_bay/hotel_experience.py` | CLI flows |
| `mandalay_bay/room_amenities.py` | TV, minibar, phone, events |
| `mandalay_bay/gentlemans_club.py` | Velvet Ledger CLI (rain, bar, encounters, minigames) |
| `docs/js/gentlemans-club.js` / `docs/js/ui/gentlemans-club-renderers.js` | Browser + RPG hosted venue |
| `docs/js/hotel.js` / `docs/js/hotel-ui.js` | Browser mirror |
| `docs/js/hotel-ui.js` → `buildHotelRenderers(ctx)` | Screens the RPG mounts too |

See also [Save slots](saves.md) for the hotel save schema.
