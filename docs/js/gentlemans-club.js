/**
 * Gentleman's Club — hotel amenity nightlife lounge.
 * Make-it-rain tips, stocked bar, encounters, minigames, cosmetic eggs.
 */

import { recordConsumption } from "./intoxication-effects.js";
import { adjustRapport } from "./phone-rapport.js";

/** @readonly */
export const CLUB_NAME = "The Velvet Ledger";
export const CLUB_TAGLINE = "Private membership lounge — bottle service, tip storms, and no photographs.";

export const RAIN_TIERS = [
  { id: "drizzle", label: "Drizzle", amount: 100, tipChance: 0.15, tipBack: [20, 60], rapport: 1 },
  { id: "shower", label: "Shower", amount: 500, tipChance: 0.28, tipBack: [80, 200], rapport: 2 },
  { id: "storm", label: "Storm", amount: 2000, tipChance: 0.4, tipBack: [300, 900], rapport: 4 },
  { id: "monsoon", label: "Monsoon", amount: 10000, tipChance: 0.55, tipBack: [1500, 5000], rapport: 8 },
];

/** Insanely stocked club bar — bottles and signature pours. */
export const CLUB_BAR = [
  { id: "gc_club_soda", name: "Club Soda with a Look", description: "Ice, lime, judgment.", price: 12 },
  { id: "gc_old_fashioned", name: "Ledger Old Fashioned", description: "Bourbon, demerara, velvet orange.", price: 28 },
  { id: "gc_martini", name: "Membership Martini", description: "Gin so dry it files a complaint.", price: 32 },
  { id: "gc_negroni", name: "Noir Negroni", description: "Campari, sweet vermouth, secrets.", price: 30 },
  { id: "gc_champagne_coupe", name: "Coupe of Ruinart", description: "By the glass — still a statement.", price: 45 },
  { id: "gc_japanese_whisky", name: "Yamazaki 12 Pour", description: "Quiet flex in a crystal rocks glass.", price: 65 },
  { id: "gc_tequila_anejo", name: "Clase Azul Añejo", description: "Ceramic bottle energy, liquid gold.", price: 85 },
  { id: "gc_cognac", name: "Hennessy Paradis Shot", description: "One ounce of bad decisions.", price: 120 },
  { id: "gc_bottle_dom", name: "Bottle — Dom Pérignon", description: "Ice bucket, sparklers optional.", price: 450 },
  { id: "gc_bottle_cristal", name: "Bottle — Louis Roederer Cristal", description: "The room notices. Everyone notices.", price: 650 },
  { id: "gc_bottle_ace_of_spades", name: "Bottle — Armand de Brignac", description: "Ace of Spades. Tip storm recommended.", price: 900 },
  { id: "gc_bottle_louis_xiii", name: "Bottle — Louis XIII Cognac", description: "The ledger remembers this purchase forever.", price: 3500 },
  { id: "gc_bottle_rare_scotch", name: "Bottle — Macallan 25", description: "Highland royalty in crystal.", price: 2800 },
  { id: "gc_velvet_flight", name: "Velvet Flight (5 pours)", description: "Bartender's secret menu — no questions.", price: 180 },
];

