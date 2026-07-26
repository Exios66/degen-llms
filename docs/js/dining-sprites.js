/**
 * First-person dining sprites — high-px shaded SVG plates, glasses, and FPV stage.
 * Used by DiningOverlay for the eating-POV simulator.
 */

/** @typedef {"food" | "drink" | "extra"} MenuKind */

/**
 * @typedef {{
 *   id: string,
 *   kind: MenuKind,
 *   plateLabel: string,
 *   svg: string,
 * }} DiningSprite
 */

const SVG_NS_ATTR = 'xmlns="http://www.w3.org/2000/svg"';
let _spriteUid = 0;

function svgShell(viewBox, body, opts = {}) {
  const w = opts.w ?? 320;
  const h = opts.h ?? 240;
  return `<svg ${SVG_NS_ATTR} viewBox="${viewBox}" width="${w}" height="${h}" role="img" aria-hidden="true" class="dining-sprite-svg">${body}</svg>`;
}

function foodDefs(uid) {
  return `<defs>
    <radialGradient id="ps-${uid}" cx="38%" cy="32%" r="68%">
      <stop offset="0%" stop-color="#fff8ee"/><stop offset="55%" stop-color="#e8d4b8"/><stop offset="100%" stop-color="#b89a72"/>
    </radialGradient>
    <radialGradient id="ms-${uid}" cx="40%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#c45a3a"/><stop offset="45%" stop-color="#8b2e1f"/><stop offset="100%" stop-color="#3a120c"/>
    </radialGradient>
    <linearGradient id="fm-${uid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f2d6b8" stop-opacity="0.85"/><stop offset="100%" stop-color="#f2d6b8" stop-opacity="0.15"/>
    </linearGradient>
    <filter id="ss-${uid}" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#1a0c08" flood-opacity="0.45"/>
    </filter>
    <filter id="cr-${uid}" x="-5%" y="-5%" width="110%" height="110%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="0.4" result="b"/>
      <feOffset dy="1" result="o"/>
      <feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>`;
}

function drinkDefs(uid) {
  return `<defs>
    <linearGradient id="ge-${uid}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.55"/><stop offset="35%" stop-color="#fff" stop-opacity="0.08"/>
      <stop offset="70%" stop-color="#fff" stop-opacity="0.2"/><stop offset="100%" stop-color="#fff" stop-opacity="0.45"/>
    </linearGradient>
    <linearGradient id="wb-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#6b1028"/><stop offset="55%" stop-color="#3a0614"/><stop offset="100%" stop-color="#1a0208"/>
    </linearGradient>
    <linearGradient id="cb-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f7e7a3"/><stop offset="50%" stop-color="#e0c56a"/><stop offset="100%" stop-color="#b8963a"/>
    </linearGradient>
    <linearGradient id="mb-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#c8f0a8"/><stop offset="60%" stop-color="#7cb85a"/><stop offset="100%" stop-color="#3d6b2e"/>
    </linearGradient>
    <linearGradient id="ob-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#c47832"/><stop offset="55%" stop-color="#8a4a18"/><stop offset="100%" stop-color="#3e200c"/>
    </linearGradient>
    <linearGradient id="mt-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e8f0e4" stop-opacity="0.9"/><stop offset="100%" stop-color="#a8b8a0" stop-opacity="0.75"/>
    </linearGradient>
    <filter id="gs-${uid}" x="-25%" y="-15%" width="150%" height="140%">
      <feDropShadow dx="2" dy="6" stdDeviation="5" flood-color="#0a0604" flood-opacity="0.5"/>
    </filter>
  </defs>`;
}

function plateBase(uid) {
  return `
    <ellipse cx="160" cy="198" rx="132" ry="28" fill="#1a100c" opacity="0.35"/>
    <ellipse cx="160" cy="175" rx="128" ry="48" fill="url(#ps-${uid})" filter="url(#ss-${uid})"/>
    <ellipse cx="160" cy="172" rx="108" ry="38" fill="#f7efe2"/>
    <ellipse cx="160" cy="170" rx="98" ry="32" fill="#fffaf2"/>
    <ellipse cx="118" cy="152" rx="36" ry="14" fill="#ffffff" opacity="0.35"/>`;
}

