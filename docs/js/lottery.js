import { secureRandomInt } from "./core.js";

export const TICKET_TYPES = {
  pick3: {
    id: "pick3",
    name: "Strip Pick 3",
    price: 2,
    digits: 3,
    description: "Match 3 digits in order — 500:1 straight.",
  },
  pick4: {
    id: "pick4",
    name: "Neon Pick 4",
    price: 2,
    digits: 4,
    description: "Match 4 digits in order — 5,000:1 straight.",
  },
  mega: {
    id: "mega",
    name: "Mandalay Mega",
    price: 5,
    balls: 5,
    ballMax: 45,
    megaMax: 20,
    description: "5 balls (1–45) + Mega (1–20).",
  },
  scratch_gold: {
    id: "scratch_gold",
    name: "Gold Rush Scratcher",
    price: 5,
    description: "Instant reveal — prizes up to 1,000×.",
  },
  scratch_wild: {
    id: "scratch_wild",
    name: "Wild Card Scratcher",
    price: 10,
    description: "Higher stakes instant ticket — prizes up to 2,500×.",
  },
};

function drawDigits(n) {
  return Array.from({ length: n }, () => secureRandomInt(0, 9));
}

export function quickPickDigits(n) {
  return drawDigits(n);
}

export function quickPickMega() {
  const balls = [];
  while (balls.length < 5) {
    const n = secureRandomInt(1, 45);
    if (!balls.includes(n)) balls.push(n);
  }
  balls.sort((a, b) => a - b);
  return { balls, mega: secureRandomInt(1, 20) };
}

export function parsePickInput(raw, digits) {
  const cleaned = String(raw ?? "").replace(/\D/g, "");
  if (cleaned.length !== digits) return null;
  return cleaned.split("").map((ch) => Number(ch));
}

export function resolvePick3(picks, price = 2) {
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
  return { ticketId: "pick3", name: TICKET_TYPES.pick3.name, price, playerPicks: picks, draw, win, reason };
}

export function resolvePick4(picks, price = 2) {
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
  return { ticketId: "pick4", name: TICKET_TYPES.pick4.name, price, playerPicks: picks, draw, win, reason };
}

export function resolveMega(balls, mega, price = 5) {
  const draw = quickPickMega();
  const matched = balls.filter((b) => draw.balls.includes(b)).length;
  const megaHit = mega === draw.mega;
  const table = {
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
  const win = table[`${matched}:${megaHit ? 1 : 0}`] ?? 0;
  const reason = win
    ? `${matched}/5 + mega ${megaHit ? "hit" : "miss"} — ${win.toLocaleString()} chips!`
    : `${matched}/5 + mega ${megaHit ? "hit" : "miss"} — no prize.`;
  return {
    ticketId: "mega",
    name: TICKET_TYPES.mega.name,
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

export function resolveScratcher(ticketId) {
  const meta = TICKET_TYPES[ticketId];
  const prize = scratchPrize(SCRATCH_TIERS[ticketId]);
  const symbols = Array.from({ length: 3 }, () => ["★", "7", "💎", "$", "🍀", "X"][secureRandomInt(0, 5)]);
  const reason = prize > 0
    ? `Scratch [${symbols.join(" ")}] — win ${prize.toLocaleString()} chips!`
    : `Scratch [${symbols.join(" ")}] — no prize.`;
  return {
    ticketId,
    name: meta.name,
    price: meta.price,
    playerPicks: [],
    draw: [],
    win: prize,
    reason,
    symbols,
  };
}
