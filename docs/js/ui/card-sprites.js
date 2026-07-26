/**
 * Kenney CC0 playing-card sprites for table game displays.
 * Provides animated deal / flip markup used by the terminal shell and RPG overlays.
 */
const ASSET_ROOT = new URL("../../assets/cards/", import.meta.url);

/** @type {Map<string, string>} */
const lastRowSigs = new Map();

const COURT = new Set(["A", "J", "Q", "K"]);

function assetUrl(file) {
  return new URL(file, ASSET_ROOT).href;
}

/** Map game rank ("2"…"10", A/J/Q/K) → Kenney filename token. */
function rankToken(rank) {
  if (rank === "10") return "10";
  if (rank === "A" || rank === "J" || rank === "Q" || rank === "K") return rank;
  if (/^[2-9]$/.test(rank)) return `0${rank}`;
  return rank;
}

export function cardSpriteFile(card, { hidden = false, empty = false } = {}) {
  if (empty) return "card_empty.png";
  if (!card || hidden) return "card_back.png";
  return `card_${card.suit}_${rankToken(card.rank)}.png`;
}

export function cardSpriteUrl(card, opts = {}) {
  return assetUrl(cardSpriteFile(card, opts));
}

export function cardBackUrl() {
  return assetUrl("card_back.png");
}

export function cardEmptyUrl() {
  return assetUrl("card_empty.png");
}

function cardSignature(card, hidden) {
  if (!card || hidden) return hidden ? "back" : "empty";
  return card.key?.() ?? `${card.rank}${card.suit}`;
}

/**
 * Build a DOM playing-card element with deal/flip/court animation classes.
 * @param {object|null} card
 * @param {{ hidden?: boolean, empty?: boolean, deal?: boolean, flip?: boolean, delayMs?: number, alt?: string }} [opts]
 */
export function createPlayingCardEl(card, opts = {}) {
  const {
    hidden = false,
    empty = false,
    deal = true,
    flip = false,
    delayMs = 0,
    alt = null,
  } = opts;

  const wrap = document.createElement("div");
  const isCourt = Boolean(card && !hidden && !empty && COURT.has(card.rank));
  wrap.className = [
    "playing-card",
    empty ? "playing-card--empty" : "",
    hidden || !card ? "playing-card--back" : "playing-card--face",
    isCourt ? "playing-card--court" : "",
    deal ? "playing-card--deal" : "",
    flip ? "playing-card--flip" : "",
  ].filter(Boolean).join(" ");
  if (delayMs) wrap.style.setProperty("--deal-delay", `${delayMs}ms`);

  const inner = document.createElement("div");
  inner.className = "playing-card__inner";

  const face = document.createElement("img");
  face.className = "playing-card__face";
  face.src = cardSpriteUrl(card, { hidden: false, empty });
  face.alt = alt ?? (card && !hidden && !empty ? card.label?.(true) ?? `${card.rank}${card.suit}` : "");
  face.draggable = false;
  face.decoding = "async";

  const back = document.createElement("img");
  back.className = "playing-card__back";
  back.src = empty ? cardEmptyUrl() : cardBackUrl();
  back.alt = empty ? "" : "Facedown card";
  back.draggable = false;
  back.decoding = "async";

  if (empty) {
    wrap.appendChild(face);
  } else if (hidden || !card) {
    wrap.appendChild(back);
  } else if (flip) {
    inner.appendChild(back);
    inner.appendChild(face);
    wrap.appendChild(inner);
  } else {
    wrap.appendChild(face);
  }

  // Accessible text fallback for screen readers / broken images
  const sr = document.createElement("span");
  sr.className = "playing-card__sr";
  sr.textContent = empty ? "" : (hidden || !card ? "Facedown" : (card.label?.(true) ?? ""));
  wrap.appendChild(sr);

  return wrap;
}

/**
 * Build a row of animated card sprites.
 * New / revealed cards deal (or flip) relative to the previous row signature.
 *
 * @param {Array<object|null>} cards
 * @param {{ hiddenMask?: Function, slots?: number|null, rowId?: string, animate?: boolean }} [opts]
 */
export function createCardSpriteRow(cards, opts = {}) {
  const { hiddenMask = null, slots = null, rowId = "default", animate = true } = opts;
  const row = document.createElement("div");
  row.className = "card-row card-row--sprites";

  const count = slots ?? cards.length;
  const prev = (lastRowSigs.get(rowId) || "").split(",");
  const nextSigs = [];

  for (let i = 0; i < count; i++) {
    const card = cards[i] ?? null;
    const empty = !card && slots != null;
    const hidden = empty ? false : (hiddenMask ? hiddenMask(i, card) : !card);
    const sig = empty ? "empty" : cardSignature(card, hidden);
    nextSigs.push(sig);

    const prevSig = prev[i] ?? "";
    const isNew = animate && sig !== prevSig && sig !== "empty";
    const isFlip = animate && prevSig === "back" && sig !== "back" && sig !== "empty";

    row.appendChild(
      createPlayingCardEl(card, {
        hidden: hidden || (!card && !empty),
        empty,
        deal: isNew && !isFlip,
        flip: isFlip,
        delayMs: isNew || isFlip ? i * 70 : 0,
        alt: card && !hidden ? card.label?.(true) : null,
      })
    );
  }

  lastRowSigs.set(rowId, nextSigs.join(","));
  return row;
}

/** Reset animation memory (e.g. when leaving a table). */
export function resetCardSpriteRowMemory(rowId) {
  if (rowId == null) lastRowSigs.clear();
  else lastRowSigs.delete(rowId);
}

/**
 * HTML string variant for overlays that still use innerHTML composition.
 * Prefer createCardSpriteRow / createPlayingCardEl when possible.
 */
export function playingCardHtml(card, opts = {}) {
  const el = createPlayingCardEl(card, opts);
  return el.outerHTML;
}

export function cardSpriteRowHtml(cards, opts = {}) {
  return createCardSpriteRow(cards, opts).outerHTML;
}
