/**
 * A small velocity-adaptive exponential smoother shared by touch/pen and hand
 * input. A low velocity gets more filtering to remove tremor; fast deliberate
 * movement increases follow speed so the stroke never feels delayed.
 */
const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

export function smoothStrokePoint(previous, raw, { smoothing = 42, source = "pointer" } = {}) {
  if (!previous || !raw) return null;
  const dx = Number(raw.x) - Number(previous.x);
  const dy = Number(raw.y) - Number(previous.y);
  const distance = Math.hypot(dx, dy);
  const elapsed = clamp((Number(raw.time) || performance.now()) - (Number(previous.time) || 0), 4, 80);
  const amount = clamp(Number(smoothing) / 100, 0, .92);

  // Hand landmarks already pass through the MediaPipe stabilizer, so they
  // receive a lighter second pass than touch or pen input.
  const baseFollow = source === "hand"
    ? .72 + (1 - amount) * .13
    : .20 + (1 - amount) * .70;
  const frameVelocity = distance / Math.max(.25, elapsed / 16.667);
  const velocityBoost = clamp(frameVelocity * (source === "hand" ? .18 : .24), 0, source === "hand" ? .16 : .34);
  const follow = clamp(baseFollow + velocityBoost, source === "hand" ? .64 : .12, .96);
  const point = {
    x: Number(previous.x) + dx * follow,
    y: Number(previous.y) + dy * follow,
    pressure: Number.isFinite(Number(raw.pressure)) ? Number(raw.pressure) : (Number(previous.pressure) || 1),
    time: Number(raw.time) || performance.now()
  };
  const minDistance = source === "hand" ? .0018 : .0008;
  if (Math.hypot(point.x - Number(previous.x), point.y - Number(previous.y)) < minDistance) return null;
  return point;
}
