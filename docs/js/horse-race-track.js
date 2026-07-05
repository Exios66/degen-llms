/**
 * Atari / electromechanical table-racing style animated track.
 * Side-profile gallop sprites with jockeys on the race canvas.
 */

import {
  drawHorseAndJockeyAt,
  getJockeySilks,
  HORSE_GALLOP_H,
  HORSE_GALLOP_W,
} from "./horse-sprites.js";
import { fmtOdds } from "./horse_racing.js";

const TRACK_W = 640;
const SKY_H = 72;
const FOOTER_H = 8;
const LANE_H = 44;
const HORSE_SCALE = 1;

export function buildRacePlan(horses, results) {
  const count = horses.length;
  return horses.map((h, lane) => {
    const rank = results.indexOf(h.number);
    const finishNorm = 0.52 + (rank / Math.max(1, count - 1)) * 0.42;
    return {
      ...h,
      lane,
      rank,
      silks: getJockeySilks(h.number),
      finishNorm,
    };
  });
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function drawPixelRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawTrackScene(ctx, w, h, laneCount, scroll) {
  const lanesTop = SKY_H;

  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, SKY_H);
  sky.addColorStop(0, "#88d0f8");
  sky.addColorStop(1, "#c8ecff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, SKY_H);

  // Clouds
  const clouds = [[40, 18, 36], [180, 12, 28], [340, 20, 32], [500, 14, 40]];
  for (const [cx, cy, cw] of clouds) {
    drawPixelRect(ctx, cx - scroll * 0.08, cy, cw, 6, "rgba(255,255,255,0.85)");
    drawPixelRect(ctx, cx + 6 - scroll * 0.08, cy - 4, cw - 12, 5, "rgba(255,255,255,0.75)");
  }

  // Far treeline
  const treeY = SKY_H - 8;
  for (let x = 0; x < w; x += 8) {
    const th = 8 + ((x * 7) % 12);
    drawPixelRect(ctx, x - scroll * 0.15, treeY - th, 6, th, "#286838");
    drawPixelRect(ctx, x + 3 - scroll * 0.15, treeY - th - 4, 4, 4, "#388848");
  }

  // Back grass hill
  ctx.fillStyle = "#58c860";
  ctx.fillRect(0, SKY_H - 4, w, 8);

  // Back fence
  drawFence(ctx, 0, SKY_H + 2, w, scroll * 0.25);

  // Dirt track lanes
  for (let i = 0; i < laneCount; i++) {
    const ly = lanesTop + i * LANE_H;
    drawPixelRect(ctx, 0, ly, w, LANE_H - 2, i % 2 === 0 ? "#c8a878" : "#b89868");
    drawPixelRect(ctx, 0, ly + LANE_H - 3, w, 1, "rgba(0,0,0,0.1)");
  }

  // Mid fence between upper/lower lanes
  if (laneCount > 2) {
    drawFence(ctx, 0, lanesTop + Math.floor(laneCount / 2) * LANE_H - 2, w, scroll * 0.35);
  }

  // Front fence
  drawFence(ctx, 0, lanesTop + laneCount * LANE_H - 6, w, scroll * 0.45);

  // Foreground grass
  drawPixelRect(ctx, 0, lanesTop + laneCount * LANE_H, w, FOOTER_H, "#40a848");

  // Finish line — checkerboard post
  const finishX = w - 48;
  for (let y = lanesTop; y < lanesTop + laneCount * LANE_H; y += 4) {
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        const c = (row + col) % 2 === 0 ? "#f0f0f0" : "#202020";
        drawPixelRect(ctx, finishX + col * 4, y + row, 4, 4, c);
      }
    }
  }
  drawPixelRect(ctx, finishX - 2, lanesTop, 2, laneCount * LANE_H, "#f0f0f0");
}

function drawFence(ctx, x, y, w, offset) {
  drawPixelRect(ctx, x, y, w, 2, "#f8f8f8");
  for (let px = (-offset % 24) - 24; px < w + 24; px += 24) {
    drawPixelRect(ctx, px, y - 6, 3, 8, "#f0f0f0");
    drawPixelRect(ctx, px + 1, y - 8, 1, 2, "#e8e8e8");
  }
}

function drawLaneBadge(ctx, x, y, number, silks) {
  drawPixelRect(ctx, x, y, 16, 14, silks.shirt);
  drawPixelRect(ctx, x, y, 16, 2, silks.cap);
  drawPixelRect(ctx, x + 1, y + 1, 14, 12, "rgba(0,0,0,0.15)");
  ctx.fillStyle = "#fff";
  ctx.font = "bold 9px JetBrains Mono, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(number), x + 8, y + 8);
}

function drawRunner(ctx, runner, x, laneTop, animFrame) {
  const y = laneTop + Math.floor((LANE_H - HORSE_GALLOP_H * HORSE_SCALE) / 2);
  drawHorseAndJockeyAt(ctx, runner.spriteId, x, y, {
    scale: HORSE_SCALE,
    frame: animFrame,
    animation: "gallop",
    direction: "right",
    horseNumber: runner.number,
    jockeySilks: runner.silks,
  });
  drawLaneBadge(ctx, x - 20, laneTop + 14, runner.number, runner.silks);
}

