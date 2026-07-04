import { secureRandomInt, fisherYatesShuffle } from "./core.js";

const HORSE_NAMES = [
  "Midnight Runner", "Desert Wind", "Golden Mane", "Silver Streak",
  "Lucky Charm", "Thunder Bolt", "Royal Flush", "Neon Star",
];

const TRACKS = ["Mandalay Turf", "Bay Downs", "Sunset Mile", "Neon Park"];

function payoutWin(amount, odds) {
  if (odds > 0) return amount + Math.floor((amount * odds) / 100);
  return amount + Math.floor((amount * 100) / Math.abs(odds));
}

export function generateRace() {
  const track = TRACKS[secureRandomInt(0, TRACKS.length - 1)];
  const names = fisherYatesShuffle([...HORSE_NAMES]);
  const count = secureRandomInt(5, 6);
  const horses = [];
  for (let i = 0; i < count; i++) {
    const strength = 0.4 + secureRandomInt(0, 600) / 1000;
    let odds;
    if (strength > 0.85) odds = [-150, -120, -110][secureRandomInt(0, 2)];
    else if (strength > 0.65) odds = [120, 150, 180][secureRandomInt(0, 2)];
    else odds = [250, 300, 400, 600][secureRandomInt(0, 3)];
    horses.push({ number: i + 1, name: names[i], odds, strength });
  }
  return { track, horses, results: null, label: `${track} — ${count} runners` };
}

export function simulateRace(card) {
  const remaining = [...card.horses];
  const order = [];
  while (remaining.length) {
    const total = remaining.reduce((s, h) => s + h.strength, 0);
    const roll = secureRandomInt(0, Math.floor(total * 1000)) / 1000;
    let acc = 0;
    for (let i = 0; i < remaining.length; i++) {
      acc += remaining[i].strength;
      if (roll <= acc) {
        order.push(remaining[i].number);
        remaining.splice(i, 1);
        break;
      }
    }
  }
  card.results = order;
  return order;
}

export function settleTicket(slip, results) {
  const pos = results.indexOf(slip.horse) + 1;
  if (slip.betType === "win" && pos === 1) {
    const payout = payoutWin(slip.amount, slip.odds);
    return { won: true, payout, net: payout - slip.amount, reason: `Win — #${slip.horse} finished 1st` };
  }
  if (slip.betType === "place" && pos <= 2) {
    const payout = slip.amount * 2;
    return { won: true, payout, net: payout - slip.amount, reason: `Place — #${slip.horse} finished ${pos}` };
  }
  if (slip.betType === "show" && pos <= 3) {
    const payout = slip.amount * 2;
    return { won: true, payout, net: payout - slip.amount, reason: `Show — #${slip.horse} finished ${pos}` };
  }
  return { won: false, payout: 0, net: -slip.amount, reason: `#${slip.horse} finished ${pos}` };
}

export function fmtOdds(odds) {
  return odds > 0 ? `+${odds}` : String(odds);
}