export const CLUB_ENCOUNTERS = [
  {
    id: "hostess_viva",
    name: "Viva — Floor Hostess",
    blurb: "Clipboard, smile, eyes that price you in under a second.",
    choices: [
      { label: "Ask for a better table", cost: 200, rapport: 2, message: "Viva moves you two rows closer to the stage. The view improves. Your wallet notices." },
      { label: "Tip for the guest list whisper", cost: 500, rapport: 4, message: "She leans in: 'Row F coupe guy is still unpaid. Don't be him.' Flag tucked into your night.", setFlag: "egg_velvet_guest_list" },
      { label: "Just chat", cost: 0, rapport: 1, message: "Viva talks weather and whale etiquette. You feel almost civilized." },
    ],
  },
  {
    id: "dealer_dante",
    name: "Dante — Private Felt",
    blurb: "A single blackjack table behind smoked glass. House rules bend for members.",
    choices: [
      { label: "Play a friendly hand ($250)", cost: 250, minigame: "felt_flip", message: "Cards whisper across felt." },
      { label: "Ask about the side bet", cost: 100, rapport: 1, message: "Dante grins: 'Side bet pays in stories. Tonight it pays $80.'", credit: 80 },
      { label: "Walk away", cost: 0, message: "You leave the glass room intact. Rare." },
    ],
  },
  {
    id: "bottle_blair",
    name: "Blair — Bottle Captain",
    blurb: "She carries sparklers like a second language.",
    choices: [
      { label: "Request the sparkler parade", cost: 300, rapport: 3, message: "Sparklers cut the dark. The whole lounge clocks your table." },
      { label: "Challenge her bottle memory game", cost: 150, minigame: "bottle_memory", message: "Blair stacks the labels. Memorize or tip again." },
      { label: "Ask for the off-menu pour", cost: 400, setFlag: "egg_off_menu_pour", message: "She pours something that isn't on any ledger. Your tongue files a five-star review." },
    ],
  },
  {
    id: "security_sasha",
    name: "Sasha — Velvet Rope",
    blurb: "Earpiece, posture, zero patience for photography.",
    choices: [
      { label: "Ask about the back hallway", cost: 0, requiresRain: 1, setFlag: "egg_velvet_back_hall", message: "Sasha nods once. A service door clicks. You glimpse a hallway of unclaimed coats and one gold umbrella." },
      { label: "Offer a tip for the quiet booth", cost: 350, rapport: 2, message: "You're steered to a booth where the bass is polite." },
      { label: "Provoke nothing", cost: 0, message: "Sasha appreciates professionals who keep their phones down." },
    ],
  },
];

export const CLUB_MINIGAMES = [
  {
    id: "tip_cascade",
    name: "Tip Cascade",
    blurb: "Time the rain — hit the beat when the cascade peaks.",
    ante: 100,
  },
  {
    id: "bottle_memory",
    name: "Bottle Memory",
    blurb: "Blair flashes three labels. Repeat the order.",
    ante: 150,
  },
  {
    id: "felt_flip",
    name: "Felt Flip",
    blurb: "Call high or low on Dante's private shoe.",
    ante: 250,
  },
];

function rnd(a, b) {
  return a + Math.floor(Math.random() * (b - a + 1));
}

function ensureRpgFlags(session) {
  return session.ensureRpgState?.().flags ?? (session.rpg = session.rpg || { flags: {} }).flags;
}

export function defaultClubState() {
  return {
    visits: 0,
    rainCount: 0,
    totalRained: 0,
    drinks: [],
    encounters: [],
    minigamesPlayed: 0,
    eggs: [],
  };
}

export function ensureClub(session) {
  if (!session.gentlemansClub) session.gentlemansClub = defaultClubState();
  const c = session.gentlemansClub;
  c.visits ??= 0;
  c.rainCount ??= 0;
  c.totalRained ??= 0;
  c.drinks ??= [];
  c.encounters ??= [];
  c.minigamesPlayed ??= 0;
  c.eggs ??= [];
  return c;
}

export function attachClubToSession(session, data = {}) {
  const raw = data.gentlemansClub ?? data.gentlemans_club ?? {};
  session.gentlemansClub = {
    ...defaultClubState(),
    ...raw,
    drinks: [...(raw.drinks ?? [])],
    encounters: [...(raw.encounters ?? [])],
    eggs: [...(raw.eggs ?? [])],
  };
  return session.gentlemansClub;
}

function discoverEgg(session, flag) {
  if (!flag) return false;
  const club = ensureClub(session);
  const flags = ensureRpgFlags(session);
  if (flags[flag]) return false;
  flags[flag] = true;
  if (!club.eggs.includes(flag)) club.eggs.push(flag);
  return true;
}

/**
 * Make it rain — tip the room.
 * @param {import("./core.js").PlayerSession} session
 * @param {string} tierId
 */
