import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const app = read("web/assets/js/app.js");
const bootstrap = read("web/assets/js/features/hand-engine-bootstrap.js");
const tracking = read("web/assets/js/features/hand-tracking-engine.js");
const runtime = read("web/assets/js/config/runtime.js");
const worker = read("web/sw.js");
const release = JSON.parse(read("web/release.json"));

for (const marker of [
  "videoRect = ui.camera.getBoundingClientRect",
  "Camera mirroring is visual-only CSS",
  "trackingWidth",
  "width: { ideal: 320, max: 480 }",
  "state.handDelegate = result.delegate"
]) {
  if (!app.includes(marker)) throw new Error(`Hand sync/performance runtime marker missing: ${marker}`);
}
for (const marker of [
  "local-url-gpu",
  "local-buffer-gpu",
  'delegate: "GPU"',
  "local-url-cpu",
  "trackingConfidence",
  "preferredDelegate",
  "cpuAttempts"
]) {
  if (!bootstrap.includes(marker)) throw new Error(`GPU acceleration fallback marker missing: ${marker}`);
}
for (const marker of ["catch up", "alpha = clamp(baseAlpha + movementBoost, .22, .90)"]) {
  if (!tracking.includes(marker)) throw new Error(`Low-latency stabilizer marker missing: ${marker}`);
}
if (!runtime.includes("model=v6-fbc2a300")) throw new Error("Hand model cache key was not rotated.");
if (!worker.includes(release.buildId)) throw new Error("Service-worker cache namespace was not rotated.");
console.log("AIR-DROW hand sync and GPU performance contract passed.");
