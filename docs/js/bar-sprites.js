/**
 * First-person bar sprites — FPV rail POV + drink glass SVGs per pour style.
 */

const SVG_NS = 'xmlns="http://www.w3.org/2000/svg"';

function svg(viewBox, body, w = 320, h = 280) {
  return `<svg ${SVG_NS} viewBox="${viewBox}" width="${w}" height="${h}" class="bar-sprite-svg" aria-hidden="true">${body}</svg>`;
}

function drinkDefs(uid) {
  return `<defs>
    <linearGradient id="lg-${uid}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.55"/>
      <stop offset="50%" stop-color="#fff" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0.35"/>
    </linearGradient>
    <linearGradient id="liq-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e8a848"/>
      <stop offset="60%" stop-color="#a85820"/>
      <stop offset="100%" stop-color="#4a2808"/>
    </linearGradient>
    <linearGradient id="ice-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e8f4ff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#90b8d0" stop-opacity="0.5"/>
    </linearGradient>
    <filter id="sh-${uid}"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity="0.45"/></filter>
  </defs>`;
}

function glassHighball(uid, color = "#c87830") {
  return `${drinkDefs(uid)}
    <g filter="url(#sh-${uid})">
      <rect x="118" y="88" width="84" height="140" rx="6" fill="url(#ice-${uid})" opacity="0.25"/>
      <path d="M120 92 L120 218 Q120 228 130 228 L190 228 Q200 228 200 218 L200 92 Z" fill="none" stroke="#d8e8f0" stroke-width="3"/>
      <rect x="124" y="110" width="72" height="100" rx="4" fill="${color}" opacity="0.85"/>
      <rect x="128" y="108" width="20" height="90" fill="url(#lg-${uid})" opacity="0.5"/>
      <ellipse cx="162" cy="100" rx="28" ry="6" fill="#fff" opacity="0.35"/>
    </g>`;
}

function glassRocks(uid, color = "#a04018") {
  return `${drinkDefs(uid)}
    <g filter="url(#sh-${uid})">
      <ellipse cx="160" cy="210" rx="70" ry="18" fill="#0a0604" opacity="0.35"/>
      <path d="M95 175 Q95 140 160 130 Q225 140 225 175 L218 215 Q215 228 160 228 Q105 228 102 215 Z" fill="none" stroke="#c8d8e0" stroke-width="3"/>
      <path d="M100 178 Q100 148 160 138 Q220 148 220 178 L214 212 Q212 222 160 222 Q108 222 106 212 Z" fill="${color}" opacity="0.88"/>
      <circle cx="130" cy="185" r="14" fill="url(#ice-${uid})" opacity="0.7"/>
      <circle cx="175" cy="192" r="11" fill="url(#ice-${uid})" opacity="0.6"/>
      <rect x="108" y="150" width="16" height="50" fill="url(#lg-${uid})" opacity="0.4" transform="rotate(-8 116 175)"/>
    </g>`;
}

function glassFrozen(uid, color = "#f0a848") {
  return `${drinkDefs(uid)}
    <g filter="url(#sh-${uid})">
      <path d="M108 200 L132 90 L188 90 L212 200 Z" fill="none" stroke="#e8c878" stroke-width="4"/>
      <path d="M112 198 L134 96 L186 96 L208 198 Z" fill="${color}" opacity="0.9"/>
      <ellipse cx="160" cy="96" rx="30" ry="8" fill="#fff" opacity="0.4"/>
      <rect x="148" y="72" width="24" height="28" rx="4" fill="#e8c040"/>
      <circle cx="140" cy="140" r="5" fill="#fff" opacity="0.5"/>
      <circle cx="175" cy="155" r="4" fill="#fff" opacity="0.4"/>
    </g>`;
}

function glassMartini(uid) {
  return `${drinkDefs(uid)}
    <g filter="url(#sh-${uid})">
      <path d="M160 78 L108 198 L212 198 Z" fill="none" stroke="#d0e0e8" stroke-width="3"/>
      <path d="M160 82 L112 192 L208 192 Z" fill="#e8f0e8" opacity="0.75"/>
      <line x1="160" y1="198" x2="160" y2="228" stroke="#c8b878" stroke-width="4"/>
      <ellipse cx="160" cy="228" rx="22" ry="5" fill="#a89858"/>
      <circle cx="160" cy="175" r="6" fill="#2a5828"/>
    </g>`;
}

