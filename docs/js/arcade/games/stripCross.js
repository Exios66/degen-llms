/** Strip Cross — Frogger across Las Vegas Blvd. */

import { ARCADE_W as W, ARCADE_H as H, setupArcadeCanvas } from "../gfx/display.js";
import { fillDither, fillStripeShade, withAlpha } from "../gfx/pixel.js";
import { frameAt, pulse01 } from "../gfx/anim.js";
import { createParticlePool } from "../gfx/fx.js";
import { drawTourist, drawVehicle } from "../gfx/sprites.js";

export function createStripCross(canvas, api) {
  const ctx = setupArcadeCanvas(canvas);
  const fx = createParticlePool(100);

  const LANE_H = 72;
  const ROWS = 10;
  let player = { c: 4, r: ROWS - 1, dir: "up", anim: 0, hop: 0 };
  let hazards = [];
  let score = 0;
  let lives = 3;
  let running = false;
  let raf = 0;
  let last = 0;
  let won = false;
  let deadFlash = 0;
  let time = 0;
  let marqueePhase = 0;

  function resetHazards() {
    hazards = [];
    const kinds = [
      { r: 8, speed: 140, w: 84, color: "#ffd700", gap: 220 },
      { r: 7, speed: -180, w: 100, color: "#ff5ec8", gap: 260 },
      { r: 6, speed: 220, w: 72, color: "#6ec6ff", gap: 200 },
      { r: 4, speed: -150, w: 116, color: "#3dcc8c", gap: 280 },
      { r: 3, speed: 190, w: 80, color: "#ff9f43", gap: 230 },
      { r: 2, speed: -240, w: 68, color: "#ff6b6b", gap: 190 },
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
    player = { c: 4, r: ROWS - 1, dir: "up", anim: 0, hop: 0 };
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
    const { cw, ch } = cellSize();
    const px = player.c * cw + cw / 2;
    const py = player.r * ch + ch / 2;
    fx.burst(px, py, "#ff6b6b");
    fx.spawn(px, py, { count: 10, color: "#fff8e7", speed: 100, life: 0.4, size: 2 });
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
    if (cleared) fx.confetti(W / 2, 40);
    const mult = cleared ? 2.5 : Math.min(2, score / 400);
    api.onEnded?.({
      won: cleared || score >= 200,
      score,
      payoutMult: mult,
      cleared,
    });
  }

  function drawBackground() {
    const { ch } = cellSize();
    ctx.fillStyle = "#0a1210";
    ctx.fillRect(0, 0, W, H);

    for (let r = 0; r < ROWS; r += 1) {
      const y = r * ch;
      if (r === 0) {
        // Neon marquee zone
        fillDither(ctx, 0, y, W, ch, "#2a1a40", "#3d2860", 3, 0.18);
        const shimmer = 0.55 + pulse01(marqueePhase, 1) * 0.45;
        ctx.fillStyle = withAlpha("#ff5ec8", shimmer);
        ctx.font = "bold 22px JetBrains Mono, monospace";
        ctx.textAlign = "center";
        const letters = "★ NEON MARQUEE ★";
        const wave = Math.sin(marqueePhase * 4) * 2;
        ctx.fillText(letters, W / 2, y + 28 + wave);
        ctx.fillStyle = withAlpha("#ffd700", shimmer * 0.85);
        ctx.font = "bold 14px JetBrains Mono, monospace";
        ctx.fillText("· VEGAS STRIP ·", W / 2, y + 50);
        ctx.textAlign = "left";
        // Marquee bulbs
        for (let i = 0; i < 18; i += 1) {
          const on = (frameAt(marqueePhase + i * 0.05, 8, 2) === (i % 2));
          ctx.fillStyle = on ? "#ffd700" : "#5a4020";
          ctx.fillRect(16 + i * 38, y + 8, 6, 6);
        }
      } else if (r === ROWS - 1 || r === 5) {
        fillDither(ctx, 0, y, W, ch, "#1a2420", "#2a3830", r + 7, 0.14);
        // Sidewalk cracks
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.beginPath();
        ctx.moveTo(0, y + ch * 0.5);
        ctx.lineTo(W, y + ch * 0.5);
        ctx.stroke();
      } else {
        fillStripeShade(ctx, 0, y, W, ch, r % 2 ? "#121a18" : "#0e1614", "rgba(0,0,0,0.15)");
        // Asphalt grit
        fillDither(ctx, 0, y, W, ch, "rgba(0,0,0,0)", "#1a2824", r * 13, 0.1);
        // Lane dashes with slight parallax shimmer
        const dashOff = (time * 40 * (r % 2 ? 1 : -1)) % 36;
        ctx.strokeStyle = withAlpha("#ffd700", 0.22 + pulse01(time + r, 0.5) * 0.08);
        ctx.setLineDash([16, 20]);
        ctx.lineDashOffset = -dashOff;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, y + ch / 2);
        ctx.lineTo(W, y + ch / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
        ctx.lineWidth = 1;
      }
    }
  }

  function draw() {
    const { cw, ch } = cellSize();
    drawBackground();

    for (const h of hazards) {
      const x = ((h.x % (W + h.w)) + (W + h.w)) % (W + h.w) - h.w * 0.2;
      drawVehicle(ctx, x, h.r * ch + 10, h.w, ch - 20, h.color, time, h.speed > 0);
    }

    // Player tourist (3× pixels so the walk cycle reads on the CRT)
    const hopY = player.hop > 0 ? -Math.sin(player.hop * Math.PI) * 10 : 0;
    const tw = 8 * 3;
    const th = 9 * 3;
    const px = player.c * cw + (cw - tw) / 2;
    const py = player.r * ch + (ch - th) / 2 + hopY;
    drawTourist(ctx, px, py, {
      dir: player.dir,
      t: player.anim,
      scale: 3,
      flash: deadFlash > 0,
    });

    fx.draw(ctx);

    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "14px JetBrains Mono, monospace";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE ${score}   LIVES ${lives}`, 12, H - 12);
  }

  function tick(ts) {
    if (!running) return;
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    time += dt;
    marqueePhase += dt;
    if (deadFlash > 0) deadFlash -= dt;
    if (player.hop > 0) player.hop = Math.max(0, player.hop - dt * 4);
    player.anim += dt;

    for (const h of hazards) h.x += h.speed * dt;
    fx.update(dt);

    if (hitTest() && deadFlash <= 0) die();

    if (player.r === 0 && !won) {
      won = true;
      score += 250;
      fx.confetti(W / 2, 36);
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
    if (k === "ArrowLeft" || k === "a") {
      player.c = Math.max(0, player.c - 1);
      player.dir = "left";
      moved = true;
    }
    if (k === "ArrowRight" || k === "d") {
      player.c = Math.min(8, player.c + 1);
      player.dir = "right";
      moved = true;
    }
    if (k === "ArrowUp" || k === "w") {
      player.r = Math.max(0, player.r - 1);
      player.dir = "up";
      moved = true;
      score += 10;
    }
    if (k === "ArrowDown" || k === "s") {
      player.r = Math.min(ROWS - 1, player.r + 1);
      player.dir = "down";
      moved = true;
    }
    if (moved) {
      e.preventDefault();
      player.hop = 1;
      api.onHud?.({ score, lives, message: "Cross the Strip…" });
    }
  }

  return {
    start() {
      score = 0;
      lives = 3;
      won = false;
      time = 0;
      fx.clear();
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
      fx.clear();
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
