/**
 * Dynamic phone dialogue trees, text menus, and call scripts.
 * Content scales with rapport, tier, and play time.
 */

import { resolveLine, meetsRequirements } from "./phone-rapport.js";

/** @typedef {{ label: string, next?: string, rapport?: number, egg?: string, requires?: object, end?: boolean }} TreeChoice */
/** @typedef {{ text: string|Function, choices?: TreeChoice[], end?: boolean }} TreeNode */

/** Multi-turn SMS conversation trees keyed by contact → treeId → nodeId → node */
export const DIALOGUE_TREES = {
  attorney_brief: {
    courtroom: {
      start: {
        text: (ctx) => ctx.band.id === "stranger"
          ? "Welcome to Brief & Briefier LLP — theatrical division. State your grievance against the house."
          : `Counselor ${ctx.playerName} returns to my docket. The casino trembles. What's the motion?`,
        choices: [
          { label: "Objection!", next: "objection", rapport: 2 },
          { label: "Cross-examine the dealer", next: "cross", rapport: 3, requires: { minRapport: 10 } },
          { label: "File a motion to comp", next: "motion_comp", rapport: 2 },
          { label: "Opening statement", next: "opening", rapport: 4, requires: { minRapport: 25 } },
        ],
      },
      objection: {
        text: "On what grounds?",
        choices: [
          { label: "Hearsay!", next: "hearsay", rapport: 2, egg: "legal_hearsay" },
          { label: "Bad beat!", next: "bad_beat", rapport: 2 },
          { label: "Leading the witness (dealer)", next: "leading", rapport: 3 },
        ],
      },
      hearsay: {
        text: (ctx) => `SUSTAINED. The pit boss may not testify that you were 'due.' `
          + `${ctx.tier.label} tier noted for the record. Emotionally satisfying; legally decorative.`,
        choices: [
          { label: "Request sidebar with Betty", next: "sidebar_betty", rapport: 3, requires: { minRapport: 20 } },
          { label: "Rest my case", next: "rest", rapport: 1, end: true },
        ],
      },
      bad_beat: {
        text: "OVERRULED. Probability is cruel but admissible. Damages: one (1) sigh and a free metaphor.",
        choices: [
          { label: "Appeal to Steve Harvey", next: "appeal_steve", rapport: 4, egg: "legal_appeal_steve" },
          { label: "Accept verdict", next: "rest", rapport: 1, end: true },
        ],
      },
      leading: {
        text: "The dealer's eyes suggest guilt. Jury of one (me) finds the HOUSE aesthetically responsible.",
        choices: [
          { label: "Demand discovery (slot RTP)", next: "discovery", rapport: 5, requires: { minRapport: 30 } },
          { label: "Withdraw", next: "rest", rapport: 1, end: true },
        ],
      },
      discovery: {
        text: "PAR sheets are 'trade secret.' I subpoenaed vibes instead. Vibes say: bet smaller after midnight.",
        end: true,
      },
      cross: {
        text: "Dealer on the stand — hypothetical. 'Did you KNOW the player was tilting?'",
        choices: [
          { label: "Badger the witness", next: "badger", rapport: 4 },
          { label: "Ask about comps", next: "cross_comp", rapport: 2 },
        ],
      },
      badger: {
        text: "OBJECTION — argumentative! Sustained against me. I love when the bit commits.",
        end: true,
      },
      cross_comp: {
        text: (ctx) => `Dealer invokes Fifth Amendment (comp policy). `
          + `Your ${ctx.tier.label} card may unlock Betty's mercy. That's civil law, not criminal.`,
        end: true,
      },
      motion_comp: {
        text: (ctx) => `Motion to comp one (1) dignity restoration drink. `
          + `${ctx.tierIdx >= 2 ? "Gold+ — I'll stamp it with gold foil." : "Denied pending tier upgrade. Try Pearl tears."}`,
        end: true,
      },
      opening: {
        text: (ctx) => `Ladies and gentlemen of the pit, my client ${ctx.playerName} `
          + `wagered ${ctx.lifetimeWagered.toLocaleString()} in good faith. The house edge is not a personality.`,
        choices: [
          { label: "Closing argument", next: "closing", rapport: 5 },
          { label: "Call character witness (Tina)", next: "witness_tina", rapport: 4, egg: "legal_witness_tina" },
        ],
      },
      closing: {
        text: "If the math is not kind, let the comps be generous. I rest — billable hours continue off-screen.",
        end: true,
      },
      witness_tina: {
        text: "Witness Tina testifies she is ALSO lost. Case dismissed for adorable irrelevance.",
        end: true,
      },
      appeal_steve: {
        text: "Survey says… SUSTAINED ON APPEAL. Steve's charisma overrides Nevada gaming code. (It doesn't.)",
        end: true,
      },
      sidebar_betty: {
        text: "Sidebar at Betty's Bar: settlement reached — one gossip and a heavy pour. Case closed.",
        end: true,
      },
      rest: {
        text: "Court adjourned. Remember: this is legal theatre. Actual lawyers bill more and joke less.",
        end: true,
      },
    },
    retainer: {
      start: {
        text: "Retainer negotiation — my favorite billable fiction.",
        choices: [
          { label: "Pay in chips", next: "chips", rapport: 2 },
          { label: "Pay in comps", next: "comps", rapport: 2 },
          { label: "Pro bono?", next: "probono", rapport: 1 },
        ],
      },
      chips: {
        text: (ctx) => `500 chips retainer, or ${Math.max(100, Math.floor(ctx.netSession * -0.1))} if you're down bad. `
          + "I accept IOUs written on cocktail napkins.",
        end: true,
      },
      comps: {
        text: "Buffet comp accepted. Both parties suffer equally. Justice served lukewarm.",
        end: true,
      },
      probono: {
        text: "Pro bono denied — even theater has union rates. Text me after your next tier bump.",
        end: true,
      },
    },
  },

  steve_harvey: {
    feud_board: {
      start: {
        text: "Show me 'Things Steve Harvey Says At The Table' — top six answers on the board!",
        choices: [
          { label: "Survey says!", next: "survey", rapport: 2, egg: "feud_survey" },
          { label: "Photo finish!", next: "photo", rapport: 2 },
          { label: "Family!", next: "family", rapport: 3, requires: { minRapport: 20 } },
        ],
      },
      survey: {
        text: "Number one answer: SURVEY SAYS! (247 points). Number two: 'That's what I said!'",
        end: true,
      },
      photo: {
        text: "Royal Flush in the stretch! Wrong sport, right drama. Steve called it — always does.",
        end: true,
      },
      family: {
        text: "Name a feud answer that's also a life lesson: 'Communication.' Survey says… you need more chips.",
        end: true,
      },
    },
  },

  host_representative: {
    escalation: {
      start: {
        text: (ctx) => `Alexandra Vale — ${ctx.tier.label} escalation desk. `
          + "Describe the incident in one typo or less.",
        choices: [
          { label: "Bad beat at blackjack", next: "blackjack", rapport: 2 },
          { label: "Minibar prices", next: "minibar", rapport: 2 },
          { label: "I deserve Chairman perks", next: "chairman", rapport: 3, requires: { minTierIdx: 4 } },
          { label: "Compliment the staff", next: "praise", rapport: 5, requires: { minRapport: 25 } },
        ],
      },
      blackjack: {
        text: "I'm escalating to 'sympathetic nod' and a note that you were 'due.' Narratively comforting.",
        end: true,
      },
      minibar: {
        text: "Minibar prices are a feature, not a bug. I can comp a vibe. The vibe is 'understanding.'",
        end: true,
      },
      chairman: {
        text: "Chairman privileges loading… velvet rope, whispered suite keys, and a harpoon metaphor. Metaphor only.",
        end: true,
      },
      praise: {
        text: (ctx) => `Noted in your file: '${ctx.playerName} is delightful.' `
          + "That actually helps. Rare guest behavior. +rapport with the universe.",
        end: true,
      },
    },
  },

  barkeep_betty: {
    gossip_chain: {
      start: {
        text: "Gossip requires two ingredients: names and speculation. Who we talking about?",
        choices: [
          { label: "Steve at roulette", next: "steve", rapport: 2 },
          { label: "Tina got lost again", next: "tina", rapport: 2 },
          { label: "Meryl at blackjack", next: "meryl", rapport: 3, requires: { minRapport: 15 } },
          { label: "The whale at penny slots", next: "whale", rapport: 3, requires: { minRapport: 30 } },
        ],
      },
      steve: {
        text: "He called a photo finish on red 32. It hit. Survey says… Steve's ego did.",
        end: true,
      },
      tina: {
        text: "She asked directions to the buffet from inside the buffet. Icon behavior.",
        end: true,
      },
      meryl: {
        text: "She quoted Hamlet at a split. Player folded. Art won.",
        end: true,
      },
      whale: {
        text: "Cried over a cherry hit, tipped in comp points. Vegas is a mood ring.",
        end: true,
      },
    },
  },

  chip_chandler: {
    pit_intel: {
      start: {
        text: (ctx) => ctx.playHours >= 2
          ? `Night ${Math.floor(ctx.playHours / 2) + 1} intel — you've been on property ${ctx.playHours}h. Respect.`
          : "Fresh on the floor? I'll read you tonight's pit weather.",
        choices: [
          { label: "Blackjack heat?", next: "bj", rapport: 2 },
          { label: "Roulette vibe?", next: "roulette", rapport: 2 },
          { label: "Who's tilting?", next: "tilt", rapport: 3, requires: { minRapport: 20 } },
          { label: "Insider table?", next: "insider", rapport: 5, requires: { band: "insider" } },
        ],
      },
      bj: {
        text: "Meryl's table: dramatic. Jennifer's: surgical. Pick your poison.",
        end: true,
      },
      roulette: {
        text: "Steve's wheel. Survey energy. Bet with your heart, lose with your wallet. Classic.",
        end: true,
      },
      tilt: {
        text: (ctx) => ctx.isDownBad
          ? "You, maybe. Hydrate. Betty's line is shorter than the ATM."
          : "Tourist in slots aisle talking to the machine. Machine winning.",
        end: true,
      },
      insider: {
        text: "High-limit room after 2am: fewer tourists, more stories. Bring bankroll or main-character energy.",
        end: true,
      },
    },
  },

  tourist_tina: {
    lost_quest: {
      start: {
        text: "OK so WHERE did you last see something you recognized??",
        choices: [
          { label: "Gold carpet", next: "carpet", rapport: 2 },
          { label: "A plant", next: "plant", rapport: 2 },
          { label: "Steve Harvey", next: "steve", rapport: 3, egg: "tina_steve" },
          { label: "Give up", next: "destiny", rapport: 1 },
        ],
      },
      carpet: {
        text: "Gold carpet leads to MORE carpet. But like, confidently?",
        end: true,
      },
      plant: {
        text: "The plant is fake but the confusion is real. Text CHIP. Or don't. Adventure!",
        end: true,
      },
      steve: {
        text: "If you see Steve you're either at roulette or a fever dream. Both valid.",
        end: true,
      },
      destiny: {
        text: "Accept destiny. Destiny is probably the buffet. It's always the buffet.",
        end: true,
      },
    },
  },

  pete_bookie: {
    parlay_therapy: {
      start: {
        text: "Parlay therapy session — how many legs we mourning?",
        choices: [
          { label: "2-leg (optimist)", next: "two", rapport: 2 },
          { label: "8-leg (delusional)", next: "eight", rapport: 3, egg: "pete_parlay8" },
          { label: "Same game parlay", next: "sgp", rapport: 2 },
          { label: "I only bet locks", next: "locks", rapport: 1, requires: { minRapport: 15 } },
        ],
      },
      two: {
        text: "Two legs? Cute. Vegas allows hope at that dosage.",
        end: true,
      },
      eight: {
        text: "Eight legs? That's not a bet, that's a cry for help. Line: sympathy +300.",
        end: true,
      },
      sgp: {
        text: "Same game parlay — correlation is a suggestion the house ignores profitably.",
        end: true,
      },
      locks: {
        text: "Mandalay Bay to remain standing. Lock of the millennium. -10000.",
        end: true,
      },
    },
  },
};

