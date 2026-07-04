import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "web/index.html", "web/assets/css/app.css", "web/assets/css/visual-system.css", "web/assets/css/icon-system.css", "web/assets/css/drawer-layout.css", "web/assets/css/production-ui.css", "web/release.json", "web/sw.js", "web/manifest.webmanifest", "web/favicon.svg", "web/assets/fonts/noto-kufi-arabic/NotoKufiArabic-VariableFont_wght.ttf",
  "web/assets/js/app.js", "web/assets/js/config/runtime.js", "web/assets/js/i18n/translations.js", "web/assets/js/ui/registry.js", "web/assets/js/core/project-store.js", "web/assets/js/core/release-manager.js", "web/assets/js/core/font-kit.js", "web/assets/js/core/loading-manager.js", "web/assets/js/core/performance-governor.js", "web/assets/js/core/reliability-center.js", "web/assets/js/core/persistence-guard.js", "web/assets/js/core/diagnostics.js",
  "web/assets/js/features/device-readiness.js", "web/assets/js/features/final-live-qa.js", "web/assets/js/features/hand-calibration.js", "web/assets/js/features/hand-tracking-engine.js", "web/assets/js/features/hand-frame-scheduler.js", "web/assets/js/features/tracking-quality-governor.js", "web/assets/js/features/hand-engine-bootstrap.js", "web/assets/js/features/onboarding-flow.js", "web/assets/js/features/exporter.js", "web/assets/js/features/stroke-smoother.js", "web/assets/js/features/gesture-shortcuts.js", "web/assets/js/features/ai-studio.js",
  "web/vendor/models/hand_landmarker.task", "scripts/build-selfhosted-mediapipe.mjs", "scripts/verify-final-release.mjs", "scripts/verify-localization-theme-final.mjs", "scripts/verify-runtime-experience.mjs", "web/assets/brand/instagram-sarhang-io-qr.svg", "docs/screenshots/air-drow-studio-en.png", "docs/screenshots/air-drow-hand-en.png", "scripts/verify-local-hand-model.mjs", "scripts/verify-hand-runtime-loader-fix.mjs", "scripts/verify-deployment-build-order.mjs", "scripts/verify-input-export-safety.mjs", "scripts/verify-mobile-safety.mjs", "scripts/verify-legacy-webkit-compatibility.mjs", "tests/legacy-webkit-compatibility.test.mjs", "docs/V831_LEGACY_WEBKIT_COMPATIBILITY.md", "docs/V831_LEGACY_WEBKIT_COMPATIBILITY_KU.md", "tests/export-gesture-reliability.test.mjs", "tests/mobile-safety.test.mjs", "docs/V830_EXPORT_PREVIEW_SAVE_POLISH.md", "docs/V830_EXPORT_PREVIEW_SAVE_POLISH_KU.md", "scripts/verify-launch-validation.mjs", "tests/launch-validation.test.mjs", "docs/DEVICE_VALIDATION_CHECKLIST.md", "docs/DEVICE_VALIDATION_CHECKLIST_KU.md", "scripts/verify-release-readiness.mjs", "tests/release-readiness.test.mjs", "scripts/sync-toolbar-icons.mjs", "scripts/verify-toolbar-icon-bundle.mjs", "api/health.js", "api/ai/generate.js", ".env.example", "vercel.json", "package.json"
];
const icons = ["brush", "eraser", "hand", "camera", "undo", "redo", "trash", "moon", "sun", "settings"];
const missing = [...required, ...icons.map(name => `web/assets/icons/toolbar/${name}.svg`)].filter(file => !existsSync(resolve(root, file)));
if (missing.length) throw new Error(`Missing required source files\n${missing.map(file => `- ${file}`).join("\n")}`);
const read = file => readFileSync(resolve(root, file), "utf8");
const pkg = JSON.parse(read("package.json"));
const release = JSON.parse(read("web/release.json"));
const html = read("web/index.html");
const worker = read("web/sw.js");
const manifest = JSON.parse(read("web/manifest.webmanifest"));
const vercel = JSON.parse(read("vercel.json"));
if (vercel.outputDirectory !== "public" || vercel.installCommand !== "npm ci --no-audit --no-fund" || vercel.buildCommand !== "npm run vercel:build") throw new Error("Vercel production configuration is incomplete.");
if (!pkg.dependencies?.["@mediapipe/tasks-vision"]) throw new Error("Hand drawing dependency is missing.");
if (pkg.engines?.node !== ">=22 <25") throw new Error("Node engine must support Vercel and Termux.");
if (pkg.version !== release.version || !release.buildId || !release.assetRevision) throw new Error("Release metadata is incomplete.");
if (!manifest.name.includes("AIR-DROW") || !manifest.start_url.includes(`v${release.version.replaceAll(".", "")}`)) throw new Error("Install manifest is missing the current release.");
if (!html.includes(`production-ui.css?v=${release.assetRevision}`)) throw new Error("Consolidated production stylesheet is not linked.");
for (const obsolete of ["phase2-ui.css", "ui-clarity.css", "final-layout-localization.css", "bootstrap-hotfix.css"]) if (html.includes(obsolete) || worker.includes(obsolete)) throw new Error(`Obsolete stylesheet reference remains: ${obsolete}`);
if (worker.includes('"/vendor/models/hand_landmarker.task"')) throw new Error("The hand model must not be in the install shell.");
if (!worker.includes("cacheFirstOnDemand") || !worker.includes("production-ui.css")) throw new Error("Lazy runtime cache policy is incomplete.");
if (!read("scripts/build-selfhosted-mediapipe.mjs").includes("stale MediaPipe sourcemap")) throw new Error("MediaPipe sourcemap cleanup is missing.");
if (statSync(resolve(root, "web/vendor/models/hand_landmarker.task")).size !== 7_819_105) throw new Error("Complete local hand model is missing.");
console.log(`AIR-DROW production preflight passed: v${release.version}`);
