/** Neon Invaders — Space Invaders with neon signs. */

import { ARCADE_W as W, ARCADE_H as H, setupArcadeCanvas } from "../gfx/display.js";
import { withAlpha } from "../gfx/pixel.js";
import { pulse01 } from "../gfx/anim.js";
import { createParticlePool } from "../gfx/fx.js";
import { drawInvader, drawCannon, drawBullet } from "../gfx/sprites.js";

export function createNeonInvaders(canvas, api) {
  const ctx = setupArcadeCanvas(canvas);
  const fx = createParticlePool(140);

  let shipX = W / 2;
  let aliens = [];
  let bullets = [];
  let enemyShots = [];
  let dir = 1;
  let score = 0;
  let lives = 3;
  let running = false;
  let raf = 0;
  let last = 0;
  let shootCd = 0;
  let keys = new Set();
  let time = 0;
  let stars = [];

  function initStars() {
    stars = Array.from({ length: 70 }, (_, i) => ({
      x: (i * 97 + 13) % W,
      y: (i * 53 + 29) % (H - 80),
      z: 0.4 + (i % 5) * 0.15,
      tw: Math.random() * Math.PI * 2,
    }));
  }

  function spawnWave() {
    aliens = [];
    const colors = ["#ff5ec8", "#6ec6ff", "#ffd700", "#3dcc8c"];
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 7; c += 1) {
        aliens.push({
          x: 60 + c * 84,
          y: 80 + r * 64,
          w: 56,
          h: 36,
          color: colors[r % colors.length],
          type: r % 4,
        });
      }
    }
    dir = 1;
  }

  function end(cleared) {
    running = false;
    cancelAnimationFrame(raf);
    if (cleared) fx.confetti(W / 2, H / 3);
    const mult = cleared ? 3 : Math.min(2.2, score / 600);
    api.onEnded?.({ won: cleared || score >= 300, score, payoutMult: mult, cleared });
  }

  function drawStarfield() {
    ctx.fillStyle = "#050a12";
    ctx.fillRect(0, 0, W, H);
    // Far nebula wash
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(40,10,60,0.35)");
    g.addColorStop(0.5, "rgba(10,20,40,0.15)");
    g.addColorStop(1, "rgba(0,30,40,0.25)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    for (const s of stars) {
      const twinkle = 0.25 + pulse01(time + s.tw, s.z) * 0.75;
      const size = s.z > 0.8 ? 3 : 2;
      ctx.fillStyle = withAlpha("#ffffff", twinkle * 0.55);
      ctx.fillRect(s.x, s.y, size, size);
      if (s.z > 0.9) {
        ctx.fillStyle = withAlpha("#6ec6ff", twinkle * 0.35);
        ctx.fillRect(s.x - 1, s.y + 1, 1, 1);
      }
    }

    // Ground strip glow
    const gg = ctx.createLinearGradient(0, H - 90, 0, H);
    gg.addColorStop(0, "rgba(0,0,0,0)");
    gg.addColorStop(0.4, "rgba(255,94,200,0.08)");
    gg.addColorStop(1, "rgba(255,215,0,0.18)");
    ctx.fillStyle = gg;
    ctx.fillRect(0, H - 90, W, 90);
    ctx.fillStyle = withAlpha("#ffd700", 0.35 + pulse01(time, 1.2) * 0.2);
    ctx.fillRect(0, H - 52, W, 2);
  }

  function draw() {
    drawStarfield();

    for (const a of aliens) {
      drawInvader(ctx, a.x, a.y, a.color, a.type, time, 2);
    }

    for (const b of bullets) drawBullet(ctx, b.x, b.y, false);
    for (const b of enemyShots) drawBullet(ctx, b.x, b.y, true);

    drawCannon(ctx, shipX, H - 72, time, 2);

    fx.draw(ctx);

    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "14px JetBrains Mono, monospace";
    ctx.fillText(`SCORE ${score}   LIVES ${lives}`, 12, H - 12);
  }

  function tick(ts) {
    if (!running) return;
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    time += dt;
    shootCd = Math.max(0, shootCd - dt);
    fx.update(dt);

    // Parallax star drift
    for (const s of stars) {
      s.y += s.z * 12 * dt;
      if (s.y > H - 80) s.y = 0;
    }

    if (keys.has("ArrowLeft") || keys.has("a")) shipX = Math.max(36, shipX - 360 * dt);
    if (keys.has("ArrowRight") || keys.has("d")) shipX = Math.min(W - 36, shipX + 360 * dt);
    if ((keys.has(" ") || keys.has("z") || keys.has("Z")) && shootCd <= 0) {
      bullets.push({ x: shipX, y: H - 80 });
      fx.spawn(shipX, H - 76, {
        count: 4, color: "#ffd700", speed: 40, life: 0.2, size: 2, gravity: -20, kind: "spark",
        angle: -Math.PI / 2, spread: 0.6,
      });
      shootCd = 0.28;
    }

    let stepDown = false;
    for (const a of aliens) {
      a.x += dir * 56 * dt;
      if (a.x < 16 || a.x + a.w > W - 16) stepDown = true;
    }
    if (stepDown) {
      dir *= -1;
      for (const a of aliens) a.y += 24;
    }

    if (Math.random() < 0.02 && aliens.length) {
      const a = aliens[Math.floor(Math.random() * aliens.length)];
      enemyShots.push({ x: a.x + a.w / 2, y: a.y + a.h });
    }

    bullets = bullets.filter((b) => {
      b.y -= 520 * dt;
      for (let i = aliens.length - 1; i >= 0; i -= 1) {
        const a = aliens[i];
        if (b.x > a.x && b.x < a.x + a.w && b.y > a.y && b.y < a.y + a.h) {
          fx.burst(a.x + a.w / 2, a.y + a.h / 2, a.color);
          aliens.splice(i, 1);
          score += 40;
          api.onHud?.({ score, lives, message: "Neon down!" });
          return false;
        }
      }
      return b.y > 0;
    });

    enemyShots = enemyShots.filter((b) => {
      b.y += 320 * dt;
      if (Math.abs(b.x - shipX) < 28 && b.y > H - 80 && b.y < H - 32) {
        fx.burst(shipX, H - 56, "#ff6b6b");
        lives -= 1;
        api.onHud?.({ score, lives, message: lives > 0 ? "Hit!" : "GAME OVER" });
        if (lives <= 0) { end(false); return false; }
        return false;
      }
      return b.y < H;
    });

    if (aliens.some((a) => a.y + a.h >= H - 100)) {
      end(false);
      return;
    }
    if (!aliens.length) {
      score += 200;
      api.onHud?.({ score, lives, message: "WAVE CLEARED" });
      end(true);
      return;
    }

    draw();
    raf = requestAnimationFrame(tick);
  }

  function onKeyDown(e) {
    keys.add(e.key);
    if (["ArrowLeft", "ArrowRight", " ", "z", "Z", "a", "d"].includes(e.key)) e.preventDefault();
  }
  function onKeyUp(e) { keys.delete(e.key); }

  return {
    start() {
      score = 0;
      lives = 3;
      shipX = W / 2;
      bullets = [];
      enemyShots = [];
      keys = new Set();
      time = 0;
      fx.clear();
      initStars();
      spawnWave();
      running = true;
      last = performance.now();
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      api.onHud?.({ score, lives, message: "Defend the Strip — fire!" });
      draw();
      raf = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      keys.clear();
      fx.clear();
    },
    input(dir) {
      if (dir === "left") keys.add("ArrowLeft");
      if (dir === "right") keys.add("ArrowRight");
      if (dir === "fire") {
        keys.add(" ");
        setTimeout(() => keys.delete(" "), 80);
      }
      if (dir === "left-up") keys.delete("ArrowLeft");
      if (dir === "right-up") keys.delete("ArrowRight");
    },
  };
}