/** @type {Record<string, (uid: number) => { kind: MenuKind, plateLabel: string, svg: string }>} */
const SPRITE_BUILDERS = {
  aur_amuse: (uid) => ({
    kind: "food",
    plateLabel: "Amuse flight",
    svg: svgShell("0 0 320 240", `${foodDefs(uid)}${plateBase(uid)}
      <g filter="url(#cr-${uid})">
        <ellipse cx="110" cy="155" rx="22" ry="14" fill="#2d5a3a"/>
        <ellipse cx="110" cy="152" rx="16" ry="9" fill="#f5e6c8"/>
        <circle cx="106" cy="150" r="3" fill="#c45c26"/>
        <ellipse cx="160" cy="148" rx="20" ry="12" fill="#8b1e3f"/>
        <ellipse cx="160" cy="145" rx="14" ry="8" fill="#f0d090"/>
        <ellipse cx="210" cy="156" rx="22" ry="13" fill="#1a3a4a"/>
        <ellipse cx="210" cy="153" rx="15" ry="8" fill="#e8c8a0"/>
        <circle cx="214" cy="151" r="2.5" fill="#d4a84b"/>
      </g>`),
  }),
  aur_tasting: (uid) => ({
    kind: "food",
    plateLabel: "Tasting courses",
    svg: svgShell("0 0 320 240", `${foodDefs(uid)}${plateBase(uid)}
      <g filter="url(#cr-${uid})">
        <path d="M95 155 Q160 120 225 155 Q160 185 95 155" fill="url(#ms-${uid})"/>
        <ellipse cx="130" cy="150" rx="18" ry="10" fill="#6b8f3a"/>
        <ellipse cx="190" cy="152" rx="16" ry="9" fill="#c47832"/>
        <ellipse cx="160" cy="142" rx="22" ry="8" fill="#f5e6c8" opacity="0.9"/>
        <path d="M120 160 Q160 145 200 158" stroke="url(#fm-${uid})" stroke-width="3" fill="none"/>
      </g>`),
  }),
  aur_steak: (uid) => ({
    kind: "food",
    plateLabel: "Dry-aged ribeye",
    svg: svgShell("0 0 320 240", `${foodDefs(uid)}${plateBase(uid)}
      <g filter="url(#cr-${uid})">
        <ellipse cx="160" cy="170" rx="78" ry="22" fill="#1a0c08" opacity="0.3"/>
        <path d="M85 155 C100 120 140 110 175 118 C210 126 240 145 235 165 C230 185 190 195 150 190 C110 185 75 175 85 155Z" fill="url(#ms-${uid})"/>
        <path d="M110 145 Q145 135 180 148 Q210 158 200 170" stroke="url(#fm-${uid})" stroke-width="4" fill="none" stroke-linecap="round"/>
        <ellipse cx="210" cy="155" rx="28" ry="16" fill="#3d5c28"/>
        <ellipse cx="212" cy="152" rx="20" ry="10" fill="#6b8f3a"/>
        <ellipse cx="100" cy="168" rx="14" ry="8" fill="#c45c26" opacity="0.85"/>
        <ellipse cx="145" cy="130" rx="22" ry="8" fill="#ffffff" opacity="0.12"/>
      </g>`),
  }),
  aur_tower_pour: (uid) => ({
    kind: "drink",
    plateLabel: "Cabernet",
    svg: svgShell("0 0 200 280", `${drinkDefs(uid)}
      <ellipse cx="100" cy="262" rx="36" ry="8" fill="#0a0604" opacity="0.4"/>
      <g filter="url(#gs-${uid})">
        <path d="M70 40 L130 40 L122 150 Q100 175 78 150 Z" fill="url(#ge-${uid})" opacity="0.35"/>
        <path d="M78 55 L122 55 L116 145 Q100 165 84 145 Z" fill="url(#wb-${uid})"/>
        <ellipse cx="100" cy="55" rx="22" ry="5" fill="#8b1e3f"/>
        <ellipse cx="100" cy="52" rx="18" ry="3" fill="#c45a6a" opacity="0.35"/>
        <rect x="96" y="165" width="8" height="70" rx="2" fill="#d8e8f0" opacity="0.55"/>
        <ellipse cx="100" cy="245" rx="28" ry="7" fill="#d8e8f0" opacity="0.5"/>
      </g>`, { w: 200, h: 280 }),
  }),
  aur_champagne: (uid) => ({
    kind: "drink",
    plateLabel: "Krug glass",
    svg: svgShell("0 0 200 280", `${drinkDefs(uid)}
      <ellipse cx="100" cy="262" rx="30" ry="7" fill="#0a0604" opacity="0.35"/>
      <g filter="url(#gs-${uid})">
        <path d="M85 30 L115 30 L108 160 Q100 175 92 160 Z" fill="url(#ge-${uid})" opacity="0.4"/>
        <path d="M90 45 L110 45 L105 155 Q100 168 95 155 Z" fill="url(#cb-${uid})"/>
        <ellipse cx="100" cy="45" rx="10" ry="3" fill="#f7e7a3"/>
        <circle cx="96" cy="70" r="1.5" fill="#fff" opacity="0.7"/>
        <circle cx="102" cy="90" r="1.2" fill="#fff" opacity="0.6"/>
        <circle cx="98" cy="115" r="1.4" fill="#fff" opacity="0.55"/>
        <rect x="97" y="168" width="6" height="72" rx="2" fill="#d8e8f0" opacity="0.55"/>
        <ellipse cx="100" cy="248" rx="22" ry="6" fill="#d8e8f0" opacity="0.5"/>
      </g>`, { w: 200, h: 280 }),
  }),
  aur_dessert: (uid) => ({
    kind: "extra",
    plateLabel: "Chocolate sphere",
    svg: svgShell("0 0 320 240", `${foodDefs(uid)}${plateBase(uid)}
      <g filter="url(#cr-${uid})">
        <circle cx="160" cy="140" r="48" fill="#3a1a10"/>
        <circle cx="160" cy="140" r="42" fill="#5c2a18"/>
        <circle cx="145" cy="125" r="14" fill="#8b4a28" opacity="0.55"/>
        <ellipse cx="160" cy="175" rx="55" ry="10" fill="#c45c26" opacity="0.55"/>
        <path d="M120 165 Q160 185 200 160" stroke="#e07830" stroke-width="3" fill="none" opacity="0.7"/>
      </g>`),
  }),
  bg_guacamole: (uid) => ({
    kind: "food",
    plateLabel: "Guacamole",
    svg: svgShell("0 0 320 240", `${foodDefs(uid)}${plateBase(uid)}
      <g filter="url(#cr-${uid})">
        <ellipse cx="155" cy="160" rx="55" ry="28" fill="#3d5c1a"/>
        <ellipse cx="155" cy="155" rx="48" ry="22" fill="#6b9a32"/>
        <ellipse cx="145" cy="148" rx="20" ry="10" fill="#8fc04a" opacity="0.7"/>
        <circle cx="160" cy="152" r="4" fill="#f5f0e0"/>
        <circle cx="175" cy="160" r="3" fill="#c45c26"/>
        <ellipse cx="220" cy="165" rx="28" ry="18" fill="#e8c878"/>
        <path d="M205 165 L235 155 M205 170 L235 168 M208 175 L232 178" stroke="#d4a84b" stroke-width="3"/>
      </g>`),
  }),
  bg_ceviche: (uid) => ({
    kind: "food",
    plateLabel: "Ceviche trio",
    svg: svgShell("0 0 320 240", `${foodDefs(uid)}${plateBase(uid)}
      <g filter="url(#cr-${uid})">
        <ellipse cx="115" cy="155" rx="32" ry="20" fill="#f0f4f0"/>
        <ellipse cx="115" cy="152" rx="26" ry="14" fill="#c8e8d0"/>
        <ellipse cx="160" cy="148" rx="30" ry="18" fill="#f8f0e0"/>
        <ellipse cx="160" cy="145" rx="24" ry="12" fill="#f0d090"/>
        <ellipse cx="205" cy="156" rx="30" ry="18" fill="#e8f0f8"/>
        <ellipse cx="205" cy="153" rx="24" ry="12" fill="#a8d0e0"/>
      </g>`),
  }),
  bg_brunch: (uid) => ({
    kind: "food",
    plateLabel: "Brunch feast",
    svg: svgShell("0 0 320 240", `${foodDefs(uid)}${plateBase(uid)}
      <g filter="url(#cr-${uid})">
        <ellipse cx="130" cy="155" rx="40" ry="22" fill="#e8c878"/>
        <ellipse cx="130" cy="150" rx="32" ry="14" fill="#f5e6a0"/>
        <ellipse cx="190" cy="148" rx="36" ry="20" fill="#c45c26"/>
        <ellipse cx="190" cy="144" rx="28" ry="12" fill="#e07840"/>
        <ellipse cx="160" cy="170" rx="50" ry="14" fill="#6b8f3a"/>
        <circle cx="145" cy="145" r="8" fill="#fff8e8"/>
      </g>`),
  }),
  bg_enchiladas: (uid) => ({
    kind: "food",
    plateLabel: "Enchiladas",
    svg: svgShell("0 0 320 240", `${foodDefs(uid)}${plateBase(uid)}
      <g filter="url(#cr-${uid})">
        <rect x="95" y="140" width="130" height="40" rx="18" fill="#c45c26"/>
        <rect x="100" y="145" width="120" height="30" rx="14" fill="#e07840"/>
        <ellipse cx="130" cy="155" rx="18" ry="10" fill="#f5e6c8" opacity="0.85"/>
        <ellipse cx="170" cy="158" rx="16" ry="9" fill="#f5e6c8" opacity="0.75"/>
        <ellipse cx="200" cy="154" rx="14" ry="8" fill="#6b8f3a"/>
      </g>`),
  }),
  bg_margarita: (uid) => ({
    kind: "drink",
    plateLabel: "Margarita",
    svg: svgShell("0 0 200 280", `${drinkDefs(uid)}
      <ellipse cx="100" cy="262" rx="34" ry="8" fill="#0a0604" opacity="0.4"/>
      <g filter="url(#gs-${uid})">
        <path d="M55 70 L145 70 L115 165 Q100 180 85 165 Z" fill="url(#ge-${uid})" opacity="0.35"/>
        <path d="M65 85 L135 85 L110 160 Q100 172 90 160 Z" fill="url(#mb-${uid})"/>
        <ellipse cx="100" cy="85" rx="35" ry="6" fill="#e8f8d0"/>
        <circle cx="118" cy="78" r="10" fill="#d4a84b"/>
        <path d="M118 68 L118 55 M112 62 L124 62" stroke="#3d5c1a" stroke-width="2"/>
        <rect x="96" y="172" width="8" height="60" rx="2" fill="#d8e8f0" opacity="0.5"/>
        <ellipse cx="100" cy="240" rx="26" ry="7" fill="#d8e8f0" opacity="0.5"/>
      </g>`, { w: 200, h: 280 }),
  }),
  bg_mezcal: (uid) => ({
    kind: "drink",
    plateLabel: "Mezcal flight",
    svg: svgShell("0 0 280 240", `${drinkDefs(uid)}
      <g filter="url(#gs-${uid})">
        ${[70, 140, 210].map((x, i) => `
          <ellipse cx="${x}" cy="210" rx="18" ry="5" fill="#0a0604" opacity="0.35"/>
          <rect x="${x - 12}" y="90" width="24" height="100" rx="4" fill="url(#ge-${uid})" opacity="0.35"/>
          <rect x="${x - 9}" y="110" width="18" height="70" rx="3" fill="${i === 0 ? "#c47832" : i === 1 ? "#8a4a18" : "#5c3010"}"/>
          <ellipse cx="${x}" cy="110" rx="9" ry="3" fill="#e0a060" opacity="0.6"/>
        `).join("")}
      </g>`, { w: 280, h: 240 }),
  }),
  bg_bottomless: (uid) => ({
    kind: "extra",
    plateLabel: "Bottomless pour",
    svg: svgShell("0 0 200 280", `${drinkDefs(uid)}
      <ellipse cx="100" cy="262" rx="36" ry="8" fill="#0a0604" opacity="0.4"/>
      <g filter="url(#gs-${uid})">
        <path d="M60 50 L140 50 L130 170 Q100 195 70 170 Z" fill="url(#ge-${uid})" opacity="0.35"/>
        <path d="M70 70 L130 70 L122 160 Q100 180 78 160 Z" fill="url(#cb-${uid})"/>
        <ellipse cx="100" cy="70" rx="30" ry="6" fill="#f7e7a3"/>
        <circle cx="90" cy="100" r="2" fill="#fff" opacity="0.7"/>
        <circle cx="110" cy="130" r="1.5" fill="#fff" opacity="0.6"/>
        <rect x="96" y="185" width="8" height="50" rx="2" fill="#d8e8f0" opacity="0.5"/>
        <ellipse cx="100" cy="245" rx="28" ry="7" fill="#d8e8f0" opacity="0.5"/>
      </g>`, { w: 200, h: 280 }),
  }),
  ss_oysters: (uid) => ({
    kind: "food",
    plateLabel: "Oysters on ice",
    svg: svgShell("0 0 320 240", `${foodDefs(uid)}${plateBase(uid)}
      <g filter="url(#cr-${uid})">
        <ellipse cx="160" cy="165" rx="90" ry="35" fill="#d8e8f0"/>
        <ellipse cx="160" cy="160" rx="82" ry="28" fill="#f0f8fc"/>
        ${[[120, 150], [155, 140], [190, 148], [140, 168], [180, 165]].map(([x, y]) => `
          <ellipse cx="${x}" cy="${y}" rx="22" ry="14" fill="#8a9a8a" transform="rotate(-15 ${x} ${y})"/>
          <ellipse cx="${x}" cy="${y}" rx="14" ry="8" fill="#e8d0b0" transform="rotate(-15 ${x} ${y})"/>
        `).join("")}
      </g>`),
  }),
  ss_wagyu: (uid) => ({
    kind: "food",
    plateLabel: "A5 wagyu",
    svg: svgShell("0 0 320 240", `${foodDefs(uid)}${plateBase(uid)}
      <g filter="url(#cr-${uid})">
        <path d="M90 150 C110 115 160 108 210 125 C245 140 240 175 200 185 C150 198 85 180 90 150Z" fill="url(#ms-${uid})"/>
        <path d="M115 140 Q160 125 205 145 Q220 155 200 168 Q150 185 120 165" fill="none" stroke="url(#fm-${uid})" stroke-width="5"/>
        <ellipse cx="215" cy="155" rx="22" ry="12" fill="#3d5c28"/>
        <ellipse cx="100" cy="165" rx="12" ry="6" fill="#c45c26"/>
      </g>`),
  }),
  ss_prime: (uid) => ({
    kind: "food",
    plateLabel: "Bone-in ribeye",
    svg: svgShell("0 0 320 240", `${foodDefs(uid)}${plateBase(uid)}
      <g filter="url(#cr-${uid})">
        <path d="M75 155 C95 118 150 105 205 120 C250 135 255 175 210 190 C155 205 70 185 75 155Z" fill="url(#ms-${uid})"/>
        <ellipse cx="95" cy="150" rx="18" ry="28" fill="#e8d4b8" transform="rotate(-25 95 150)"/>
        <ellipse cx="95" cy="150" rx="10" ry="18" fill="#f5ebe0" transform="rotate(-25 95 150)"/>
        <path d="M120 145 Q165 130 210 150" stroke="url(#fm-${uid})" stroke-width="4" fill="none"/>
        <ellipse cx="220" cy="160" rx="24" ry="14" fill="#4a6b2a"/>
      </g>`),
  }),
  ss_fries: (uid) => ({
    kind: "extra",
    plateLabel: "Duck-fat fries",
    svg: svgShell("0 0 320 240", `${foodDefs(uid)}${plateBase(uid)}
      <g filter="url(#cr-${uid})">
        <ellipse cx="160" cy="185" rx="40" ry="12" fill="#c8a878"/>
        ${[[140, 100, -12], [155, 85, 8], [170, 95, -5], [148, 115, 15], [175, 110, -18], [162, 125, 4], [135, 130, 20], [185, 128, -10]].map(([x, y, r]) => `
          <rect x="${x}" y="${y}" width="10" height="55" rx="3" fill="#e8c060" transform="rotate(${r} ${x + 5} ${y + 27})"/>
          <rect x="${x + 2}" y="${y + 2}" width="3" height="40" rx="1" fill="#fff3c0" opacity="0.45" transform="rotate(${r} ${x + 5} ${y + 27})"/>
        `).join("")}
      </g>`),
  }),
  ss_old_fashioned: (uid) => ({
    kind: "drink",
    plateLabel: "Old fashioned",
    svg: svgShell("0 0 200 280", `${drinkDefs(uid)}
      <ellipse cx="100" cy="250" rx="40" ry="10" fill="#0a0604" opacity="0.4"/>
      <g filter="url(#gs-${uid})">
        <rect x="55" y="90" width="90" height="130" rx="8" fill="url(#ge-${uid})" opacity="0.3"/>
        <rect x="62" y="110" width="76" height="100" rx="6" fill="url(#ob-${uid})"/>
        <ellipse cx="100" cy="110" rx="38" ry="8" fill="#c47832"/>
        <rect x="85" y="125" width="28" height="22" rx="3" fill="#e8f4f8" opacity="0.55"/>
        <circle cx="125" cy="145" r="12" fill="#c45c26"/>
        <path d="M125 133 L125 120 M118 128 L132 128" stroke="#3d5c1a" stroke-width="2"/>
      </g>`, { w: 200, h: 280 }),
  }),
  ss_martini: (uid) => ({
    kind: "drink",
    plateLabel: "Dirty martini",
    svg: svgShell("0 0 200 280", `${drinkDefs(uid)}
      <ellipse cx="100" cy="255" rx="32" ry="8" fill="#0a0604" opacity="0.4"/>
      <g filter="url(#gs-${uid})">
        <path d="M50 70 L150 70 L105 160 Q100 170 95 160 Z" fill="url(#ge-${uid})" opacity="0.35"/>
        <path d="M65 85 L135 85 L102 155 Q100 162 98 155 Z" fill="url(#mt-${uid})"/>
        <ellipse cx="100" cy="85" rx="35" ry="5" fill="#e8f0e4"/>
        <circle cx="100" cy="120" r="6" fill="#6b8f3a"/>
        <circle cx="112" cy="128" r="5" fill="#5a7a30"/>
        <line x1="100" y1="160" x2="100" y2="230" stroke="#d8e8f0" stroke-width="5" opacity="0.55"/>
        <ellipse cx="100" cy="238" rx="24" ry="6" fill="#d8e8f0" opacity="0.5"/>
      </g>`, { w: 200, h: 280 }),
  }),
  ss_cheesecake: (uid) => ({
    kind: "food",
    plateLabel: "Basque cheesecake",
    svg: svgShell("0 0 320 240", `${foodDefs(uid)}${plateBase(uid)}
      <g filter="url(#cr-${uid})">
        <path d="M110 165 Q110 120 160 115 Q210 120 210 165 Q160 185 110 165Z" fill="#e8d4b0"/>
        <path d="M115 145 Q160 105 205 145 Q160 130 115 145Z" fill="#5c3a22"/>
        <ellipse cx="145" cy="135" rx="18" ry="8" fill="#8b5a30" opacity="0.55"/>
        <ellipse cx="160" cy="160" rx="30" ry="10" fill="#fff8ee" opacity="0.35"/>
      </g>`),
  }),
};

