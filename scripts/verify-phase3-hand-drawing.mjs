import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHandStabilizer, createPinchGate, createStrokeContinuityGate, readHandPosture } from "../web/assets/js/features/hand-tracking-engine.js";
import { PROFILE_RULES } from "../web/assets/js/config/runtime.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const app = read("web/assets/js/app.js");
const tracking = read("web/assets/js/features/hand-tracking-engine.js");
const worker = read("web/sw.js");
const release = JSON.parse(read("web/release.json"));

if (!existsSync(resolve(root, "web/assets/js/features/hand-tracking-engine.js"))) throw new Error("Phase 3 tracking engine is missing.");
if (release.phase !== 3 || release.stage !== "hand-drawing-engine") throw new Error("Phase 3 release metadata is incomplete.");
for (const marker of [
  "createStrokeContinuityGate",
  "readHandPosture",
  "velocity-aware",
  "bounded one-frame prediction",
  "function holdOrFinishHandStroke",
  "state.handContinuity.begin(now, state.handPoint)",
  "Closed fist detected — stroke held safely",
  "HAND_GUIDE_HOLD_MS = 560",
  "const handSmooth = Math.max(.08, Math.min(.30, smooth * .48))"
]) if (!app.includes(marker) && !tracking.includes(marker)) throw new Error(`Phase 3 hand drawing marker missing: ${marker}`);
if (!worker.includes("hand-tracking-engine.js")) throw new Error("Service worker must cache the Phase 3 hand engine.");

const rule = PROFILE_RULES.balanced;
const stabilizer = createHandStabilizer();
let sample;
for (let index = 0; index < rule.stableFrames; index += 1) {
  sample = stabilizer.observe({ x: .40 + index * .009, y: .26, time: index * 33 }, { scale: .16, rule, eligible: true });
}
if (!sample?.stable || !sample?.point || !sample.accepted) throw new Error("Stable fingertip samples must become drawable.");
if (sample.point.x < .40 || sample.point.x > .46) throw new Error("Velocity-aware pointer prediction is out of safe bounds.");
const rejectedJump = stabilizer.observe({ x: .99, y: .99, time: 200 }, { scale: .16, rule, eligible: true });
if (!rejectedJump.jumped || rejectedJump.accepted) throw new Error("Large camera jumps must never be painted.");

const gate = createStrokeContinuityGate();
gate.begin(100, { x: .45, y: .4, time: 100 });
const fistHold = gate.observe({ now: 520, usable: false, landmarksPresent: true, fist: true, rule });
if (!fistHold.paused || fistHold.expired) throw new Error("A closed fist must keep a current stroke safely held for the bounded grace window.");
const restored = gate.observe({ now: 550, usable: true, landmarksPresent: true, point: { x: .46, y: .4, time: 550 }, rule });
if (restored.paused || !restored.active) throw new Error("Safe tracking must resume an interrupted current stroke.");
const missingHold = gate.observe({ now: 720, usable: false, landmarksPresent: false, rule });
if (!missingHold.paused) throw new Error("A brief missing-frame interruption must not drop active ink.");
const expired = gate.observe({ now: 1200, usable: false, landmarksPresent: false, rule });
if (!expired.expired) throw new Error("A prolonged loss must finish the active stroke instead of keeping a stale point alive.");
gate.begin(1300, { x: .4, y: .4 });
const jumpEnd = gate.observe({ now: 1310, usable: false, landmarksPresent: true, jumped: true, rule });
if (!jumpEnd.expired || jumpEnd.reason !== "jump") throw new Error("A tracking jump must end the active stroke immediately.");

const fist = Array.from({ length: 21 }, () => ({ x: .5, y: .56, z: 0 }));
fist[0] = { x: .5, y: .70, z: 0 };
fist[5] = { x: .42, y: .56, z: 0 };
fist[9] = { x: .5, y: .53, z: 0 };
fist[17] = { x: .58, y: .56, z: 0 };
for (const index of [8, 12, 16, 20]) fist[index] = { x: .5, y: .60, z: 0 };
const posture = readHandPosture(fist, { scale: .16, fingerSpan: .55 });
if (!posture.closedFist) throw new Error("Closed-fist posture must be detectable for continuity protection.");

const pinch = createPinchGate();
for (let index = 0; index < rule.enterFrames; index += 1) sample = pinch.observe({ pinchRatio: .20, usable: true, rule, safe: true });
if (!sample.started) throw new Error("A stable pinch must still arm drawing exactly once.");
console.log(`AIR-DROW Phase 3 hand drawing verified: v${release.version} / velocity-aware fingertip sync, stable pinch, fist continuity and guarded stroke release.`);
