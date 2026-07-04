import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const need = [
  "web/assets/js/features/hand-frame-scheduler.js",
  "web/assets/js/features/tracking-quality-governor.js",
  "tests/hand-performance-stabilization.test.mjs",
  "docs/V780_HAND_PERFORMANCE_QA.md"
];
for (const file of need) if (!existsSync(resolve(root, file))) throw new Error(`Missing hand-performance release file: ${file}`);

const app = read("web/assets/js/app.js");
const runtime = read("web/assets/js/config/runtime.js");
const scheduler = read("web/assets/js/features/hand-frame-scheduler.js");
const governor = read("web/assets/js/features/tracking-quality-governor.js");
const release = JSON.parse(read("web/release.json"));

for (const token of ["createHandFrameScheduler", "createTrackingQualityGovernor", "startHandLoop", "isHandPointOnProtectedSurface", "gestureUiProtected", "handSessionId"]) {
  if (!app.includes(token)) throw new Error(`Hand-performance integration is incomplete: ${token}`);
}
if (!scheduler.includes("requestVideoFrameCallback") || !scheduler.includes("duplicate")) throw new Error("Video-frame scheduler must use requestVideoFrameCallback and duplicate-frame protection.");
if (!governor.includes("requestCaptureReduction") || !governor.includes("mode === \"max\"")) throw new Error("Adaptive tracking governor is incomplete.");
if (!runtime.includes("inputSafetyVersion: 3")) throw new Error("Hand safety migration must be versioned for existing local projects.");
if (release.version !== "7.8.0" || release.stage !== "hand-performance-stabilization") throw new Error("Hand-performance release metadata is stale.");
if (app.includes("console.warn = (...args)")) throw new Error("Inference must not globally override console.warn.");

for (const test of ["tests/export-gesture-reliability.test.mjs", "tests/hand-performance-stabilization.test.mjs"]) {
  const result = spawnSync(process.execPath, [test], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${test} failed`);
}
console.log("AIR-DROW Hand Tracking & Performance Stabilization QA passed.");