const FALLBACK_KEY = { food: "aur_steak", drink: "aur_tower_pour", extra: "ss_fries" };

/**
 * @param {string} itemId
 * @param {MenuKind} [kind]
 * @returns {DiningSprite}
 */
export function getDiningSprite(itemId, kind = "food") {
  const uid = ++_spriteUid;
  const builder = SPRITE_BUILDERS[itemId] || SPRITE_BUILDERS[FALLBACK_KEY[kind] || "aur_steak"];
  const built = builder(uid);
  return { id: itemId, ...built };
}

/**
 * Build the persistent first-person dining stage (restaurant POV).
 * @param {string} motif
 * @returns {HTMLElement}
 */
export function buildFpvStage(motif = "steakhouse") {
  const stage = document.createElement("div");
  stage.className = `dining-fpv dining-fpv--${motif}`;
  stage.setAttribute("aria-hidden", "true");
  stage.innerHTML = `
    <div class="dining-fpv__sky"></div>
    <div class="dining-fpv__room">
      <div class="dining-fpv__backwall"></div>
      <div class="dining-fpv__lights">
        <span class="dining-fpv__pendant"></span>
        <span class="dining-fpv__pendant dining-fpv__pendant--2"></span>
        <span class="dining-fpv__candle"></span>
        <span class="dining-fpv__candle dining-fpv__candle--2"></span>
      </div>
      <div class="dining-fpv__diners" aria-hidden="true">
        <span class="dining-fpv__sil"></span>
        <span class="dining-fpv__sil dining-fpv__sil--r"></span>
      </div>
    </div>
    <div class="dining-fpv__table">
      <div class="dining-fpv__tablecloth"></div>
      <div class="dining-fpv__place">
        <div class="dining-fpv__plate-well">
          <div class="dining-fpv__plate-empty">
            <span class="dining-fpv__plate-ring"></span>
            <span class="dining-fpv__plate-hint">Order a course</span>
          </div>
          <div class="dining-fpv__food" data-fpv-food></div>
        </div>
        <div class="dining-fpv__glass-well">
          <div class="dining-fpv__glass-empty"></div>
          <div class="dining-fpv__drink" data-fpv-drink></div>
        </div>
        <div class="dining-fpv__utensils">
          <span class="dining-fpv__fork"></span>
          <span class="dining-fpv__knife"></span>
        </div>
      </div>
      <div class="dining-fpv__hands">
        <div class="dining-fpv__arm dining-fpv__arm--left"></div>
        <div class="dining-fpv__arm dining-fpv__arm--right"></div>
      </div>
      <div class="dining-fpv__bite" data-fpv-bite></div>
    </div>
    <div class="dining-fpv__vignette"></div>
    <div class="dining-fpv__caption" data-fpv-caption></div>
  `;
  return stage;
}

