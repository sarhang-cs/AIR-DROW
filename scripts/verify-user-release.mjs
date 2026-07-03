import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const json = file => JSON.parse(read(file));
const release = json("web/release.json");
const pkg = json("package.json");
const project = json("PROJECT_MANIFEST.json");
const assets = json("web/assets/LOCAL_ASSETS_MANIFEST.json");
const manifest = json("web/manifest.webmanifest");
const runtime = read("web/assets/js/config/runtime.js");
const worker = read("web/sw.js");
const index = read("web/index.html");
const translations = read("web/assets/js/i18n/translations.js");
const model = resolve(root, "web/vendor/models/hand_landmarker.task");
const runtimeBundle = resolve(root, "web/vendor/mediapipe/vision_bundle.js");
const runtimeWasm = resolve(root, "web/vendor/mediapipe/wasm/vision_wasm_internal.wasm");

for (const file of [
  "README.md", "README_KU.md", "CHANGELOG.md", "FINAL_RELEASE_MANIFEST.json",
  "docs/USER_GUIDE.md", "docs/USER_GUIDE_KU.md", "docs/PRIVACY.md",
  "web/assets/readme/air-drow-cover.svg", "web/assets/readme/air-drow-workspace.svg",
  "termux/replace-with-user-icons.sh"
]) if (!existsSync(resolve(root, file))) throw new Error(`Final user-release file is missing: ${file}`);

if (release.version !== pkg.version || release.version !== project.version || release.version !== assets.version) throw new Error("Version metadata is not synchronized.");
if (release.buildId !== project.buildId || release.buildId !== assets.buildId) throw new Error("Build metadata is not synchronized.");
if (!runtime.includes(`version: "${release.version}"`) || !runtime.includes(`buildId: "${release.buildId}"`)) throw new Error("Runtime release metadata is inconsistent.");
if (!worker.includes(`const BUILD_ID = "${release.buildId}"`)) throw new Error("Service-worker release metadata is inconsistent.");
if (!index.includes(`content="${release.buildId}"`) || !index.includes(`v${release.version}`)) throw new Error("Index release metadata is inconsistent.");
if (!manifest.name.includes("AIR-DROW") || !manifest.start_url.includes("v730")) throw new Error("Install manifest is incomplete.");
if (!existsSync(model) || statSync(model).size !== 7_819_105) throw new Error("Complete local hand model is missing.");
if (!existsSync(runtimeBundle) || statSync(runtimeBundle).size < 100_000 || !existsSync(runtimeWasm) || statSync(runtimeWasm).size < 100_000) throw new Error("Complete local hand runtime is missing.");
if (!index.includes('id="runDeviceReadinessBtn"') || !index.includes('id="runFinalLiveQaBtn"')) throw new Error("Friendly app-check controls are missing.");
for (const marker of ['"deviceReadinessTitle": "App readiness"', '"finalLiveQaTitle": "Hand drawing check"', '"aboutMadeFor"', '"aboutPrivacy"']) {
  if (!translations.includes(marker)) throw new Error(`User-facing copy is missing: ${marker}`);
}
for (const forbidden of ['>Developer<', '>Build ID<', 'Final Master Release', 'Final live QA']) {
  if (index.includes(forbidden)) throw new Error(`Developer-facing UI copy remains in index.html: ${forbidden}`);
}
console.log(`AIR-DROW final-polish release check passed: v${release.version}`);
