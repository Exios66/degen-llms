import { secureRandomInt } from "./core.js";
import { getTierPayoutBoost } from "./stakes.js";

/** Corrected Powerball-style ranges (docs / real lottery feel). */
export const MEGA_BALLS = 5;
export const MEGA_BALL_MAX = 70;
export const MEGA_POWERBALL_MAX = 25;

const BASE_MEGA_TABLE = {
  "5:1": 250000,
  "5:0": 25000,
  "4:1": 2500,
  "4:0": 500,
  "3:1": 150,
  "3:0": 25,
  "2:1": 20,
  "1:1": 10,
  "0:1": 5,
};

export const TICKET_TYPES = {
  pick3: {
    id: "pick3",
    name: "Strip Pick 3",
    price: 2,
    kind: "pick",
    digits: 3,
    description: "Match 3 digits in order — 500:1 straight.",
  },
  pick4: {
    id: "pick4",
    name: "Neon Pick 4",
    price: 2,
    kind: "pick",
    digits: 4,
    description: "Match 4 digits in order — 5,000:1 straight.",
  },
  pick3_high: {
    id: "pick3_high",
    name: "High Limit Pick 3",
    price: 25,
    kind: "pick",
    digits: 3,
    description: "High-limit 3-digit draw — 500:1 straight on a $25 ticket.",
  },
  pick4_high: {
    id: "pick4_high",
    name: "High Limit Pick 4",
    price: 25,
    kind: "pick",
    digits: 4,
    description: "High-limit 4-digit draw — 5,000:1 straight on a $25 ticket.",
  },
  mega: {
    id: "mega",
    name: "Mandalay Mega",
    price: 5,
    kind: "mega",
    balls: MEGA_BALLS,
    ballMax: MEGA_BALL_MAX,
    megaMax: MEGA_POWERBALL_MAX,
    prizeMult: 1,
    description: "5 lucky numbers (1–70) + Powerball (1–25).",
  },
  mega_high: {
    id: "mega_high",
    name: "High Limit Mega",
    price: 50,
    kind: "mega",
    balls: MEGA_BALLS,
    ballMax: MEGA_BALL_MAX,
    megaMax: MEGA_POWERBALL_MAX,
    prizeMult: 10,
    description: "High-limit Mega — 10× prize table, same 5+Powerball draw.",
  },
  mega_salon: {
    id: "mega_salon",
    name: "Salon Powerball",
    price: 500,
    kind: "mega",
    balls: MEGA_BALLS,
    ballMax: MEGA_BALL_MAX,
    megaMax: MEGA_POWERBALL_MAX,
    prizeMult: 100,
    description: "Salon Powerball — 100× prizes for high rollers.",
  },
  scratch_gold: {
    id: "scratch_gold",
    name: "Gold Rush Scratcher",
    price: 5,
    kind: "scratch",
    description: "Instant reveal — prizes up to 1,000×.",
  },
  scratch_wild: {
    id: "scratch_wild",
    name: "Wild Card Scratcher",
    price: 10,
    kind: "scratch",
    description: "Higher stakes instant ticket — prizes up to 2,500×.",
  },
  scratch_platinum: {
    id: "scratch_platinum",
    name: "Platinum Scratcher",
    price: 50,
    kind: "scratch",
    description: "Premium instant ticket — prizes up to 100,000 chips.",
  },
  scratch_diamond: {
    id: "scratch_diamond",
    name: "Diamond Scratcher",
    price: 250,
    kind: "scratch",
    description: "Salon scratcher — prizes up to 500,000 chips.",
  },
};

export const TICKET_ORDER = [
  "pick3",
  "pick4",
  "mega",
  "scratch_gold",
  "scratch_wild",
  "pick3_high",
  "pick4_high",
  "mega_high",
  "scratch_platinum",
  "mega_salon",
  "scratch_diamond",
];

export function lotteryTierScale(tierId) {
  if (!tierId) return 1;
  return getTierPayoutBoost(tierId);
}

export function scaledTicketPrice(basePrice, tierId = null) {
  const scale = lotteryTierScale(tierId);
  return Math.max(1, Math.round(basePrice * scale));
}

export function scaleFixedPrize(prize, tierId = null) {
  if (prize <= 0) return 0;
  return Math.max(0, Math.round(prize * lotteryTierScale(tierId)));
}

export function ticketKind(ticketId) {
  return TICKET_TYPES[ticketId]?.kind ?? "pick";
}

function drawDigits(n) {
  return Array.from({ length: n }, () => secureRandomInt(0, 9));
}

export function quickPickDigits(n) {
  return drawDigits(n);
}

export function quickPickMega(
  ballMax = MEGA_BALL_MAX,
  megaMax = MEGA_POWERBALL_MAX,
  balls = MEGA_BALLS,
) {
  const chosen = [];
  while (chosen.length < balls) {
    const n = secureRandomInt(1, ballMax);
    if (!chosen.includes(n)) chosen.push(n);
  }
  chosen.sort((a, b) => a - b);
  return { balls: chosen, mega: secureRandomInt(1, megaMax) };
}

export function validateMegaPicks(
  balls,
  powerball,
  {
    ballMax = MEGA_BALL_MAX,
    megaMax = MEGA_POWERBALL_MAX,
    count = MEGA_BALLS,
  } = {},
) {
  if (!Array.isArray(balls) || balls.length !== count || new Set(balls).size !== count) {
    return `Need exactly ${count} unique lucky numbers from 1–${ballMax}.`;
  }
  if (balls.some((b) => b < 1 || b > ballMax)) {
    return `Lucky numbers must be between 1 and ${ballMax}.`;
  }
  if (!Number.isFinite(powerball) || powerball < 1 || powerball > megaMax) {
    return `Powerball must be between 1 and ${megaMax}.`;
  }
  return null;
}

