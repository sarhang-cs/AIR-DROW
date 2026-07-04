import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const runtime = readFileSync(resolve(root, "web/assets/js/config/runtime.js"), "utf8");
const bootstrap = readFileSync(resolve(root, "web/assets/js/features/hand-engine-bootstrap.js"), "utf8");
const app = readFileSync(resolve(root, "web/assets/js/app.js"), "utf8");
const worker = readFileSync(resolve(root, "web/sw.js"), "utf8");
const vercel = readFileSync(resolve(root, "vercel.json"), "utf8");
for (const rel of [
  "public/vendor/mediapipe/vision_bundle.js",
  "public/vendor/mediapipe/wasm/vision_wasm_internal.js",
  "public/vendor/mediapipe/wasm/vision_wasm_internal.wasm",
  "public/vendor/mediapipe/wasm/vision_wasm_module_internal.js",
  "public/vendor/mediapipe/wasm/vision_wasm_module_internal.wasm",
  "public/vendor/mediapipe/wasm/vision_wasm_nosimd_internal.js",
  "public/vendor/mediapipe/wasm/vision_wasm_nosimd_internal.wasm",
  "public/vendor/models/hand_landmarker.task"
]) {
  const file = resolve(root, rel);
  if (!existsSync(file) || statSync(file).size < 1024) throw new Error(`Missing runtime asset: ${rel}`);
}
if (!runtime.includes("vision_bundle.js")) throw new Error("Runtime must load the local .js MediaPipe bundle.");
if (!runtime.includes('new URL("../../../vendor/mediapipe/wasm", import.meta.url)')) throw new Error("WASM base must have no trailing slash.");
if (!bootstrap.includes('replace(/\\/+$/, "")')) throw new Error("WASM base normalization is missing.");
if (!worker.includes("cacheFirstOnDemand") || !worker.includes('url.pathname.startsWith("/vendor/")')) throw new Error("Service worker must lazy-cache the local hand runtime on demand.");
if (!vercel.includes('application/javascript; charset=utf-8') || !vercel.includes('application/wasm')) throw new Error("Explicit runtime MIME headers are missing.");
if (!app.includes('diagnostics?.record("hand-engine", error)') || !app.includes('Keep technical browser/CSP details in local Diagnostics')) throw new Error("Local hand-engine diagnostics and safe recovery are missing.");
console.log("Hand runtime loader contract passed.");
