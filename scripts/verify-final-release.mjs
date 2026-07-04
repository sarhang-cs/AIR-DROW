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
const productionUi = read("web/assets/css/production-ui.css");
const model = resolve(root, "web/vendor/models/hand_landmarker.task");
const runtimeBundle = resolve(root, "web/vendor/mediapipe/vision_bundle.js");
const runtimeWasm = resolve(root, "web/vendor/mediapipe/wasm/vision_wasm_internal.wasm");
const required = [
  "README.md", "README_KU.md", "CHANGELOG.md", "FINAL_RELEASE_MANIFEST.json",
  "docs/USER_GUIDE.md", "docs/USER_GUIDE_KU.md", "docs/PRIVACY.md", "docs/RELEASE_NOTES.md",
  "termux/replace-with-v860-all-feature-device-qa.sh",
  "docs/screenshots/air-drow-studio-en.png", "docs/screenshots/air-drow-hand-en.png",
  "docs/V830_EXPORT_PREVIEW_SAVE_POLISH.md", "docs/V830_EXPORT_PREVIEW_SAVE_POLISH_KU.md", "docs/V830_QA_REPORT.md", "docs/V831_QA_REPORT.md", "docs/V831_LEGACY_WEBKIT_COMPATIBILITY.md", "docs/V831_LEGACY_WEBKIT_COMPATIBILITY_KU.md", "docs/V832_LAYOUT_LEGACY_RUNTIME_HARDENING.md", "docs/V832_LAYOUT_LEGACY_RUNTIME_HARDENING_KU.md", "docs/V832_QA_REPORT.md", "docs/V840_HAND_INPUT_RELIABILITY.md", "docs/V840_HAND_INPUT_RELIABILITY_KU.md", "docs/V840_QA_REPORT.md", "docs/V850_SETTINGS_KURDISH_RESPONSIVE_POLISH.md", "docs/V850_SETTINGS_KURDISH_RESPONSIVE_POLISH_KU.md", "docs/V850_QA_REPORT.md", "docs/V860_ALL_FEATURE_DEVICE_QA.md", "docs/V860_ALL_FEATURE_DEVICE_QA_KU.md", "docs/V860_QA_REPORT.md",
  "docs/DEVICE_VALIDATION_CHECKLIST.md", "docs/DEVICE_VALIDATION_CHECKLIST_KU.md",
  "scripts/verify-release-readiness.mjs", "scripts/verify-launch-validation.mjs",
  "tests/launch-validation.test.mjs", "web/assets/brand/instagram-sarhang-io-qr.svg"
];
for (const file of required) if (!existsSync(resolve(root, file))) throw new Error(`Production release file is missing: ${file}`);
if (release.version !== pkg.version || release.version !== project.version || release.version !== assets.version) throw new Error("Version metadata is not synchronized.");
if (release.buildId !== project.buildId || release.buildId !== assets.buildId) throw new Error("Build metadata is not synchronized.");
if (release.assetRevision !== assets.assetRevision || release.assetRevision !== "860") throw new Error("Asset revision metadata is not synchronized.");
if (!runtime.includes(`version: "${release.version}"`) || !runtime.includes(`buildId: "${release.buildId}"`)) throw new Error("Runtime release metadata is inconsistent.");
if (!worker.includes(`const BUILD_ID = "${release.buildId}"`)) throw new Error("Service-worker release metadata is inconsistent.");
if (!index.includes(`content="${release.buildId}"`) || !index.includes(`v${release.version}`)) throw new Error("Index release metadata is inconsistent.");
if (!manifest.name.includes("AIR-DROW") || !manifest.start_url.includes(`v${release.version.replaceAll(".", "")}`)) throw new Error("Install manifest is incomplete.");
if (!existsSync(model) || statSync(model).size !== 7_819_105) throw new Error("Complete local hand model is missing.");
if (!existsSync(runtimeBundle) || statSync(runtimeBundle).size < 100_000 || !existsSync(runtimeWasm) || statSync(runtimeWasm).size < 100_000) throw new Error("Complete local hand runtime is missing.");
if (/sourceMappingURL=/u.test(read("web/vendor/mediapipe/vision_bundle.js"))) throw new Error("The source MediaPipe bundle must not reference a missing source map.");
if (!productionUi.includes("about-meta-input") || !productionUi.includes("grid-template-areas:\"inputs version\"")) throw new Error("Wider Kurdish About-card layout is missing.");
if (!index.includes("about-creator-card") || !index.includes("instagram-sarhang-io-qr.svg") || !index.includes("https://www.instagram.com/sarhang.io/") || !index.includes("data-airdrow-surface")) throw new Error("Developer profile, Instagram QR or protected surface markup is incomplete.");
if (!read("README.md").includes("docs/screenshots/air-drow-studio-en.png") || !read("README_KU.md").includes("docs/screenshots/air-drow-hand-en.png") || !read("README.md").includes("v8.6.0")) throw new Error("README screenshots or current release notes are not linked.");
if (!read("web/assets/js/app.js").includes("createFeatureValidation") || !productionUi.includes("v8.6.0 All-Feature Device QA")) throw new Error("All-feature device QA is missing.");
if (!read("web/assets/js/app.js").includes("isStudioControlSurface") || !read("web/assets/js/app.js").includes("createHandFrameScheduler") || !read("web/assets/js/app.js").includes("bindStudioSurfaceGuards")) throw new Error("Canvas input isolation is missing.");
const readiness = read("web/assets/js/features/device-readiness.js");
for (const check of ["Canvas", "RasterExport", "SaveRoute"]) if (!readiness.includes(`"${check}"`)) throw new Error(`On-device launch validation is missing: ${check}`);
if (!readiness.includes("never triggers a file download")) throw new Error("Launch validation must document its no-download boundary.");
const bootScriptMatches = [...index.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
if (bootScriptMatches.length !== 1 || (bootScriptMatches[0][1].match(/const BOOT_COPY/g) || []).length !== 1) throw new Error("Bootstrap script declarations are invalid.");
for (const obsolete of ["phase2-ui.css", "ui-clarity.css", "final-layout-localization.css"]) if (existsSync(resolve(root, "web/assets/css", obsolete))) throw new Error(`Legacy patch stylesheet remains: ${obsolete}`);
if (!index.includes("production-ui.css?v=860") || !worker.includes("production-ui.css?v=860")) throw new Error("Current static cache revision is not synchronized.");
if (!read("README.md").includes("DEVICE_VALIDATION_CHECKLIST.md") || !read("README_KU.md").includes("DEVICE_VALIDATION_CHECKLIST_KU.md")) throw new Error("Device validation guidance is not linked from the READMEs.");

const csp = JSON.parse(read("vercel.json")).headers.flatMap(group => group.headers || []).find(header => header.key === "Content-Security-Policy")?.value || "";
if (!/script-src[^;]*'wasm-unsafe-eval'/.test(csp) || !/script-src[^;]*'unsafe-eval'/.test(csp)) throw new Error("Legacy WebKit WebAssembly CSP compatibility is missing.");
const handEngine = read("web/assets/js/features/hand-tracking-engine.js");
if (!handEngine.includes("createHandIntentGate") || !read("web/assets/js/app.js").includes("resolveHandRepinch")) throw new Error("Hand input reliability path is missing.");
console.log(`AIR-DROW final release check passed: v${release.version}`);