/**
 * Build the arcade race cabinet DOM: status bar + animated canvas.
 * @param {object} opts
 * @param {object} opts.card — race card with horses[]
 * @param {number[]} opts.results — finish order (horse numbers)
 * @param {object[]} [opts.slips] — player tickets for status bar
 * @param {number} [opts.raceNumber]
 * @param {boolean} [opts.autoRun] — start animation immediately
 * @param {function} [opts.onComplete] — fired when race finishes
 */
export function createRaceTrackView({
  card,
  results,
  slips = [],
  raceNumber = 1,
  autoRun = true,
  onComplete = null,
}) {
  const horses = card.horses;
  const plan = buildRacePlan(horses, results);
  const laneCount = horses.length;
  const canvasH = SKY_H + laneCount * LANE_H + FOOTER_H;

  const root = document.createElement("div");
  root.className = "race-cabinet";

  const marquee = document.createElement("div");
  marquee.className = "race-cabinet-marquee";
  marquee.textContent = "★  MANDALAY ELECTRIC DERBY  ★";

  const statusBar = document.createElement("div");
  statusBar.className = "race-status-bar";

  const statusLeft = document.createElement("span");
  statusLeft.className = "race-status-left";
  const statusRight = document.createElement("span");
  statusRight.className = "race-status-right";

  const primarySlip = slips[0];
  if (primarySlip) {
    const h = horses.find((x) => x.number === primarySlip.horse);
    const silks = getJockeySilks(primarySlip.horse);
    statusLeft.textContent = `#${primarySlip.horse} ${h?.name ?? primarySlip.horseName} (${silks.name}) ${fmtOdds(primarySlip.odds)} — Stake ${primarySlip.amount}`;
  } else {
    statusLeft.textContent = `${laneCount} runners — ${card.track}`;
  }
  statusRight.textContent = `Race ${raceNumber}`;

  statusBar.appendChild(statusLeft);
  statusBar.appendChild(statusRight);

  const screen = document.createElement("div");
  screen.className = "race-cabinet-screen";

  const canvas = document.createElement("canvas");
  canvas.className = "race-track-canvas";
  canvas.width = TRACK_W;
  canvas.height = canvasH;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", `Horse race animation, ${laneCount} runners at ${card.track}`);

  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  screen.appendChild(canvas);

  const controls = document.createElement("div");
  controls.className = "race-cabinet-controls";
  const runBtn = document.createElement("button");
  runBtn.className = "btn primary race-run-btn";
  runBtn.textContent = autoRun ? "Racing…" : "Start race";
  runBtn.disabled = autoRun;
  controls.appendChild(runBtn);

  root.appendChild(marquee);
  root.appendChild(statusBar);
  root.appendChild(screen);
  if (!autoRun) root.appendChild(controls);

  const startX = 24;
  const finishX = TRACK_W - 88;
  const raceDurationMs = 4200 + laneCount * 280;
  let animId = null;
  let startTime = null;
  let finished = false;

  function renderFrame(elapsed) {
    const scroll = elapsed * 0.04;
    const animFrame = Math.floor(elapsed / 55) % 4;

    ctx.clearRect(0, 0, TRACK_W, canvasH);
    drawTrackScene(ctx, TRACK_W, canvasH, laneCount, scroll);

    const sorted = [...plan].sort((a, b) => {
      const pa = easeOutCubic(Math.min(1, elapsed / (raceDurationMs * a.finishNorm)));
      const pb = easeOutCubic(Math.min(1, elapsed / (raceDurationMs * b.finishNorm)));
      return pa - pb;
    });

    for (const runner of sorted) {
      const t = easeOutCubic(Math.min(1, elapsed / (raceDurationMs * runner.finishNorm)));
      const x = startX + t * (finishX - startX);
      const laneTop = SKY_H + runner.lane * LANE_H;
      drawRunner(ctx, runner, x, laneTop, animFrame);
    }

    if (elapsed >= raceDurationMs && !finished) {
      finished = true;
      runBtn.textContent = "Finished!";
      runBtn.disabled = true;
      root.classList.add("race-cabinet--finished");
      statusRight.textContent = `Race ${raceNumber} — Official`;
      if (onComplete) onComplete({ results, plan });
    }
  }

  function tick(ts) {
    if (!startTime) startTime = ts;
    const elapsed = ts - startTime;
    renderFrame(elapsed);
    if (!finished) animId = requestAnimationFrame(tick);
  }

  function startRace() {
    if (animId) cancelAnimationFrame(animId);
    finished = false;
    startTime = null;
    runBtn.textContent = "Racing…";
    runBtn.disabled = true;
    root.classList.remove("race-cabinet--finished");
    animId = requestAnimationFrame(tick);
  }

  runBtn.onclick = startRace;

  // Preview frame at starting gate
  renderFrame(0);

  if (autoRun) {
    requestAnimationFrame(() => requestAnimationFrame(startRace));
  }

  root.cleanup = () => {
    if (animId) cancelAnimationFrame(animId);
  };

  return root;
}

/** Static starting-gate preview — all card horses visible before the race. */
export function createRacePreview(card) {
  const preview = createRaceTrackView({
    card,
    results: card.horses.map((h) => h.number),
    autoRun: false,
    raceNumber: 0,
  });
  const statusRight = preview.querySelector(".race-status-right");
  if (statusRight) statusRight.textContent = "Post Parade";
  const btn = preview.querySelector(".race-run-btn");
  if (btn) btn.textContent = "Preview gate";
  return preview;
}

export { TRACK_W, LANE_H, HORSE_SCALE, HORSE_GALLOP_W, HORSE_GALLOP_H };
