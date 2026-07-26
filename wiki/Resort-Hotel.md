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

MGM Rewards tier comps can cover upgrades and room nights. See [[MGM-Rewards|MGM Rewards]].

## Hotel flow

1. **Front desk (Clerk Carmen)** — locate reservation, settle overdue charges, upgrade rooms, review folios, checkout, **resort dining**
2. **Room key** — activates as soon as the day's check-in requirement is satisfied, whether the phone or the desk finished it; the desk then offers your hallway or your door directly
3. **Hallway mini-game** — three beats of directional choices to reach your door (wrong turns are comedic; a dining food coma forces one zig)
4. **Your room** — TV, minibar, phone, balcony decisions, unlockable Vegas vignettes

## Resort dining

Carmen books the three tables that matter: **Aureole**, **Border Grill**, and **Stripsteak**. Opening dining launches the capacity overlay — order courses, pace yourself, and risk drink-scaled encounters (strangers, celebrities, satirical escort gags, wine angels).

→ [[Resort-Dining|Resort Dining]]

## In-room amenities

| Amenity | Highlights |
|---------|------------|
| **TV** | Shark Reef (ch. 47), wave pool cam, ULTRA Arena boxing, House of Blues (Gold+ tier) |
| **Minibar** | Sensor-enabled charges; concierge suggests items |
| **Phone** | Concierge, bookie, Foundation Room (Noir+), spa, Delano |
| **Decisions** | Balcony, sky bridge to Mandalay Place, suite/penthouse perks, wake-up roulette |

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
| `docs/js/hotel.js` / `docs/js/hotel-ui.js` | Browser mirror |
| `docs/js/hotel-ui.js` → `buildHotelRenderers(ctx)` | Screens the RPG mounts too |

See also [Save slots](saves.md) for the hotel save schema.
