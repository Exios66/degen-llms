export const NPCS = {
  concierge: {
    id: "concierge",
    name: "Concierge",
    location: "main_lobby",
    startNode: "concierge_greeting",
  },
  event_coordinator: {
    id: "event_coordinator",
    name: "Event Coordinator",
    location: "convention_center",
    startNode: "coordinator_greeting",
  },
  pit_boss: {
    id: "pit_boss",
    name: "Pit Boss",
    location: "casino_floor",
    startNode: "pit_boss_greeting",
    encounter: "blackjack",
  },
  lifeguard: {
    id: "lifeguard",
    name: "Lifeguard",
    location: "mandalay_beach",
    startNode: "lifeguard_greeting",
  },
  host: {
    id: "host",
    name: "Host",
    location: "high_limit_salon",
    startNode: "host_greeting",
  },
};

export const DIALOGUES = {
  concierge_greeting: {
    speaker: "Concierge",
    text: "Welcome to Mandalay Bay. How may I assist you today?",
    choices: [
      { label: "Where is the casino floor?", next: "concierge_casino_dir" },
      { label: "Any events today?", next: "concierge_events", setFlag: "asked_events" },
      { label: "Goodbye.", end: true },
    ],
  },
  concierge_casino_dir: {
    speaker: "Concierge",
    text: "Head south from the lobby to the Casino Floor. You'll hear the slots before you see the tables.",
    choices: [
      { label: "Thanks.", end: true },
    ],
  },
  concierge_events: {
    speaker: "Concierge",
    text: "There's a tech expo in the Convention Center and a show at the Michelob ULTRA Arena tonight.",
    choices: [
      { label: "Interesting. Goodbye.", end: true },
    ],
  },
  coordinator_greeting: {
    speaker: "Event Coordinator",
    text: null,
    dynamicText(session) {
      if (session.rpgData?.flags?.asked_events) {
        return "You're the guest who asked the concierge about events! The expo keynote starts in an hour.";
      }
      return "Welcome to the Convention Center. Exhibitor badges are at registration — just down in the Main Lobby.";
    },
    choices: [
      { label: "Where is registration?", next: "coordinator_registration" },
      { label: "See you later.", end: true },
    ],
  },
  coordinator_registration: {
    speaker: "Event Coordinator",
    text: "Registration is in the Main Lobby. You can't miss the front desk.",
    choices: [
      { label: "Got it.", end: true },
    ],
  },
  pit_boss_greeting: {
    speaker: "Pit Boss",
    text: "Evening. We've got a solo table open — minimum ten chips. Feeling lucky?",
    choices: [
      { label: "Deal me in.", encounter: "blackjack" },
      { label: "Just browsing.", next: "pit_boss_browse" },
      { label: "Not tonight.", end: true },
    ],
  },
  pit_boss_browse: {
    speaker: "Pit Boss",
    text: "Take your time. The table's here when you're ready.",
    choices: [
      { label: "Actually, deal me in.", encounter: "blackjack" },
      { label: "Thanks.", end: true },
    ],
  },
  lifeguard_greeting: {
    speaker: "Lifeguard",
    text: "Stay hydrated out here. The lazy river's calm today if you want to float.",
    choices: [
      { label: "What about Shark Reef?", next: "lifeguard_shark" },
      { label: "Thanks for the tip.", end: true },
    ],
  },
  lifeguard_shark: {
    speaker: "Lifeguard",
    text: "Shark Reef's on the east side of the property — great for families. Touch Pool is just beyond it.",
    choices: [
      { label: "Good to know.", end: true },
    ],
  },
  host_greeting: {
    speaker: "Host",
    text: "Welcome to the High Limit Salon. We cater to guests who appreciate discretion and higher stakes.",
    choices: [
      { label: "Impressive.", next: "host_flavor" },
      { label: "I'll pass for now.", end: true },
    ],
  },
  host_flavor: {
    speaker: "Host",
    text: "The arena and House of Blues are just south if you're looking for entertainment after the tables.",
    choices: [
      { label: "Thanks.", end: true },
    ],
  },
};

export function getNpcsAtLocation(locationId) {
  return Object.values(NPCS).filter((npc) => npc.location === locationId);
}

export function getDialogueNode(nodeId) {
  return DIALOGUES[nodeId] ?? null;
}