/**
 * Place or clear a food/drink sprite on the FPV stage.
 * @param {HTMLElement} stage
 * @param {{ foodId?: string|null, drinkId?: string|null, foodKind?: MenuKind, drinkKind?: MenuKind, caption?: string }} state
 */
export function syncFpvSprites(stage, state = {}) {
  const foodSlot = stage.querySelector("[data-fpv-food]");
  const drinkSlot = stage.querySelector("[data-fpv-drink]");
  const caption = stage.querySelector("[data-fpv-caption]");
  const emptyPlate = stage.querySelector(".dining-fpv__plate-empty");
  const emptyGlass = stage.querySelector(".dining-fpv__glass-empty");

  if (foodSlot) {
    if (state.foodId) {
      const spr = getDiningSprite(state.foodId, state.foodKind || "food");
      foodSlot.innerHTML = spr.svg;
      foodSlot.classList.add("is-served");
      foodSlot.dataset.itemId = state.foodId;
      emptyPlate?.classList.add("is-hidden");
    } else if (state.foodId === null) {
      foodSlot.innerHTML = "";
      foodSlot.classList.remove("is-served");
      delete foodSlot.dataset.itemId;
      emptyPlate?.classList.remove("is-hidden");
    }
  }

  if (drinkSlot) {
    if (state.drinkId) {
      const spr = getDiningSprite(state.drinkId, state.drinkKind || "drink");
      drinkSlot.innerHTML = spr.svg;
      drinkSlot.classList.add("is-served");
      drinkSlot.dataset.itemId = state.drinkId;
      emptyGlass?.classList.add("is-hidden");
    } else if (state.drinkId === null) {
      drinkSlot.innerHTML = "";
      drinkSlot.classList.remove("is-served");
      delete drinkSlot.dataset.itemId;
      emptyGlass?.classList.remove("is-hidden");
    }
  }

  if (caption && state.caption != null) {
    caption.textContent = state.caption;
  }
}

