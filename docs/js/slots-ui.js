/** Per-machine theme and playstyle metadata for browser slot cabinets. */

export const MACHINE_UI = {
  fortune: {
    themeClass: "slot-theme-classic-gold",
    category: "Classic",
    playstyle: "Three-reel floor favorite",
    badge: "Classic",
    icon: "🎰",
    reelFrame: "mechanical",
  },
  high_roller: {
    themeClass: "slot-theme-high-limit",
    category: "High Limit",
    playstyle: "Premium high-limit reels",
    badge: "High Limit",
    icon: "💰",
    reelFrame: "mechanical",
  },
  megabucks: {
    themeClass: "slot-theme-megabucks",
    category: "Progressive",
    playstyle: "Wide-area linked jackpot",
    badge: "Megabucks",
    icon: "💵",
    reelFrame: "progressive",
  },
  wheel_of_fortune: {
    themeClass: "slot-theme-wheel",
    category: "Video",
    playstyle: "Wheel bonus video slot",
    badge: "Wheel Bonus",
    icon: "🎡",
    reelFrame: "video",
  },
  blazin_7s: {
    themeClass: "slot-theme-blazin",
    category: "Classic",
    playstyle: "Flaming sevens line pays",
    badge: "Blazin' 7s",
    icon: "🔥",
    reelFrame: "mechanical",
  },
  buffalo_gold: {
    themeClass: "slot-theme-buffalo",
    category: "Video",
    playstyle: "Stampede gold-coin bonus",
    badge: "Gold Series",
    icon: "🦬",
    reelFrame: "video",
  },
  monte_carlo: {
    themeClass: "slot-theme-monte-carlo",
    category: "Progressive",
    playstyle: "European linked progressive",
    badge: "Linked",
    icon: "👑",
    reelFrame: "progressive",
  },
  super_spin: {
    themeClass: "slot-theme-super-spin",
    category: "Progressive",
    playstyle: "Star-linked super spin",
    badge: "Super Spin",
    icon: "⭐",
    reelFrame: "progressive",
  },
  triple_red_hot_7s: {
    themeClass: "slot-theme-red-hot",
    category: "Classic",
    playstyle: "Red-hot triple sevens",
    badge: "Red Hot",
    icon: "7️⃣",
    reelFrame: "mechanical",
  },
  double_jackpot: {
    themeClass: "slot-theme-double-jp",
    category: "Video",
    playstyle: "Two-tier jackpot chase",
    badge: "Double JP",
    icon: "JP",
    reelFrame: "video",
  },
  spooky_link: {
    themeClass: "slot-theme-spooky",
    category: "Themed",
    playstyle: "Mo Mummy · Yo Yeti · Go Ghost",
    badge: "Spooky Link",
    icon: "👻",
    reelFrame: "themed",
  },
  wizard_of_oz: {
    themeClass: "slot-theme-oz",
    category: "Themed",
    playstyle: "Hold & Spin yellow-brick road",
    badge: "Oz Bonus",
    icon: "👠",
    reelFrame: "themed",
  },
  emerald_guardian: {
    themeClass: "slot-theme-emerald",
    category: "Themed",
    playstyle: "Defend the emerald vault",
    badge: "Guardian",
    icon: "🐉",
    reelFrame: "themed",
  },
  tiger_and_dragon: {
    themeClass: "slot-theme-tiger-dragon",
    category: "Themed",
    playstyle: "East-meets-West super bonus",
    badge: "Super Bonus",
    icon: "🐯",
    reelFrame: "themed",
  },
};

export const SLOT_CATEGORIES = [
  { id: "Classic", label: "Classic & Reel Slots" },
  { id: "High Limit", label: "High Limit Room" },
  { id: "Progressive", label: "Legendary Progressives" },
  { id: "Video", label: "Video Slots" },
  { id: "Themed", label: "Themed Adventures" },
];

const DEFAULT_UI = {
  themeClass: "slot-theme-classic-gold",
  category: "Classic",
  playstyle: "Three-reel slot",
  badge: "Slots",
  icon: "🎰",
  reelFrame: "mechanical",
};

export function getMachineUI(machine) {
  return MACHINE_UI[machine.id] ?? DEFAULT_UI;
}

export function paytableEntries(machine) {
  const entries = Object.entries(machine.paytable).sort((a, b) => b[1] - a[1]);
  const rows = entries.map(([key, mult]) => {
    const bits = key.split("|");
    let label;
    if (bits.length === 3 && bits[0] === bits[1] && bits[1] === bits[2]) {
      const sym = machine.symbols.find((s) => s.name === bits[0]);
      label = sym ? `${sym.display} × 3` : `${bits[0]} × 3`;
    } else if (bits.length === 2) {
      const sym = machine.symbols.find((s) => s.name === bits[0]);
      label = sym ? `${sym.display} × 2` : `${bits[0]} × 2`;
    } else {
      const sym = machine.symbols.find((s) => s.name === key);
      label = sym ? `${sym.display} (1st reel)` : `${key} (1st)`;
    }
    return { label, mult, key };
  });
  if (machine.progressive && machine.jackpotKey) {
    const symName = machine.jackpotKey.split("|")[0];
    const sym = machine.symbols.find((s) => s.name === symName);
    const req = machine.jackpotRequiresMaxBet ? "max bet" : "any bet";
    rows.unshift({
      label: sym ? `${sym.display} × 3` : `${symName} × 3`,
      mult: "JACKPOT",
      key: machine.jackpotKey,
      progressive: true,
      note: req,
    });
  }
  return rows;
}
