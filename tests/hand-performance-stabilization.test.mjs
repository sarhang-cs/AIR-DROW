import assert from "node:assert/strict";
import { createHandFrameScheduler } from "../web/assets/js/features/hand-frame-scheduler.js";
import { createTrackingQualityGovernor } from "../web/assets/js/features/tracking-quality-governor.js";

// Modern Android Chrome path: exactly one synchronous inference per eligible
// decoded video frame, even if MediaPipe returns before the next callback.
let videoCallback = null;
const video = {
  readyState: 2,
  currentTime: 0,
  requestVideoFrameCallback(callback) { videoCallback = callback; return 7; },
  cancelVideoFrameCallback() {}
};
const frames = [];
const scheduler = createHandFrameScheduler({ getMinInterval: () => 50 });
assert.equal(scheduler.start(video, frame => frames.push(frame)), true);
videoCallback(0, { mediaTime: 0.00 });
assert.equal(frames.length, 1);
videoCallback(24, { mediaTime: 0.02 });
assert.equal(frames.length, 1, "scheduler must respect the tracking interval");
videoCallback(58, { mediaTime: 0.04 });
assert.equal(frames.length, 2);
videoCallback(120, { mediaTime: 0.04 });
assert.equal(frames.length, 2, "duplicate decoded camera frames must not be inferred twice");
scheduler.stop();
assert.equal(scheduler.snapshot().running, false);

// The adaptive governor reduces inference cadence only after repeated slow
// samples and never overrides a creator-selected Maximum profile.
const governor = createTrackingQualityGovernor({ floorFps: 12 });
let quality = governor.observe({ configured: 24, measured: 11, inferenceMs: 96, mode: "auto", drawing: false });
assert.equal(quality.requestCaptureReduction, false);
quality = governor.observe({ configured: 24, measured: 11, inferenceMs: 96, mode: "auto", drawing: false });
assert.ok(quality.effectiveFps >= 12 && quality.effectiveFps < 24);
assert.equal(quality.requestCaptureReduction, true);
quality = governor.observe({ configured: 24, measured: 6, inferenceMs: 120, mode: "max", drawing: false });
assert.equal(quality.effectiveFps, 24);
assert.equal(quality.degraded, false);

console.log("Hand scheduling and adaptive performance QA passed.");
