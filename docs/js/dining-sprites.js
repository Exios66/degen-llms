/**
 * First-person dining sprites — high-detail shaded SVG plates/glasses + venue FPV stages.
 * Used by DiningOverlay for the eating-POV simulator.
 */

/** @typedef {"food" | "drink" | "extra"} MenuKind */
/** @typedef {"wine-tower" | "poolside" | "steakhouse"} DiningMotif */

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
  const w = opts.w ?? 400;
  const h = opts.h ?? 300;
  return `<svg ${SVG_NS_ATTR} viewBox="${viewBox}" width="${w}" height="${h}" role="img" aria-hidden="true" class="dining-sprite-svg">${body}</svg>`;
}

/** Shared paint + texture kit for food plates */
function foodDefs(uid) {
  return `<defs>
    <radialGradient id="ps-${uid}" cx="36%" cy="30%" r="72%">
      <stop offset="0%" stop-color="#fffaf2"/>
      <stop offset="40%" stop-color="#f0e0c8"/>
      <stop offset="78%" stop-color="#c8a888"/>
      <stop offset="100%" stop-color="#8a6848"/>
    </radialGradient>
    <radialGradient id="psInner-${uid}" cx="42%" cy="38%" r="55%">
      <stop offset="0%" stop-color="#fffef8"/>
      <stop offset="100%" stop-color="#efe0cc"/>
    </radialGradient>
    <radialGradient id="ms-${uid}" cx="38%" cy="32%" r="68%">
      <stop offset="0%" stop-color="#d46848"/>
      <stop offset="28%" stop-color="#a83820"/>
      <stop offset="62%" stop-color="#6a1c10"/>
      <stop offset="100%" stop-color="#2a0c08"/>
    </radialGradient>
    <radialGradient id="wagyu-${uid}" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#e07050"/>
      <stop offset="35%" stop-color="#b04028"/>
      <stop offset="70%" stop-color="#701810"/>
      <stop offset="100%" stop-color="#280808"/>
    </radialGradient>
    <linearGradient id="fm-${uid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fff0d8" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="#f0d0a8" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#e8c090" stop-opacity="0.12"/>
    </linearGradient>
    <linearGradient id="sear-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a0804" stop-opacity="0.75"/>
      <stop offset="40%" stop-color="#3a1808" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#1a0804" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="sauce-${uid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#8b1e3f"/>
      <stop offset="100%" stop-color="#3a0c18"/>
    </linearGradient>
    <linearGradient id="herb-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7aab48"/>
      <stop offset="100%" stop-color="#2a4818"/>
    </linearGradient>
    <pattern id="porcelain-${uid}" width="8" height="8" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="0.6" fill="#d8c8b0" opacity="0.18"/>
      <circle cx="5" cy="4" r="0.5" fill="#fff" opacity="0.12"/>
    </pattern>
    <filter id="grain-${uid}" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="${uid % 97}" result="n"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.1  0 0 0 0 0.05  0 0 0 0.18 0" in="n" result="g"/>
      <feBlend in="SourceGraphic" in2="g" mode="multiply"/>
    </filter>
    <filter id="ss-${uid}" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#0a0604" flood-opacity="0.5"/>
    </filter>
    <filter id="cr-${uid}" x="-8%" y="-8%" width="116%" height="116%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="0.5" result="b"/>
      <feOffset dy="1.2" result="o"/>
      <feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="softGlow-${uid}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>`;
}

function drinkDefs(uid) {
  return `<defs>
    <linearGradient id="ge-${uid}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.65"/>
      <stop offset="22%" stop-color="#fff" stop-opacity="0.08"/>
      <stop offset="48%" stop-color="#fff" stop-opacity="0.02"/>
      <stop offset="72%" stop-color="#fff" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0.5"/>
    </linearGradient>
    <linearGradient id="wb-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8b1838"/>
      <stop offset="35%" stop-color="#5a0c20"/>
      <stop offset="70%" stop-color="#2a0610"/>
      <stop offset="100%" stop-color="#120208"/>
    </linearGradient>
    <linearGradient id="cb-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fff6c8"/>
      <stop offset="35%" stop-color="#f0d878"/>
      <stop offset="75%" stop-color="#c8a040"/>
      <stop offset="100%" stop-color="#8a6820"/>
    </linearGradient>
    <linearGradient id="mb-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e0f8b8"/>
      <stop offset="40%" stop-color="#98d060"/>
      <stop offset="80%" stop-color="#4a8830"/>
      <stop offset="100%" stop-color="#284818"/>
    </linearGradient>
    <linearGradient id="ob-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e09048"/>
      <stop offset="40%" stop-color="#a85820"/>
      <stop offset="80%" stop-color="#5a280c"/>
      <stop offset="100%" stop-color="#281008"/>
    </linearGradient>
    <linearGradient id="mt-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f0f8ec" stop-opacity="0.92"/>
      <stop offset="55%" stop-color="#c8d8c0" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#889888" stop-opacity="0.7"/>
    </linearGradient>
    <radialGradient id="ice-${uid}" cx="40%" cy="35%" r="60%">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.85"/>
      <stop offset="55%" stop-color="#c8e0f0" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#80a0b8" stop-opacity="0.25"/>
    </radialGradient>
    <filter id="gs-${uid}" x="-30%" y="-15%" width="160%" height="140%">
      <feDropShadow dx="2" dy="7" stdDeviation="6" flood-color="#060402" flood-opacity="0.55"/>
    </filter>
    <filter id="bubble-${uid}" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="0.4"/>
    </filter>
  </defs>`;
}

