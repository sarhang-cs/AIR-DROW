import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const app = read("web/assets/js/app.js");
const runtime = read("web/assets/js/config/runtime.js");
const bootstrap = read("web/assets/js/features/hand-engine-bootstrap.js");
const css = read("web/assets/css/drawer-layout.css");
const html = read("web/index.html");
const worker = read("web/sw.js");
const release = JSON.parse(read("web/release.json"));

for (const file of [
  "web/vendor/models/hand_landmarker.task",
  "web/assets/icons/toolbar/undo.svg",
  "web/assets/icons/toolbar/redo.svg",
  "web/assets/css/drawer-layout.css"
]) if (!existsSync(resolve(root, file))) throw new Error(`Missing Camera/UI release asset: ${file}`);
if (statSync(resolve(root, "web/vendor/models/hand_landmarker.task")).size < 7_000_000) throw new Error("Local hand model is incomplete.");
for (const marker of [
  "createLocalHandLandmarker", "primeLocalHandAssets", "handleHandRuntimeFailure",
  "hideRecovery(\"camera\")", "reportHandEngineFailure", "await waitForCameraFrame(2200)"
]) if (!app.includes(marker)) throw new Error(`Hand-engine reliability marker is missing: ${marker}`);
for (const marker of ["local-url-cpu", "local-url-default", "local-buffer-cpu", "modelAssetPath: modelUrl"]) {
  if (!bootstrap.includes(marker)) throw new Error(`Local hand bootstrap marker is missing: ${marker}`);
}
if (!runtime.includes('wasm/", import.meta.url')) throw new Error("Local WASM directory must use a trailing slash.");
for (const marker of [
  "grid-template-rows: var(--drawer-header-height) var(--drawer-tabs-height) minmax(0, 1fr)",
  "overflow-y: auto !important", "scroll-padding-block", "toggle-control", "toggle-visual",
  "grid-template-columns: 30px minmax(0, 1fr) 28px", "#workspaceTitle", ".settings-header"
]) if (!css.includes(marker)) throw new Error(`Drawer/RTL reliability marker is missing: ${marker}`);
if (!html.includes('data-toolbar-icon="redo"') || !html.includes('AIRDROW_ICON:redo:START')) throw new Error("Redo must use the same inline local toolbar icon contract as undo.");
for (const marker of ["/assets/css/icon-system.css", "/assets/css/drawer-layout.css", "/vendor/models/hand_landmarker.task", "/vendor/mediapipe/vision_bundle.js"]) if (!worker.includes(marker)) throw new Error(`Service-worker cache is missing ${marker}`);
if (release.version !== "5.0.6" || release.buildId !== "air-drow-v506-hand-runtime-loader-fix") throw new Error("Camera/UI release metadata is inconsistent.");
console.log("AIR-DROW Hand Runtime Loader Fix verified: local camera-frame-first hand engine, Android-safe toggles, fixed drawer geometry, stable RTL/LTR header and visible history icons.");