function glassChampagne(uid) {
  return `${drinkDefs(uid)}
    <g filter="url(#sh-${uid})">
      <path d="M148 95 Q148 75 160 72 Q172 75 172 95 L168 200 Q166 215 160 218 Q154 215 152 200 Z" fill="none" stroke="#e8e0c8" stroke-width="2.5"/>
      <path d="M150 98 L154 198 Q155 208 160 210 Q165 208 166 198 L170 98 Z" fill="#f0e8c0" opacity="0.8"/>
      <circle cx="155" cy="120" r="2" fill="#fff" opacity="0.6"/>
      <circle cx="168" cy="135" r="1.5" fill="#fff" opacity="0.5"/>
      <circle cx="158" cy="150" r="2" fill="#fff" opacity="0.45"/>
    </g>`;
}

function glassBeer(uid) {
  return `${drinkDefs(uid)}
    <g filter="url(#sh-${uid})">
      <rect x="118" y="100" width="84" height="128" rx="8" fill="none" stroke="#e0d0a0" stroke-width="3"/>
      <rect x="122" y="118" width="76" height="100" rx="6" fill="#d8a030" opacity="0.9"/>
      <ellipse cx="160" cy="118" rx="38" ry="12" fill="#fff8e0" opacity="0.85"/>
      <rect x="128" y="108" width="14" height="80" fill="url(#lg-${uid})" opacity="0.35"/>
    </g>`;
}

let _uid = 0;
function nextUid() { _uid += 1; return _uid; }

function inferGlassType(drinkId = "", name = "") {
  const s = `${drinkId} ${name}`.toLowerCase();
  if (/frozen|colada|freeze|daiquiri|marg|mojito|refill/.test(s)) return "frozen";
  if (/champagne|krug|moët|dom|cristal|coupe|bubbles/.test(s)) return "champagne";
  if (/martini|negroni/.test(s)) return "martini";
  if (/beer|flight|stout|tap/.test(s)) return "beer";
  if (/old.?fashioned|whiskey|bourbon|whisky|scotch|cognac|anejo|japanese/.test(s)) return "rocks";
  return "highball";
}

const GLASS_COLORS = {
  frozen: "#f0b848",
  highball: "#d87838",
  rocks: "#a84820",
  martini: "#e8f0e8",
  champagne: "#f0e8c0",
  beer: "#d8a030",
};

/** @param {string} drinkId @param {{ name?: string }} [drink] */
export function getBarSprite(drinkId, drink = {}) {
  const uid = nextUid();
  const type = inferGlassType(drinkId, drink.name ?? "");
  const builders = {
    frozen: () => glassFrozen(uid, GLASS_COLORS.frozen),
    rocks: () => glassRocks(uid, GLASS_COLORS.rocks),
    martini: () => glassMartini(uid),
    champagne: () => glassChampagne(uid),
    beer: () => glassBeer(uid),
    highball: () => glassHighball(uid, GLASS_COLORS.highball),
  };
  const svgBody = (builders[type] ?? builders.highball)();
  return { type, svg: svgBody };
}

const BAR_SCENERY = {
  "sound-lounge": `
    <div class="bar-scenery bar-scenery--sound">
      <div class="bar-scenery__dancefloor"></div>
      <div class="bar-scenery__speakers"><span></span><span></span></div>
      <div class="bar-scenery__neon">EYECANDY</div>
    </div>`,
  "frozen-rail": `
    <div class="bar-scenery bar-scenery--frozen">
      <div class="bar-scenery__blender"></div>
      <div class="bar-scenery__cups"></div>
      <div class="bar-scenery__neon">BIG CHILL</div>
    </div>`,
  "live-lounge": `
    <div class="bar-scenery bar-scenery--live">
      <div class="bar-scenery__stage"></div>
      <div class="bar-scenery__amp"></div>
      <div class="bar-scenery__neon">R &amp; R</div>
    </div>`,
  "lobby-bar": `
    <div class="bar-scenery bar-scenery--lobby">
      <div class="bar-scenery__slots"></div>
      <div class="bar-scenery__betty">BETTY'S</div>
    </div>`,
  skyline: `
    <div class="bar-scenery bar-scenery--skyline">
      <div class="bar-scenery__strip"></div>
      <div class="bar-scenery__window"></div>
    </div>`,
  velvet: `
    <div class="bar-scenery bar-scenery--velvet">
      <div class="bar-scenery__bottles"></div>
      <div class="bar-scenery__rope"></div>
    </div>`,
  "pool-deck": `
    <div class="bar-scenery bar-scenery--pool">
      <div class="bar-scenery__palms"></div>
      <div class="bar-scenery__water"></div>
    </div>`,
  noir: `
    <div class="bar-scenery bar-scenery--noir">
      <div class="bar-scenery__velvet-wall"></div>
      <div class="bar-scenery__candle"></div>
    </div>`,
};

