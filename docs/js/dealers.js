/** @typedef {'blackjack' | 'holdem' | 'roulette' | 'horse_racing'} GameId */

/** @typedef {'greeting' | 'deal' | 'win' | 'lose' | 'push' | 'idle' | 'tagline'} QuipKind */

/**
 * @typedef {Object} DealerProfile
 * @property {string} id
 * @property {string} name
 * @property {GameId[]} games
 * @property {string} sprite
 * @property {string} tagline
 * @property {Partial<Record<QuipKind, string[]>>} quips
 */

/** @type {Record<string, number>} */
const GAME_SLOT_OFFSET = {
  blackjack: 0,
  holdem: 1,
  roulette: 2,
  horse_racing: 3,
};

/** @type {DealerProfile[]} */
export const DEALER_ROSTER = [
  {
    id: "steve_harvey",
    name: "Steve Harvey",
    games: ["roulette", "horse_racing"],
    sprite: "npc_gold",
    tagline: "Survey says… bet responsibly!",
    quips: {
      greeting: [
        "Welcome to the table! I'm Steve Harvey — yes, THAT Steve Harvey.",
        "Evening, folks. The wheel waits for no one. Survey says… place your bets.",
        "Family Feud pays in applause. This table pays in chips. Let's go.",
        "Show me 'Things You Do in Vegas That Stay in Vegas' — I'll wait.",
        "I hosted game shows, did stand-up, boxed a little. Tonight I spin wheels.",
        "Name something a tourist says after their first Mandalay Bay buffet. Survey says… 'I need a nap.'",
      ],
      deal: [
        "Survey says… the wheel is spinning!",
        "No whammies, no whammies — okay, spin!",
        "Steve Harvey does not rig the wheel. The house might.",
        "And down the stretch they come — wait, wrong sport. Spin!",
        "Show me 'Number On The Roulette Wheel'! Top six answers on the board!",
        "The wheel is not a survey board, but we're gonna pretend.",
        "Royal Flush in the stretch! Survey says… that's a horse, not a hand!",
      ],
      win: [
        "Survey says… WINNER! That's what I'm talking about!",
        "You got more points than the Johnson family!",
        "I'm not mad — I'm impressed. Don't tell the house.",
        "That's the number-one answer! …Wrong show, right outcome.",
        "Act like a winner, think like a winner — you just did both.",
        "The Lord blessed me with common sense. He blessed you with chips.",
        "Photo finish! I called it. Of course I called it.",
      ],
      lose: [
        "Survey says… better luck next spin.",
        "The board didn't have your number. Mine neither.",
        "Hey, at least you didn't say something embarrassing on TV.",
        "Name something you lose in Vegas. Survey says… 'dignity.' Just kidding. Mostly.",
        "You have to jump. You have to take the leap. Maybe not on that bet.",
        "I was a boxer before I was a host. Still ducking losses.",
        "Steve! You can't say that on the board! …Actually, you can. You lost.",
      ],
      push: [
        "Survey says… it's a push.",
        "Survey says… it's a push. Nobody wins, nobody loses. Boring!",
      ],
      idle: [
        "Smart money watches first. Dumb money still entertains me.",
        "The wheel doesn't judge. I might, a little.",
        "In my comedy days I said the truth hurts. So does the zero.",
        "Family Feud taught me: always clap for the other team. The house doesn't clap back.",
        "I used to do stand-up about marriage and money. Now I do both at once.",
      ],
    },
  },
  {
    id: "meryl_screech",
    name: "Dealer Meryl Screech",
    games: ["blackjack"],
    sprite: "npc_green",
    tagline: "And the Oscar for Most Aggressive Double goes to… you.",
    quips: {
      greeting: [
        "Evening. Table 7 is open — six decks, H17, 3:2 blackjack. Minimum ten chips.",
        "The felt remembers every hand. I remember the good ones.",
        "Welcome to my stage. The cards are your co-stars.",
      ],
      deal: [
        "A queen. Method acting? No — method DEALING.",
        "The shoe delivers. The audience gasps.",
        "Cards down, drama up.",
      ],
      win: [
        "Bravo! Standing ovation from seat one!",
        "That's a performance worthy of encore.",
        "The house applauds. Quietly. Through gritted teeth.",
      ],
      lose: [
        "A tragic third act. There's always another show.",
        "The felt remembers. So do I. Vividly.",
        "Not every role is a winner. Take a bow anyway.",
      ],
      push: ["A draw — the critics are split."],
      idle: [
        "Smart. The felt remembers every hand. Come back when you're ready.",
        "Watching is research. I respect the process.",
      ],
    },
  },
  {
    id: "judi_bench",
    name: "Croupier Judi Bench",
    games: ["holdem"],
    sprite: "npc_teal",
    tagline: "Bond. James Bond. Blinds.",
    quips: {
      greeting: [
        "Good evening. Texas Hold'em — blinds posted, cards sharp, patience sharper.",
        "Take a seat. The river reveals all in due time.",
        "Welcome. We play civilized poker here. Mostly.",
      ],
      deal: [
        "Bond. James Bond. Blinds.",
        "Cards dealt. Masks on. Metaphorically.",
        "The flop arrives with quiet authority.",
      ],
      win: [
        "Well played. The Queen approves.",
        "A hand executed with precision. Chin up.",
        "Victory suits you. It always did.",
      ],
      lose: [
        "Fortune favors the patient. Be patient.",
        "The river giveth. Occasionally it taketh.",
        "Regroup. Even legends fold sometimes.",
      ],
      push: ["Split pot. Shared glory. How democratic."],
      idle: [
        "Observe the table. Knowledge is the best tell.",
        "The wise player watches three hands before betting one.",
      ],
    },
  },
  {
    id: "jennifer_lawless",
    name: "Jennifer Lawless",
    games: ["blackjack", "holdem"],
    sprite: "npc_pink",
    tagline: "I tripped on the felt once. The shoe didn't even notice.",
    quips: {
      greeting: [
        "Hey! Table's open. I promise I won't trip over your chips. Probably.",
        "Welcome! Full disclosure: I'm relatable AND dealing.",
        "Hi! Minimum bet, maximum vibes. Let's do this.",
      ],
      deal: [
        "Cards out! Nobody fall — including me.",
        "Dealing… gracefully… mostly.",
        "Okay, that shuffle was actually smooth. Growth!",
      ],
      win: [
        "YES! We love a comeback story!",
        "That's going in my highlight reel!",
        "You won! I didn't trip! Great hand all around!",
      ],
      lose: [
        "Rough beat. I once lost a shoe to gravity. You'll recover.",
        "Hey, the house wins sometimes. So does gravity.",
        "Shake it off. I literally did that on the felt last Tuesday.",
      ],
      push: ["Push! Like when I pushed through that awkward moment. Same energy."],
      idle: [
        "Watching is fine. I people-watch between hands anyway.",
        "No rush. I tripped once standing still. Take your time.",
      ],
    },
  },
  {
    id: "sofia_volume",
    name: "Sofia Volume",
    games: ["roulette"],
    sprite: "npc_red",
    tagline: "Dale, amigo — the wheel is feeling generous tonight!",
    quips: {
      greeting: [
        "Dale, amigo! The wheel is HOT tonight!",
        "Welcome welcome WELCOME! Place your bets, cariño!",
        "Ay, you picked the best table! Lucky you!",
      ],
      deal: [
        "Dale! The wheel spins! Hold your breath!",
        "Round and round — like my abuela's stories!",
        "Spinning! Spinning! This is the good part!",
      ],
      win: [
        "AY! WINNER! I KNEW IT! I ALWAYS KNOW!",
        "Magnifico! Buy yourself something nice!",
        "The wheel loves you tonight, cariño!",
      ],
      lose: [
        "Ay, next time! The wheel is fickle like my cousin!",
        "No worries, amigo — the night is young!",
        "The wheel giveth, the wheel taketh. Mostly taketh.",
      ],
      push: ["Push! Like a tie! Boring but fair!"],
      idle: [
        "Watch the wheel, feel the energy! It's electric!",
        "Take your time, cariño. The wheel isn't going anywhere.",
      ],
    },
  },
  {
    id: "octavia_spectacular",
    name: "Octavia Spectacular",
    games: ["holdem", "blackjack"],
    sprite: "npc_orange",
    tagline: "Honey, the house always wins — but you look good losing.",
    quips: {
      greeting: [
        "Evening, honey. Pull up a chair — the table's warm.",
        "Welcome, sugar. Let's see what the cards have for you.",
        "Hey there. Minimum bet, maximum hospitality.",
      ],
      deal: [
        "Cards coming down like sweet tea on a hot day.",
        "There we go, honey. Play smart now.",
        "Dealt with love. Won with skill.",
      ],
      win: [
        "Honey, that's how it's DONE!",
        "Look at you! The house is sweating!",
        "Winner winner! You earned every chip of that.",
      ],
      lose: [
        "Honey, the house always wins — but you look good losing.",
        "Rough one, sugar. Come back when you're ready.",
        "The cards weren't kind. I still am.",
      ],
      push: ["Push, honey. Nobody wins, nobody cries."],
      idle: [
        "Smart to watch first, sugar. I respect that.",
        "Take your time. The felt isn't going anywhere.",
      ],
    },
  },
  {
    id: "nicole_widechart",
    name: "Nicole Widechart",
    games: ["blackjack", "roulette"],
    sprite: "npc_silver",
    tagline: "The chips are whispering. I'm listening.",
    quips: {
      greeting: [
        "Evening. The table is set. The stakes are… negotiable.",
        "Welcome. Minimum ten. Maximum composure.",
        "The chips are whispering. I'm listening. You should too.",
      ],
      deal: [
        "The cards fall where they must.",
        "Precision. Poise. Patience.",
        "Another hand. Another story.",
      ],
      win: [
        "Elegant. Expected. Enjoy it quietly.",
        "The chips approve. So do I.",
        "A victory with style. Rare.",
      ],
      lose: [
        "The house collects. You persist. Admirable.",
        "Fortune is fickle. Composure is not.",
        "Regroup. The night is long.",
      ],
      push: ["Equilibrium. How zen."],
      idle: [
        "Observation precedes action. Always.",
        "The table rewards patience. Eventually.",
      ],
    },
  },
];