export function makeItRain(session, tierId) {
  const tier = RAIN_TIERS.find((t) => t.id === tierId);
  if (!tier) return { ok: false, message: "Unknown rain tier." };
  if (!session.wallet.debit(tier.amount, "gentlemans_club", `Make it rain — ${tier.label}`)) {
    return { ok: false, message: `Need $${tier.amount.toLocaleString()} chips to make it ${tier.label.toLowerCase()}.` };
  }
  const club = ensureClub(session);
  club.rainCount += 1;
  club.totalRained += tier.amount;
  adjustRapport(session, "host_representative", tier.rapport);

  let tipBack = 0;
  let egg = null;
  if (Math.random() < tier.tipChance) {
    tipBack = rnd(tier.tipBack[0], tier.tipBack[1]);
    session.wallet.credit(tipBack, "gentlemans_club", "Crowd tips back");
  }
  if (tier.id === "monsoon" && club.rainCount >= 2) {
    if (discoverEgg(session, "egg_monsoon_receipt")) egg = "egg_monsoon_receipt";
  }
  if (club.totalRained >= 5000 && discoverEgg(session, "egg_velvet_ledger")) {
    egg = "egg_velvet_ledger";
  }

  session.recordVisit("gentlemans_club");
  const tipLine = tipBack
    ? ` The crowd throws $${tipBack.toLocaleString()} back.`
    : " The room drinks it in.";
  const eggLine = egg ? " Something in the ledger just underlined your name." : "";
  return {
    ok: true,
    tipBack,
    egg,
    message: `You make it ${tier.label.toLowerCase()} — $${tier.amount.toLocaleString()} in the air.${tipLine}${eggLine}`,
  };
}

export function orderClubDrink(session, drinkId) {
  const drink = CLUB_BAR.find((d) => d.id === drinkId);
  if (!drink) return { ok: false, message: "Not on the ledger." };
  if (!session.wallet.debit(drink.price, "gentlemans_club", `${drink.name} @ ${CLUB_NAME}`)) {
    return { ok: false, message: `Insufficient chips — ${drink.name} is $${drink.price.toLocaleString()}.` };
  }
  const club = ensureClub(session);
  club.drinks.push(drinkId);
  recordConsumption(session, drinkId, { source: "gentlemans_club" });
  let egg = null;
  if (drinkId === "gc_bottle_louis_xiii" && discoverEgg(session, "egg_louis_toast")) {
    egg = "egg_louis_toast";
  }
  if (club.drinks.length >= 5 && discoverEgg(session, "egg_velvet_bar_tab")) {
    egg = egg ?? "egg_velvet_bar_tab";
  }
  session.recordVisit("gentlemans_club");
  return {
    ok: true,
    egg,
    message: `Ordered ${drink.name} for $${drink.price.toLocaleString()}.${egg ? " The bartender winks — off-books toast." : ""}`,
  };
}

/**
 * @param {import("./core.js").PlayerSession} session
 * @param {string} encounterId
 * @param {number} choiceIndex
 */
export function runClubEncounter(session, encounterId, choiceIndex) {
  const enc = CLUB_ENCOUNTERS.find((e) => e.id === encounterId);
  if (!enc) return { ok: false, message: "They're off the floor." };
  const choice = enc.choices[choiceIndex];
  if (!choice) return { ok: false, message: "That option walked away." };

  const club = ensureClub(session);
  if (choice.requiresRain && club.rainCount < choice.requiresRain) {
    return { ok: false, message: "Sasha only talks after you've made it rain at least once." };
  }
  if (choice.cost > 0 && !session.wallet.debit(choice.cost, "gentlemans_club", `${enc.name} — ${choice.label}`)) {
    return { ok: false, message: `Need $${choice.cost.toLocaleString()} chips for that move.` };
  }
  if (choice.credit) {
    session.wallet.credit(choice.credit, "gentlemans_club", `${enc.name} payout`);
  }
  if (choice.rapport) adjustRapport(session, "host_representative", choice.rapport);
  let egg = null;
  if (choice.setFlag && discoverEgg(session, choice.setFlag)) egg = choice.setFlag;
  if (!club.encounters.includes(encounterId)) club.encounters.push(encounterId);
  session.recordVisit("gentlemans_club");

  return {
    ok: true,
    minigame: choice.minigame ?? null,
    egg,
    message: choice.message + (egg ? " (Secret underlined in the ledger.)" : ""),
  };
}

