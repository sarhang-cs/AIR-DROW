import { cpSync, existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "web");
const output = resolve(root, "public");
const packageRoot = resolve(root, "node_modules/@mediapipe/tasks-vision");
const mediaPipeVersion = "0.10.35";
const vendorRoot = resolve(output, "vendor/mediapipe");
const modelRoot = resolve(output, "vendor/models");
const sourceModel = resolve(source, "vendor/models/hand_landmarker.task");
const outputModel = resolve(modelRoot, "hand_landmarker.task");

function copyRequired(from, to) {
  if (!existsSync(from)) throw new Error(`Required file is missing: ${from}`);
  cpSync(from, to, { recursive: true });
}

const verify = spawnSync(process.execPath, [resolve(root, "scripts/verify-local-hand-model.mjs")], { cwd: root, stdio: "inherit" });
if (verify.status !== 0) throw new Error("Local hand model verification failed; static build stopped.");

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync(source, output, { recursive: true });
mkdirSync(vendorRoot, { recursive: true });
// Keep the package source intact but publish it as .js. Some strict Android
// deployments serve .mjs with a non-JS MIME type, while .js is unambiguous.
copyRequired(resolve(packageRoot, "vision_bundle.mjs"), resolve(vendorRoot, "vision_bundle.js"));
copyRequired(resolve(packageRoot, "wasm"), resolve(vendorRoot, "wasm"));
mkdirSync(modelRoot, { recursive: true });
copyRequired(sourceModel, outputModel);

for (const path of [
  resolve(output, "index.html"),
  resolve(vendorRoot, "vision_bundle.js"),
  resolve(vendorRoot, "wasm", "vision_wasm_internal.js"),
  resolve(vendorRoot, "wasm", "vision_wasm_internal.wasm"),
  resolve(vendorRoot, "wasm", "vision_wasm_module_internal.js"),
  resolve(vendorRoot, "wasm", "vision_wasm_module_internal.wasm"),
  resolve(vendorRoot, "wasm", "vision_wasm_nosimd_internal.js"),
  resolve(vendorRoot, "wasm", "vision_wasm_nosimd_internal.wasm"),
  outputModel
]) {
  if (!existsSync(path)) throw new Error(`Build output missing: ${path}`);
}
if (statSync(outputModel).size !== statSync(sourceModel).size) throw new Error("Static hand-model copy size mismatch.");
console.log(`AIR-DROW self-hosted MediaPipe ${mediaPipeVersion} build complete. Local model bytes: ${statSync(outputModel).size}`);
