/* AIR-DROW Hand Calibration & Confidence Guard
   Calibration records four *different*, target-confirmed index-tip positions.
   The mapping remains local to this browser and is only enabled after the
   complete rectangle passes geometric validation. */

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, Number(value) || 0));
const average = values => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);

export const HAND_CALIBRATION_DEFAULT = Object.freeze({
  enabled: false,
  xMin: 0,
  xMax: 1,
  yMin: 0,
  yMax: 1,
  updatedAt: 0
});

export function normalizeHandCalibration(value = {}) {
  const candidate = { ...HAND_CALIBRATION_DEFAULT, ...(value || {}) };
  const xMin = clamp(candidate.xMin, -0.2, 1.2);
  const xMax = clamp(candidate.xMax, -0.2, 1.2);
  const yMin = clamp(candidate.yMin, -0.2, 1.2);
  const yMax = clamp(candidate.yMax, -0.2, 1.2);
  const usable = Boolean(candidate.enabled) && (xMax - xMin >= 0.28) && (yMax - yMin >= 0.28);
  return {
    enabled: usable,
    xMin: usable ? xMin : 0,
    xMax: usable ? xMax : 1,
    yMin: usable ? yMin : 0,
    yMax: usable ? yMax : 1,
    updatedAt: Number(candidate.updatedAt) || 0
  };
}

export function toDisplayPoint(point, { mirror = true } = {}) {
  return {
    ...point,
    x: clamp(mirror ? 1 - Number(point?.x || 0) : Number(point?.x || 0)),
    y: clamp(Number(point?.y || 0))
  };
}

export function mapHandPoint(point, calibration, options = {}) {
  const display = toDisplayPoint(point, options);
  const safe = normalizeHandCalibration(calibration);
  if (!safe.enabled) return display;
  return {
    ...display,
    x: clamp((display.x - safe.xMin) / Math.max(0.001, safe.xMax - safe.xMin)),
    y: clamp((display.y - safe.yMin) / Math.max(0.001, safe.yMax - safe.yMin))
  };
}

const TARGETS = Object.freeze([
  { id: "top-left", x: 0.15, y: 0.20 },
  { id: "top-right", x: 0.85, y: 0.20 },
  { id: "bottom-right", x: 0.85, y: 0.80 },
  { id: "bottom-left", x: 0.15, y: 0.80 }
]);

function targetDistance(point, target) {
  if (!point || !target) return Infinity;
  return Math.hypot(Number(point.x || 0) - Number(target.x || 0), Number(point.y || 0) - Number(target.y || 0));
}

export function createHandCalibration({ holdMs = 620, maxJitter = 0.028, targetRadius = 0.135 } = {}) {
  let session = null;

  function current() {
    if (!session) return { active: false, status: "idle", targets: TARGETS };
    return {
      active: Boolean(session.active),
      status: session.status,
      index: session.index,
      total: TARGETS.length,
      target: TARGETS[session.index] || null,
      progress: session.progress || 0,
      captures: session.captures.length,
      targets: TARGETS
    };
  }

  function start(now = performance.now()) {
    session = {
      active: true,
      status: "seeking",
      index: 0,
      captures: [],
      samples: [],
      holdStartedAt: 0,
      progress: 0,
      startedAt: now
    };
    return current();
  }

  function cancel() {
    if (session) {
      session.active = false;
      session.status = "cancelled";
      session.progress = 0;
    }
    return current();
  }

  function clearHold(status = "seeking") {
    if (!session) return;
    session.status = status;
    session.samples = [];
    session.holdStartedAt = 0;
    session.progress = 0;
  }

  function sampleJitter(samples) {
    if (samples.length < 3) return 0;
    const cx = average(samples.map(sample => sample.x));
    const cy = average(samples.map(sample => sample.y));
    return Math.max(...samples.map(sample => Math.hypot(sample.x - cx, sample.y - cy)));
  }

  function finish() {
    const [topLeft, topRight, bottomRight, bottomLeft] = session.captures;
    const xMin = average([topLeft.x, bottomLeft.x]);
    const xMax = average([topRight.x, bottomRight.x]);
    const yMin = average([topLeft.y, topRight.y]);
    const yMax = average([bottomRight.y, bottomLeft.y]);
    const calibration = normalizeHandCalibration({
      enabled: true,
      xMin,
      xMax,
      yMin,
      yMax,
      updatedAt: Date.now()
    });

    if (!calibration.enabled) {
      // Never leave a malformed 4/4 session active: it would trap the person
      // in a loop. Surface a clean failure and require an explicit retry.
      session.active = false;
      session.status = "invalid";
      session.progress = 0;
      return { ...current(), type: "invalid" };
    }

    session.active = false;
    session.status = "complete";
    session.progress = 1;
    return { ...current(), type: "complete", calibration };
  }

  function observe(point, { now = performance.now(), stable = false, usable = false, mirror = true } = {}) {
    if (!session?.active) return { active: false, type: "idle" };
    if (!point || !stable || !usable) {
      clearHold(point ? "steady" : "seeking");
      return { ...current(), type: "waiting" };
    }

    const sample = toDisplayPoint(point, { mirror });
    const target = TARGETS[session.index];
    const distance = targetDistance(sample, target);
    if (distance > targetRadius) {
      // The old flow captured four copies of one stable hand position. This
      // target gate is what makes calibration real instead of synthetic.
      clearHold("aim");
      return { ...current(), type: "aim", targetDistance: distance };
    }

    if (!session.holdStartedAt) session.holdStartedAt = now;
    session.samples.push(sample);
    if (session.samples.length > 18) session.samples.shift();

    const jitter = sampleJitter(session.samples);
    if (jitter > maxJitter) {
      clearHold("steady");
      return { ...current(), type: "unstable", targetDistance: distance };
    }

    const elapsed = now - session.holdStartedAt;
    session.status = "holding";
    session.progress = clamp(elapsed / holdMs);
    if (elapsed < holdMs || session.samples.length < 5) return { ...current(), type: "progress", targetDistance: distance };

    const captured = {
      x: average(session.samples.map(item => item.x)),
      y: average(session.samples.map(item => item.y))
    };
    session.captures.push(captured);
    session.index += 1;
    session.samples = [];
    session.holdStartedAt = 0;
    session.progress = 0;

    if (session.index >= TARGETS.length) return finish();
    session.status = "captured";
    return { ...current(), type: "captured", targetDistance: distance };
  }

  return { start, cancel, current, observe, reset: () => { session = null; return current(); } };
}