function plateBase(uid, opts = {}) {
  const rim = opts.rim || "#c8a878";
  const accent = opts.accent || null;
  return `
    <ellipse cx="200" cy="248" rx="165" ry="34" fill="#0a0604" opacity="0.4"/>
    <ellipse cx="200" cy="220" rx="158" ry="58" fill="url(#ps-${uid})" filter="url(#ss-${uid})"/>
    <ellipse cx="200" cy="218" rx="158" ry="58" fill="url(#porcelain-${uid})" opacity="0.55"/>
    <ellipse cx="200" cy="216" rx="138" ry="48" fill="${rim}" opacity="0.35"/>
    <ellipse cx="200" cy="214" rx="128" ry="42" fill="url(#psInner-${uid})"/>
    <ellipse cx="200" cy="212" rx="118" ry="36" fill="#fffef9"/>
    <ellipse cx="155" cy="192" rx="42" ry="16" fill="#ffffff" opacity="0.4"/>
    <ellipse cx="200" cy="228" rx="100" ry="22" fill="#e8d4b8" opacity="0.15"/>
    ${accent ? `<ellipse cx="200" cy="214" rx="122" ry="40" fill="none" stroke="${accent}" stroke-width="3" opacity="0.45"/>` : ""}`;
}

function grillMarks(uid, cx, cy, w, h, n = 5) {
  let out = "";
  for (let i = 0; i < n; i++) {
    const x = cx - w / 2 + (w / (n - 1)) * i;
    out += `<rect x="${x - 2.5}" y="${cy - h / 2}" width="5" height="${h}" rx="2" fill="url(#sear-${uid})" opacity="${0.45 + (i % 2) * 0.15}" transform="rotate(${-8 + i * 3} ${x} ${cy})"/>`;
  }
  return out;
}

function herbScatter(cx, cy, count = 6) {
  let out = "";
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count;
    const x = cx + Math.cos(a) * (18 + (i % 3) * 6);
    const y = cy + Math.sin(a) * (10 + (i % 2) * 5);
    out += `<ellipse cx="${x}" cy="${y}" rx="5" ry="2.2" fill="#4a7828" opacity="0.85" transform="rotate(${i * 40} ${x} ${y})"/>`;
  }
  return out;
}

function condensation(uid, x, y, w, h) {
  let out = "";
  for (let i = 0; i < 10; i++) {
    const dx = x + (i * 17) % w;
    const dy = y + ((i * 29) % h);
    out += `<ellipse cx="${dx}" cy="${dy}" rx="${1.2 + (i % 3) * 0.4}" ry="${2 + (i % 2)}" fill="#fff" opacity="${0.25 + (i % 3) * 0.08}"/>`;
  }
  return out;
}

