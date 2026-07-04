import assert from "node:assert/strict";
import { createHandIntentGate, createPinchGate } from "../web/assets/js/features/hand-tracking-engine.js";
import { PROFILE_RULES } from "../web/assets/js/config/runtime.js";

const rule = PROFILE_RULES.balanced;
const point = (x, y) => ({ x, y, time: performance.now() });
const intent = createHandIntentGate();
const pinch = createPinchGate();

// A closed/early pinch must not create a stroke before the stable open-hand arm.
let result = intent.observe({ usable: true, stable: true, open: false, pinchStarted: true, pinchActive: true, point: point(.3, .3), rule });
assert.equal(result.blocked, true);
intent.reset();

// Arm through the configured stable open-hand frames.
for (let index = 0; index < rule.armFrames; index += 1) {
  result = intent.observe({ usable: true, stable: true, open: true, pinchActive: false, point: point(.3, .3), rule });
}
assert.equal(result.armed, true);

// A stationary pinch stays pending and can be cancelled without a dot.
const first = pinch.observe({ pinchRatio: rule.start - .02, usable: true, rule, safe: true });
// Feed remaining frames until the pinch gate confirms.
let confirmed = first;
for (let index = 1; index < rule.enterFrames; index += 1) confirmed = pinch.observe({ pinchRatio: rule.start - .02, usable: true, rule, safe: true });
result = intent.observe({ usable: true, stable: true, open: false, pinchStarted: confirmed.started, pinchActive: confirmed.active, point: point(.3, .3), rule });
assert.equal(result.waiting, true);
result = intent.observe({ usable: true, stable: true, open: false, pinchActive: true, point: point(.304, .303), rule });
assert.equal(result.waiting, true);
result = intent.observe({ usable: true, stable: true, open: true, pinchActive: false, pinchReleased: true, point: point(.304, .303), rule });
assert.equal(result.cancelled, true);

// Re-arm and commit only after an intentional movement.
for (let index = 0; index < rule.armFrames; index += 1) result = intent.observe({ usable: true, stable: true, open: true, pinchActive: false, point: point(.4, .4), rule });
const gate = createPinchGate();
let active;
for (let index = 0; index < rule.enterFrames; index += 1) active = gate.observe({ pinchRatio: rule.start - .02, usable: true, rule, safe: true });
result = intent.observe({ usable: true, stable: true, open: false, pinchStarted: active.started, pinchActive: active.active, point: point(.4, .4), rule });
assert.equal(result.waiting, true);
result = intent.observe({ usable: true, stable: true, open: false, pinchActive: true, point: point(.4 + rule.intentTravel + .004, .4), rule });
assert.equal(result.commit, true);
console.log("Hand input reliability intent-gate QA passed.");
