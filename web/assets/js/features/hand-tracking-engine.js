/**
 * AIR-DROW Phase 3 hand-tracking primitives.
 *
 * The browser receives raw MediaPipe landmarks. This module makes the
 * detector-to-canvas path deterministic: it validates hand geometry,
 * suppresses impossible jumps, uses a velocity-aware low-pass/prediction
 * filter, applies pinch hysteresis, and safely holds an active stroke across
 * short closed-fist / occlusion interruptions.
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
 * Classifies only the safe visual state needed by the continuity guard. It is
 * deliberately not used to start drawing: a fist can hold a current stroke,
 * but can never create a new one.
 */
export function readHandPosture(landmarks = [], geometry = null) {
  if (!Array.isArray(landmarks) || landmarks.length < 21) return { closedFist: false, foldedFingers: 0, tipReach: Infinity };
  const scale = Math.max(.025, Number(geometry?.scale) || normalizedPinch(landmarks).scale);
  const wrist = landmarks[0];
  const tips = [8, 12, 16, 20].map(index => landmarkDistance(landmarks[index], wrist) / scale);
  const foldedFingers = tips.filter(distance => distance < 1.38).length;
  const tipReach = tips.reduce((sum, distance) => sum + distance, 0) / Math.max(1, tips.length);
  const closedFist = foldedFingers >= 3 && tipReach < 1.55 && Number(geometry?.fingerSpan ?? 0) < 1.58;
  return { closedFist, foldedFingers, tipReach };
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
 * Velocity-aware adaptive low-pass filter.
 *
 * Slow placement is heavily damped to remove camera jitter. Intentional fast
 * movement receives higher alpha and a bounded one-frame prediction so the
 * ink tracks the index fingertip without the old laggy "rubber-band" feel.
 */
export function createHandStabilizer() {
  let filtered = null;
  let previousRaw = null;
  let velocity = { x: 0, y: 0 };
  let stableFrames = 0;

  function reset() {
    filtered = null;
    previousRaw = null;
    velocity = { x: 0, y: 0 };
    stableFrames = 0;
  }

  function observe(raw, { scale = .05, rule, eligible = true } = {}) {
    if (!raw || !rule || !eligible) {
      stableFrames = 0;
      return { point: filtered, predicted: filtered, rawJump: 0, jumped: false, stable: false, accepted: false, alpha: 0, velocity };
    }

    const previousTime = Number(previousRaw?.time);
    const sampleTime = Number(raw.time);
    const dtMs = Number.isFinite(sampleTime) && Number.isFinite(previousTime)
      ? clamp(sampleTime - previousTime, 12, 110)
      : 33;
    const dt = dtMs / 1000;
    const rawJump = previousRaw ? landmarkDistance(raw, previousRaw) / Math.max(.035, scale) : 0;
    previousRaw = { ...raw };
    const jumped = rawJump > rule.maxJump;
    if (jumped) {
      stableFrames = 0;
      return { point: filtered, predicted: filtered, rawJump, jumped: true, stable: false, accepted: false, alpha: 0, velocity };
    }

    // At low inference rates, a cautious filter trails the hand. Preserve
    // noise protection while still, then catch up strongly as the user moves.
    const baseAlpha = clamp(1 - rule.smooth, .24, .76);
    const movementBoost = clamp((rawJump - .016) * 2.25, 0, .34);
    const alpha = clamp(baseAlpha + movementBoost, .24, .92);
    const previousFiltered = filtered || raw;
    filtered = {
      ...raw,
      x: previousFiltered.x + (raw.x - previousFiltered.x) * alpha,
      y: previousFiltered.y + (raw.y - previousFiltered.y) * alpha
    };

    const instantVelocity = {
      x: (filtered.x - previousFiltered.x) / dt,
      y: (filtered.y - previousFiltered.y) / dt
    };
    const velocityBlend = clamp(.32 + movementBoost * .8, .32, .62);
    velocity = {
      x: velocity.x + (instantVelocity.x - velocity.x) * velocityBlend,
      y: velocity.y + (instantVelocity.y - velocity.y) * velocityBlend
    };

    const lookAheadSeconds = clamp(.010 + rawJump * .020, .010, .024);
    const maxLead = Math.max(.0028, scale * .18);
    const leadX = clamp(velocity.x * lookAheadSeconds, -maxLead, maxLead);
    const leadY = clamp(velocity.y * lookAheadSeconds, -maxLead, maxLead);
    const predicted = { ...filtered, x: filtered.x + leadX, y: filtered.y + leadY, time: raw.time };

    stableFrames += 1;
    return { point: predicted, predicted, filtered, rawJump, jumped: false, stable: stableFrames >= rule.stableFrames, accepted: true, alpha, velocity };
  }

  return { reset, observe, snapshot: () => ({ filtered, previousRaw, velocity, stableFrames }) };
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
 * Intent gate for hand drawing.
 *
 * A pinch alone is not treated as a drawing command. The user must first hold
 * an open, stable hand for a few detector frames, then begin a pinch, then
 * move a small intentional distance. This removes accidental dots/lines from
 * natural hand motion while retaining responsive live ink once drawing begins.
 */
export function createHandIntentGate() {
  let armed = false;
  let openFrames = 0;
  let pending = null;

  function reset() {
    armed = false;
    openFrames = 0;
    pending = null;
  }

  function snapshot(extra = {}) {
    return {
      armed,
      openFrames,
      pending: Boolean(pending),
      pendingFrames: pending?.frames || 0,
      anchor: pending?.anchor ? { ...pending.anchor } : null,
      ...extra
    };
  }

  function observe({ usable = false, stable = false, open = false, pinchStarted = false, pinchActive = false, pinchReleased = false, point = null, rule } = {}) {
    const armFrames = clamp(Number(rule?.armFrames) || (Number(rule?.enterFrames) || 3) + 1, 2, 8);
    const intentFrames = clamp(Number(rule?.intentFrames) || 2, 1, 6);
    const intentTravel = clamp(Number(rule?.intentTravel) || .010, .003, .06);

    if (!usable || !stable || !point) {
      const cancelled = Boolean(pending);
      reset();
      return snapshot({ cancelled, reason: "unstable" });
    }

    if (pending) {
      if (pinchReleased || !pinchActive) {
        pending = null;
        return snapshot({ cancelled: true, reason: "released" });
      }
      pending.frames += 1;
      const travel = landmarkDistance(point, pending.anchor);
      if (pending.frames >= intentFrames && travel >= intentTravel) {
        const anchorPoint = { ...pending.anchor };
        pending = null;
        return snapshot({ commit: true, anchor: anchorPoint, travel });
      }
      return snapshot({ waiting: true, travel });
    }

    if (!pinchActive) {
      openFrames = open ? Math.min(armFrames, openFrames + 1) : 0;
      if (openFrames >= armFrames) armed = true;
    }

    if (pinchStarted) {
      if (!armed) return snapshot({ blocked: true, reason: "open-hand" });
      pending = { anchor: { ...point }, frames: 1 };
      armed = false;
      openFrames = 0;
      return snapshot({ waiting: true, started: true, travel: 0 });
    }

    return snapshot({ ready: armed });
  }

  return { reset, observe, snapshot };
}

/**
 * Holds an already-started stroke through a short detector interruption. A
 * closed fist receives a slightly longer visual hold, but no samples are
 * added while tracking is ambiguous. This prevents a fist or one dropped
 * frame from making live ink vanish, without allowing a stale point to paint.
 */
export function createStrokeContinuityGate() {
  let active = false;
  let lastUsableAt = 0;
  let lastPoint = null;

  function reset() {
    active = false;
    lastUsableAt = 0;
    lastPoint = null;
  }

  function begin(now = 0, point = null) {
    active = true;
    lastUsableAt = Number(now) || 0;
    lastPoint = point ? { ...point } : null;
  }

  function observe({ now = 0, usable = false, landmarksPresent = false, jumped = false, point = null, fist = false, rule } = {}) {
    if (!active) return { active: false, paused: false, expired: false, resumed: false, point: lastPoint, elapsed: 0 };
    const timestamp = Number(now) || 0;
    if (usable && point && !jumped) {
      const resumed = lastUsableAt > 0 && timestamp - lastUsableAt > 16;
      lastUsableAt = timestamp;
      lastPoint = { ...point };
      return { active: true, paused: false, expired: false, resumed, point: lastPoint, elapsed: 0 };
    }
    if (jumped) {
      const pointAtExit = lastPoint;
      reset();
      return { active: false, paused: false, expired: true, reason: "jump", point: pointAtExit, elapsed: Infinity };
    }

    // Freeze ink only briefly. A guide can fade independently, while an active
    // stroke waits long enough for one real detector miss or a closed-fist
    // transition, then finishes instead of resuming as a ghost line.
    const base = Math.max(260, Number(rule?.lostFrames || 4) * 75);
    const holdMs = fist ? Math.max(700, base * 2.2) : (landmarksPresent ? Math.max(500, base * 1.65) : Math.max(380, base * 1.25));
    const elapsed = Math.max(0, timestamp - lastUsableAt);
    if (elapsed <= holdMs) return { active: true, paused: true, expired: false, point: lastPoint, elapsed, holdMs, fist };

    const pointAtExit = lastPoint;
    reset();
    return { active: false, paused: false, expired: true, reason: landmarksPresent ? "ambiguous" : "missing", point: pointAtExit, elapsed, holdMs, fist };
  }

  return { begin, observe, reset, snapshot: () => ({ active, lastUsableAt, lastPoint }) };
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
