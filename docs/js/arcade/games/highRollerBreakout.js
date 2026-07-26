/** High-Roller Breakout — Breakout with card bricks. */

import { ARCADE_W as W, ARCADE_H as H, setupArcadeCanvas } from "../gfx/display.js";
import { fillDither } from "../gfx/pixel.js";
import { easeOutCubic } from "../gfx/anim.js";
import { createParticlePool } from "../gfx/fx.js";
import { drawBrick, drawPaddle, drawChipBall } from "../gfx/sprites.js";

export function createHighRollerBreakout(canvas, api) {
  const ctx = setupArcadeCanvas(canvas);
  const fx = createParticlePool(120);

  const suits = ["♠", "♥", "♦", "♣"];
  const colors = ["#ffd700", "#ff5ec8", "#6ec6ff", "#3dcc8c", "#ff9f43"];
  let bricks = [];
  let paddle = { x: W / 2 - 72, w: 144, h: 20 };
  let ball = { x: W / 2, y: H - 120, vx: 240, vy: -320, r: 10, live: false };
  let score = 0;
  let lives = 3;
  let running = false;
  let raf = 0;
  let last = 0;
  let keys = new Set();
  let trail = [];
  let paddleSquash = 0;

  function layoutBricks() {
    bricks = [];
    for (let r = 0; r < 5; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        bricks.push({
          x: 24 + c * 84,
          y: 72 + r * 44,
          w: 76,
          h: 32,
          color: colors[r % colors.length],
          suit: suits[(r + c) % 4],
        });
      }
    }
  }

  function resetBall() {
    ball = {
      x: paddle.x + paddle.w / 2,
      y: H - 120,
      vx: 240 * (Math.random() > 0.5 ? 1 : -1),
      vy: -340,
      r: 10,
      live: false,
    };
    trail = [];
  }

  function end(cleared) {
    running = false;
    cancelAnimationFrame(raf);
    if (cleared) fx.confetti(W / 2, H / 3);
    const mult = cleared ? 3 : Math.min(2.4, score / 800);
    api.onEnded?.({ won: cleared || score >= 400, score, payoutMult: mult, cleared });
  }

  function drawTable() {
    ctx.fillStyle = "#0c1814";
    ctx.fillRect(0, 0, W, H);
    // Salon rails
    ctx.fillStyle = "#3a2810";
    ctx.fillRect(0, 0, W, 16);
    ctx.fillRect(0, 0, 12, H);
    ctx.fillRect(W - 12, 0, 12, H);
    ctx.fillStyle = "#c8a45a";
    ctx.fillRect(0, 14, W, 3);
    ctx.fillRect(10, 0, 3, H);
    ctx.fillRect(W - 13, 0, 3, H);

    // Felt band + nap
    fillDither(ctx, 12, H - 160, W - 24, 160, "rgba(20,80,50,0.45)", "rgba(40,120,70,0.35)", 11, 0.16);
    // Soft felt wash behind bricks
    fillDither(ctx, 12, 60, W - 24, 280, "rgba(16,48,36,0.35)", "rgba(30,70,50,0.25)", 5, 0.1);
  }

  function draw() {
    drawTable();

    for (const b of bricks) {
      drawBrick(ctx, b.x, b.y, b.w, b.h, b.color, b.suit);
    }

    const squash = paddleSquash > 0 ? easeOutCubic(paddleSquash) : 0;
    drawPaddle(ctx, paddle.x, H - 80, paddle.w, paddle.h, squash);
    drawChipBall(ctx, ball.x, ball.y, ball.r, trail);

    fx.draw(ctx);

    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "14px JetBrains Mono, monospace";
    ctx.fillText(
      ball.live ? `SCORE ${score}   LIVES ${lives}` : "SPACE TO LAUNCH",
      16,
      H - 14,
    );
  }

  function tick(ts) {
    if (!running) return;
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    fx.update(dt);
    if (paddleSquash > 0) paddleSquash = Math.max(0, paddleSquash - dt * 4);

    if (keys.has("ArrowLeft") || keys.has("a")) paddle.x = Math.max(12, paddle.x - 520 * dt);
    if (keys.has("ArrowRight") || keys.has("d")) paddle.x = Math.min(W - paddle.w - 12, paddle.x + 520 * dt);
    if (!ball.live && (keys.has(" ") || keys.has("z") || keys.has("Z"))) {
      ball.live = true;
    }
    if (!ball.live) {
      ball.x = paddle.x + paddle.w / 2;
      ball.y = H - 104;
      trail = [];
    } else {
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      trail.push({ x: ball.x, y: ball.y });
      if (trail.length > 8) trail.shift();

      if (ball.x < ball.r + 12 || ball.x > W - ball.r - 12) ball.vx *= -1;
      if (ball.y < ball.r + 16) ball.vy = Math.abs(ball.vy);
      if (
        ball.y + ball.r >= H - 80 && ball.y < H - 56
        && ball.x > paddle.x && ball.x < paddle.x + paddle.w
      ) {
        const hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
        ball.vx = hit * 360;
        ball.vy = -Math.abs(ball.vy);
        paddleSquash = 1;
        fx.spawn(ball.x, H - 80, {
          count: 6, color: "#ffd700", speed: 60, life: 0.25, size: 2, gravity: 80,
        });
      }
      if (ball.y > H) {
        lives -= 1;
        if (lives <= 0) { end(false); return; }
        resetBall();
        api.onHud?.({ score, lives, message: "Ball in the pit…" });
      }
      for (let i = bricks.length - 1; i >= 0; i -= 1) {
        const b = bricks[i];
        if (
          ball.x > b.x && ball.x < b.x + b.w
          && ball.y > b.y && ball.y < b.y + b.h
        ) {
          fx.spawn(b.x + b.w / 2, b.y + b.h / 2, {
            count: 12,
            color: b.color,
            speed: 120,
            life: 0.4,
            size: 3,
            kind: "burst",
          });
          fx.spawn(b.x + b.w / 2, b.y + b.h / 2, {
            count: 4,
            color: "#fff8e7",
            speed: 60,
            life: 0.3,
            size: 2,
          });
          bricks.splice(i, 1);
          ball.vy *= -1;
          score += 25;
          api.onHud?.({ score, lives, message: "Brick cashed!" });
          break;
        }
      }
      if (!bricks.length) {
        score += 300;
        api.onHud?.({ score, lives, message: "SALON CLEARED" });
        end(true);
        return;
      }
    }

    draw();
    raf = requestAnimationFrame(tick);
  }

  function onKeyDown(e) {
    keys.add(e.key);
    if (["ArrowLeft", "ArrowRight", " ", "a", "d"].includes(e.key)) e.preventDefault();
  }
  function onKeyUp(e) { keys.delete(e.key); }

  return {
    start() {
      score = 0;
      lives = 3;
      keys = new Set();
      paddleSquash = 0;
      fx.clear();
      layoutBricks();
      resetBall();
      running = true;
      last = performance.now();
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      api.onHud?.({ score, lives, message: "Clear the card wall" });
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
      if (dir === "fire") keys.add(" ");
      if (dir === "left-up") keys.delete("ArrowLeft");
      if (dir === "right-up") keys.delete("ArrowRight");
      if (dir === "fire-up") keys.delete(" ");
    },
  };
}