/**
 * @param {string} motif
 * @param {{ venueName?: string }} [opts]
 */
export function buildBarFpvStage(motif = "live-lounge", opts = {}) {
  const key = BAR_SCENERY[motif] ? motif : "live-lounge";
  const stage = document.createElement("div");
  stage.className = `bar-fpv bar-fpv--${key}`;
  stage.dataset.motif = key;
  stage.setAttribute("aria-hidden", "true");
  const scenery = BAR_SCENERY[key] ?? BAR_SCENERY["live-lounge"];
  stage.innerHTML = `
    <div class="bar-fpv__ambient"></div>
    <div class="bar-fpv__room">
      <div class="bar-fpv__backbar">
        <div class="bar-fpv__bottle-row"></div>
        <div class="bar-fpv__mirror"></div>
      </div>
      ${scenery}
      <div class="bar-fpv__pendants">
        <span class="bar-fpv__light"></span>
        <span class="bar-fpv__light bar-fpv__light--2"></span>
      </div>
    </div>
    <div class="bar-fpv__rail">
      <div class="bar-fpv__rail-wood"></div>
      <div class="bar-fpv__mat"></div>
      <div class="bar-fpv__glass-well">
        <div class="bar-fpv__glass-empty"></div>
        <div class="bar-fpv__drink" data-bar-drink></div>
      </div>
      <div class="bar-fpv__napkin"></div>
      <div class="bar-fpv__hands">
        <div class="bar-fpv__arm bar-fpv__arm--left"></div>
        <div class="bar-fpv__arm bar-fpv__arm--right"></div>
      </div>
      <div class="bar-fpv__sip" data-bar-sip></div>
    </div>
    <div class="bar-fpv__vignette"></div>
    <div class="bar-fpv__caption" data-bar-caption>${opts.venueName ? escapeHtml(opts.venueName) : ""}</div>
  `;
  return stage;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** @param {HTMLElement} stage @param {{ drinkId?: string|null, caption?: string, drink?: object }} state */
export function syncBarFpvSprites(stage, state = {}) {
  const slot = stage.querySelector("[data-bar-drink]");
  const caption = stage.querySelector("[data-bar-caption]");
  const empty = stage.querySelector(".bar-fpv__glass-empty");
  if (slot) {
    if (state.drinkId) {
      const spr = getBarSprite(state.drinkId, state.drink ?? {});
      slot.innerHTML = spr.svg;
      slot.classList.add("is-served");
      slot.dataset.itemId = state.drinkId;
      empty?.classList.add("is-hidden");
    } else if (state.drinkId === null) {
      slot.innerHTML = "";
      slot.classList.remove("is-served");
      delete slot.dataset.itemId;
      empty?.classList.remove("is-hidden");
    }
  }
  if (caption && state.caption != null) caption.textContent = state.caption;
}

/**
 * @param {HTMLElement} stage
 * @param {{ id: string, name: string }} drink
 */
export function playBarSipAnimation(stage, drink, opts = {}) {
  const reduced = opts.reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sip = stage.querySelector("[data-bar-sip]");
  const drinkSlot = stage.querySelector("[data-bar-drink]");
  const hands = stage.querySelector(".bar-fpv__hands");
  const spr = getBarSprite(drink.id, drink);

  if (reduced) {
    syncBarFpvSprites(stage, { drinkId: drink.id, drink, caption: drink.name });
    return Promise.resolve();
  }

  stage.classList.add("bar-fpv--sipping");
  hands?.classList.add("is-sipping");
  syncBarFpvSprites(stage, { drinkId: drink.id, drink, caption: drink.name });
  drinkSlot?.classList.add("bar-fpv__anim-arrive");
  if (sip) {
    sip.innerHTML = spr.svg;
    sip.classList.add("is-active");
  }

  return new Promise((resolve) => {
    window.setTimeout(() => {
      sip?.classList.remove("is-active");
      if (sip) sip.innerHTML = "";
      drinkSlot?.classList.remove("bar-fpv__anim-arrive");
      hands?.classList.remove("is-sipping");
      stage.classList.remove("bar-fpv--sipping");
      resolve();
    }, 680);
  });
}
