/**
 * Dynamic phone dialogue trees, text menus, and call scripts.
 * Content scales with rapport, tier, and play time.
 */

import { resolveLine, meetsRequirements, buildDialogueContext } from "./phone-rapport.js";

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
    drunk_court: {
      start: {
        text: (ctx) => `*hushed barrister voice* Counsel for ${ctx.playerName} `
          + `moves to adjourn to Betty's. Court is… wobbly.`,
        choices: [
          { label: "OBJECTION (slurred)", next: "slurred", rapport: 3, egg: "legal_drunk_objection" },
          { label: "Motion to comp Uber", next: "uber", rapport: 2 },
          { label: "Sue the carpet", next: "carpet", rapport: 4, egg: "legal_drunk_carpet" },
        ],
      },
      slurred: {
        text: "SUSTAINED. The jury (me) cannot understand you but respects the energy.",
        end: true,
      },
      uber: {
        text: "Motion granted. Narrative Uber en route. Do not text Harvey again until water happens.",
        end: true,
      },
      carpet: {
        text: "The carpet is guilty of being too soft. Settlement: one (1) sit-down.",
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
    drunk_survey: {
      start: {
        text: "Survey says… you're texting STEVE HARVEY at whatever o'clock! I respect the commitment.",
        choices: [
          { label: "Am I winning?", next: "winning", rapport: 2 },
          { label: "Is the wheel alive?", next: "wheel", rapport: 3, egg: "steve_drunk_wheel" },
          { label: "Sing Feud theme", next: "theme", rapport: 4, egg: "steve_drunk_theme" },
        ],
      },
      winning: {
        text: "Survey says… emotionally? Yes. Mathematically? Steve is not a financial advisor.",
        end: true,
      },
      wheel: {
        text: "The wheel is spinning, baby! So is the room! Sit down before you spin with it!",
        end: true,
      },
      theme: {
        text: "DING DING DING — top answer: HYDRATE. Runner-up: call Betty. Third: stop texting Steve.",
        end: true,
      },
    },
  },

  meryl_screech: {
    method_acting: {
      start: {
        text: "Act I: the player texts the dealer. Act II: we choose a genre.",
        choices: [
          { label: "Shakespeare at the felt", next: "shakespeare", rapport: 3 },
          { label: "Noir monologue", next: "noir", rapport: 2, requires: { minTierIdx: 4 } },
          { label: "Oscar campaign", next: "oscar", rapport: 4, requires: { minRapport: 25 } },
        ],
      },
      shakespeare: {
        text: "To hit, or not to hit — that is the question. Whether 'tis nobler to split eights…",
        end: true,
      },
      noir: {
        text: "The pit boss is a shadow. The ace is a confession. You? Still at the table. Art.",
        end: true,
      },
      oscar: {
        text: "Campaign slogan: 'Meryl Screech — Best Supporting Dealer.' Vote with your tips.",
        end: true,
      },
    },
  },

  judi_bench: {
    bond_table: {
      start: {
        text: "Bond. James Bond. State your poker grievance with British restraint.",
        choices: [
          { label: "Bad river card", next: "river", rapport: 2 },
          { label: "Read my tell", next: "tell", rapport: 3, requires: { minRapport: 20 } },
          { label: "All-in courage?", next: "allin", rapport: 2 },
        ],
      },
      river: {
        text: "The river giveth. Occasionally it taketh with impeccable timing. Regroup.",
        end: true,
      },
      tell: {
        text: (ctx) => ctx.isDownBad
          ? "You sigh before the turn. Hydrate. Fold earlier. Queen's orders."
          : "You play patient — good. Watch the eyes, not the hoodie.",
        end: true,
      },
      allin: {
        text: "Only when you mean it. I fold on bad jokes and worse math.",
        end: true,
      },
    },
  },

  jennifer_lawless: {
    relatable: {
      start: {
        text: "OK hi — relatable dealer hotline. What's the vibe?",
        choices: [
          { label: "I tripped (metaphorically)", next: "trip", rapport: 2 },
          { label: "Hot table?", next: "hot", rapport: 2 },
          { label: "Encourage me", next: "pep", rapport: 3, requires: { minRapport: 15 } },
        ],
      },
      trip: {
        text: "I literally tripped on the felt last Tuesday. You'll recover faster than I did.",
        end: true,
      },
      hot: {
        text: "Meryl's dramatic, I'm surgical, Octavia's sweet — pick your poison. I won't trip guiding you.",
        end: true,
      },
      pep: {
        text: "You got this! Minimum bet, maximum vibes — that's literally my tagline.",
        end: true,
      },
    },
  },

  sofia_volume: {
    dale_roulette: {
      start: {
        text: "¡Dale, amigo! The wheel is VOLUME tonight — pick your energy!",
        choices: [
          { label: "Lucky number?", next: "number", rapport: 2 },
          { label: "Red or black?", next: "color", rapport: 2 },
          { label: "¡Más volumen!", next: "loud", rapport: 4, requires: { minRapport: 20 }, egg: "sofia_volume_max" },
        ],
      },
      number: {
        text: "Survey says — wait, wrong host. Sofia says… 17! Or 4! Or your heart!",
        end: true,
      },
      color: {
        text: "Red is passion, black is mystery, green is… house money. Place your bets, cariño!",
        end: true,
      },
      loud: {
        text: "MAXIMUM VOLUME! The pit boss asked me to whisper. I said NO. ¡Vamos!",
        end: true,
      },
    },
  },

  octavia_spectacular: {
    sweetheart: {
      start: {
        text: "Honey, the table's warm and the texts are warmer. What you need, sugar?",
        choices: [
          { label: "Pep talk", next: "pep", rapport: 2 },
          { label: "Hold'em or blackjack?", next: "game", rapport: 2 },
          { label: "Sweetheart secrets", next: "secrets", rapport: 4, requires: { band: "insider" } },
        ],
      },
      pep: {
        text: "Honey, the house always wins — but you look good trying. That's half the battle.",
        end: true,
      },
      game: {
        text: "Blackjack for drama, Hold'em for patience. Either way I'll pour charm, not drinks.",
        end: true,
      },
      secrets: {
        text: "Insider tip: compliment the pit boss's shoes. Works every third Tuesday.",
        end: true,
      },
    },
  },

  nicole_widechart: {
    widechart: {
      start: {
        text: "The chips are whispering. I'm listening. Choose a frequency.",
        choices: [
          { label: "Chart the night", next: "chart", rapport: 2 },
          { label: "Roulette poise", next: "roulette", rapport: 2 },
          { label: "Blackjack precision", next: "blackjack", rapport: 3, requires: { minRapport: 20 } },
        ],
      },
      chart: {
        text: (ctx) => `Session trend: ${ctx.isUp ? "ascending with composure" : ctx.isDownBad ? "corrective phase advised" : "equilibrium"}.`,
        end: true,
      },
      roulette: {
        text: "Precision. Poise. Patience. Also maybe don't bet Steve's survey numbers.",
        end: true,
      },
      blackjack: {
        text: "Split eights with elegance. Double with conviction. Tip with discretion.",
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
    drunk_comp: {
      start: {
        text: "…Alexandra here. Your texts have typos AND confidence. VIP after-hours line open.",
        choices: [
          { label: "Comp the minibar", next: "minibar", rapport: 3, egg: "host_drunk_minibar" },
          { label: "I love everyone", next: "love", rapport: 2 },
          { label: "Escalate Steve Harvey", next: "steve", rapport: 4, egg: "host_drunk_steve" },
        ],
      },
      minibar: {
        text: "I cannot comp peanuts. I CAN comp the story that they were artisan.",
        end: true,
      },
      love: {
        text: "Noted. Sober-you may cringe. I'll archive with compassion.",
        end: true,
      },
      steve: {
        text: "Escalating to Steve's mustache. Survey says… handled.",
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
    drunk_menu: {
      start: {
        text: (ctx) => `OK listen — you've had ${ctx.intox.totalDoses} pours and I'm still pouring judgment. `
          + "Off-menu after-hours. Pick your poison.",
        choices: [
          { label: "One more for the road", next: "onemore", rapport: 2, egg: "betty_drunk_onemore" },
          { label: "Water? (coward)", next: "water", rapport: 1 },
          { label: "Cut me off", next: "cutoff", rapport: 4, egg: "betty_drunk_cutoff" },
          { label: "Who's cute at the bar?", next: "cute", rapport: 3, requires: { minRapport: 15 }, egg: "betty_drunk_gossip" },
        ],
      },
      onemore: {
        text: "Last one. Narrator voice: it was not the last one. Hydrate before slots.",
        end: true,
      },
      water: {
        text: "Responsible legend behavior. Steve Harvey would be proud. I'd never admit that sober.",
        end: true,
      },
      cutoff: {
        text: "Cut off with LOVE. Uber your soul to bed. I'll tell Chip you're vertical-ish.",
        end: true,
      },
      cute: {
        text: "Steve's mustache. Next question. …Also Carmen if she stops fighting the elevator.",
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
    drunk_pit: {
      start: {
        text: "Chip here — you texting the pit at this hour? Respect. Also concern.",
        choices: [
          { label: "Should I double down?", next: "dd", rapport: 2, egg: "chip_drunk_dd" },
          { label: "Is Steve real?", next: "steve", rapport: 3, egg: "chip_drunk_steve" },
          { label: "Where's Tina?", next: "tina", rapport: 2 },
        ],
      },
      dd: {
        text: "Sober answer: math. Drunk answer: do it for the story. I plead the fifth.",
        end: true,
      },
      steve: {
        text: "Steve is real. The mustache is registered as a landmark.",
        end: true,
      },
      tina: {
        text: "Tina? Somewhere between buffet and enlightenment. Same as always.",
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
    drunk_lost: {
      start: {
        text: "OMG the room is SPINNING but like emotionally. Are you spinning too??",
        choices: [
          { label: "Everything is gold", next: "gold", rapport: 2, egg: "tina_drunk_gold" },
          { label: "I see two Steves", next: "steve", rapport: 4, egg: "tina_drunk_steve" },
          { label: "Hold my hand (textually)", next: "hand", rapport: 3 },
        ],
      },
      gold: {
        text: "Gold carpet theory CONFIRMED. Follow it. Or don't. We're all lost bestie.",
        end: true,
      },
      steve: {
        text: "Two Steves means double survey energy. Run. Or hug. Adventure!",
        end: true,
      },
      hand: {
        text: "Holding your hand via SMS. Warm. Weird. Vegas.",
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
    drunk_parlay: {
      start: {
        text: (ctx) => `…You sound ${ctx.intox.categories.contraband ? "relaxed" : "hydrated"}. `
          + "Parlay therapy after hours — no judgment. Much judgment actually.",
        choices: [
          { label: "Bet the field", next: "field", rapport: 3, egg: "pete_drunk_field" },
          { label: "Same bet as last time", next: "again", rapport: 2 },
          { label: "What's a spread?", next: "spread", rapport: 4, egg: "pete_drunk_spread" },
        ],
      },
      field: {
        text: "The FIELD? Bold. Drunk bold. Line: chaos +900. Godspeed, legend.",
        end: true,
      },
      again: {
        text: "You lost that one sober. This version has 'vibes' though. Terrible vibes.",
        end: true,
      },
      spread: {
        text: "Spread is… points. Or vibes between teams. Ask sober Pete. He'll still be vague.",
        end: true,
      },
    },
  },
};

/** One-time texts when player first hits heightened intoxication. */
export const INTOX_UNLOCK_MESSAGES = {
  chip_chandler: "🥴 Floor alert: you're buzzed enough for after-hours pit texts. Don't double down because of this message.",
  barkeep_betty: "🍸 Hidden menu unlocked. You know what you did. Hydrate between texts.",
  steve_harvey: "Survey says… you're texting at volume! Drunk Feud board now on my line.",
  attorney_brief: "Counsel notes your BAC is legally theatrical. Drunk courtroom mode available. (Still not legal advice.)",
  tourist_tina: "BESTIE are you OK?? Drunk lost quest unlocked if you need me ❤️",
  pete_bookie: "Lines are closed but drunk parlay therapy isn't. God help us both.",
  host_representative: "Alexandra here — VIP typo-hotline open. I'll pretend this is intentional.",
};

/** Hidden text/call options only visible when buzzed. */
function intoxTextOptions(contactId, ctx) {
  const buzzed = { buzzed: true };
  const opts = [];

  const push = (opt) => opts.push({ ...opt, intoxHidden: true, requires: { ...buzzed, ...opt.requires } });

  if (contactId === "barkeep_betty") {
    push({ key: "drunk_menu", label: "🥴 Off-menu (shh)", reply: null, startTree: { treeId: "drunk_menu", nodeId: "start" }, rapport: 3 });
    push({ key: "drunk_pour", label: "…betty?", reply: "Yeah I'm here. Slow down, legend. Hidden menu's up if you need chaos.", rapport: 2 });
  }
  if (contactId === "steve_harvey") {
    push({ key: "drunk_survey", label: "🥴 Drunk Feud", reply: null, startTree: { treeId: "drunk_survey", nodeId: "start" }, rapport: 3 });
  }
  if (contactId === "attorney_brief") {
    push({ key: "drunk_court", label: "🥴 Drunk courtroom", reply: null, startTree: { treeId: "drunk_court", nodeId: "start" }, rapport: 4 });
    push({ key: "drunk_objection", label: "OBJECTION!!!", reply: "SUSTAINED. The bartender is overruled. Go home. …After one more text.", egg: "legal_drunk_objection_quick", rapport: 3 });
  }
  if (contactId === "chip_chandler") {
    push({ key: "drunk_pit", label: "🥴 Drunk pit hotline", reply: null, startTree: { treeId: "drunk_pit", nodeId: "start" }, rapport: 3 });
  }
  if (contactId === "tourist_tina") {
    push({ key: "drunk_lost", label: "🥴 EVERYTHING SPINS", reply: null, startTree: { treeId: "drunk_lost", nodeId: "start" }, rapport: 3 });
  }
  if (contactId === "pete_bookie") {
    push({ key: "drunk_parlay", label: "🥴 Drunk parlay therapy", reply: null, startTree: { treeId: "drunk_parlay", nodeId: "start" }, rapport: 3 });
  }
  if (contactId === "host_representative") {
    push({ key: "drunk_comp", label: "🥴 VIP typo hotline", reply: null, startTree: { treeId: "drunk_comp", nodeId: "start" }, rapport: 4 });
  }
  if (contactId === "clerk_carmen") {
    push({ key: "drunk_elevator", label: "🥴 Elevator conspiracy", reply: "Floor 14 sent me this text. It says you're not supposed to be vertical. Sit. Hydrate.", egg: "carmen_drunk_elevator", rapport: 3 });
  }
  if (contactId === "meryl_screech") {
    push({ key: "drunk_drama", label: "🥴 Stage whisper to dealer", reply: "Method ACTING at 2am? The pit boss is concerned. I'm delighted.", egg: "meryl_drunk_drama", rapport: 3 });
  }
  if (contactId === "jennifer_lawless") {
    push({ key: "drunk_trip", label: "🥴 I fell over texting", reply: "OK same energy as me on the felt. Sit. Hydrate. You're iconic.", egg: "jennifer_drunk_trip", rapport: 3 });
  }
  if (contactId === "sofia_volume") {
    push({ key: "drunk_volume", label: "🥴 TURN IT UP", reply: "¡DALE! Volume MAX! Also water. But mostly DALE!", egg: "sofia_drunk_volume", rapport: 3 });
  }
  if (contactId === "octavia_spectacular") {
    push({ key: "drunk_sweet", label: "🥴 Honey I'm fine", reply: "Sugar you're NOT fine but you're loved. Sit down.", egg: "octavia_drunk_sweet", rapport: 3 });
  }
  if (contactId === "nicole_widechart") {
    push({ key: "drunk_chart", label: "🥴 Chart says spin", reply: "Chart says: hydrate. Poise temporarily suspended.", egg: "nicole_drunk_chart", rapport: 3 });
  }
  if (contactId === "judi_bench") {
    push({ key: "drunk_bond", label: "🥴 Shaken not stirred", reply: "Bond would fold. You should too. After this text.", egg: "judi_drunk_bond", rapport: 3 });
  }
  if (contactId === "lifeguard_lou" || contactId === "beach_dj") {
    push({ key: "drunk_pool", label: "🥴 Pool confessions", reply: "No diving. No texting Harvey. Hydrate. The wave pool forgives.", rapport: 2 });
  }
  if (ctx.intox.categories.contraband > 0) {
    push({
      key: "contraband_vibes",
      label: "🌿 …vibes check",
      reply: contactId === "pete_bookie"
        ? "Off-record stays off-record. Lock of the day: Mandalay Bay still standing."
        : "Vibes: elevated. Legal status: ask Harvey. Pool status: ask Lou.",
      egg: "intox_contraband_text",
      rapport: 2,
      requires: { intoxCategory: "contraband" },
    });
  }

  return opts.filter((opt) => meetsRequirements(opt.requires, ctx));
}

/** Extra drunk call choices merged when buzzed. */
export function getIntoxCallChoices(contactId, ctx) {
  if (!ctx.isBuzzed) return [];
  const choices = [];
  if (contactId === "barkeep_betty") {
    choices.push({ label: "🥴 One more (secret)", response: "Pouring one more. Narrator: it was three more. Hydrate.", egg: "betty_drunk_call", rapport: 3 });
  }
  if (contactId === "steve_harvey") {
    choices.push({ label: "🥴 Survey says I'm invincible", response: "Survey says… INCORRECT. But charismatic. Sit down.", egg: "steve_drunk_call", rapport: 3 });
  }
  if (contactId === "attorney_brief") {
    choices.push({ label: "🥴 Drunk objection", response: "SUSTAINED. Go to bed. Case closed.", egg: "legal_drunk_call", rapport: 4 });
  }
  if (contactId === "chip_chandler") {
    choices.push({ label: "🥴 Talk me out of it", response: "I cannot. I can narrate your legend. Badly.", rapport: 3 });
  }
  return choices.filter((c) => meetsRequirements(c.requires, ctx));
}

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
    push({ key: "drama_tree", label: "🎭 Method acting desk", reply: null, startTree: { treeId: "method_acting", nodeId: "start" }, rapport: 3 });
    push({ key: "drama", label: "Table drama?", reply: band.id === "regular"
      ? "Tonight's show: 'Player vs Probability, Act III.' Standing room only."
      : "Every hand is a monologue. Some audiences boo with their wallets.", rapport: 2 });
    push({ key: "shakespeare", label: "Quote Shakespeare?", reply: "To hit, or not to hit — that is the question. Whether 'tis nobler to split eights…", requires: { minRapport: 20 }, rapport: 3 });
  }

  if (contactId === "jennifer_lawless") {
    push({ key: "relatable", label: "Relatable check-in", reply: null, startTree: { treeId: "relatable", nodeId: "start" }, rapport: 2 });
    push({ key: "trip", label: "Ever trip on felt?", reply: "Last Tuesday. Shoe survived. Ego didn't. You're fine.", egg: "jennifer_trip", rapport: 2 });
    push({ key: "vibes", label: "Table vibes?", reply: "Minimum bet, maximum vibes — that's the whole brand.", rapport: 1 });
    push({ key: "pep", label: "Pep talk?", reply: "You got this! I won't trip over your chips. Probably.", requires: { minRapport: 15 }, rapport: 3 });
  }

  if (contactId === "sofia_volume") {
    push({ key: "dale", label: "¡Dale, amigo!", reply: null, startTree: { treeId: "dale_roulette", nodeId: "start" }, rapport: 3 });
    push({ key: "roulette", label: "Roulette energy?", reply: "The wheel is HOT! Bet with your heart, lose with charisma!", egg: "sofia_roulette", rapport: 2 });
    push({ key: "volume", label: "Louder tips?", reply: band.id === "confidant"
      ? "MAXIMUM VOLUME! Steve asked me to whisper. I said SURVEY SAYS NO."
      : "Turn up the volume after a win — the pit loves confidence.", requires: { minRapport: 20 }, rapport: 2 });
  }

  if (contactId === "octavia_spectacular") {
    push({ key: "sweetheart", label: "Hey honey", reply: null, startTree: { treeId: "sweetheart", nodeId: "start" }, rapport: 2 });
    push({ key: "pep", label: "Pep talk?", reply: "Honey, you look good winning OR losing. Mostly winning. Hopefully.", rapport: 2 });
    push({ key: "game", label: "Blackjack or Hold'em?", reply: "Both tables run warm when you're polite. Sugar helps.", rapport: 1 });
    push({ key: "insider", label: "Insider charm?", reply: "Compliment the pit boss's shoes. Third Tuesday magic.", requires: { band: "insider" }, rapport: 4 });
  }

  if (contactId === "nicole_widechart") {
    push({ key: "widechart", label: "Read the chart", reply: null, startTree: { treeId: "widechart", nodeId: "start" }, rapport: 3 });
    push({ key: "whisper", label: "Chips whispering?", reply: isUp
      ? "They whisper ascent. Composure maintained. Rare."
      : isDownBad ? "They whisper caution. Regroup with poise." : "They whisper patience. Listen.", rapport: 2 });
    push({ key: "poise", label: "Poise check", reply: "Precision. Poise. Patience. The trilogy.", rapport: 1 });
    push({ key: "session", label: "Session read?", reply: `${playHours}h on property — ${isDownBad ? "corrective phase advised" : "equilibrium holding"}.`, requires: { minPlayHours: 2 }, rapport: 3 });
  }

  if (contactId === "judi_bench") {
    push({ key: "bond_tree", label: "🎬 Bond table", reply: null, startTree: { treeId: "bond_table", nodeId: "start" }, rapport: 3 });
    push({ key: "allin", label: "All in?", reply: "Only when you mean it. I fold on bad jokes and bad river cards.", rapport: 2 });
    push({ key: "tell", label: "Any tells?", reply: band.id === "insider"
      ? "You tilt after coolers. Hydrate. Also stop sighing at the river."
      : "Watch the eyes, not the hoodie. This isn't cinema.", requires: { minRapport: 25 }, rapport: 3 });
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
  const opts = [...baseTextOptions(contactId, ctx), ...intoxTextOptions(contactId, ctx)];
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
    meryl_screech: "Meryl Screech. The felt remembers. Text OSCAR or start METHOD ACTING mode.",
    judi_bench: "Judi Bench — Hold'em pit. Text BOND TABLE when you mean business.",
    jennifer_lawless: "Jennifer Lawless — relatable dealer on duty. Text me before you trip over a chair.",
    sofia_volume: "Sofia Volume 📣 ¡Dale! Roulette energy in text form. Volume optional but encouraged.",
    octavia_spectacular: "Octavia Spectacular, honey. Sweetheart line open — text PEP for sugar-coated truth.",
    nicole_widechart: "Nicole Widechart. The chips whisper; I translate. Text CHART when you're ready.",
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
    meryl_screech: {
      opening: "Meryl Screech — method dealing division. Curtain up.",
      lines: ["The pit boss is the audience. You are the protagonist. Try not to fold in Act I."],
      choices: [
        { label: "Oscar tips?", response: "Whisper to the ace. The pit hates it. The crowd loves it.", egg: "meryl_call_oscar", rapport: 2 },
        { label: "Shakespeare?", response: "To hit, or not to hit — whether 'tis nobler to split eights…", egg: null, rapport: 3 },
        { label: "Drama level?", response: playHours >= 3 ? "Act III energy. Standing room at my table." : "Act I — establish character. Tip accordingly.", egg: null, rapport: 2 },
      ],
    },
    judi_bench: {
      opening: "Judi Bench. Hold'em pit. Speak with British restraint.",
      lines: ["Bond. James Bond. Blinds."],
      choices: [
        { label: "River complaint", response: "The river giveth. Occasionally it taketh. Regroup with poise.", egg: null, rapport: 2 },
        { label: "Read my tell", response: ctx.isDownBad ? "You sigh before the turn. Hydrate." : "Patient play. I approve quietly.", egg: null, rapport: 3, requires: { minRapport: 20 } },
        { label: "All in?", response: "Only when you mean it. I fold on bad jokes.", egg: null, rapport: 2 },
      ],
    },
    jennifer_lawless: {
      opening: "Jennifer Lawless! Relatable dealer hotline — I didn't trip getting to the phone.",
      lines: ["Minimum bet, maximum vibes. How can I help?"],
      choices: [
        { label: "Pep talk", response: "You got this! I believe in you more than gravity believes in me.", egg: null, rapport: 2 },
        { label: "Hot table?", response: "Meryl's dramatic, I'm surgical — pick your adventure.", egg: null, rapport: 2 },
        { label: "Trip story", response: "I tripped on the felt Tuesday. Shoe fine. Ego bruised. You'll survive.", egg: "jennifer_call_trip", rapport: 3 },
      ],
    },
    sofia_volume: {
      opening: "¡SOFIA VOLUME! The wheel called — you answered!",
      lines: ["Dale, amigo! Place your bets with PASSION!"],
      choices: [
        { label: "Lucky number?", response: "17! Or 4! Or whatever your heart screams!", egg: "sofia_call_number", rapport: 2 },
        { label: "More volume!", response: "MAXIMUM VOLUME! Pit boss asked me to whisper. I LAUGHED.", egg: "sofia_call_volume", rapport: 3 },
      ],
    },
    octavia_spectacular: {
      opening: "Octavia Spectacular, honey. The table's warm.",
      lines: ["The house always wins — but you look good trying."],
      choices: [
        { label: "Pep talk", response: "Honey, you're a star tonight. Act like it at the cashier.", egg: null, rapport: 2 },
        { label: "Sweetheart secret", response: "Compliment pit boss shoes. Third Tuesday magic.", egg: "octavia_call_secret", rapport: 4, requires: { band: "insider" } },
      ],
    },
    nicole_widechart: {
      opening: "Nicole Widechart. The chips are whispering.",
      lines: ["Precision. Poise. Patience. Also: how may I assist?"],
      choices: [
        { label: "Chart the night", response: ctx.isUp ? "Ascending trend. Maintain composure." : "Corrective phase. Poise intact.", egg: null, rapport: 2 },
        { label: "Roulette poise", response: "Bet with elegance. Lose with dignity. Tip discreetly.", egg: null, rapport: 2 },
      ],
    },
  };

  const script = scripts[contactId];
  if (!script) return null;
  const intoxChoices = getIntoxCallChoices(contactId, ctx);
  return {
    ...script,
    choices: [...script.choices, ...intoxChoices].filter((c) => meetsRequirements(c.requires, ctx)),
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

/** Proactive texts after big session wins/losses. */
export const SESSION_SWING_WIN_THRESHOLD = 2000;
export const SESSION_SWING_LOSS_THRESHOLD = 1000;
export const SESSION_SWING_TIER_LOSS_THRESHOLD = 2500;

/** @param {import("./core.js").PlayerSession} session @param {string} activityId @param {number} net @returns {[string, string][]} */
export function getSessionSwingMessages(session, activityId, net) {
  const entries = [];
  const actLabel = activityId.replace(/_/g, " ");
  const ctx = buildDialogueContext(session, "chip_chandler");

  if (net >= SESSION_SWING_WIN_THRESHOLD) {
    entries.push(["chip_chandler", `Floor alert: +${net.toLocaleString()} at ${actLabel}. Pits are gossiping. Respect.`]);
    if (ctx.tierIdx >= 3) {
      entries.push(["host_representative", `Big win at ${actLabel} (+${net.toLocaleString()}). Comping a celebratory vibe — text COMPAINT if you want it louder.`]);
    }
    if (activityId === "roulette" || activityId === "horse_racing") {
      entries.push(["steve_harvey", "Survey says… WINNER! Top answer: MORE CHIPS. Number two: STEVE HARVEY."]);
    }
    if (activityId === "blackjack" || activityId === "holdem") {
      entries.push(["meryl_screech", `Bravo at ${actLabel}! Standing ovation from the pit — quietly, through gritted teeth.`]);
    }
    entries.push(["barkeep_betty", "Victory pour incoming — don't spend it all before you text me again."]);
  }

  if (net <= -SESSION_SWING_LOSS_THRESHOLD) {
    entries.push(["chip_chandler", `Rough ${actLabel} session (${net.toLocaleString()}). Pit weather: sympathetic. Hydrate.`]);
    entries.push(["barkeep_betty", "Sympathy pour on standby. Third one's a cutoff with love."]);
    if (ctx.tierIdx >= 2) {
      entries.push(["attorney_brief", `Counsel notes ${actLabel} damages of ${Math.abs(net).toLocaleString()} chips. Objection emotionally sustained.`]);
    }
    if (net <= -SESSION_SWING_TIER_LOSS_THRESHOLD && ctx.tierIdx >= 4) {
      entries.push(["host_representative", `${ctx.tier.label} tier and a rough beat — escalating to 'gentle comp' energy. Hydrate before revenge betting.`]);
      entries.push(["chip_chandler", `${ctx.tier.label} member down bad — floor staff pretend not to stare. They are staring.`]);
    }
  }

  return entries;
}

/** @param {string} tierId */
export function getTierRankUpMessages(tierId) {
  const messages = TIER_RANKUP_MESSAGES[tierId];
  return messages ? Object.entries(messages) : [];
}