export function parsePickInput(raw, digits) {
  const cleaned = String(raw ?? "").replace(/\D/g, "");
  if (cleaned.length !== digits) return null;
  return cleaned.split("").map((ch) => Number(ch));
}

export function resolvePick3(picks, price = 2, { ticketId = "pick3" } = {}) {
  const meta = TICKET_TYPES[ticketId];
  const draw = drawDigits(3);
  let win = 0;
  let reason;
  if (picks.every((d, i) => d === draw[i])) {
    win = price * 500;
    reason = `Straight hit ${draw.join(" ")} — ${win.toLocaleString()} chips!`;
  } else if ([...picks].sort().join() === [...draw].sort().join()) {
    win = price * 80;
    reason = `Box hit ${draw.join(" ")} — ${win.toLocaleString()} chips!`;
  } else {
    reason = `Draw ${draw.join(" ")} — no match.`;
  }
  return {
    ticketId,
    name: meta.name,
    price,
    playerPicks: picks,
    draw,
    win,
    reason,
  };
}

export function resolvePick4(picks, price = 2, { ticketId = "pick4" } = {}) {
  const meta = TICKET_TYPES[ticketId];
  const draw = drawDigits(4);
  let win = 0;
  let reason;
  if (picks.every((d, i) => d === draw[i])) {
    win = price * 5000;
    reason = `Straight hit ${draw.join(" ")} — ${win.toLocaleString()} chips!`;
  } else if ([...picks].sort().join() === [...draw].sort().join()) {
    win = price * 200;
    reason = `Box hit ${draw.join(" ")} — ${win.toLocaleString()} chips!`;
  } else {
    reason = `Draw ${draw.join(" ")} — no match.`;
  }
  return {
    ticketId,
    name: meta.name,
    price,
    playerPicks: picks,
    draw,
    win,
    reason,
  };
}

export function resolveMega(balls, mega, price = 5, { ticketId = "mega", tierId = null } = {}) {
  const meta = TICKET_TYPES[ticketId];
  const ballMax = meta.ballMax ?? MEGA_BALL_MAX;
  const megaMax = meta.megaMax ?? MEGA_POWERBALL_MAX;
  const prizeMult = meta.prizeMult ?? 1;
  const draw = quickPickMega(ballMax, megaMax);
  const matched = balls.filter((b) => draw.balls.includes(b)).length;
  const megaHit = mega === draw.mega;
  const baseWin = (BASE_MEGA_TABLE[`${matched}:${megaHit ? 1 : 0}`] ?? 0) * prizeMult;
  const win = scaleFixedPrize(baseWin, tierId);
  const reason = win
    ? `${matched}/5 + Powerball ${megaHit ? "hit" : "miss"} — ${win.toLocaleString()} chips!`
    : `${matched}/5 + Powerball ${megaHit ? "hit" : "miss"} — no prize.`;
  return {
    ticketId,
    name: meta.name,
    price,
    playerPicks: [...balls, mega],
    draw: [...draw.balls, draw.mega],
    win,
    reason,
  };
}

const SCRATCH_TIERS = {
  scratch_gold: [
    [0.55, 0], [0.25, 5], [0.12, 15], [0.05, 50], [0.025, 200], [0.004, 1000], [0.001, 5000],
  ],
  scratch_wild: [
    [0.50, 0], [0.25, 10], [0.14, 40], [0.07, 150], [0.03, 750], [0.008, 5000], [0.002, 25000],
  ],
  scratch_platinum: [
    [0.48, 0], [0.24, 50], [0.15, 200], [0.08, 1000], [0.035, 5000], [0.012, 25000], [0.003, 100000],
  ],
  scratch_diamond: [
    [0.45, 0], [0.25, 250], [0.16, 1000], [0.08, 5000], [0.04, 25000], [0.015, 100000], [0.005, 500000],
  ],
};

function scratchPrize(tiers) {
  const roll = secureRandomInt(0, 9999) / 10000;
  let acc = 0;
  for (const [weight, prize] of tiers) {
    acc += weight;
    if (roll <= acc) return prize;
  }
  return 0;
}

export function resolveScratcher(ticketId, { tierId = null, price = null } = {}) {
  const meta = TICKET_TYPES[ticketId];
  const charged = price != null ? price : scaledTicketPrice(meta.price, tierId);
  const prize = scaleFixedPrize(scratchPrize(SCRATCH_TIERS[ticketId]), tierId);
  const symbols = Array.from({ length: 3 }, () => ["★", "7", "💎", "$", "🍀", "X"][secureRandomInt(0, 5)]);
  const reason = prize > 0
    ? `Scratch [${symbols.join(" ")}] — win ${prize.toLocaleString()} chips!`
    : `Scratch [${symbols.join(" ")}] — no prize.`;
  return {
    ticketId,
    name: meta.name,
    price: charged,
    playerPicks: [],
    draw: [],
    win: prize,
    reason,
    symbols,
  };
}

export function classifyLotteryWin(win, price) {
  if (win <= 0) return null;
  if (win >= price * 1000 || win >= 100000) return "jackpot";
  if (win >= price * 50 || win >= 1000) return "big";
  return "small";
}
