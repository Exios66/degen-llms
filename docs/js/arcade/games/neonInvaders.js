/** Neon Invaders — Space Invaders with neon signs. */

export function createNeonInvaders(canvas, api) {
  const ctx = canvas.getContext("2d");
  const W = 360;
  const H = 420;
  canvas.width = W;
  canvas.height = H;

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

  function spawnWave() {
    aliens = [];
    const colors = ["#ff5ec8", "#6ec6ff", "#ffd700", "#3dcc8c"];
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 7; c += 1) {
        aliens.push({
          x: 30 + c * 42,
          y: 40 + r * 32,
          w: 28,
          h: 18,
          color: colors[r % colors.length],
        });
      }
    }
    dir = 1;
  }

  function end(cleared) {
    running = false;
    cancelAnimationFrame(raf);
    const mult = cleared ? 3 : Math.min(2.2, score / 600);
    api.onEnded?.({ won: cleared || score >= 300, score, payoutMult: mult, cleared });
  }

  function draw() {
    ctx.fillStyle = "#050a12";
    ctx.fillRect(0, 0, W, H);
    // Star dust
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    for (let i = 0; i < 40; i += 1) {
      ctx.fillRect((i * 47) % W, (i * 91) % H, 2, 2);
    }

    for (const a of aliens) {
      ctx.fillStyle = a.color;
      ctx.shadowColor = a.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(a.x, a.y, a.w, a.h);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#0a0e14";
      ctx.fillRect(a.x + 6, a.y + 5, 6, 4);
      ctx.fillRect(a.x + 16, a.y + 5, 6, 4);
    }

    for (const b of bullets) {
      ctx.fillStyle = "#ffd700";
      ctx.fillRect(b.x - 2, b.y, 4, 10);
    }
    for (const b of enemyShots) {
      ctx.fillStyle = "#ff6b6b";
      ctx.fillRect(b.x - 2, b.y, 4, 10);
    }

    ctx.fillStyle = "#e8f0ff";
    ctx.beginPath();
    ctx.moveTo(shipX, H - 36);
    ctx.lineTo(shipX - 16, H - 18);
    ctx.lineTo(shipX + 16, H - 18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(shipX, H - 28, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillText(`SCORE ${score}   LIVES ${lives}`, 8, H - 6);
  }

  function tick(ts) {
    if (!running) return;
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    shootCd = Math.max(0, shootCd - dt);

    if (keys.has("ArrowLeft") || keys.has("a")) shipX = Math.max(18, shipX - 180 * dt);
    if (keys.has("ArrowRight") || keys.has("d")) shipX = Math.min(W - 18, shipX + 180 * dt);
    if ((keys.has(" ") || keys.has("z") || keys.has("Z")) && shootCd <= 0) {
      bullets.push({ x: shipX, y: H - 40 });
      shootCd = 0.28;
    }

    let stepDown = false;
    for (const a of aliens) {
      a.x += dir * 28 * dt;
      if (a.x < 8 || a.x + a.w > W - 8) stepDown = true;
    }
    if (stepDown) {
      dir *= -1;
      for (const a of aliens) a.y += 12;
    }

    if (Math.random() < 0.02 && aliens.length) {
      const a = aliens[Math.floor(Math.random() * aliens.length)];
      enemyShots.push({ x: a.x + a.w / 2, y: a.y + a.h });
    }

    bullets = bullets.filter((b) => {
      b.y -= 260 * dt;
      for (let i = aliens.length - 1; i >= 0; i -= 1) {
        const a = aliens[i];
        if (b.x > a.x && b.x < a.x + a.w && b.y > a.y && b.y < a.y + a.h) {
          aliens.splice(i, 1);
          score += 40;
          api.onHud?.({ score, lives, message: "Neon down!" });
          return false;
        }
      }
      return b.y > 0;
    });

    enemyShots = enemyShots.filter((b) => {
      b.y += 160 * dt;
      if (Math.abs(b.x - shipX) < 14 && b.y > H - 40 && b.y < H - 16) {
        lives -= 1;
        api.onHud?.({ score, lives, message: lives > 0 ? "Hit!" : "GAME OVER" });
        if (lives <= 0) { end(false); return false; }
        return false;
      }
      return b.y < H;
    });

    if (aliens.some((a) => a.y + a.h >= H - 50)) {
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
