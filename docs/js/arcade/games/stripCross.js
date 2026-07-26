/** Strip Cross — Frogger across Las Vegas Blvd. */

export function createStripCross(canvas, api) {
  const ctx = canvas.getContext("2d");
  const W = 360;
  const H = 420;
  canvas.width = W;
  canvas.height = H;

  const LANE_H = 36;
  const ROWS = 10;
  let player = { c: 4, r: ROWS - 1 };
  let hazards = [];
  let score = 0;
  let lives = 3;
  let running = false;
  let raf = 0;
  let last = 0;
  let won = false;
  let deadFlash = 0;

  function resetHazards() {
    hazards = [];
    const kinds = [
      { r: 8, speed: 70, w: 42, color: "#ffd700", gap: 110 },
      { r: 7, speed: -90, w: 50, color: "#ff5ec8", gap: 130 },
      { r: 6, speed: 110, w: 36, color: "#6ec6ff", gap: 100 },
      { r: 4, speed: -75, w: 58, color: "#3dcc8c", gap: 140 },
      { r: 3, speed: 95, w: 40, color: "#ff9f43", gap: 115 },
      { r: 2, speed: -120, w: 34, color: "#ff6b6b", gap: 95 },
    ];
    for (const k of kinds) {
      let x = Math.random() * W;
      for (let i = 0; i < 4; i += 1) {
        hazards.push({ ...k, x: x + i * k.gap });
      }
    }
  }

  function cellSize() {
    return { cw: W / 9, ch: LANE_H };
  }

  function spawn() {
    player = { c: 4, r: ROWS - 1 };
    deadFlash = 0;
  }

  function hitTest() {
    const { cw, ch } = cellSize();
    const px = player.c * cw + cw * 0.25;
    const py = player.r * ch + ch * 0.25;
    const pw = cw * 0.5;
    const ph = ch * 0.5;
    for (const h of hazards) {
      if (h.r !== player.r) continue;
      const hx = ((h.x % (W + h.w)) + (W + h.w)) % (W + h.w) - h.w * 0.2;
      if (px < hx + h.w && px + pw > hx && py < h.r * ch + ch && py + ph > h.r * ch) {
        return true;
      }
    }
    return false;
  }

  function die() {
    lives -= 1;
    deadFlash = 0.4;
    api.onHud?.({ score, lives, message: lives > 0 ? "Splat! Watch the limos." : "GAME OVER" });
    if (lives <= 0) {
      end(false);
    } else {
      spawn();
    }
  }

  function end(cleared) {
    running = false;
    cancelAnimationFrame(raf);
    const mult = cleared ? 2.5 : Math.min(2, score / 400);
    api.onEnded?.({
      won: cleared || score >= 200,
      score,
      payoutMult: mult,
      cleared,
    });
  }

  function draw() {
    const { cw, ch } = cellSize();
    ctx.fillStyle = "#0a1210";
    ctx.fillRect(0, 0, W, H);

    // Goal / sidewalks
    for (let r = 0; r < ROWS; r += 1) {
      if (r === 0) ctx.fillStyle = "#2a1a40";
      else if (r === ROWS - 1 || r === 5) ctx.fillStyle = "#1a2420";
      else ctx.fillStyle = r % 2 ? "#121a18" : "#0e1614";
      ctx.fillRect(0, r * ch, W, ch);
      if (r > 0 && r < ROWS - 1 && r !== 5) {
        ctx.strokeStyle = "rgba(255,215,0,0.15)";
        ctx.setLineDash([8, 10]);
        ctx.beginPath();
        ctx.moveTo(0, r * ch + ch / 2);
        ctx.lineTo(W, r * ch + ch / 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    ctx.fillStyle = "#ff5ec8";
    ctx.font = "bold 11px JetBrains Mono, monospace";
    ctx.fillText("★ NEON MARQUEE ★", 100, 22);

    for (const h of hazards) {
      const x = ((h.x % (W + h.w)) + (W + h.w)) % (W + h.w) - h.w * 0.2;
      ctx.fillStyle = h.color;
      ctx.fillRect(x, h.r * ch + 6, h.w, ch - 12);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(x + 4, h.r * ch + 10, 10, 8);
    }

    // Player tourist
    const px = player.c * cw + 4;
    const py = player.r * ch + 4;
    ctx.fillStyle = deadFlash > 0 ? "#ff6b6b" : "#fff8e7";
    ctx.fillRect(px, py, cw - 8, ch - 8);
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(px + 6, py + 2, cw - 20, 6);

    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillText(`SCORE ${score}   LIVES ${lives}`, 8, H - 8);
  }

  function tick(ts) {
    if (!running) return;
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    if (deadFlash > 0) deadFlash -= dt;

    for (const h of hazards) h.x += h.speed * dt;

    if (hitTest() && deadFlash <= 0) die();

    if (player.r === 0 && !won) {
      won = true;
      score += 250;
      api.onHud?.({ score, lives, message: "Made the marquee!" });
      end(true);
      return;
    }

    draw();
    raf = requestAnimationFrame(tick);
  }

  function onKey(e) {
    if (!running || deadFlash > 0) return;
    const k = e.key;
    let moved = false;
    if (k === "ArrowLeft" || k === "a") { player.c = Math.max(0, player.c - 1); moved = true; }
    if (k === "ArrowRight" || k === "d") { player.c = Math.min(8, player.c + 1); moved = true; }
    if (k === "ArrowUp" || k === "w") { player.r = Math.max(0, player.r - 1); moved = true; score += 10; }
    if (k === "ArrowDown" || k === "s") { player.r = Math.min(ROWS - 1, player.r + 1); moved = true; }
    if (moved) {
      e.preventDefault();
      api.onHud?.({ score, lives, message: "Cross the Strip…" });
    }
  }

  return {
    start() {
      score = 0;
      lives = 3;
      won = false;
      resetHazards();
      spawn();
      running = true;
      last = performance.now();
      window.addEventListener("keydown", onKey);
      api.onHud?.({ score, lives, message: "INSERT COIN — reach the neon marquee" });
      draw();
      raf = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    },
    input(dir) {
      if (!running) return;
      const map = {
        left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown",
      };
      if (map[dir]) onKey({ key: map[dir], preventDefault() {} });
    },
  };
}
