/** Lightweight particle pool for Arcade Alley VFX. */

/**
 * @typedef {{ x:number, y:number, vx:number, vy:number, life:number, max:number, color:string, size:number, kind?:string }} Particle
 */

export function createParticlePool(max = 120) {
  /** @type {Particle[]} */
  const particles = [];

  function spawn(x, y, {
    count = 8,
    color = "#ffd700",
    speed = 80,
    life = 0.45,
    size = 3,
    gravity = 120,
    kind = "spark",
    spread = Math.PI * 2,
    angle = -Math.PI / 2,
  } = {}) {
    for (let i = 0; i < count; i += 1) {
      if (particles.length >= max) particles.shift();
      const a = angle + (Math.random() - 0.5) * spread;
      const sp = speed * (0.45 + Math.random() * 0.7);
      particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life,
        max: life,
        color,
        size: size * (0.6 + Math.random() * 0.6),
        kind,
        gravity,
      });
    }
  }

  function burst(x, y, color) {
    spawn(x, y, { count: 14, color, speed: 140, life: 0.5, size: 3, kind: "burst" });
  }

  function confetti(x, y) {
    const colors = ["#ff5ec8", "#ffd700", "#6ec6ff", "#3dcc8c", "#ff9f43"];
    for (let i = 0; i < 24; i += 1) {
      spawn(x, y, {
        count: 1,
        color: colors[i % colors.length],
        speed: 60 + Math.random() * 100,
        life: 0.9 + Math.random() * 0.5,
        size: 2 + Math.random() * 3,
        gravity: 40,
        kind: "confetti",
        angle: -Math.PI / 2,
        spread: Math.PI,
      });
    }
  }

  function update(dt) {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.gravity ?? 120) * dt;
      if (p.kind === "spark") {
        p.vx *= 0.98;
      }
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  function draw(ctx) {
    for (const p of particles) {
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.kind === "confetti") {
        ctx.fillRect(p.x, p.y, p.size, p.size * 0.55);
      } else {
        ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.max(1, p.size | 0), Math.max(1, p.size | 0));
      }
    }
    ctx.globalAlpha = 1;
  }

  function clear() {
    particles.length = 0;
  }

  return { spawn, burst, confetti, update, draw, clear, get particles() { return particles; } };
}
