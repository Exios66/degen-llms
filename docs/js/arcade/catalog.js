/** Arcade Alley cabinet catalog — Vegas-skinned classic minigames. */

export const ARCADE_GAMES = [
  {
    id: "strip_cross",
    title: "Strip Cross",
    classic: "Frogger",
    blurb: "Dash across Las Vegas Blvd — limos, taxis, and tour groups don't stop.",
    cost: 5,
    controls: "← → ↑ ↓ move · reach the neon marquee",
    accent: "#ff5ec8",
  },
  {
    id: "neon_invaders",
    title: "Neon Invaders",
    classic: "Space Invaders",
    blurb: "Blast descending neon signs before they swamp the Strip.",
    cost: 10,
    controls: "← → move · Space / Z fire",
    accent: "#3dcc8c",
  },
  {
    id: "high_roller_breakout",
    title: "High-Roller Breakout",
    classic: "Breakout",
    blurb: "Chip ball, felt paddle, card-suit bricks — clear the salon wall.",
    cost: 10,
    controls: "← → paddle · Space launch",
    accent: "#ffd700",
  },
  {
    id: "showgirl_beat",
    title: "Showgirl Beat",
    classic: "Rhythm",
    blurb: "Match the kick / snare / hat sequence under the show lights.",
    cost: 15,
    controls: "Z kick · X snare · C hat · or 1 / 2 / 3",
    accent: "#6ec6ff",
  },
];

export const REDEEM_OFFERS = [
  {
    id: "chips_50",
    label: "Chip pack (+50)",
    costTickets: 8,
    kind: "chips",
    amount: 50,
  },
  {
    id: "chips_150",
    label: "High-roller pack (+150)",
    costTickets: 20,
    kind: "chips",
    amount: 150,
  },
  {
    id: "slot_voucher",
    label: "Free-spin voucher (narrative)",
    costTickets: 12,
    kind: "flag",
    flag: "arcade_slot_voucher",
  },
  {
    id: "welcome_refill",
    label: "Welcome drink refill",
    costTickets: 6,
    kind: "flag",
    flag: "arcade_drink_refill",
  },
];

export function getArcadeGame(id) {
  return ARCADE_GAMES.find((g) => g.id === id) ?? null;
}

/** Tickets from a finished run. */
export function ticketsFromScore(score, { cleared = false } = {}) {
  const base = Math.floor(Math.max(0, score) / 100);
  return base + (cleared ? 2 : 0);
}

/** Chip payout from performance multiplier (0–3× cost). */
export function payoutFromMult(cost, mult) {
  const m = Math.max(0, Math.min(3, Number(mult) || 0));
  return Math.floor(cost * m);
}
