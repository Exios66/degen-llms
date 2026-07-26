/**
 * Retro arcade OutRun-lite: pseudo-3D Strip scroll with neon skyline,
 * traffic dodge, and tip pickups. Canvas-only — not Phaser tile art.
 */

const W = 640;
const H = 360;
const ROAD_W_NEAR = 420;
const DURATION_MS = 55_000;
const CLEAR_REWARD = 30;

const LANDMARKS = [
  { name: "MANDALAY", color: "#e8c060", shape: "tower" },
  { name: "LUXOR", color: "#f0d060", shape: "pyramid" },
  { name: "EXCALIBUR", color: "#d06070", shape: "castle" },
  { name: "NEON", color: "#60e0ff", shape: "sign" },
];

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function rnd(a, b) {
  return a + Math.random() * (b - a);
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *   onHud?: (hud: { score: number, tips: number, timeLeft: number, status: string }) => void,
 *   onEnd?: (result: { cleared: boolean, score: number, tips: number, reward: number }) => void,
 * }} hooks
 */
export function createStripDriveGame(canvas, hooks = {}) {
  const ctx = canvas.getContext("2d");
  canvas.width = W;
  canvas.height = H;

  const input = { left: false, right: false, accel: false };
  let running = false;
  let raf = 0;
  let lastTs = 0;
  let elapsed = 0;
  let distance = 0;
  let speed = 0;
  let lane = 0; // -1..1
  let score = 0;
  let tips = 0;
  let status = "Ready";
  let crashFlash = 0;
  let ended = false;

  /** @type {{ z: number, lane: number, kind: "car"|"tip", w: number }[]} */
  let entities = [];
  let spawnAcc = 0;
  let landmarkIdx = 0;
  let landmarkDist = 0;

  const keyDown = (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") input.left = true;
    if (e.code === "ArrowRight" || e.code === "KeyD") input.right = true;
    if (e.code === "ArrowUp" || e.code === "KeyW" || e.code === "Space") {
      input.accel = true;
      e.preventDefault();
    }
  };
  const keyUp = (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") input.left = false;
    if (e.code === "ArrowRight" || e.code === "KeyD") input.right = false;
    if (e.code === "ArrowUp" || e.code === "KeyW" || e.code === "Space") input.accel = false;
  };

  function reset() {
    elapsed = 0;
    distance = 0;
    speed = 0;
    lane = 0;
    score = 0;
    tips = 0;
    status = "Hit the Strip";
    crashFlash = 0;
    ended = false;
    entities = [];
    spawnAcc = 0;
    landmarkIdx = 0;
    landmarkDist = 0;
    lastTs = 0;
    emitHud();
  }

  function emitHud() {
    hooks.onHud?.({
      score,
      tips,
      timeLeft: Math.max(0, (DURATION_MS - elapsed) / 1000),
      status,
    });
  }

  function finish(cleared) {
    if (ended) return;
    ended = true;
    running = false;
    cancelAnimationFrame(raf);
    const reward = cleared ? CLEAR_REWARD : Math.min(15, tips * 5);
    status = cleared ? `Clear! +$${reward}` : `Crash out · tips $${reward}`;
    emitHud();
    hooks.onEnd?.({ cleared, score, tips, reward });
  }

  function spawnEntity() {
    const tip = Math.random() < 0.35;
    entities.push({
      z: 1,
      lane: rnd(-0.75, 0.75),
      kind: tip ? "tip" : "car",
      w: tip ? 0.12 : 0.22,
    });
  }

  function project(z, lat) {
    const scale = 1 / (z + 0.15);
    const y = H * 0.42 + (H * 0.55) * (1 - scale * 0.85);
    const roadW = ROAD_W_NEAR * scale;
    const x = W / 2 + lat * roadW * 0.5;
    return { x, y, scale, roadW };
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.45);
    g.addColorStop(0, "#1a1040");
    g.addColorStop(0.45, "#3a1860");
    g.addColorStop(1, "#c85840");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H * 0.45);

    // Stars
    ctx.fillStyle = "rgba(255,240,200,0.55)";
    for (let i = 0; i < 40; i += 1) {
      const sx = (i * 97 + distance * 8) % W;
      const sy = 8 + (i * 53) % (H * 0.28);
      ctx.fillRect(sx, sy, 2, 2);
    }

    // Moon
    ctx.fillStyle = "#f8e8c0";
    ctx.beginPath();
    ctx.arc(W - 70, 48, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSkyline() {
    const baseY = H * 0.42;
    const scroll = (distance * 40) % 200;
    for (let i = -1; i < 8; i += 1) {
      const bx = i * 90 - scroll;
      const bh = 40 + ((i * 37) % 70);
      ctx.fillStyle = i % 2 === 0 ? "#141028" : "#1c1438";
      ctx.fillRect(bx, baseY - bh, 70, bh);
      // Windows
      ctx.fillStyle = "#f0c060";
      for (let wy = baseY - bh + 6; wy < baseY - 8; wy += 10) {
        for (let wx = bx + 6; wx < bx + 62; wx += 12) {
          if (((wx + wy) * 13) % 5 !== 0) ctx.fillRect(wx, wy, 4, 4);
        }
      }
    }

    const lm = LANDMARKS[landmarkIdx % LANDMARKS.length];
    const lx = W * 0.55 - (landmarkDist * 120);
    if (lx > -80 && lx < W + 80) {
      ctx.fillStyle = lm.color;
      if (lm.shape === "pyramid") {
        ctx.beginPath();
        ctx.moveTo(lx, baseY);
        ctx.lineTo(lx + 36, baseY - 70);
        ctx.lineTo(lx + 72, baseY);
        ctx.fill();
        ctx.fillStyle = "#fff8c0";
        ctx.fillRect(lx + 34, baseY - 90, 4, 22);
      } else if (lm.shape === "castle") {
        ctx.fillRect(lx, baseY - 55, 60, 55);
        ctx.fillRect(lx - 4, baseY - 70, 12, 18);
        ctx.fillRect(lx + 24, baseY - 78, 12, 26);
        ctx.fillRect(lx + 52, baseY - 70, 12, 18);
      } else if (lm.shape === "sign") {
        ctx.fillRect(lx + 20, baseY - 50, 8, 50);
        ctx.fillRect(lx, baseY - 62, 48, 16);
        ctx.fillStyle = "#101018";
        ctx.font = "bold 10px monospace";
        ctx.fillText("LIVE", lx + 10, baseY - 50);
      } else {
        ctx.fillRect(lx + 8, baseY - 95, 28, 95);
        ctx.fillRect(lx, baseY - 105, 44, 14);
        ctx.fillStyle = "#60ffe0";
        for (let y = baseY - 90; y < baseY - 10; y += 8) {
          ctx.fillRect(lx + 14, y, 16, 3);
        }
      }
    }
  }

  function drawRoad() {
    const horizon = H * 0.42;
    ctx.fillStyle = "#2a2038";
    ctx.fillRect(0, horizon, W, H - horizon);

    // Road trapezoid
    ctx.fillStyle = "#303848";
    ctx.beginPath();
    ctx.moveTo(W / 2 - 40, horizon);
    ctx.lineTo(W / 2 + 40, horizon);
    ctx.lineTo(W / 2 + ROAD_W_NEAR / 2, H);
    ctx.lineTo(W / 2 - ROAD_W_NEAR / 2, H);
    ctx.closePath();
    ctx.fill();

    // Shoulder glow
    const edge = ctx.createLinearGradient(0, horizon, 0, H);
    edge.addColorStop(0, "rgba(255, 120, 60, 0)");
    edge.addColorStop(1, "rgba(255, 160, 40, 0.35)");
    ctx.fillStyle = edge;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 48, horizon);
    ctx.lineTo(W / 2 - 40, horizon);
    ctx.lineTo(W / 2 - ROAD_W_NEAR / 2, H);
    ctx.lineTo(W / 2 - ROAD_W_NEAR / 2 - 28, H);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(W / 2 + 40, horizon);
    ctx.lineTo(W / 2 + 48, horizon);
    ctx.lineTo(W / 2 + ROAD_W_NEAR / 2 + 28, H);
    ctx.lineTo(W / 2 + ROAD_W_NEAR / 2, H);
    ctx.closePath();
    ctx.fill();

    // Lane dashes
    const dashScroll = (distance * 220) % 1;
    for (let i = 0; i < 14; i += 1) {
      const z = (i + dashScroll) / 14;
      const p = project(z, 0);
      const h = Math.max(2, 10 * p.scale);
      ctx.fillStyle = "rgba(255, 220, 120, 0.75)";
      ctx.fillRect(p.x - 3 * p.scale, p.y, 6 * p.scale, h);
    }
  }

  function drawCar(x, y, scale, color, player = false) {
    const w = 56 * scale;
    const h = 28 * scale;
    ctx.fillStyle = color;
    ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = player ? "#80e8ff" : "#203048";
    ctx.fillRect(x - w * 0.35, y - h * 0.85, w * 0.7, h * 0.35);
    ctx.fillStyle = "#f8e060";
    ctx.fillRect(x - w / 2, y - h * 0.35, w * 0.18, h * 0.2);
    ctx.fillRect(x + w / 2 - w * 0.18, y - h * 0.35, w * 0.18, h * 0.2);
    if (player) {
      ctx.fillStyle = "#ff4060";
      ctx.fillRect(x - w * 0.1, y - h * 1.15, w * 0.2, h * 0.2);
    }
  }

  function drawTip(x, y, scale) {
    const s = 16 * scale;
    ctx.fillStyle = "#f0c040";
    ctx.beginPath();
    ctx.arc(x, y - s, s * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#604010";
    ctx.font = `bold ${Math.max(8, 12 * scale)}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText("$", x, y - s * 0.7);
    ctx.textAlign = "left";
  }

  function drawPlayer() {
    const p = project(0.08, lane);
    drawCar(p.x, H - 18, 1.15, "#e84868", true);
  }

  function drawEntities() {
    const sorted = [...entities].sort((a, b) => b.z - a.z);
    for (const e of sorted) {
      const p = project(e.z, e.lane);
      if (e.kind === "tip") drawTip(p.x, p.y, p.scale * 1.4);
      else drawCar(p.x, p.y, p.scale * 1.1, e.lane < 0 ? "#4080e0" : "#50c878");
    }
  }

  function drawHudChrome() {
    ctx.fillStyle = "rgba(8, 6, 16, 0.55)";
    ctx.fillRect(0, 0, W, 36);
    ctx.fillStyle = "#ffe8a0";
    ctx.font = "bold 14px monospace";
    ctx.fillText("STRIP DRIVE", 12, 22);
    ctx.fillStyle = "#a8e8ff";
    ctx.fillText(`SCORE ${score}`, 160, 22);
    ctx.fillText(`TIPS ${tips}`, 280, 22);
    const t = Math.max(0, (DURATION_MS - elapsed) / 1000);
    ctx.fillText(`TIME ${t.toFixed(1)}`, 400, 22);
    ctx.fillStyle = "#f0a0c0";
    ctx.fillText(status, 520, 22);

    if (crashFlash > 0) {
      ctx.fillStyle = `rgba(255,40,60,${clamp(crashFlash, 0, 0.45)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function update(dt) {
    if (ended) return;
    elapsed += dt * 1000;
    if (elapsed >= DURATION_MS) {
      score += tips * 10 + Math.floor(distance * 2);
      finish(true);
      return;
    }

    const target = input.accel ? 1 : 0.35;
    speed += (target - speed) * Math.min(1, dt * 3);
    distance += speed * dt;

    const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    lane = clamp(lane + steer * dt * (1.1 + speed * 0.4), -0.92, 0.92);

    landmarkDist += speed * dt * 0.35;
    if (landmarkDist > 1.4) {
      landmarkDist = 0;
      landmarkIdx += 1;
    }

    spawnAcc += dt * (0.7 + speed);
    if (spawnAcc > 1) {
      spawnAcc = 0;
      spawnEntity();
    }

    const playerZ = 0.08;
    for (const e of entities) {
      e.z -= speed * dt * 0.55;
    }
    entities = entities.filter((e) => {
      if (e.z > playerZ + 0.02) return true;
      if (e.z < -0.05) return false;
      const overlap = Math.abs(e.lane - lane) < (e.w + 0.14);
      if (!overlap) return e.z > -0.02;
      if (e.kind === "tip") {
        tips += 1;
        score += 25;
        status = "Tip jar!";
        return false;
      }
      crashFlash = 0.6;
      status = "Screech!";
      finish(false);
      return false;
    });

    score += Math.floor(speed * dt * 12);
    crashFlash = Math.max(0, crashFlash - dt);
    emitHud();
  }

  function frame(ts) {
    if (!running) return;
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    update(dt);
    drawSky();
    drawSkyline();
    drawRoad();
    drawEntities();
    drawPlayer();
    drawHudChrome();
    raf = requestAnimationFrame(frame);
  }

  function start() {
    reset();
    running = true;
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener("keydown", keyDown);
    window.removeEventListener("keyup", keyUp);
  }

  function setInput(partial) {
    Object.assign(input, partial);
  }

  return { start, stop, setInput, reset, canvas, CLEAR_REWARD };
}

export { CLEAR_REWARD, DURATION_MS };
