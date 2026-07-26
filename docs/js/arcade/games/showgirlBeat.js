/** Showgirl Beat — rhythm match under the show lights. */

export function createShowgirlBeat(canvas, api) {
  const ctx = canvas.getContext("2d");
  const W = 360;
  const H = 420;
  canvas.width = W;
  canvas.height = H;

  const LABELS = ["KICK", "SNARE", "HAT"];
  const KEYS = { z: 0, Z: 0, x: 1, X: 1, c: 2, C: 2, "1": 0, "2": 1, "3": 2 };
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
  const TARGET_ROUNDS = 5;

  function newSequence() {
    const len = Math.min(3 + round, 7);
    sequence = Array.from({ length: len }, () => Math.floor(Math.random() * 3));
    step = 0;
  }

  function end(cleared) {
    running = false;
    cancelAnimationFrame(raf);
    const mult = cleared ? 2.8 : Math.min(2, score / 500);
    api.onEnded?.({ won: cleared || score >= 250, score, payoutMult: mult, cleared });
  }

  function press(idx) {
    if (!running) return;
    flash = { i: idx, t: 0.2 };
    if (sequence[step] !== idx) {
      lives -= 1;
      step = 0;
      newSequence();
      api.onHud?.({ score, lives, message: lives > 0 ? "Off beat!" : "SHOW'S OVER" });
      if (lives <= 0) end(false);
      return;
    }
    step += 1;
    score += 30 + round * 5;
    if (step >= sequence.length) {
      round += 1;
      score += 80;
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

  function draw() {
    // Stage gradient
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#1a0a28");
    g.addColorStop(1, "#0a1018");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Spotlights
    ctx.fillStyle = `rgba(255,215,0,${0.08 + pulse * 0.06})`;
    ctx.beginPath();
    ctx.moveTo(W * 0.2, 0);
    ctx.lineTo(W * 0.35, H * 0.55);
    ctx.lineTo(W * 0.05, H * 0.55);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(W * 0.8, 0);
    ctx.lineTo(W * 0.95, H * 0.55);
    ctx.lineTo(W * 0.65, H * 0.55);
    ctx.fill();

    ctx.fillStyle = "#ff5ec8";
    ctx.font = "bold 16px JetBrains Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText("SHOWGIRL BEAT", W / 2, 36);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "11px JetBrains Mono, monospace";
    ctx.fillText(`Round ${Math.min(round, TARGET_ROUNDS)} / ${TARGET_ROUNDS}`, W / 2, 56);

    // Upcoming sequence
    const show = sequence.slice(step, step + 5);
    show.forEach((note, i) => {
      const x = W / 2 - (show.length * 28) + i * 56;
      ctx.fillStyle = i === 0 ? "#ffd700" : "rgba(255,255,255,0.25)";
      ctx.beginPath();
      ctx.arc(x, 120, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.font = "bold 10px JetBrains Mono, monospace";
      ctx.fillText(LABELS[note][0], x, 124);
    });

    // Pads
    LABELS.forEach((label, i) => {
      const x = 40 + i * 100;
      const y = 220;
      const lit = flash && flash.i === i;
      ctx.fillStyle = lit ? "#ffd700" : ["#ff5ec8", "#6ec6ff", "#3dcc8c"][i];
      ctx.fillRect(x, y, 80, 90);
      ctx.fillStyle = "#111";
      ctx.font = "bold 14px JetBrains Mono, monospace";
      ctx.fillText(label, x + 40, y + 40);
      ctx.font = "10px JetBrains Mono, monospace";
      ctx.fillText(["Z / 1", "X / 2", "C / 3"][i], x + 40, y + 62);
    });

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillText(`SCORE ${score}   LIVES ${lives}`, 8, H - 8);
  }

  function tick(ts) {
    if (!running) return;
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    pulse = (pulse + dt * 3) % 1;
    if (flash) {
      flash.t -= dt;
      if (flash.t <= 0) flash = null;
    }
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
    },
    input(dir) {
      if (dir === "kick") press(0);
      if (dir === "snare") press(1);
      if (dir === "hat") press(2);
    },
  };
}
