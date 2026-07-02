/**
 * Deterministic hand-tracking primitives.
 *
 * The MediaPipe task returns raw landmarks. This module keeps the acceptance,
 * stabilization and pinch state deterministic so the application shell can
 * remain focused on UI and drawing behavior.
 */
const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

export function landmarkDistance(a, b) {
  return Math.hypot(Number(a?.x || 0) - Number(b?.x || 0), Number(a?.y || 0) - Number(b?.y || 0));
}

function angleAt(a, b, c) {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const denominator = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
  if (!denominator) return 0;
  const cosine = clamp((abx * cbx + aby * cby) / denominator, -1, 1);
  return Math.acos(cosine) * 180 / Math.PI;
}

function handednessScore(result) {
  const score = Number(result?.handednesses?.[0]?.[0]?.score);
  return Number.isFinite(score) ? score : 0;
}

export function normalizedPinch(landmarks = []) {
  const palmWidth = landmarkDistance(landmarks[5], landmarks[17]);
  const palmLength = landmarkDistance(landmarks[0], landmarks[9]);
  const scale = Math.max(.025, palmWidth, palmLength);
  return { value: landmarkDistance(landmarks[4], landmarks[8]) / scale, scale, palmWidth, palmLength };
}

export function readHandGeometry(landmarks, result) {
  if (!Array.isArray(landmarks) || landmarks.length < 21) return null;
  const { value: pinchRatio, scale, palmWidth, palmLength } = normalizedPinch(landmarks);
  const indexReach = landmarkDistance(landmarks[8], landmarks[5]) / scale;
  const thumbReach = landmarkDistance(landmarks[4], landmarks[2]) / scale;
  const tipDepth = Math.abs((landmarks[4].z || 0) - (landmarks[8].z || 0)) / scale;
  const indexAngle = angleAt(landmarks[5], landmarks[6], landmarks[8]);
  const palmAspect = palmLength / Math.max(.001, palmWidth);
  const fingerSpan = landmarkDistance(landmarks[8], landmarks[20]) / scale;
  const wristReach = landmarkDistance(landmarks[0], landmarks[8]) / scale;
  const score = handednessScore(result);
  return { pinchRatio, scale, palmWidth, palmLength, indexReach, thumbReach, tipDepth, indexAngle, palmAspect, fingerSpan, wristReach, score };
}

/**
 * Rejects ambiguous landmark sets before they can paint. The checks are broad
 * enough for normal hand rotation while rejecting tiny, collapsed and
 * face-like false positives that otherwise look like a pinch.
 */
export function handGeometryIsUsable(geometry, rule) {
  if (!geometry || !rule) return false;
  return geometry.score >= rule.confidence &&
    geometry.scale >= rule.minPalm &&
    geometry.indexReach >= rule.minIndexReach &&
    geometry.thumbReach >= rule.minThumbReach &&
    geometry.tipDepth <= rule.maxTipDepth &&
    geometry.indexAngle >= rule.minIndexAngle &&
    geometry.palmAspect >= rule.minPalmAspect &&
    geometry.palmAspect <= rule.maxPalmAspect &&
    geometry.fingerSpan >= rule.minFingerSpan &&
    geometry.wristReach >= rule.minWristReach;
}

/**
 * Adaptive low-pass filter. Slow placement is heavily stabilized, while fast
 * intentional movement receives a larger alpha to avoid visible drawing lag.
 */
export function createHandStabilizer() {
  let filtered = null;
  let previousRaw = null;
  let stableFrames = 0;

  function reset() {
    filtered = null;
    previousRaw = null;
    stableFrames = 0;
  }

  function observe(raw, { scale = .05, rule, eligible = true } = {}) {
    if (!raw || !rule || !eligible) {
      stableFrames = 0;
      return { point: filtered, rawJump: 0, jumped: false, stable: false, accepted: false, alpha: 0 };
    }

    const rawJump = previousRaw ? landmarkDistance(raw, previousRaw) / Math.max(.035, scale) : 0;
    previousRaw = raw;
    const jumped = rawJump > rule.maxJump;
    if (jumped) {
      stableFrames = 0;
      return { point: filtered, rawJump, jumped: true, stable: false, accepted: false, alpha: 0 };
    }

    const baseAlpha = clamp(1 - rule.smooth, .16, .68);
    const movementBoost = clamp((rawJump - .025) * 1.35, 0, .22);
    const alpha = clamp(baseAlpha + movementBoost, .16, .74);
    filtered = filtered
      ? { ...raw, x: filtered.x + (raw.x - filtered.x) * alpha, y: filtered.y + (raw.y - filtered.y) * alpha }
      : { ...raw };
    stableFrames += 1;
    return { point: filtered, rawJump, jumped: false, stable: stableFrames >= rule.stableFrames, accepted: true, alpha };
  }

  return { reset, observe, snapshot: () => ({ filtered, previousRaw, stableFrames }) };
}

/**
 * Pinch gate with hysteresis. It emits a one-frame `started` or `released`
 * event instead of re-triggering strokes while the fingers remain together.
 */
export function createPinchGate() {
  let active = false;
  let onFrames = 0;
  let offFrames = 0;

  function reset() {
    active = false;
    onFrames = 0;
    offFrames = 0;
  }

  function observe({ pinchRatio = Infinity, usable = false, jumped = false, rule, safe = true } = {}) {
    if (!rule || !usable || jumped) {
      const released = active;
      reset();
      return { active: false, started: false, released, onFrames: 0, offFrames: 0, closing: false, opening: true };
    }

    const closing = pinchRatio <= rule.start;
    const opening = pinchRatio >= rule.stop;
    onFrames = closing ? onFrames + 1 : 0;
    offFrames = opening ? offFrames + 1 : 0;

    let started = false;
    let released = false;
    if (!active && (safe ? onFrames >= rule.enterFrames : closing)) {
      active = true;
      started = true;
      offFrames = 0;
    }
    if (active && (safe ? offFrames >= rule.exitFrames : opening)) {
      active = false;
      released = true;
      onFrames = 0;
    }

    return { active, started, released, onFrames, offFrames, closing, opening };
  }

  return { reset, observe, snapshot: () => ({ active, onFrames, offFrames }) };
}

/**
 * Prevents a weak phone from repeatedly scheduling synchronous inference above
 * its measured capacity. The detector is still responsive at a safe floor.
 */
export function effectiveTrackingFps({ configured = 24, measured = 0 } = {}) {
  const requested = clamp(configured, 12, 30);
  if (!Number.isFinite(measured) || measured < 1) return requested;
  if (measured >= requested * .8) return requested;
  return clamp(Math.floor(measured + 2), 8, requested);
}