/** Tier rank-up congratulation texts per contact subset */
export const TIER_RANKUP_MESSAGES = {
  pearl: {
    barkeep_betty: "Pearl tier! 🍸 Your pours get 12% more judgmental — in a good way. First slot free-play comp unlocked.",
    chip_chandler: "Pearl unlocked — floor staff now pretends to remember you. Progress!",
  },
  gold: {
    attorney_brief: "Gold tier detected. Retainer rates increase; so does my theatrical commitment. OBJECTION ready on standby.",
    barkeep_betty: "Gold! Buffet comp unlocked. Line still long but your aura says 'comped.'",
    host_representative: "Gold status noted. I can't upgrade you yet but I can spell your name right on comps.",
  },
  platinum: {
    host_representative: "Platinum welcome — you've unlocked my direct line. Text COMPAINT anytime. (One P. Always one P.)",
    chip_chandler: "Platinum on the floor — pits whisper your tier. Tina still gets lost. Some constants remain.",
  },
  noir: {
    host_representative: "Noir tier. Suite upgrade comp queued. I escalate with noir-filtered gravitas now.",
    attorney_brief: "Noir tier — legally you're too cool for small claims. I recommend dramatic pauses at blackjack.",
  },
  chairman: {
    host_representative: "Chairman. The penthouse comp whispers your name. I don't ask questions. I arrange vibes.",
    steve_harvey: "Survey says… CHAIRMAN! You made it. I knew you when you were Sapphire. Don't forget me on TV.",
    chip_chandler: "Chairman on property. Floor hosts salute. Steve salutes louder. Welcome to the endgame.",
  },
};

