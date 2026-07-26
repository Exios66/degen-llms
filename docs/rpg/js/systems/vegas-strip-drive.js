/**
 * Retro arcade OutRun-lite: scanline pseudo-3D Strip drive with neon skyline,
 * traffic dodge, and tip pickups. Canvas-only — not Phaser tile art.
 */

const W = 640;
const H = 360;
const HORIZON_Y = Math.floor(H * 0.38);
const CAM_DEPTH = 0.55;
const Z_FAR = 1.4;
const NEAR_HALF_W = 290;
const PLAYER_Z = 0.04;
const DURATION_MS = 55_000;
const CLEAR_REWARD = 30;
const SCALE_NEAR = CAM_DEPTH / (CAM_DEPTH + 0);
const SCALE_FAR = CAM_DEPTH / (CAM_DEPTH + Z_FAR);

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
 * Shared projection for road scanlines, cars, tips, and the player.
 * z = 0 at the near bumper, z grows toward the horizon.
 * Near maps to the bottom of the canvas; far maps to HORIZON_Y.
 * @param {number} z
 * @param {number} lat lane in [-1, 1]
 * @param {number} playerLane current player lane (world slides opposite)
 */
function project(z, lat, playerLane) {
  const zClamped = clamp(z, 0, Z_FAR);
  const scale = CAM_DEPTH / (CAM_DEPTH + zClamped);
  // 1 at bumper, 0 at horizon — drives screen Y and foreshortening.
  const t = (scale - SCALE_FAR) / (SCALE_NEAR - SCALE_FAR);
  const y = HORIZON_Y + t * (H - HORIZON_Y - 6);
  const roadHalfW = NEAR_HALF_W * (scale / SCALE_NEAR);
  // Steering slides the world under the car (classic arcade feel).
  const centerX = W / 2 - playerLane * roadHalfW * 0.55;
  const x = centerX + lat * roadHalfW * 0.78;
  return {
    x,
    y: clamp(y, HORIZON_Y, H - 2),
    scale: clamp(scale / SCALE_NEAR, 0.05, 1.25),
    roadHalfW,
    centerX,
  };
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
    // Prefer left / center / right lanes so traffic reads as a boulevard.
    const lanes = [-0.62, -0.2, 0.2, 0.62];
    entities.push({
      z: 1.25,
      lane: tip ? rnd(-0.55, 0.55) : lanes[Math.floor(Math.random() * lanes.length)],
      kind: tip ? "tip" : "car",
      w: tip ? 0.1 : 0.2,
    });
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
    g.addColorStop(0, "#120c28");
    g.addColorStop(0.55, "#2a1450");
    g.addColorStop(1, "#a04838");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, HORIZON_Y);

    ctx.fillStyle = "rgba(255,240,200,0.5)";
    for (let i = 0; i < 36; i += 1) {
      const sx = (i * 97 + distance * 12) % W;
      const sy = 6 + (i * 53) % (HORIZON_Y * 0.7);
      ctx.fillRect(sx, sy, 2, 2);
    }

    ctx.fillStyle = "#f4e6b8";
    ctx.beginPath();
    ctx.arc(W - 64, 42, 16, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSkyline() {
    const baseY = HORIZON_Y;
    const scroll = (distance * 55) % 180;
    for (let i = -1; i < 9; i += 1) {
      const bx = i * 82 - scroll;
      const bh = 28 + ((i * 41) % 58);
      ctx.fillStyle = i % 2 === 0 ? "#101022" : "#16122e";
      ctx.fillRect(bx, baseY - bh, 64, bh);
      ctx.fillStyle = "#d0a040";
      for (let wy = baseY - bh + 5; wy < baseY - 6; wy += 9) {
        for (let wx = bx + 5; wx < bx + 58; wx += 11) {
          if (((wx + wy) * 11) % 7 !== 0) ctx.fillRect(wx, wy, 3, 3);
        }
      }
    }

    const lm = LANDMARKS[landmarkIdx % LANDMARKS.length];
    const lx = W * 0.58 - landmarkDist * 140;
    if (lx > -90 && lx < W + 90) {
      ctx.fillStyle = lm.color;
      if (lm.shape === "pyramid") {
        ctx.beginPath();
        ctx.moveTo(lx, baseY);
        ctx.lineTo(lx + 34, baseY - 64);
        ctx.lineTo(lx + 68, baseY);
        ctx.fill();
        ctx.fillStyle = "#fff4c0";
        ctx.fillRect(lx + 32, baseY - 84, 3, 20);
      } else if (lm.shape === "castle") {
        ctx.fillRect(lx, baseY - 50, 56, 50);
        ctx.fillRect(lx - 3, baseY - 64, 10, 16);
        ctx.fillRect(lx + 22, baseY - 72, 10, 24);
        ctx.fillRect(lx + 48, baseY - 64, 10, 16);
      } else if (lm.shape === "sign") {
        ctx.fillRect(lx + 18, baseY - 46, 7, 46);
        ctx.fillRect(lx, baseY - 58, 44, 14);
        ctx.fillStyle = "#101018";
        ctx.font = "bold 10px monospace";
        ctx.fillText("LIVE", lx + 8, baseY - 47);
      } else {
        ctx.fillRect(lx + 8, baseY - 88, 26, 88);
        ctx.fillRect(lx, baseY - 98, 42, 12);
        ctx.fillStyle = "#50e8d0";
        for (let y = baseY - 84; y < baseY - 8; y += 7) {
          ctx.fillRect(lx + 13, y, 14, 2);
        }
      }
    }
  }

  /**
   * Classic scanline road: asphalt, curbs, converging dashes, sidewalks.
   * Uses the same projection math as cars/tips.
   */
  /** Invert screen Y → depth z so every scanline is contiguous (no ladder gaps). */
  function zAtScreenY(screenY) {
    const span = H - HORIZON_Y - 6;
    const t = clamp((screenY - HORIZON_Y) / span, 0, 1); // 0 far → 1 near
    const scale = SCALE_FAR + t * (SCALE_NEAR - SCALE_FAR);
    return CAM_DEPTH / scale - CAM_DEPTH;
  }

  function drawRoad() {
    // Desert / parking apron beside the boulevard
    const ground = ctx.createLinearGradient(0, HORIZON_Y, 0, H);
    ground.addColorStop(0, "#2a2438");
    ground.addColorStop(1, "#1a1624");
    ctx.fillStyle = ground;
    ctx.fillRect(0, HORIZON_Y, W, H - HORIZON_Y);

    // One horizontal scanline per pixel row — solid asphalt, no shutter gaps.
    for (let y = HORIZON_Y; y < H; y += 1) {
      const z = zAtScreenY(y);
      const p = project(z, 0, lane);
      const half = p.roadHalfW;
      const cx = p.centerX;
      const left = cx - half;
      const right = cx + half;
      const t = clamp((y - HORIZON_Y) / (H - HORIZON_Y), 0, 1);

      // Sidewalk bands just outside the curb
      const walk = half * 0.14;
      ctx.fillStyle = (Math.floor(z * 20 + distance * 8) % 2 === 0) ? "#3a3448" : "#322c40";
      ctx.fillRect(left - walk, y, walk, 1);
      ctx.fillRect(right, y, walk, 1);

      // Asphalt body — cool slate gray (readable as pavement)
      const shade = 62 + Math.floor(t * 40);
      ctx.fillStyle = `rgb(${shade - 4}, ${shade + 2}, ${shade + 10})`;
      ctx.fillRect(left, y, Math.max(1, right - left), 1);
      // Subtle asphalt grain
      if ((y + Math.floor(distance * 10)) % 5 === 0) {
        ctx.fillStyle = `rgba(0,0,0,${0.06 + t * 0.05})`;
        ctx.fillRect(left + half * 0.2, y, half * 0.15, 1);
        ctx.fillRect(cx + half * 0.1, y, half * 0.2, 1);
      }

      // Thin white edge lines (boulevard shoulders)
      const edgeW = Math.max(1.5, 3.5 * p.scale);
      ctx.fillStyle = "#e8e0d0";
      ctx.fillRect(left + 1, y, edgeW, 1);
      ctx.fillRect(right - edgeW - 1, y, edgeW, 1);

      // Outer rumble tick (narrow — never a red triangle fill)
      const rumbleW = Math.max(1.5, half * 0.022);
      const rumbleOn = Math.floor(distance * 36 + z * 20) % 2 === 0;
      ctx.fillStyle = rumbleOn ? "#d4a84a" : "#8a3040";
      ctx.fillRect(left - rumbleW, y, rumbleW, 1);
      ctx.fillRect(right, y, rumbleW, 1);

      // Longitudinal lane dashes (world-space along depth so they elongate near-camera)
      const dashWave = ((distance * 3.2 - z * 4.5) % 1 + 1) % 1;
      if (dashWave < 0.45) {
        const dashW = Math.max(1.5, 5 * p.scale);
        ctx.fillStyle = "#f2dc70";
        for (const lat of [-0.34, 0.34]) {
          const dx = cx + lat * half * 0.78;
          ctx.fillRect(dx - dashW / 2, y, dashW, 1);
        }
      }
    }

    // Scrolling roadside lamps outside the curb (scale with projection)
    for (let i = 0; i < 14; i += 1) {
      const depthZ = ((i / 14) + (distance * 0.45) % 1) % 1 * Z_FAR * 0.95 + 0.05;
      const side = i % 2 === 0 ? -1 : 1;
      const p = project(depthZ, side * 1.12, lane);
      if (p.y <= HORIZON_Y + 2 || p.scale < 0.08) continue;
      const s = p.scale;
      const postH = 44 * s;
      const postW = Math.max(1.5, 2.5 * s);
      ctx.fillStyle = "#b0a890";
      ctx.fillRect(p.x - postW / 2, p.y - postH, postW, postH);
      ctx.fillStyle = "#f0c060";
      ctx.beginPath();
      ctx.arc(p.x, p.y - postH - 2 * s, Math.max(1.5, 4 * s), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2f6a40";
      ctx.fillRect(p.x - 9 * s, p.y - postH * 0.7, 18 * s, Math.max(2, 5 * s));
    }
  }

  function drawCar(x, y, scale, color, player = false) {
    const s = clamp(scale, 0.08, 1.4);
    const w = (player ? 72 : 54) * s;
    const h = (player ? 36 : 26) * s;
    const top = y - h;

    // Shadow on asphalt
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(x - w * 0.45, y - 3 * s, w * 0.9, Math.max(2, 4 * s));

    // Body
    ctx.fillStyle = color;
    ctx.fillRect(x - w / 2, top + h * 0.2, w, h * 0.7);
    // Cabin
    ctx.fillStyle = player ? "#70d8f0" : "#1a2838";
    ctx.fillRect(x - w * 0.32, top + h * 0.05, w * 0.64, h * 0.38);
    // Roof lip
    ctx.fillStyle = color;
    ctx.fillRect(x - w * 0.28, top, w * 0.56, h * 0.18);
    // Taillights / headlights
    ctx.fillStyle = player ? "#ff4058" : "#f8e060";
    ctx.fillRect(x - w / 2, top + h * 0.55, w * 0.16, h * 0.18);
    ctx.fillRect(x + w / 2 - w * 0.16, top + h * 0.55, w * 0.16, h * 0.18);
    if (player) {
      ctx.fillStyle = "#ffe060";
      ctx.fillRect(x - w * 0.08, top - h * 0.12, w * 0.16, h * 0.14);
    }
  }

  function drawTip(x, y, scale) {
    const s = clamp(scale, 0.1, 1.2);
    const r = 10 * s;
    // Sit on the road surface (chip rests just above asphalt).
    const cy = y - r * 0.35;
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(x, y - 1, r * 0.7, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f0c040";
    ctx.beginPath();
    ctx.arc(x, cy, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#a07020";
    ctx.lineWidth = Math.max(1, 1.5 * s);
    ctx.stroke();
    ctx.fillStyle = "#503010";
    ctx.font = `bold ${Math.max(8, Math.floor(12 * s))}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", x, cy + 1);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  function drawEntities() {
    const sorted = [...entities].sort((a, b) => b.z - a.z);
    for (const e of sorted) {
      if (e.z < 0.02 || e.z > 1.4) continue;
      const p = project(e.z, e.lane, lane);
      if (e.kind === "tip") drawTip(p.x, p.y, p.scale * 1.15);
      else {
        const color = e.lane < 0 ? "#3a78d8" : e.lane > 0.3 ? "#40b870" : "#d8a040";
        drawCar(p.x, p.y, p.scale * 1.05, color, false);
      }
    }
  }

  function drawPlayer() {
    const p = project(PLAYER_Z, 0, lane);
    // Keep the player planted on the near road, steered by world slide.
    const x = W / 2;
    drawCar(x, Math.min(H - 10, p.y + 6), 1.2, "#e84868", true);
  }

  function drawHudChrome() {
    ctx.fillStyle = "rgba(8, 6, 16, 0.55)";
    ctx.fillRect(0, 0, W, 34);
    ctx.fillStyle = "#ffe8a0";
    ctx.font = "bold 14px monospace";
    ctx.fillText("STRIP DRIVE", 12, 22);
    ctx.fillStyle = "#a8e8ff";
    ctx.fillText(`SCORE ${score}`, 160, 22);
    ctx.fillText(`TIPS ${tips}`, 280, 22);
    const t = Math.max(0, (DURATION_MS - elapsed) / 1000);
    ctx.fillText(`TIME ${t.toFixed(1)}`, 400, 22);
    ctx.fillStyle = "#f0a0c0";
    ctx.fillText(status, 510, 22);

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

    for (const e of entities) {
      e.z -= speed * dt * 0.55;
    }
    entities = entities.filter((e) => {
      if (e.z > PLAYER_Z + 0.03) return true;
      if (e.z < -0.05) return false;
      // Player sits at lane 0 in local space; world slide means entities
      // compare against their authored lane vs player lane.
      const overlap = Math.abs(e.lane - lane) < (e.w + 0.16);
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
