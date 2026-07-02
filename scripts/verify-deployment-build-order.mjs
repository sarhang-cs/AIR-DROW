import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const build = String(pkg.scripts?.build || "");
const staticIndex = build.indexOf("npm run build:static");
const outputIndex = build.indexOf("npm run verify:deploy-output");

if (staticIndex < 0 || outputIndex < 0 || staticIndex > outputIndex) {
  throw new Error("Deploy output verification must run after build:static.");
}

for (const rel of [
  "public/vendor/mediapipe/vision_bundle.js",
  "public/vendor/mediapipe/wasm/vision_wasm_internal.js",
  "public/vendor/mediapipe/wasm/vision_wasm_internal.wasm",
  "public/vendor/models/hand_landmarker.task"
]) {
  const file = resolve(root, rel);
  if (!existsSync(file) || statSync(file).size < 1024) {
    throw new Error("Deploy output asset missing: " + rel);
  }
}

console.log("AIR-DROW deployment build order and generated runtime assets verified.");