/** @param {string} contactId @param {object} ctx */
function baseTextOptions(contactId, ctx) {
  const { band, tier, playHours, isDownBad, isUp } = ctx;
  const opts = [];

  const push = (opt) => {
    if (meetsRequirements(opt.requires, ctx)) opts.push(opt);
  };

  if (contactId === "attorney_brief") {
    push({ key: "objection", label: "Objection!", reply: band.id === "stranger"
      ? "Sustained. Emotional damages: one (1) bad beat. My retainer accepts chips and dignity."
      : "OVERRULED — wait, no, SUSTAINED for you. The house looks guilty. Legally meaningless. Emotionally satisfying.",
      egg: "legal_objection", rapport: 2 });
    push({ key: "courtroom", label: "🎭 Courtroom mode", reply: null, startTree: { treeId: "courtroom", nodeId: "start" }, rapport: 3 });
    push({ key: "sue", label: "Can I sue the casino?", reply: isDownBad
      ? "You can sue anyone. Winning is another matter. Right now I'd sue the ATM for emotional distress."
      : "You can sue anyone. Winning is another matter. Also you signed the guest directory. That waives… vibes.",
      rapport: 1 });
    push({ key: "nda", label: "What happens in Vegas?", reply: "Stays in Vegas unless Tina posts it. She won't. She can't find the share button.", egg: "vegas_nda", rapport: 1 });
    push({ key: "retainer_tree", label: "Retainer talk", reply: null, startTree: { treeId: "retainer", nodeId: "start" },
      requires: { minRapport: 10 }, rapport: 2 });
    push({ key: "tier_legal", label: `${tier.label} legal perks?`, reply: tier.id === "chairman"
      ? "Chairman: I pretend to know judges. Noir: dramatic sidebar rights. Gold: one free OBJECTION per night."
      : `${tier.label} tier — comps are civil law; bad beats are acts of God. I specialize in God.`,
      requires: { minTierIdx: 2 }, rapport: 2 });
    push({ key: "long_session", label: "I've been here forever", reply: `Counsel notes ${playHours}h on property. Legally you're a resident. Try the homesteader defense at checkout.`,
      requires: { minPlayHours: 3 }, rapport: 3, onceKey: "attorney_long_session" });
  }

  if (contactId === "steve_harvey") {
    push({ key: "survey", label: "Survey says…", reply: band.id === "confidant"
      ? "SURVEY SAYS… you're family now! Top answer: MORE CHIPS. Second: STEVE HARVEY."
      : "SURVEY SAYS… you're my favorite degenerate tonight! 🔔 Top answer: MORE CHIPS.",
      egg: "survey_says", rapport: 2 });
    push({ key: "feud_tree", label: "Family Feud board", reply: null, startTree: { treeId: "feud_board", nodeId: "start" }, rapport: 3 });
    push({ key: "feud", label: "Feud story?", reply: "Show me 'Reason Steve Left Chicago' — I got a whole board. You get free entertainment.", rapport: 1 });
    push({ key: "horse", label: "Wrong sport?", reply: "Royal Flush in the stretch! …Wrong animal, right energy.", egg: "steve_horse", rapport: 1 });
    push({ key: "tier_steve", label: `${tier.label} player check`, reply: `Survey says… ${tier.label} tier! ${tier.id === "chairman" ? "You made it, champ." : "Keep climbing — Feud reruns don't pay rent."}`,
      requires: { minTierIdx: 1 }, rapport: 2 });
    push({ key: "roulette_tip", label: "Roulette number?", reply: "Survey says… 4! Or 17. Or don't listen to game show hosts for math.", requires: { minRapport: 20 }, rapport: 2 });
  }

  if (contactId === "host_representative") {
    push({ key: "compaint", label: "I have a compaint", reply: "One P, noted. I'm escalating to 'smiling harder.' Suite upgrade pending narrative approval.", egg: "host_typo", rapport: 2 });
    push({ key: "escalation", label: "📋 Escalation desk", reply: null, startTree: { treeId: "escalation", nodeId: "start" }, rapport: 3 });
    push({ key: "vip", label: "VIP treatment?", reply: `You're ${tier.label} — velvet rope at the buffet line. Noir gets the rope itself.`, rapport: 1 });
    push({ key: "whale", label: "Am I a whale?", reply: ctx.lifetimeWagered >= 10000
      ? "You're past dolphin. Call yourself a marlin. Chairman gets the harpoon metaphor."
      : "You're a dolphin with ambition. Keep wagering — Chairman tier gets a literal harpoon metaphor. (It's complimentary.)",
      egg: "whale_status", rapport: 2 });
    push({ key: "session_host", label: "Long session check-in", reply: `${playHours}h on property — I'm sending a narratively appropriate wellness vibe. Hydrate. Compliment Carmen.`,
      requires: { minPlayHours: 4 }, rapport: 4 });
  }

  if (contactId === "barkeep_betty") {
    push({ key: "comp", label: "Comp drink?", reply: `Pour incoming — ${tier.label} tier. Sapphire gets sympathy; Gold gets gin; Chairman gets whatever you want and no questions.`,
      rapport: 2 });
    push({ key: "gossip_tree", label: "🍸 Gossip chain", reply: null, startTree: { treeId: "gossip_chain", nodeId: "start" }, rapport: 3 });
    push({ key: "gossip", label: "Quick gossip?", reply: "Tina saw a whale cry at penny slots. Steve called a photo finish at roulette. Normal Tuesday.", egg: "betty_gossip", rapport: 1 });
    push({ key: "drink_rec", label: "Drink recommendation?", reply: band.id === "insider"
      ? "Off-menu: 'The Chairman's Regret' — top shelf, no ice, served with a knowing look."
      : "The Walk of Shame — tastes like regret, looks like tourism.", requires: { minRapport: 15 }, rapport: 2 });
    push({ key: "down_bad", label: "Rough session", reply: "First one's on sympathy. Second one's on denial. Third — I'm cutting you off with love.",
      requires: { minRapport: 5 }, onceKey: "betty_down_bad", rapport: 3 });
  }

  if (contactId === "chip_chandler") {
    push({ key: "pit", label: "Who's on pit?", reply: "Tonight: drama at blackjack, chaos at roulette, Steve being Steve at the pavilion. You're welcome.", rapport: 1 });
    push({ key: "pit_tree", label: "🎲 Pit intel deep dive", reply: null, startTree: { treeId: "pit_intel", nodeId: "start" }, rapport: 3 });
    push({ key: "tip", label: "Hot tips?", reply: `Hot tip #1: the house has math. Hot tip #2: Betty pours heavy on ${tier.label}+.`, egg: "chip_tip", rapport: 2 });
    push({ key: "regular", label: "Regular check-in", reply: `${ctx.totalVisits} floor visits — you're basically furniture. Complimentary!`,
      requires: { minVisits: 15 }, rapport: 4 });
  }

  if (contactId === "tourist_tina") {
    push({ key: "lost", label: "I'm lost", reply: "Same!! Try the gold carpet tiles near the plants. Or text CHIP. Or accept destiny.", egg: "tina_lost", rapport: 2 });
    push({ key: "lost_tree", label: "🗺️ Lost quest", reply: null, startTree: { treeId: "lost_quest", nodeId: "start" }, rapport: 3 });
    push({ key: "food", label: "Where's food?", reply: "Buffet comp maybe? Steve says survey says… line moves if you look confident.", rapport: 1 });
    push({ key: "bff", label: "Are we friends?", reply: band.id === "confidant"
      ? "BFFs!! I put you in my phone as 'Person Who Knows Directions (Maybe)'!"
      : "We're getting there!! You haven't abandoned me in a hallway yet!",
      requires: { minRapport: 25 }, rapport: 3 });
  }

  if (contactId === "pete_bookie") {
    push({ key: "lock", label: "Lock of the day?", reply: "Mandalay Bay to remain standing. Line: -10000. (Past performance ≠ future Mandalay.)", egg: "pete_lock", rapport: 1 });
    push({ key: "parlay_tree", label: "📋 Parlay therapy", reply: null, startTree: { treeId: "parlay_therapy", nodeId: "start" }, rapport: 3 });
    push({ key: "help", label: "Help my parlay", reply: "I can't fix prayer. I can offer sympathy at 3:1.", rapport: 1 });
    push({ key: "insider_line", label: "Insider line?", reply: "Off-record: bet with your head, not Steve's survey board. Record resumes now.",
      requires: { band: "insider" }, rapport: 4 });
  }

  if (contactId === "meryl_screech") {
    push({ key: "oscar", label: "Oscar tips?", reply: "Method dealing: whisper to the ace. The audience (pit boss) hates it.", egg: "meryl_oscar", rapport: 2 });
    push({ key: "drama", label: "Table drama?", reply: band.id === "regular"
      ? "Tonight's show: 'Player vs Probability, Act III.' Standing room only."
      : "Every hand is a monologue. Some audiences boo with their wallets.", rapport: 2 });
    push({ key: "shakespeare", label: "Quote Shakespeare?", reply: "To hit, or not to hit — that is the question. Whether 'tis nobler to split eights…", requires: { minRapport: 20 }, rapport: 3 });
  }

  if (contactId === "pavilion_paula") {
    push({ key: "odds", label: "Long shot of the day?", reply: "Gate 4 has 'attitude' — that's not a stat but it's a vibe.", rapport: 2 });
    push({ key: "mood", label: "Paddock mood?", reply: playHours >= 3 ? "Late card — ponies tired, crowd superstitious. Perfect." : "Early card — optimism and sunscreen.", rapport: 1 });
    push({ key: "insider_paula", label: "Insider angle?", reply: "Watch the jockey silks, ignore my last three picks. Consistency is for accountants.",
      requires: { minRapport: 30 }, rapport: 4 });
  }

  if (contactId === "clerk_carmen") {
    push({ key: "conf", label: "Elevator gaslighting?", reply: "Floor 14 is real. The elevator disagrees for sport. Use stairs or charm.", rapport: 2 });
    push({ key: "room", label: "Room status?", reply: tier.id === "platinum" || tier.id === "noir" || tier.id === "chairman"
      ? `${tier.label} — I'll see what narrative upgrade Alexandra queued. Keys still with me.`
      : "Reservation's in the system. Somewhere. Try spelling your name slower.", rapport: 1 });
  }

  if (contactId === "judi_bench") {
    push({ key: "allin", label: "All in?", reply: "Only when you mean it. I fold on bad jokes and bad river cards.", rapport: 2 });
    push({ key: "tell", label: "Any tells?", reply: band.id === "insider"
      ? "You tilt after coolers. Hydrate. Also stop sighing at the river."
      : "Watch the eyes, not the hoodie. This isn't cinema.", requires: { minRapport: 25 }, rapport: 3 });
  }

  // Dealer / NPC default fallbacks
  if (!opts.length) {
    push({ key: "hey", label: band.id === "stranger" ? "Hey!" : "Good to see you again!",
      reply: band.id === "stranger"
        ? "Got your text. I'm between shifts — hit me again after you visit the floor."
        : `Back for more? ${playHours >= 2 ? "Long session energy. Respect." : "Floor's waiting."}`,
      rapport: 1 });
    push({ key: "tier_note", label: `${tier.label} check`, reply: `${tier.label} tier on the floor — comps and gossip scale accordingly.`, requires: { minTierIdx: 1 }, rapport: 1 });
  }

  return opts;
}

