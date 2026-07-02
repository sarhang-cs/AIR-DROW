import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHandStabilizer, createPinchGate, effectiveTrackingFps, handGeometryIsUsable, readHandGeometry } from "../web/assets/js/features/hand-tracking-engine.js";
import { PROFILE_RULES } from "../web/assets/js/config/runtime.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const modulePath = resolve(root, "web/assets/js/features/hand-tracking-engine.js");
const app = readFileSync(resolve(root, "web/assets/js/app.js"), "utf8");
const html = readFileSync(resolve(root, "web/index.html"), "utf8");
const css = readFileSync(resolve(root, "web/assets/css/visual-system.css"), "utf8");
const worker = readFileSync(resolve(root, "web/sw.js"), "utf8");

if (!existsSync(modulePath)) throw new Error("Hand tracking engine module is missing.");
for (const marker of ["createHandStabilizer", "createPinchGate", "effectiveTrackingFps", "handGeometryIsUsable", "readHandGeometry"]) {
  if (!app.includes(marker)) throw new Error(`Hand tracking runtime marker missing: ${marker}`);
}
for (const marker of ["cameraHandSection", "data-camera-runtime"]) {
  if (!html.includes(marker)) throw new Error(`Camera isolation UI marker missing: ${marker}`);
}
if (!css.includes(".app:not(.camera-session-active) [data-camera-runtime]")) throw new Error("Camera runtime controls are not auto-hidden.");
if (!worker.includes("hand-tracking-engine.js")) throw new Error("Service worker must cache the hand tracking engine.");

const hand = Array.from({ length: 21 }, () => ({ x: .5, y: .5, z: 0 }));
hand[0] = { x: .50, y: .82, z: 0 };
hand[5] = { x: .39, y: .56, z: 0 };
hand[9] = { x: .50, y: .48, z: 0 };
hand[17] = { x: .61, y: .56, z: 0 };
hand[2] = { x: .39, y: .54, z: 0 };
hand[4] = { x: .31, y: .39, z: .01 };
hand[6] = { x: .40, y: .38, z: 0 };
hand[8] = { x: .42, y: .18, z: 0 };
hand[20] = { x: .73, y: .36, z: 0 };
const geometry = readHandGeometry(hand, { handednesses: [[{ score: .94 }]] });
if (!handGeometryIsUsable(geometry, PROFILE_RULES.balanced)) throw new Error("A normal open hand must be accepted by the balanced profile.");

const stabilizer = createHandStabilizer();
let sample = null;
for (let index = 0; index < PROFILE_RULES.balanced.stableFrames; index += 1) {
  sample = stabilizer.observe({ x: .42 + index * .002, y: .18, time: index }, { scale: geometry.scale, rule: PROFILE_RULES.balanced, eligible: true });
}
if (!sample?.stable || !sample.accepted) throw new Error("Stable hand samples must become drawable after the configured guard frames.");
const jump = stabilizer.observe({ x: .98, y: .98, time: 9 }, { scale: geometry.scale, rule: PROFILE_RULES.balanced, eligible: true });
if (!jump.jumped || jump.accepted) throw new Error("Large landmark jumps must be rejected before drawing.");

const gate = createPinchGate();
for (let index = 0; index < PROFILE_RULES.balanced.enterFrames - 1; index += 1) {
  const pending = gate.observe({ pinchRatio: .20, usable: true, rule: PROFILE_RULES.balanced, safe: true });
  if (pending.started) throw new Error("Pinch must wait for the configured enter frames.");
}
const started = gate.observe({ pinchRatio: .20, usable: true, rule: PROFILE_RULES.balanced, safe: true });
if (!started.started || !started.active) throw new Error("Stable pinch must start exactly once.");
for (let index = 0; index < PROFILE_RULES.balanced.exitFrames - 1; index += 1) {
  const pending = gate.observe({ pinchRatio: .60, usable: true, rule: PROFILE_RULES.balanced, safe: true });
  if (pending.released) throw new Error("Pinch release must wait for the configured exit frames.");
}
const released = gate.observe({ pinchRatio: .60, usable: true, rule: PROFILE_RULES.balanced, safe: true });
if (!released.released || released.active) throw new Error("Stable pinch release must finish the stroke once.");
if (effectiveTrackingFps({ configured: 24, measured: 4 }) >= 24) throw new Error("Low measured FPS must lower future detector scheduling.");

console.log("AIR-DROW hand tracking verified: candidate guard, adaptive stabilization, pinch hysteresis, safe scheduling and camera isolation are wired.");
