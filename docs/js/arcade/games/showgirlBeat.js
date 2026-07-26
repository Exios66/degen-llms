/** Showgirl Beat — rhythm match under the show lights. */

import { ARCADE_W as W, ARCADE_H as H, setupArcadeCanvas } from "../gfx/display.js";
import { fillDither, fillStripeShade } from "../gfx/pixel.js";
import { pulse01, easeOutBack } from "../gfx/anim.js";
import { createParticlePool } from "../gfx/fx.js";
import { drawShowgirl, drawDrumPad, drawNoteOrb } from "../gfx/sprites.js";

export function createShowgirlBeat(canvas, api) {
  const ctx = setupArcadeCanvas(canvas);
  const fx = createParticlePool(100);

  const LABELS = ["KICK", "SNARE", "HAT"];
  const KEYS = { z: 0, Z: 0, x: 1, X: 1, c: 2, C: 2, "1": 0, "2": 1, "3": 2 };
  const PAD_COLORS = ["#ff5ec8", "#6ec6ff", "#3dcc8c"];
  let sequence = [];
  let step = 0;
  let score = 0;
  let lives = 3;
  let round = 1;
  let running = false;
  let flash = null;
  let pulse = 0;
  let raf = 0;
  let last = 0;
  let time = 0;
  let shake = 0;
  let pressAnim = [0, 0, 0];
  const TARGET_ROUNDS = 5;

  function newSequence() {
    const len = Math.min(3 + round, 7);
    sequence = Array.from({ length: len }, () => Math.floor(Math.random() * 3));
    step = 0;
  }

  function end(cleared) {
    running = false;
    cancelAnimationFrame(raf);
    if (cleared) fx.confetti(W / 2, H * 0.35);
    const mult = cleared ? 2.8 : Math.min(2, score / 500);
    api.onEnded?.({ won: cleared || score >= 250, score, payoutMult: mult, cleared });
  }

  function press(idx) {
    if (!running) return;
    flash = { i: idx, t: 0.2 };
    pressAnim[idx] = 1;
    if (sequence[step] !== idx) {
      lives -= 1;
      step = 0;
      shake = 0.35;
      newSequence();
      api.onHud?.({ score, lives, message: lives > 0 ? "Off beat!" : "SHOW'S OVER" });
      if (lives <= 0) end(false);
      return;
    }
    const padX = 80 + idx * 200 + 80;
    fx.spawn(padX, 500, {
      count: 10,
      color: PAD_COLORS[idx],
      speed: 100,
      life: 0.35,
      size: 3,
      gravity: 60,
      angle: -Math.PI / 2,
      spread: Math.PI * 0.8,
    });
    step += 1;
    score += 30 + round * 5;
    if (step >= sequence.length) {
      round += 1;
      score += 80;
      fx.spawn(W / 2, 240, {
        count: 16, color: "#ffd700", speed: 120, life: 0.5, size: 3, gravity: 40,
      });
      api.onHud?.({ score, lives, message: `Encore — round ${round}` });
      if (round > TARGET_ROUNDS) {
        score += 200;
        api.onHud?.({ score, lives, message: "STANDING OVATION" });
        end(true);
        return;
      }
      newSequence();
    } else {
      api.onHud?.({ score, lives, message: `Beat ${step}/${sequence.length}` });
    }
  }

  function drawStage() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#1a0a28");
    g.addColorStop(0.45, "#120818");
    g.addColorStop(1, "#0a1018");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Curtain folds
    for (let i = 0; i < 10; i += 1) {
      const x = i * 72;
      const shade = i % 2 ? "rgba(80,10,40,0.55)" : "rgba(120,20,60,0.45)";
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.quadraticCurveTo(x + 36, 40 + Math.sin(time + i) * 6, x + 72, 0);
      ctx.lineTo(x + 72, 90);
      ctx.lineTo(x, 90);
      ctx.fill();
    }
    ctx.fillStyle = "#5a1028";
    ctx.fillRect(0, 86, W, 8);
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(0, 92, W, 3);

    // Stage boards
    fillStripeShade(ctx, 0, H * 0.52, W, H * 0.48, "#2a1810", "rgba(0,0,0,0.2)");
    fillDither(ctx, 0, H * 0.52, W, H * 0.48, "rgba(0,0,0,0)", "rgba(60,40,20,0.35)", 9, 0.12);

    // Sweeping spotlights
    const sweep = Math.sin(time * 1.1) * 0.12;
    const spots = [
      { ax: W * (0.2 + sweep), color: "255,215,0" },
      { ax: W * (0.8 - sweep), color: "255,94,200" },
    ];
    for (const s of spots) {
      const alpha = 0.07 + pulse * 0.05;
      const grd = ctx.createRadialGradient(s.ax, 0, 10, s.ax, H * 0.45, 180);
      grd.addColorStop(0, `rgba(${s.color},${alpha + 0.1})`);
      grd.addColorStop(1, `rgba(${s.color},0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(s.ax - 30, 0);
      ctx.lineTo(s.ax + 80, H * 0.55);
      ctx.lineTo(s.ax - 80, H * 0.55);
      ctx.closePath();
      ctx.fill();
    }
  }

  function draw() {
    const ox = shake > 0 ? (Math.random() - 0.5) * 10 * shake : 0;
    const oy = shake > 0 ? (Math.random() - 0.5) * 8 * shake : 0;
    ctx.save();
    ctx.translate(ox, oy);

    drawStage();

    ctx.fillStyle = "#ff5ec8";
    ctx.font = "bold 28px JetBrains Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText("SHOWGIRL BEAT", W / 2, 130);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "16px JetBrains Mono, monospace";
    ctx.fillText(`Round ${Math.min(round, TARGET_ROUNDS)} / ${TARGET_ROUNDS}`, W / 2, 158);

    drawShowgirl(ctx, W / 2 - 40, 168, time, 4);

    // Upcoming sequence
    const show = sequence.slice(step, step + 5);
    show.forEach((note, i) => {
      const x = W / 2 - (show.length - 1) * 36 + i * 72;
      const bob = Math.sin(time * 4 + i) * (i === 0 ? 4 : 2);
      drawNoteOrb(ctx, x, 340 + bob, LABELS[note][0], i === 0, time);
    });

    // Pads
    LABELS.forEach((label, i) => {
      const x = 80 + i * 200;
      const y = 460;
      const lit = flash && flash.i === i;
      const press = pressAnim[i] > 0 ? easeOutBack(pressAnim[i]) : 0;
      drawDrumPad(ctx, x, y, 160, 180, PAD_COLORS[i], label, ["Z / 1", "X / 2", "C / 3"][i], {
        lit: !!lit,
        press,
      });
    });

    fx.draw(ctx);

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "14px JetBrains Mono, monospace";
    ctx.fillText(`SCORE ${score}   LIVES ${lives}`, 16, H - 14);

    ctx.restore();
  }

  function tick(ts) {
    if (!running) return;
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    time += dt;
    pulse = (pulse + dt * 3) % 1;
    if (flash) {
      flash.t -= dt;
      if (flash.t <= 0) flash = null;
    }
    if (shake > 0) shake = Math.max(0, shake - dt);
    for (let i = 0; i < 3; i += 1) {
      if (pressAnim[i] > 0) pressAnim[i] = Math.max(0, pressAnim[i] - dt * 3.5);
    }
    fx.update(dt);
    draw();
    raf = requestAnimationFrame(tick);
  }

  function onKey(e) {
    if (KEYS[e.key] != null) {
      e.preventDefault();
      press(KEYS[e.key]);
    }
  }

  return {
    start() {
      score = 0;
      lives = 3;
      round = 1;
      flash = null;
      shake = 0;
      pressAnim = [0, 0, 0];
      time = 0;
      fx.clear();
      newSequence();
      running = true;
      last = performance.now();
      window.addEventListener("keydown", onKey);
      api.onHud?.({ score, lives, message: "Match the beat — Kick / Snare / Hat" });
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
      if (dir === "kick") press(0);
      if (dir === "snare") press(1);
      if (dir === "hat") press(2);
    },
  };
}