/** @param {string} contactId @param {object} ctx */
export function getDynamicTextOptions(contactId, ctx) {
  const opts = baseTextOptions(contactId, ctx);
  const custom = ctx.custom?.texts ?? [];
  for (const t of custom) {
    opts.unshift({
      key: `custom_${t.key ?? t.label}`,
      label: t.label,
      reply: t.reply,
      rapport: 2,
      custom: true,
    });
  }
  return opts.filter((opt) => {
    if (opt.onceKey && ctx.topicsSeen.has(opt.onceKey)) return false;
    return meetsRequirements(opt.requires, ctx);
  });
}

/** @param {string} contactId @param {object} ctx */
export function getDynamicIntro(contactId, ctx) {
  const custom = ctx.custom?.intro;
  if (custom) return custom;
  const band = ctx.band.id;
  const intros = {
    attorney_brief: band === "stranger"
      ? "Harvey Brief, Esq. You've been added to my billable contacts. Text OBJECTION for legal theater. (Not actual legal advice.)"
      : `Counsel recognizes a returning client. Rapport: ${ctx.rapport}/100. Courtroom mode available.`,
    steve_harvey: band === "confidant"
      ? "Steve Harvey 📺 Survey says… my favorite regular's back! Text SURVEY anytime."
      : "Steve Harvey 📺 Survey says… you sat at my table! Text SURVEY anytime. Family Feud reruns don't pay rent.",
    host_representative: `Alexandra Vale — MGM Host Services. ${ctx.tier.label} welcome. Text COMPAINT (yes, one P) and I'll escalate with a smile.`,
  };
  return intros[contactId] ?? null;
}