function looksLikeDrink(item) {
  if (item.kind === "drink") return true;
  if (item.kind !== "extra") return false;
  return /pour|margarita|mezcal|bottomless|champagne|wine|martini|fashioned/i.test(`${item.name}${item.id}`);
}

/**
 * Play a smooth first-person consume animation (bite or sip).
 * @param {HTMLElement} stage
 * @param {{ id: string, kind: MenuKind, name: string }} item
 * @param {{ reducedMotion?: boolean }} [opts]
 */
export function playConsumeAnimation(stage, item, opts = {}) {
  const reduced = opts.reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isDrink = looksLikeDrink(item);
  const bite = stage.querySelector("[data-fpv-bite]");
  const foodSlot = stage.querySelector("[data-fpv-food]");
  const drinkSlot = stage.querySelector("[data-fpv-drink]");
  const hands = stage.querySelector(".dining-fpv__hands");
  const spr = getDiningSprite(item.id, item.kind);

  if (reduced) {
    if (isDrink) syncFpvSprites(stage, { drinkId: item.id, drinkKind: item.kind, caption: item.name });
    else syncFpvSprites(stage, { foodId: item.id, foodKind: item.kind, caption: item.name });
    return Promise.resolve();
  }

  stage.classList.add("dining-fpv--consuming");
  if (hands) hands.classList.add(isDrink ? "is-sipping" : "is-biting");

  return new Promise((resolve) => {
    if (isDrink) {
      syncFpvSprites(stage, { drinkId: item.id, drinkKind: item.kind, caption: item.name });
      drinkSlot?.classList.remove("dining-fpv__anim-arrive");
      void drinkSlot?.offsetWidth;
      drinkSlot?.classList.add("dining-fpv__anim-arrive");
    } else {
      syncFpvSprites(stage, { foodId: item.id, foodKind: item.kind, caption: item.name });
      foodSlot?.classList.remove("dining-fpv__anim-arrive");
      void foodSlot?.offsetWidth;
      foodSlot?.classList.add("dining-fpv__anim-arrive");
    }

    if (bite) {
      bite.innerHTML = spr.svg;
      bite.className = `dining-fpv__bite ${isDrink ? "dining-fpv__bite--sip" : "dining-fpv__bite--chew"} is-active`;
    }

    const target = isDrink ? drinkSlot : foodSlot;
    target?.classList.add(isDrink ? "dining-fpv__anim-sip" : "dining-fpv__anim-bite");

    window.setTimeout(() => {
      bite?.classList.remove("is-active");
      if (bite) bite.innerHTML = "";
      target?.classList.remove("dining-fpv__anim-arrive", "dining-fpv__anim-sip", "dining-fpv__anim-bite");
      hands?.classList.remove("is-sipping", "is-biting");
      stage.classList.remove("dining-fpv--consuming");
      if (!isDrink && foodSlot) {
        foodSlot.classList.add("is-bitten");
        window.setTimeout(() => foodSlot.classList.remove("is-bitten"), 900);
      }
      resolve();
    }, isDrink ? 720 : 820);
  });
}

export { looksLikeDrink };
