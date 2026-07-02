import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = file => readFileSync(resolve(root, file), "utf8");
const runtime = read("web/assets/js/config/runtime.js");
const bootstrap = read("web/assets/js/features/hand-engine-bootstrap.js");
const app = read("web/assets/js/app.js");
const worker = read("web/sw.js");
const vercel = read("vercel.json");
const model = resolve(root, "web/vendor/models/hand_landmarker.task");

if (!existsSync(model) || statSync(model).size < 7_000_000) throw new Error("Bundled local hand model is missing or incomplete.");
for (const marker of ["vision_bundle.js", "vendor/mediapipe/wasm", "hand_landmarker.task?model=v3-fbc2a300"]) {
  if (!runtime.includes(marker)) throw new Error(`Hand runtime source configuration is missing ${marker}.`);
}
for (const marker of ["createLocalHandLandmarker", "local-url-cpu", "local-buffer-cpu", "FilesetResolver.forVisionTasks"]) {
  if (!bootstrap.includes(marker)) throw new Error(`Hand bootstrap source is missing ${marker}.`);
}
for (const marker of ["waitForCameraFrame", "reportHandEngineFailure", "engineDiagnostic"]) {
  if (!app.includes(marker)) throw new Error(`Hand startup source is missing ${marker}.`);
}
for (const marker of ["/vendor/mediapipe/vision_bundle.js", "/vendor/models/hand_landmarker.task"]) {
  if (!worker.includes(marker)) throw new Error(`Service-worker source is missing ${marker}.`);
}
if (!vercel.includes("application/javascript; charset=utf-8") || !vercel.includes("application/wasm")) {
  throw new Error("Vercel runtime MIME headers are incomplete.");
}
console.log("AIR-DROW hand runtime source contract passed.");