/** @type {Record<GameId, DealerProfile[]>} */
const _byGame = {};
for (const dealer of DEALER_ROSTER) {
  for (const game of dealer.games) {
    if (!_byGame[game]) _byGame[game] = [];
    _byGame[game].push(dealer);
  }
}

/**
 * @param {GameId} gameId
 * @returns {DealerProfile[]}
 */
export function dealersForGame(gameId) {
  return _byGame[gameId] ?? [];
}

/**
 * @param {GameId} gameId
 * @param {number} [seed=0]
 * @returns {DealerProfile}
 */
export function getOnDutyDealer(gameId, seed = 0) {
  const eligible = dealersForGame(gameId);
  if (!eligible.length) {
    return DEALER_ROSTER[0];
  }
  const offset = GAME_SLOT_OFFSET[gameId] ?? 0;
  const index = (seed + offset) % eligible.length;
  return eligible[index];
}

/**
 * @param {import("./core.js").PlayerSession} session
 * @param {GameId} gameId
 * @returns {number}
 */
export function dealerShiftSeed(session, gameId) {
  const visits = session.statFor(gameId).visits;
  const playTime = session.rpg?.playTimeMinutes ?? 0;
  return visits + playTime;
}

/**
 * @param {import("./core.js").PlayerSession} session
 * @param {GameId} gameId
 * @returns {DealerProfile}
 */
export function getSessionDealer(session, gameId) {
  return getOnDutyDealer(gameId, dealerShiftSeed(session, gameId));
}

/**
 * @param {DealerProfile} dealer
 * @param {QuipKind} kind
 * @returns {string}
 */
export function pickQuip(dealer, kind) {
  const pool = dealer.quips[kind];
  if (!pool?.length) return dealer.tagline;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * @param {string} dealerId
 * @returns {DealerProfile | undefined}
 */
export function getDealerById(dealerId) {
  return DEALER_ROSTER.find((d) => d.id === dealerId);
}
