/** High-Roller Breakout — Breakout with card bricks. */

export function createHighRollerBreakout(canvas, api) {
  const ctx = canvas.getContext("2d");
  const W = 360;
  const H = 420;
  canvas.width = W;
  canvas.height = H;

  const suits = ["♠", "♥", "♦", "♣"];
  const colors = ["#ffd700", "#ff5ec8", "#6ec6ff", "#3dcc8c", "#ff9f43"];
  let bricks = [];
  let paddle = { x: W / 2 - 36, w: 72, h: 10 };
  let ball = { x: W / 2, y: H - 60, vx: 120, vy: -160, r: 5, live: false };
  let score = 0;
  let lives = 3;
  let running = false;
  let raf = 0;
  let last = 0;
  let keys = new Set();

  function layoutBricks() {
    bricks = [];
    for (let r = 0; r < 5; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        bricks.push({
          x: 12 + c * 42,
          y: 36 + r * 22,
          w: 38,
          h: 16,
          color: colors[r % colors.length],
          suit: suits[(r + c) % 4],
        });
      }
    }
  }

  function resetBall() {
    ball = { x: paddle.x + paddle.w / 2, y: H - 60, vx: 120 * (Math.random() > 0.5 ? 1 : -1), vy: -170, r: 5, live: false };
  }

  function end(cleared) {
    running = false;
    cancelAnimationFrame(raf);
    const mult = cleared ? 3 : Math.min(2.4, score / 800);
    api.onEnded?.({ won: cleared || score >= 400, score, payoutMult: mult, cleared });
  }

  function draw() {
    ctx.fillStyle = "#0c1814";
    ctx.fillRect(0, 0, W, H);
    // Felt band
    ctx.fillStyle = "rgba(20,80,50,0.35)";
    ctx.fillRect(0, H - 80, W, 80);

    for (const b of bricks) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = "#111";
      ctx.font = "12px serif";
      ctx.fillText(b.suit, b.x + 12, b.y + 13);
    }

    ctx.fillStyle = "#c8a45a";
    ctx.fillRect(paddle.x, H - 40, paddle.w, paddle.h);
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(paddle.x + 4, H - 38, paddle.w - 8, 3);

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = "#fff8e7";
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillText(ball.live ? `SCORE ${score}   LIVES ${lives}` : "SPACE TO LAUNCH", 8, H - 8);
  }

  function tick(ts) {
    if (!running) return;
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;

    if (keys.has("ArrowLeft") || keys.has("a")) paddle.x = Math.max(4, paddle.x - 260 * dt);
    if (keys.has("ArrowRight") || keys.has("d")) paddle.x = Math.min(W - paddle.w - 4, paddle.x + 260 * dt);
    if (!ball.live && (keys.has(" ") || keys.has("z") || keys.has("Z"))) {
      ball.live = true;
    }
    if (!ball.live) {
      ball.x = paddle.x + paddle.w / 2;
      ball.y = H - 52;
    } else {
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      if (ball.x < ball.r || ball.x > W - ball.r) ball.vx *= -1;
      if (ball.y < ball.r) ball.vy = Math.abs(ball.vy);
      if (
        ball.y + ball.r >= H - 40 && ball.y < H - 28
        && ball.x > paddle.x && ball.x < paddle.x + paddle.w
      ) {
        const hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
        ball.vx = hit * 180;
        ball.vy = -Math.abs(ball.vy);
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