/** @param {string} contactId @param {object} ctx */
export function getDynamicCallScript(contactId, ctx) {
  const { band, tier, playHours } = ctx;
  const scripts = {
    attorney_brief: {
      opening: playHours >= 4
        ? `Harvey Brief, Esq. ${playHours}h on property — I'm billing in metaphors today.`
        : "Harvey Brief, Esq. Billable minute #1 starting… now.",
      lines: [
        "Before you speak: I am not licensed in your jurisdiction, this call, or the astral plane.",
        band.id === "insider"
          ? "You've earned insider counsel — I still can't help you win, but I can object louder."
          : "That said — how can I theatrically assist?",
      ],
      choices: [
        { label: "The casino took my chips", response: ctx.isDownBad
          ? "Voluntary transfer defense PLUS emotional distress. Have you tried winning them back with dignity? Or Betty's bar?"
          : "Ah, the classic 'voluntary transfer' defense. Have you tried winning them back with dignity?", egg: null, rapport: 1 },
        { label: "Objection!", response: "SUSTAINED. The house looks guilty. Legally meaningless. Emotionally satisfying.", egg: "call_objection", rapport: 3 },
        { label: "Start courtroom mode", response: "Court convened telephonically. Text COURTROOM when we hang up — docket continues.", egg: "call_courtroom", rapport: 4 },
        { label: "Retainer?", response: `My retainer is 500 chips or one buffet comp. ${tier.label} tier gets 10% off theater.`, egg: "call_retainer", rapport: 2 },
      ],
    },
    steve_harvey: {
      opening: "Steve Harvey on the line! Survey says… you called ME for once.",
      lines: [
        band.id === "regular"
          ? "Regular! I remember regulars. Survey says… loyalty pays in charisma."
          : "Listen, I spun wheels, hosted Feud, boxed a little — this call is still peak excitement.",
        "You need betting advice? Survey says… the number four. Or don't. I'm a host, not a prophet.",
      ],
      choices: [
        { label: "Any Feud stories?", response: "Once a contestant guessed 'Steve Harvey' for every answer. Survey said… correct.", egg: "call_feud", rapport: 2 },
        { label: "Horse racing tips?", response: "Royal Flush in the stretch! Place your bets — wrong sport, great energy.", egg: "call_horse", rapport: 2 },
        { label: "Chairman pep talk", response: "Survey says… you're built different. Act like it at the table.", egg: null, rapport: 3, requires: { minTierIdx: 5 } },
        { label: "Goodbye", response: "Survey says… hang up and go win something!", egg: null, rapport: 1 },
      ],
    },
    host_representative: {
      opening: `Alexandra Vale, MGM Host Representative. ${tier.label} privileges are… loading… loaded.`,
      lines: [
        "I can comp, escalate, or pretend the minibar prices are a typo.",
        playHours >= 3 ? `You've been here ${playHours}h — can I offer a narrative wellness check?` : "What do you need, member?",
      ],
      choices: [
        { label: "Room upgrade?", response: "Narrative upgrade queued. Actual keys remain with Carmen — I make vibes happen.", egg: null, rapport: 2 },
        { label: "I'm upset", response: "I'm so sorry — on a scale of 1 to Steve Harvey, how loud was the incident?", egg: "host_upset", rapport: 2 },
        { label: "Secret Chairman perk?", response: "…You didn't hear this from me. Text WHALE on my line after midnight. (It's still a metaphor.)", egg: "chairman_secret", rapport: 4, requires: { minTierIdx: 4 } },
        { label: "Compliment staff", response: "I'll note that in your file. Genuine praise is rarer than a royal flush.", egg: null, rapport: 5 },
      ],
    },
    chip_chandler: {
      opening: band.id === "insider" ? "Chip here — insider line. Pits are talking." : "Chip here. You rang the floor hotline.",
      lines: [`Pits are alive. Roulette's hot, Hold'em's chatty, Tina's lost again.${playHours >= 2 ? " Long session crew tonight." : ""}`],
      choices: [
        { label: "Best table?", response: "Wherever your bankroll feels brave. Or stupid. Same thing after midnight.", egg: null, rapport: 2 },
        { label: "Insider table?", response: "High-limit after 2am. Bring chips or confidence. Preferably both.", egg: "chip_insider_call", rapport: 4, requires: { band: "insider" } },
        { label: "Thanks", response: "Save my number. The house always has my number anyway.", egg: null, rapport: 1 },
      ],
    },
    barkeep_betty: {
      opening: "Betty's Bar — talk fast, I'm pouring.",
      lines: [band.id === "regular" ? "Your usual judgmental glance is ready." : "Comp status checks take two seconds and one judgmental glance."],
      choices: [
        { label: "Strongest drink?", response: "The 'Walk of Shame' — tastes like regret, looks like tourism.", egg: "betty_drink", rapport: 2 },
        { label: "Gossip?", response: "Steve called a photo finish at slots. Meryl quoted Shakespeare at blackjack. Normal.", egg: null, rapport: 2 },
        { label: "Rough session", response: "Sympathy pour incoming. Don't make me cut you off with love.", egg: null, rapport: 3, requires: { minRapport: 10 } },
      ],
    },
    pete_bookie: {
      opening: "Pete the Bookie. Speak fast — lines move when I breathe.",
      lines: ["Everything I say is entertainment, not financial advice. Or good advice."],
      choices: [
        { label: "Lock of the day?", response: "Mandalay Bay remains upright. Heavy favorite. Bet the house metaphorically.", egg: "pete_call_lock", rapport: 2 },
        { label: "Fix my parlay", response: "I can't fix prayer. Try fewer legs and more dignity.", egg: null, rapport: 1 },
        { label: "Parlay therapy", response: "Text PARLAY THERAPY when we hang up. Session continues on the record.", egg: null, rapport: 3 },
      ],
    },
    tourist_tina: {
      opening: "Tina here!! I was literally about to text YOU!",
      lines: [band.id === "confidant" ? "Bestie!! I'm still lost but I found YOU." : "I'm lost again but emotionally available."],
      choices: [
        { label: "Where am I?", response: "Same!! Try the gold carpet by the plants. Or don't. Adventure!", egg: "tina_call_lost", rapport: 2 },
        { label: "Friend check", response: "We're totally friends!! I saved you as 'Direction Person Maybe'!", egg: null, rapport: 3, requires: { minRapport: 20 } },
      ],
    },
    pavilion_paula: {
      opening: "Paula at the paddock. The ponies are moody. I'm moodier.",
      lines: ["Text ODDS for my long-shot. Call me for drama."],
      choices: [
        { label: "Long shot?", response: "Gate 4 has 'attitude' — that's not a stat but it's a vibe.", egg: "paula_longshot", rapport: 2 },
        { label: "Late card?", response: playHours >= 3 ? "Night card superstition peaks at 2am. You're late enough for magic." : "Early card — optimism and bad math.", egg: null, rapport: 2 },
      ],
    },
  };

  const script = scripts[contactId];
  if (!script) return null;
  return {
    ...script,
    choices: script.choices.filter((c) => meetsRequirements(c.requires, ctx)),
  };
}

/**
 * @param {string} contactId
 * @param {string} treeId
 * @param {string} nodeId
 * @param {object} ctx
 */
export function getDialogueNode(contactId, treeId, nodeId, ctx) {
  const tree = DIALOGUE_TREES[contactId]?.[treeId];
  if (!tree) return null;
  const node = tree[nodeId];
  if (!node) return null;
  const text = resolveLine(node.text, ctx);
  const choices = (node.choices ?? [])
    .filter((c) => meetsRequirements(c.requires, ctx))
    .map((c) => ({ ...c, label: resolveLine(c.label, ctx) }));
  return { text, choices, end: Boolean(node.end) };
}

/** @param {string} tierId */
export function getTierRankUpMessages(tierId) {
  const messages = TIER_RANKUP_MESSAGES[tierId];
  return messages ? Object.entries(messages) : [];
}