/** Tip Cascade — stop the meter in the green zone. */
export function playTipCascade(session, stopAt) {
  const game = CLUB_MINIGAMES.find((g) => g.id === "tip_cascade");
  const ante = game.ante;
  if (!session.wallet.debit(ante, "gentlemans_club", "Tip Cascade ante")) {
    return { ok: false, message: `Need $${ante} to play Tip Cascade.` };
  }
  const club = ensureClub(session);
  club.minigamesPlayed += 1;
  // Green zone 0.62–0.78
  const hit = stopAt >= 0.62 && stopAt <= 0.78;
  let payout = 0;
  if (hit) {
    payout = rnd(180, 320);
    session.wallet.credit(payout, "gentlemans_club", "Tip Cascade win");
  }
  let egg = null;
  if (hit && Math.abs(stopAt - 0.7) < 0.02 && discoverEgg(session, "egg_perfect_cascade")) {
    egg = "egg_perfect_cascade";
  }
  session.recordVisit("gentlemans_club");
  return {
    ok: true,
    hit,
    payout,
    egg,
    message: hit
      ? `Cascade peaks — you bank $${payout}.${egg ? " Perfect timing. The LED wall flashes your initials." : ""}`
      : "You mistime the rain. The ante dissolves into the fog machine.",
  };
}

const BOTTLE_LABELS = ["Dom", "Cristal", "Ace", "Paradis", "Macallan"];

export function startBottleMemory() {
  const sequence = Array.from({ length: 3 }, () => BOTTLE_LABELS[rnd(0, BOTTLE_LABELS.length - 1)]);
  return { sequence, labels: BOTTLE_LABELS };
}

export function resolveBottleMemory(session, sequence, guess) {
  const ante = CLUB_MINIGAMES.find((g) => g.id === "bottle_memory").ante;
  if (!session.wallet.debit(ante, "gentlemans_club", "Bottle Memory ante")) {
    return { ok: false, message: `Need $${ante} to play Bottle Memory.` };
  }
  const club = ensureClub(session);
  club.minigamesPlayed += 1;
  const correct = sequence.length === guess.length && sequence.every((v, i) => v === guess[i]);
  let payout = 0;
  if (correct) {
    payout = rnd(220, 400);
    session.wallet.credit(payout, "gentlemans_club", "Bottle Memory win");
  }
  let egg = null;
  if (correct && sequence.every((v) => v === "Ace") && discoverEgg(session, "egg_triple_ace")) {
    egg = "egg_triple_ace";
  }
  session.recordVisit("gentlemans_club");
  return {
    ok: true,
    correct,
    payout,
    egg,
    message: correct
      ? `Blair nods. Labels match. +$${payout}.${egg ? " Triple Ace — she almost smiles." : ""}`
      : `Wrong order. Correct was ${sequence.join(" → ")}. Ante gone.`,
  };
}

export function playFeltFlip(session, call) {
  const ante = CLUB_MINIGAMES.find((g) => g.id === "felt_flip").ante;
  if (!session.wallet.debit(ante, "gentlemans_club", "Felt Flip ante")) {
    return { ok: false, message: `Need $${ante} for Dante's felt.` };
  }
  const club = ensureClub(session);
  club.minigamesPlayed += 1;
  const card = rnd(1, 13);
  const isHigh = card >= 8;
  const win = (call === "high" && isHigh) || (call === "low" && !isHigh);
  let payout = 0;
  if (win) {
    payout = ante * 2;
    session.wallet.credit(payout, "gentlemans_club", "Felt Flip win");
  }
  let egg = null;
  if (win && card === 1 && discoverEgg(session, "egg_felt_ace")) {
    egg = "egg_felt_ace";
  }
  session.recordVisit("gentlemans_club");
  const ranks = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  return {
    ok: true,
    win,
    card: ranks[card],
    payout,
    egg,
    message: win
      ? `Dante flips ${ranks[card]}. You called ${call}. +$${payout}.${egg ? " Ace in the hole — Dante tips his chin." : ""}`
      : `Dante flips ${ranks[card]}. You called ${call}. The shoe eats your ante.`,
  };
}

export function clubSummary(session) {
  const club = ensureClub(session);
  return {
    visits: club.visits,
    rainCount: club.rainCount,
    totalRained: club.totalRained,
    drinks: club.drinks.length,
    encounters: club.encounters.length,
    minigamesPlayed: club.minigamesPlayed,
    eggs: club.eggs.length,
  };
}

export function markClubVisit(session) {
  const club = ensureClub(session);
  club.visits += 1;
  session.recordVisit("gentlemans_club");
  return club;
}
