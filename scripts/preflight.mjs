import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "web/index.html", "web/assets/css/app.css", "web/assets/css/phase2-ui.css", "web/assets/css/ui-clarity.css", "web/release.json", "web/sw.js", "web/manifest.webmanifest", "web/favicon.svg", "web/assets/fonts/noto-kufi-arabic/NotoKufiArabic-VariableFont_wght.ttf",
  "web/assets/js/app.js", "web/assets/js/config/runtime.js", "web/assets/js/i18n/translations.js", "web/assets/js/ui/registry.js", "web/assets/js/core/project-store.js", "web/assets/js/core/release-manager.js", "web/assets/js/core/font-kit.js", "web/assets/js/core/loading-manager.js", "web/assets/js/core/performance-governor.js", "web/assets/js/core/reliability-center.js", "web/assets/js/core/persistence-guard.js",
  "web/assets/js/features/device-readiness.js", "web/assets/js/features/final-live-qa.js", "web/assets/js/features/hand-calibration.js", "web/assets/js/features/hand-tracking-engine.js", "web/assets/js/features/onboarding-flow.js", "web/assets/js/features/exporter.js", "web/assets/js/features/ai-studio.js",
  "web/vendor/models/hand_landmarker.task", "scripts/build-selfhosted-mediapipe.mjs", "scripts/verify-user-release.mjs", "scripts/verify-ui-clarity.mjs", "scripts/verify-local-hand-model.mjs", "scripts/verify-hand-runtime-loader-fix.mjs", "scripts/verify-deployment-build-order.mjs", "scripts/sync-toolbar-icons.mjs", "scripts/verify-toolbar-icon-bundle.mjs", "api/health.js", "api/ai/generate.js", ".env.example", "vercel.json", "package.json"
];
const icons = ["brush", "eraser", "hand", "camera", "undo", "redo", "trash", "moon", "sun", "settings"];
const missing = [...required, ...icons.map(name => `web/assets/icons/toolbar/${name}.svg`)].filter(file => !existsSync(resolve(root, file)));
if (missing.length) throw new Error(`Missing required source files\n${missing.map(file => `- ${file}`).join("\n")}`);

const read = file => readFileSync(resolve(root, file), "utf8");
const pkg = JSON.parse(read("package.json"));
const release = JSON.parse(read("web/release.json"));
const html = read("web/index.html");
const app = read("web/assets/js/app.js");
const runtime = read("web/assets/js/config/runtime.js");
const worker = read("web/sw.js");
const manifest = JSON.parse(read("web/manifest.webmanifest"));
const vercel = JSON.parse(read("vercel.json"));
const health = read("api/health.js");

if (vercel.outputDirectory !== "public") throw new Error("Vercel output must be public.");
if (vercel.installCommand !== "npm ci --no-audit --no-fund") throw new Error("Vercel install must use deterministic npm ci.");
if (vercel.buildCommand !== "npm run vercel:build") throw new Error("Vercel build command is not configured.");
if (!pkg.dependencies?.["@mediapipe/tasks-vision"]) throw new Error("Hand drawing dependency is missing.");
if (pkg.version !== release.version || !release.buildId || !release.assetRevision) throw new Error("Release metadata is incomplete.");
if (!manifest.name.includes("AIR-DROW") || !manifest.name.includes(release.version) && !manifest.name.includes("Touch")) throw new Error("Install manifest is missing AIR-DROW identity.");
if (!health.includes(`version: "${release.version}"`)) throw new Error("App health version is out of date.");
if (!runtime.includes("../../../vendor/mediapipe/vision_bundle.js")) throw new Error("The local hand runtime is not configured.");
if (!app.includes("createReleaseManager") || !app.includes("createExporter") || !app.includes("createAiStudio")) throw new Error("Core AIR-DROW modules are missing.");
if (!html.includes('id="workspaceDock"') || !html.includes('id="cameraHandSection"') || !html.includes('id="updateBanner"')) throw new Error("Core AIR-DROW interface is incomplete.");
if (!html.includes('id="runDeviceReadinessBtn"') || !html.includes('id="runFinalLiveQaBtn"')) throw new Error("App check interface is incomplete.");
if (html.includes("fonts.googleapis.com") || html.includes("fonts.gstatic.com")) throw new Error("External font requests must not be shipped.");
if (!html.includes("NotoKufiArabic-VariableFont_wght.ttf")) throw new Error("Local Kurdish font is missing.");
if (statSync(resolve(root, "web/assets/fonts/noto-kufi-arabic/NotoKufiArabic-VariableFont_wght.ttf")).size < 100000) throw new Error("Local Kurdish font is incomplete.");
if (!worker.includes("NotoKufiArabic-VariableFont_wght.ttf") || !worker.includes("final-live-qa.js") || !worker.includes("device-readiness.js")) throw new Error("Offline app shell is incomplete.");
const appBuild = runtime.match(/buildId:\s*["']([^"']+)["']/)?.[1] || "missing";
const metaBuild = html.match(/name=["']air-drow-build["']\s+content=["']([^"']+)["']/)?.[1] || "missing";
const workerBuild = worker.match(/const BUILD_ID = ["']([^"']+)["']/)?.[1] || "missing";
if ([appBuild, metaBuild, workerBuild].some(value => value !== release.buildId)) throw new Error("Release identity must stay synchronized.");
for (const name of icons) if (!html.includes(`data-airdrow-bundled-icon="${name}"`)) throw new Error(`Toolbar icon is not bundled: ${name}.svg`);
console.log(`AIR-DROW source check passed: v${release.version}`);