/** @type {Record<string, (uid: number) => { kind: MenuKind, plateLabel: string, svg: string }>} */
const SPRITE_BUILDERS = {
  aur_amuse: (uid) => ({
    kind: "food",
    plateLabel: "Amuse flight",
    svg: svgShell("0 0 400 300", `${foodDefs(uid)}${plateBase(uid, { accent: "#8b1e3f" })}
      <g filter="url(#cr-${uid})">
        <ellipse cx="130" cy="200" rx="36" ry="22" fill="#1a3a28"/>
        <ellipse cx="130" cy="196" rx="28" ry="15" fill="#f8ecd0" filter="url(#grain-${uid})"/>
        <ellipse cx="124" cy="192" rx="8" ry="5" fill="#c45c26"/>
        <circle cx="138" cy="194" r="3" fill="#8b1e3f"/>
        <path d="M118 188 q8 -10 16 0" stroke="#3a6828" stroke-width="1.5" fill="none"/>
        <ellipse cx="200" cy="188" rx="34" ry="20" fill="#4a1020"/>
        <ellipse cx="200" cy="184" rx="26" ry="14" fill="#f0d090" filter="url(#grain-${uid})"/>
        <path d="M188 178 q12 -14 24 2" stroke="#2a0c10" stroke-width="2" fill="none"/>
        <ellipse cx="200" cy="182" rx="10" ry="5" fill="#fff8e0" opacity="0.5"/>
        <ellipse cx="270" cy="202" rx="36" ry="20" fill="#0e2838"/>
        <ellipse cx="270" cy="198" rx="28" ry="14" fill="#e8c8a0" filter="url(#grain-${uid})"/>
        <circle cx="276" cy="194" r="4" fill="#d4a84b"/>
        <ellipse cx="262" cy="196" rx="6" ry="3" fill="#2a6f6f"/>
        ${herbScatter(200, 210, 4)}
      </g>`),
  }),

  aur_tasting: (uid) => ({
    kind: "food",
    plateLabel: "Tasting courses",
    svg: svgShell("0 0 400 300", `${foodDefs(uid)}${plateBase(uid, { accent: "#d4a84b" })}
      <g filter="url(#cr-${uid})">
        <ellipse cx="200" cy="215" rx="95" ry="28" fill="#1a0c08" opacity="0.28"/>
        <path d="M110 200 Q200 155 290 200 Q200 240 110 200" fill="url(#ms-${uid})" filter="url(#grain-${uid})"/>
        <path d="M140 195 Q200 175 255 198" stroke="url(#fm-${uid})" stroke-width="4" fill="none"/>
        <ellipse cx="155" cy="188" rx="28" ry="16" fill="#5a7a30"/>
        <ellipse cx="155" cy="184" rx="20" ry="10" fill="#8ab048"/>
        <ellipse cx="245" cy="190" rx="26" ry="14" fill="#c47832"/>
        <ellipse cx="245" cy="186" rx="18" ry="9" fill="#e09850"/>
        <ellipse cx="200" cy="175" rx="32" ry="12" fill="#f8ecd8" opacity="0.9"/>
        <ellipse cx="200" cy="172" rx="22" ry="7" fill="#fff" opacity="0.35"/>
        <circle cx="175" cy="200" r="5" fill="url(#sauce-${uid})"/>
        <circle cx="225" cy="205" r="4" fill="#d4a84b"/>
        ${herbScatter(200, 205, 5)}
      </g>`),
  }),

  aur_steak: (uid) => ({
    kind: "food",
    plateLabel: "Dry-aged ribeye",
    svg: svgShell("0 0 400 300", `${foodDefs(uid)}${plateBase(uid)}
      <g filter="url(#cr-${uid})">
        <ellipse cx="200" cy="222" rx="105" ry="30" fill="#120808" opacity="0.35"/>
        <path d="M95 195 C115 145 175 130 230 142 C285 154 320 185 310 215 C300 245 240 262 175 255 C110 248 80 225 95 195Z"
          fill="url(#ms-${uid})" filter="url(#grain-${uid})"/>
        <path d="M95 195 C115 145 175 130 230 142 C285 154 320 185 310 215 C300 245 240 262 175 255 C110 248 80 225 95 195Z"
          fill="none" stroke="#2a1008" stroke-width="2" opacity="0.4"/>
        ${grillMarks(uid, 200, 195, 120, 55, 6)}
        <path d="M130 175 Q185 158 245 180 Q275 195 255 215" stroke="url(#fm-${uid})" stroke-width="6" fill="none" stroke-linecap="round"/>
        <path d="M145 200 Q200 185 250 205" stroke="#fff0d8" stroke-opacity="0.35" stroke-width="2.5" fill="none"/>
        <ellipse cx="275" cy="185" rx="40" ry="24" fill="#2a4018"/>
        <ellipse cx="278" cy="180" rx="30" ry="16" fill="#5a8a30" filter="url(#grain-${uid})"/>
        <ellipse cx="270" cy="175" rx="12" ry="6" fill="#8ab850" opacity="0.55"/>
        <ellipse cx="115" cy="215" rx="20" ry="12" fill="#c45c26" opacity="0.9"/>
        <ellipse cx="115" cy="212" rx="12" ry="6" fill="#e07840" opacity="0.6"/>
        <ellipse cx="175" cy="155" rx="30" ry="10" fill="#fff" opacity="0.12"/>
        ${herbScatter(200, 220, 5)}
      </g>`),
  }),

  aur_tower_pour: (uid) => ({
    kind: "drink",
    plateLabel: "Cabernet",
    svg: svgShell("0 0 220 320", `${drinkDefs(uid)}
      <ellipse cx="110" cy="300" rx="42" ry="10" fill="#060402" opacity="0.45"/>
      <g filter="url(#gs-${uid})">
        <path d="M72 36 L148 36 L138 175 Q110 205 82 175 Z" fill="url(#ge-${uid})" opacity="0.4"/>
        <path d="M82 52 L138 52 L130 168 Q110 192 90 168 Z" fill="url(#wb-${uid})"/>
        <ellipse cx="110" cy="52" rx="28" ry="6" fill="#9a2040"/>
        <ellipse cx="110" cy="48" rx="22" ry="4" fill="#d06078" opacity="0.4"/>
        <path d="M90 70 Q110 95 130 70" stroke="#fff" stroke-opacity="0.12" fill="none"/>
        <path d="M92 100 Q110 120 128 100" stroke="#fff" stroke-opacity="0.08" fill="none"/>
        ${condensation(uid, 88, 70, 44, 80)}
        <rect x="105" y="192" width="10" height="78" rx="2" fill="#d8e8f0" opacity="0.55"/>
        <ellipse cx="110" cy="280" rx="34" ry="8" fill="#d8e8f0" opacity="0.5"/>
        <ellipse cx="110" cy="277" rx="26" ry="4" fill="#fff" opacity="0.28"/>
        <path d="M86 60 L90 165" stroke="#fff" stroke-opacity="0.2" stroke-width="2"/>
      </g>`, { w: 220, h: 320 }),
  }),

  aur_champagne: (uid) => ({
    kind: "drink",
    plateLabel: "Krug glass",
    svg: svgShell("0 0 200 320", `${drinkDefs(uid)}
      <ellipse cx="100" cy="300" rx="32" ry="8" fill="#060402" opacity="0.4"/>
      <g filter="url(#gs-${uid})">
        <path d="M82 28 L118 28 L110 185 Q100 202 90 185 Z" fill="url(#ge-${uid})" opacity="0.42"/>
        <path d="M88 44 L112 44 L106 178 Q100 192 94 178 Z" fill="url(#cb-${uid})"/>
        <ellipse cx="100" cy="44" rx="12" ry="3.5" fill="#fff6c8"/>
        <ellipse cx="100" cy="42" rx="9" ry="2" fill="#fff" opacity="0.45"/>
        ${[58, 78, 98, 118, 138, 155].map((y, i) =>
          `<circle cx="${96 + (i % 3) * 4}" cy="${y}" r="${1.2 + (i % 2) * 0.4}" fill="#fff" opacity="${0.55 + (i % 3) * 0.1}" filter="url(#bubble-${uid})"/>`).join("")}
        <rect x="96" y="195" width="8" height="78" rx="2" fill="#d8e8f0" opacity="0.55"/>
        <ellipse cx="100" cy="282" rx="24" ry="7" fill="#d8e8f0" opacity="0.5"/>
        <path d="M90 50 L92 170" stroke="#fff" stroke-opacity="0.22" stroke-width="1.5"/>
      </g>`, { w: 200, h: 320 }),
  }),

  aur_dessert: (uid) => ({
    kind: "extra",
    plateLabel: "Chocolate sphere",
    svg: svgShell("0 0 400 300", `${foodDefs(uid)}${plateBase(uid, { accent: "#d4a84b" })}
      <defs>
        <radialGradient id="choco-${uid}" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stop-color="#8a4a28"/><stop offset="40%" stop-color="#4a2010"/>
          <stop offset="100%" stop-color="#1a0804"/>
        </radialGradient>
      </defs>
      <g filter="url(#cr-${uid})">
        <ellipse cx="200" cy="225" rx="70" ry="18" fill="#0a0402" opacity="0.35"/>
        <circle cx="200" cy="175" r="62" fill="url(#choco-${uid})" filter="url(#grain-${uid})"/>
        <circle cx="200" cy="175" r="56" fill="none" stroke="#d4a84b" stroke-width="1.5" opacity="0.35"/>
        <ellipse cx="175" cy="155" rx="22" ry="14" fill="#a86838" opacity="0.55"/>
        <ellipse cx="168" cy="148" rx="10" ry="6" fill="#fff" opacity="0.2"/>
        <path d="M155 145 Q200 110 245 150" stroke="#e0b868" stroke-width="2" fill="none" opacity="0.45"/>
        <ellipse cx="200" cy="228" rx="78" ry="14" fill="#c45c26" opacity="0.65"/>
        <path d="M140 215 Q200 245 260 210" stroke="#e88840" stroke-width="4" fill="none" opacity="0.75"/>
        <path d="M150 222 Q200 248 250 218" stroke="#fff" stroke-opacity="0.15" stroke-width="2" fill="none"/>
        <circle cx="230" cy="200" r="4" fill="#d4a84b" opacity="0.7"/>
      </g>`),
  }),

  bg_guacamole: (uid) => ({
    kind: "food",
    plateLabel: "Guacamole",
    svg: svgShell("0 0 400 300", `${foodDefs(uid)}${plateBase(uid, { accent: "#2a6f6f", rim: "#e8c878" })}
      <defs>
        <radialGradient id="guac-${uid}" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stop-color="#a8d050"/><stop offset="50%" stop-color="#6a9a30"/><stop offset="100%" stop-color="#3a5818"/>
        </radialGradient>
      </defs>
      <g filter="url(#cr-${uid})">
        <ellipse cx="185" cy="205" rx="78" ry="40" fill="#2a4010"/>
        <ellipse cx="185" cy="198" rx="70" ry="34" fill="url(#guac-${uid})" filter="url(#grain-${uid})"/>
        <ellipse cx="170" cy="185" rx="28" ry="14" fill="#c0e868" opacity="0.55"/>
        <circle cx="195" cy="192" r="5" fill="#f8f0e0"/>
        <circle cx="210" cy="205" r="4" fill="#c45c26"/>
        <circle cx="165" cy="208" r="3.5" fill="#1a1008"/>
        <circle cx="180" cy="198" r="2.5" fill="#fff" opacity="0.35"/>
        <ellipse cx="285" cy="210" rx="42" ry="28" fill="#e8c060"/>
        <ellipse cx="285" cy="205" rx="34" ry="20" fill="#f5d878" filter="url(#grain-${uid})"/>
        <path d="M265 205 L305 190 M262 214 L308 208 M268 222 L302 228" stroke="#d4a84b" stroke-width="4" stroke-linecap="round"/>
        <ellipse cx="285" cy="192" rx="10" ry="4" fill="#fff" opacity="0.25"/>
      </g>`),
  }),

  bg_ceviche: (uid) => ({
    kind: "food",
    plateLabel: "Ceviche trio",
    svg: svgShell("0 0 400 300", `${foodDefs(uid)}${plateBase(uid, { accent: "#2a6f6f" })}
      <g filter="url(#cr-${uid})">
        ${[[130, 198, "#c8e8d0", "#e8f8f0", "#c45c26"], [200, 185, "#f0d090", "#fff0c8", "#2a6f6f"], [270, 200, "#a8d0e0", "#e0f0f8", "#d4a84b"]].map(([x, y, a, b, c]) => `
          <ellipse cx="${x}" cy="${y + 8}" rx="42" ry="26" fill="#d0d8d0" opacity="0.5"/>
          <ellipse cx="${x}" cy="${y}" rx="40" ry="24" fill="${a}"/>
          <ellipse cx="${x}" cy="${y - 4}" rx="32" ry="16" fill="${b}" filter="url(#grain-${uid})"/>
          <circle cx="${x - 8}" cy="${y - 2}" r="4" fill="${c}"/>
          <circle cx="${x + 10}" cy="${y + 4}" r="3" fill="#fff" opacity="0.4"/>
          <ellipse cx="${x}" cy="${y - 10}" rx="14" ry="5" fill="#fff" opacity="0.3"/>
        `).join("")}
        ${herbScatter(200, 215, 4)}
      </g>`),
  }),

  bg_brunch: (uid) => ({
    kind: "food",
    plateLabel: "Brunch feast",
    svg: svgShell("0 0 400 300", `${foodDefs(uid)}${plateBase(uid, { accent: "#c45c26" })}
      <g filter="url(#cr-${uid})">
        <ellipse cx="155" cy="200" rx="55" ry="32" fill="#c8a040"/>
        <ellipse cx="155" cy="192" rx="46" ry="24" fill="#f0d878" filter="url(#grain-${uid})"/>
        <ellipse cx="145" cy="182" rx="18" ry="10" fill="#fff8c8" opacity="0.55"/>
        <ellipse cx="250" cy="188" rx="50" ry="28" fill="#a83818"/>
        <ellipse cx="250" cy="180" rx="40" ry="20" fill="#e06838" filter="url(#grain-${uid})"/>
        ${grillMarks(uid, 250, 180, 50, 30, 4)}
        <ellipse cx="200" cy="220" rx="70" ry="20" fill="#3a5820"/>
        <ellipse cx="200" cy="215" rx="58" ry="14" fill="#6a9a38"/>
        <circle cx="175" cy="178" r="12" fill="#fff8e8"/>
        <circle cx="175" cy="178" r="7" fill="#f0d060"/>
        <circle cx="230" cy="200" r="7" fill="#8b1e3f"/>
        <ellipse cx="155" cy="175" rx="16" ry="6" fill="#fff" opacity="0.25"/>
      </g>`),
  }),

  bg_enchiladas: (uid) => ({
    kind: "food",
    plateLabel: "Enchiladas",
    svg: svgShell("0 0 400 300", `${foodDefs(uid)}${plateBase(uid, { accent: "#c45c26" })}
      <defs>
        <linearGradient id="ench-${uid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#e88848"/><stop offset="55%" stop-color="#c05020"/><stop offset="100%" stop-color="#6a2010"/>
        </linearGradient>
      </defs>
      <g filter="url(#cr-${uid})">
        <rect x="105" y="175" width="190" height="55" rx="22" fill="#8a3010"/>
        <rect x="112" y="180" width="176" height="45" rx="18" fill="url(#ench-${uid})" filter="url(#grain-${uid})"/>
        <ellipse cx="155" cy="195" rx="28" ry="14" fill="#f8ecd0" opacity="0.9"/>
        <ellipse cx="210" cy="200" rx="26" ry="12" fill="#f8ecd0" opacity="0.8"/>
        <ellipse cx="255" cy="192" rx="22" ry="12" fill="#5a8a30"/>
        <ellipse cx="255" cy="188" rx="14" ry="7" fill="#8ab848"/>
        <path d="M125 188 Q200 168 275 190" stroke="#fff" stroke-opacity="0.28" stroke-width="2.5" fill="none"/>
        <circle cx="170" cy="210" r="3" fill="#fff" opacity="0.35"/>
        ${herbScatter(200, 215, 4)}
      </g>`),
  }),

  bg_margarita: (uid) => ({
    kind: "drink",
    plateLabel: "Margarita",
    svg: svgShell("0 0 220 320", `${drinkDefs(uid)}
      <ellipse cx="110" cy="300" rx="40" ry="10" fill="#060402" opacity="0.45"/>
      <g filter="url(#gs-${uid})">
        <path d="M48 78 L172 78 L132 195 Q110 215 88 195 Z" fill="url(#ge-${uid})" opacity="0.38"/>
        <path d="M62 95 L158 95 L125 188 Q110 205 95 188 Z" fill="url(#mb-${uid})"/>
        <ellipse cx="110" cy="95" rx="48" ry="8" fill="#e8f8d0"/>
        <ellipse cx="110" cy="90" rx="46" ry="6" fill="#fff" opacity="0.25"/>
        <ellipse cx="110" cy="88" rx="48" ry="5" fill="none" stroke="#f0f0f0" stroke-width="3" opacity="0.7"/>
        <circle cx="138" cy="82" r="14" fill="#e8a830"/>
        <ellipse cx="138" cy="78" rx="8" ry="5" fill="#f0c860" opacity="0.7"/>
        <path d="M138 68 L138 52 M128 60 L148 60" stroke="#3d5c1a" stroke-width="2.5" stroke-linecap="round"/>
        <ellipse cx="100" cy="130" rx="10" ry="7" fill="url(#ice-${uid})"/>
        <ellipse cx="120" cy="150" rx="8" ry="6" fill="url(#ice-${uid})"/>
        ${condensation(uid, 70, 110, 70, 60)}
        <rect x="105" y="205" width="10" height="68" rx="2" fill="#d8e8f0" opacity="0.5"/>
        <ellipse cx="110" cy="282" rx="30" ry="8" fill="#d8e8f0" opacity="0.5"/>
        <path d="M72 105 L78 180" stroke="#fff" stroke-opacity="0.2" stroke-width="2"/>
      </g>`, { w: 220, h: 320 }),
  }),

  bg_mezcal: (uid) => ({
    kind: "drink",
    plateLabel: "Mezcal flight",
    svg: svgShell("0 0 320 280", `${drinkDefs(uid)}
      <g filter="url(#gs-${uid})">
        ${[[80, "#e09048", "#a85820"], [160, "#c07030", "#6a3810"], [240, "#8a5020", "#3a2008"]].map(([x, top, bot], i) => `
          <ellipse cx="${x}" cy="250" rx="22" ry="6" fill="#060402" opacity="0.4"/>
          <rect x="${x - 16}" y="85" width="32" height="140" rx="5" fill="url(#ge-${uid})" opacity="0.35"/>
          <rect x="${x - 12}" y="110" width="24" height="100" rx="4" fill="${bot}"/>
          <rect x="${x - 12}" y="110" width="24" height="55" rx="4" fill="${top}" opacity="0.85"/>
          <ellipse cx="${x}" cy="110" rx="12" ry="4" fill="#f0b070" opacity="0.65"/>
          <path d="M${x - 8} 120 L${x - 6} 195" stroke="#fff" stroke-opacity="0.18" stroke-width="1.5"/>
          <ellipse cx="${x + 6}" cy="${140 + i * 4}" rx="3" ry="5" fill="#fff" opacity="0.12"/>
        `).join("")}
        <rect x="40" y="230" width="240" height="14" rx="3" fill="#3a2418" opacity="0.7"/>
        <rect x="40" y="230" width="240" height="4" fill="#d4a84b" opacity="0.25"/>
      </g>`, { w: 320, h: 280 }),
  }),

  bg_bottomless: (uid) => ({
    kind: "extra",
    plateLabel: "Bottomless pour",
    svg: svgShell("0 0 220 320", `${drinkDefs(uid)}
      <ellipse cx="110" cy="300" rx="42" ry="10" fill="#060402" opacity="0.45"/>
      <g filter="url(#gs-${uid})">
        <path d="M55 48 L165 48 L152 200 Q110 230 68 200 Z" fill="url(#ge-${uid})" opacity="0.38"/>
        <path d="M68 70 L152 70 L142 188 Q110 212 78 188 Z" fill="url(#cb-${uid})"/>
        <ellipse cx="110" cy="70" rx="42" ry="7" fill="#fff6c8"/>
        <ellipse cx="110" cy="66" rx="36" ry="4" fill="#fff" opacity="0.4"/>
        ${[90, 115, 140, 165].map((y, i) =>
          `<circle cx="${100 + (i % 3) * 8}" cy="${y}" r="${1.5 + (i % 2)}" fill="#fff" opacity="0.6" filter="url(#bubble-${uid})"/>`).join("")}
        ${condensation(uid, 75, 90, 70, 80)}
        <rect x="105" y="218" width="10" height="55" rx="2" fill="#d8e8f0" opacity="0.5"/>
        <ellipse cx="110" cy="282" rx="32" ry="8" fill="#d8e8f0" opacity="0.5"/>
      </g>`, { w: 220, h: 320 }),
  }),

  ss_oysters: (uid) => ({
    kind: "food",
    plateLabel: "Oysters on ice",
    svg: svgShell("0 0 400 300", `${foodDefs(uid)}${plateBase(uid, { accent: "#6a9ab0" })}
      <g filter="url(#cr-${uid})">
        <ellipse cx="200" cy="215" rx="120" ry="48" fill="#b0c8d8"/>
        <ellipse cx="200" cy="208" rx="112" ry="42" fill="#e8f4fc" filter="url(#grain-${uid})"/>
        ${[[145, 190], [195, 175], [250, 188], [165, 220], [230, 215], [200, 200]].map(([x, y], i) => `
          <ellipse cx="${x}" cy="${y}" rx="30" ry="18" fill="#6a7a6a" transform="rotate(${-20 + i * 8} ${x} ${y})"/>
          <ellipse cx="${x}" cy="${y}" rx="22" ry="12" fill="#8a9a88" transform="rotate(${-20 + i * 8} ${x} ${y})"/>
          <ellipse cx="${x}" cy="${y}" rx="16" ry="8" fill="#e8d0b0" transform="rotate(${-20 + i * 8} ${x} ${y})"/>
          <ellipse cx="${x - 2}" cy="${y - 1}" rx="9" ry="4" fill="#c8a888" transform="rotate(${-20 + i * 8} ${x} ${y})"/>
          <ellipse cx="${x - 4}" cy="${y - 3}" rx="4" ry="2" fill="#fff" opacity="0.35" transform="rotate(${-20 + i * 8} ${x} ${y})"/>
        `).join("")}
        ${[[120, 195], [280, 210], [190, 230], [260, 175]].map(([x, y]) =>
          `<circle cx="${x}" cy="${y}" r="${3 + (x % 3)}" fill="#fff" opacity="0.75"/>`).join("")}
        <ellipse cx="300" cy="195" rx="14" ry="10" fill="#c45c26" opacity="0.85"/>
        <ellipse cx="300" cy="192" rx="8" ry="5" fill="#e07040"/>
      </g>`),
  }),

  ss_wagyu: (uid) => ({
    kind: "food",
    plateLabel: "A5 wagyu",
    svg: svgShell("0 0 400 300", `${foodDefs(uid)}${plateBase(uid, { accent: "#d4a84b" })}
      <g filter="url(#cr-${uid})">
        <ellipse cx="200" cy="225" rx="108" ry="28" fill="#0a0402" opacity="0.35"/>
        <path d="M100 190 C125 140 195 128 265 150 C320 170 315 220 255 238 C185 258 85 230 100 190Z"
          fill="url(#wagyu-${uid})" filter="url(#grain-${uid})"/>
        <path d="M125 170 Q200 148 270 178 Q290 195 260 215 Q190 240 130 205" fill="none" stroke="url(#fm-${uid})" stroke-width="7"/>
        <path d="M140 195 Q200 175 255 200" stroke="#fff8ee" stroke-opacity="0.4" stroke-width="3" fill="none"/>
        <path d="M155 185 Q210 170 245 190" stroke="#f0d0a8" stroke-opacity="0.55" stroke-width="2" fill="none"/>
        ${grillMarks(uid, 200, 190, 100, 45, 5)}
        <ellipse cx="285" cy="185" rx="32" ry="18" fill="#2a4018"/>
        <ellipse cx="288" cy="180" rx="24" ry="12" fill="#5a8a30"/>
        <ellipse cx="110" cy="210" rx="16" ry="9" fill="#c45c26"/>
        <ellipse cx="170" cy="150" rx="28" ry="9" fill="#fff" opacity="0.14"/>
        ${herbScatter(200, 220, 5)}
      </g>`),
  }),

  ss_prime: (uid) => ({
    kind: "food",
    plateLabel: "Bone-in ribeye",
    svg: svgShell("0 0 400 300", `${foodDefs(uid)}${plateBase(uid)}
      <g filter="url(#cr-${uid})">
        <ellipse cx="200" cy="225" rx="115" ry="30" fill="#0a0402" opacity="0.32"/>
        <path d="M80 195 C105 140 185 122 265 145 C325 165 335 220 270 245 C190 270 65 235 80 195Z"
          fill="url(#ms-${uid})" filter="url(#grain-${uid})"/>
        <ellipse cx="105" cy="185" rx="24" ry="38" fill="#e8d4b8" transform="rotate(-28 105 185)"/>
        <ellipse cx="105" cy="185" rx="14" ry="26" fill="#f8f0e8" transform="rotate(-28 105 185)"/>
        <ellipse cx="105" cy="185" rx="6" ry="14" fill="#d0b898" transform="rotate(-28 105 185)"/>
        ${grillMarks(uid, 210, 190, 110, 50, 6)}
        <path d="M140 175 Q210 155 275 185" stroke="url(#fm-${uid})" stroke-width="5" fill="none"/>
        <ellipse cx="290" cy="195" rx="34" ry="20" fill="#3a5820"/>
        <ellipse cx="292" cy="190" rx="24" ry="12" fill="#6a9a38"/>
        <ellipse cx="160" cy="148" rx="26" ry="8" fill="#fff" opacity="0.12"/>
        ${herbScatter(200, 225, 4)}
      </g>`),
  }),

  ss_fries: (uid) => ({
    kind: "extra",
    plateLabel: "Duck-fat fries",
    svg: svgShell("0 0 400 300", `${foodDefs(uid)}${plateBase(uid, { accent: "#c47832" })}
      <defs>
        <linearGradient id="fry-${uid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fff0a0"/><stop offset="40%" stop-color="#e8c050"/><stop offset="100%" stop-color="#a87820"/>
        </linearGradient>
      </defs>
      <g filter="url(#cr-${uid})">
        <ellipse cx="200" cy="235" rx="55" ry="16" fill="#c8a878"/>
        <ellipse cx="200" cy="232" rx="48" ry="12" fill="#e0c090"/>
        ${[[165, 110, -14], [185, 88, 10], [208, 100, -6], [175, 130, 18], [220, 118, -20], [195, 145, 6], [155, 150, 22], [235, 148, -12], [180, 165, -8], [215, 160, 14]].map(([x, y, r]) => `
          <rect x="${x}" y="${y}" width="13" height="72" rx="4" fill="url(#fry-${uid})" transform="rotate(${r} ${x + 6} ${y + 36})" filter="url(#grain-${uid})"/>
          <rect x="${x + 3}" y="${y + 4}" width="4" height="50" rx="1.5" fill="#fff8c8" opacity="0.45" transform="rotate(${r} ${x + 6} ${y + 36})"/>
          <rect x="${x + 1}" y="${y + 50}" width="11" height="8" rx="2" fill="#8a5810" opacity="0.35" transform="rotate(${r} ${x + 6} ${y + 36})"/>
        `).join("")}
        <ellipse cx="200" cy="120" rx="20" ry="8" fill="#fff" opacity="0.1"/>
      </g>`),
  }),

  ss_old_fashioned: (uid) => ({
    kind: "drink",
    plateLabel: "Old fashioned",
    svg: svgShell("0 0 220 320", `${drinkDefs(uid)}
      <ellipse cx="110" cy="290" rx="48" ry="12" fill="#060402" opacity="0.45"/>
      <g filter="url(#gs-${uid})">
        <rect x="48" y="95" width="124" height="160" rx="10" fill="url(#ge-${uid})" opacity="0.32"/>
        <rect x="58" y="118" width="104" height="125" rx="8" fill="url(#ob-${uid})"/>
        <ellipse cx="110" cy="118" rx="52" ry="10" fill="#e09048"/>
        <ellipse cx="110" cy="114" rx="46" ry="6" fill="#fff" opacity="0.15"/>
        <rect x="88" y="135" width="40" height="32" rx="4" fill="url(#ice-${uid})"/>
        <rect x="95" y="142" width="28" height="20" rx="3" fill="#fff" opacity="0.25"/>
        <circle cx="145" cy="160" r="16" fill="#c45c26"/>
        <ellipse cx="145" cy="154" rx="10" ry="7" fill="#e07840" opacity="0.7"/>
        <path d="M145 144 L145 128 M135 136 L155 136" stroke="#3d5c1a" stroke-width="2.5" stroke-linecap="round"/>
        ${condensation(uid, 65, 130, 90, 90)}
        <path d="M68 130 L72 220" stroke="#fff" stroke-opacity="0.18" stroke-width="2"/>
        <ellipse cx="78" cy="180" rx="5" ry="12" fill="#fff" opacity="0.1"/>
      </g>`, { w: 220, h: 320 }),
  }),

  ss_martini: (uid) => ({
    kind: "drink",
    plateLabel: "Dirty martini",
    svg: svgShell("0 0 220 320", `${drinkDefs(uid)}
      <ellipse cx="110" cy="295" rx="36" ry="9" fill="#060402" opacity="0.45"/>
      <g filter="url(#gs-${uid})">
        <path d="M40 72 L180 72 L118 188 Q110 200 102 188 Z" fill="url(#ge-${uid})" opacity="0.38"/>
        <path d="M58 90 L162 90 L112 180 Q110 188 108 180 Z" fill="url(#mt-${uid})"/>
        <ellipse cx="110" cy="90" rx="52" ry="7" fill="#e8f0e4"/>
        <ellipse cx="110" cy="86" rx="44" ry="4" fill="#fff" opacity="0.35"/>
        <circle cx="110" cy="135" r="8" fill="#5a7a30"/>
        <ellipse cx="110" cy="132" rx="5" ry="3" fill="#8ab048" opacity="0.6"/>
        <circle cx="128" cy="148" r="7" fill="#4a6820"/>
        <ellipse cx="128" cy="145" rx="4" ry="2.5" fill="#7a9a38" opacity="0.55"/>
        <line x1="110" y1="188" x2="110" y2="262" stroke="#d8e8f0" stroke-width="6" opacity="0.55"/>
        <ellipse cx="110" cy="272" rx="28" ry="7" fill="#d8e8f0" opacity="0.5"/>
        <ellipse cx="110" cy="270" rx="20" ry="3" fill="#fff" opacity="0.25"/>
        <path d="M70 100 L78 165" stroke="#fff" stroke-opacity="0.22" stroke-width="2"/>
        ${condensation(uid, 70, 100, 80, 50)}
      </g>`, { w: 220, h: 320 }),
  }),

  ss_cheesecake: (uid) => ({
    kind: "food",
    plateLabel: "Basque cheesecake",
    svg: svgShell("0 0 400 300", `${foodDefs(uid)}${plateBase(uid, { accent: "#8b5a30" })}
      <defs>
        <radialGradient id="cake-${uid}" cx="45%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#fff8e8"/><stop offset="55%" stop-color="#e8d0a8"/><stop offset="100%" stop-color="#c8a878"/>
        </radialGradient>
        <radialGradient id="burnt-${uid}" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stop-color="#8a5a30"/><stop offset="50%" stop-color="#4a2810"/><stop offset="100%" stop-color="#1a0c04"/>
        </radialGradient>
      </defs>
      <g filter="url(#cr-${uid})">
        <ellipse cx="200" cy="230" rx="75" ry="20" fill="#0a0402" opacity="0.3"/>
        <path d="M125 215 Q125 150 200 140 Q275 150 275 215 Q200 245 125 215Z" fill="url(#cake-${uid})" filter="url(#grain-${uid})"/>
        <path d="M132 185 Q200 125 268 185 Q200 165 132 185Z" fill="url(#burnt-${uid})"/>
        <ellipse cx="175" cy="165" rx="28" ry="12" fill="#a87040" opacity="0.45"/>
        <ellipse cx="200" cy="200" rx="40" ry="14" fill="#fff" opacity="0.3"/>
        <ellipse cx="160" cy="195" rx="16" ry="8" fill="#fff8ee" opacity="0.4"/>
        <path d="M140 200 Q200 230 260 198" stroke="#c8a878" stroke-width="2" fill="none" opacity="0.4"/>
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

/** Venue-specific scenery HTML injected into the FPV stage */
const VENUE_SCENERY = {
  "wine-tower": `
    <div class="dining-venue-scenery dining-venue-scenery--aureole">
      <div class="dining-venue-scenery__tower">
        <span class="dining-venue-scenery__tower-glow"></span>
        <span class="dining-venue-scenery__bottle"></span>
        <span class="dining-venue-scenery__bottle dining-venue-scenery__bottle--2"></span>
        <span class="dining-venue-scenery__bottle dining-venue-scenery__bottle--3"></span>
        <span class="dining-venue-scenery__bottle dining-venue-scenery__bottle--4"></span>
        <span class="dining-venue-scenery__angel"></span>
        <span class="dining-venue-scenery__cable"></span>
      </div>
      <div class="dining-venue-scenery__velvet"></div>
      <div class="dining-venue-scenery__label">Aureole · Wine Tower</div>
    </div>`,
  poolside: `
    <div class="dining-venue-scenery dining-venue-scenery--border">
      <div class="dining-venue-scenery__window">
        <span class="dining-venue-scenery__sky-wash"></span>
        <span class="dining-venue-scenery__water"></span>
        <span class="dining-venue-scenery__wave"></span>
        <span class="dining-venue-scenery__wave dining-venue-scenery__wave--2"></span>
        <span class="dining-venue-scenery__palm"></span>
        <span class="dining-venue-scenery__palm dining-venue-scenery__palm--2"></span>
        <span class="dining-venue-scenery__sun"></span>
      </div>
      <div class="dining-venue-scenery__tile"></div>
      <div class="dining-venue-scenery__label">Border Grill · Poolside</div>
    </div>`,
  steakhouse: `
    <div class="dining-venue-scenery dining-venue-scenery--strip">
      <div class="dining-venue-scenery__booth"></div>
      <div class="dining-venue-scenery__grill">
        <span class="dining-venue-scenery__ember"></span>
        <span class="dining-venue-scenery__ember dining-venue-scenery__ember--2"></span>
        <span class="dining-venue-scenery__ember dining-venue-scenery__ember--3"></span>
        <span class="dining-venue-scenery__spark"></span>
      </div>
      <div class="dining-venue-scenery__brass"></div>
      <div class="dining-venue-scenery__label">Stripsteak · Mina</div>
    </div>`,
};

/**
 * Build the persistent first-person dining stage for a venue motif.
 * @param {DiningMotif|string} motif
 * @param {{ venueName?: string }} [opts]
 * @returns {HTMLElement}
 */
export function buildFpvStage(motif = "steakhouse", opts = {}) {
  const stage = document.createElement("div");
  const key = VENUE_SCENERY[motif] ? motif : "steakhouse";
  stage.className = `dining-fpv dining-fpv--${key}`;
  stage.dataset.motif = key;
  stage.setAttribute("aria-hidden", "true");
  const scenery = VENUE_SCENERY[key] || VENUE_SCENERY.steakhouse;
  stage.innerHTML = `
    <div class="dining-fpv__sky"></div>
    <div class="dining-fpv__room">
      <div class="dining-fpv__backwall"></div>
      ${scenery}
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
    <div class="dining-fpv__caption" data-fpv-caption>${opts.venueName ? escapeHtml(opts.venueName) : ""}</div>
  `;
  return stage;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
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

export function looksLikeDrink(item) {
  if (item.kind === "drink") return true;
  if (item.kind !== "extra") return false;
  return /pour|margarita|mezcal|bottomless|champagne|wine|martini|fashioned/i.test(`${item.name}${item.id}`);
}

/**
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
