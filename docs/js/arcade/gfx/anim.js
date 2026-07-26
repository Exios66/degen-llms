/** Animation timing helpers for Arcade Alley cabinets. */

/** Frame index from elapsed seconds. */
export function frameAt(t, fps, count) {
  if (count <= 0) return 0;
  return Math.floor(Math.max(0, t) * fps) % count;
}

/** Ping-pong frame (0…count-1…0). */
export function framePingPong(t, fps, count) {
  if (count <= 1) return 0;
  const cycle = count * 2 - 2;
  const i = Math.floor(Math.max(0, t) * fps) % cycle;
  return i < count ? i : cycle - i;
}

/** Smooth 0→1→0 pulse. */
export function pulse01(t, speed = 1) {
  return 0.5 + 0.5 * Math.sin(t * speed * Math.PI * 2);
}

/** Ease-out cubic for squash / bounce recoveries. */
export function easeOutCubic(u) {
  const t = Math.min(1, Math.max(0, u));
  return 1 - (1 - t) ** 3;
}

/** Ease-out back (slight overshoot) for pad presses. */
export function easeOutBack(u) {
  const t = Math.min(1, Math.max(0, u));
  const c = 1.70158;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
}
