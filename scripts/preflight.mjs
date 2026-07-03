import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "web/index.html", "web/assets/css/app.css", "web/assets/css/phase2-ui.css", "web/release.json", "web/sw.js", "web/manifest.webmanifest", "web/favicon.svg", "web/assets/fonts/noto-kufi-arabic/NotoKufiArabic-VariableFont_wght.ttf",
  "web/assets/js/app.js", "web/assets/js/config/runtime.js", "web/assets/js/i18n/translations.js", "web/assets/js/ui/registry.js", "web/assets/js/core/project-store.js", "web/assets/js/core/release-manager.js", "web/assets/js/core/font-kit.js", "web/assets/js/core/loading-manager.js", "web/assets/js/core/performance-governor.js", "web/assets/js/core/reliability-center.js", "web/assets/js/features/hand-calibration.js", "web/assets/js/features/hand-tracking-engine.js", "web/assets/js/features/onboarding-flow.js", "web/assets/js/features/exporter.js", "web/assets/js/features/brush-lab.js", "web/assets/js/features/shape-engine.js", "web/assets/js/features/gesture-shortcuts.js", "web/assets/js/features/replay-engine.js", "web/assets/js/features/share-card.js", "web/assets/js/features/air-challenge.js", "web/assets/js/features/template-studio.js", "web/assets/js/features/ai-studio.js", "web/assets/js/workers/template-render.worker.js",
  "api/health.js", "api/ai/generate.js", ".env.example",
  "scripts/verify-phase2-ui-system.mjs", "scripts/verify-phase3-hand-drawing.mjs", "scripts/verify-phase4-project-safety.mjs", "scripts/verify-phase5-release-readiness.mjs", "scripts/verify-phase6-device-readiness.mjs", "scripts/verify-phase7-final-live-qa.mjs", "web/assets/js/features/device-readiness.js", "web/assets/js/features/final-live-qa.js", "scripts/build-selfhosted-mediapipe.mjs", "scripts/verify-bootstrap-pwa-recovery.mjs", "scripts/verify-transparent-status-hud.mjs", "scripts/verify-code-cleanup.mjs", "scripts/verify-premium-visual-system.mjs", "scripts/verify-fist-guide-continuity.mjs", "scripts/sync-toolbar-icons.mjs", "scripts/verify-toolbar-icon-bundle.mjs", "scripts/verify-update-runtime.mjs", "scripts/verify-smart-shape.mjs", "scripts/verify-workspace-navigation.mjs", "scripts/verify-loading-experience.mjs", "scripts/verify-performance-guard.mjs", "scripts/verify-hand-calibration.mjs", "scripts/verify-hand-tracking-runtime.mjs", "scripts/verify-export-save-onboarding.mjs", "scripts/verify-final-completion-pass.mjs", "web/assets/css/icon-system.css", "web/assets/js/core/persistence-guard.js", "web/assets/icons/ICON_SYSTEM.md",
  "vercel.json", "package.json"
];
const icons = ["brush", "eraser", "hand", "camera", "undo", "trash", "moon", "sun", "settings"];
const missing = [...required, ...icons.map(name => `web/assets/icons/toolbar/${name}.svg`)].filter(file => !existsSync(resolve(root, file)));
if (missing.length) throw new Error(`Missing required source files:\n${missing.map(file => `- ${file}`).join("\n")}`);

const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const release = JSON.parse(readFileSync(resolve(root, "web/release.json"), "utf8"));
const html = readFileSync(resolve(root, "web/index.html"), "utf8");
const app = readFileSync(resolve(root, "web/assets/js/app.js"), "utf8");
const runtime = readFileSync(resolve(root, "web/assets/js/config/runtime.js"), "utf8");
const worker = readFileSync(resolve(root, "web/sw.js"), "utf8");
const manifest = JSON.parse(readFileSync(resolve(root, "web/manifest.webmanifest"), "utf8"));
const vercel = JSON.parse(readFileSync(resolve(root, "vercel.json"), "utf8"));
const aiFunction = readFileSync(resolve(root, "api/ai/generate.js"), "utf8");

const health = readFileSync(resolve(root, "api/health.js"), "utf8");
if (!health.includes(`version: "${release.version}"`)) throw new Error("Health endpoint version must match release.json.");

if (vercel.outputDirectory !== "public") throw new Error("vercel.json outputDirectory must be public.");
if (!pkg.dependencies?.["@mediapipe/tasks-vision"]) throw new Error("@mediapipe/tasks-vision is required.");
if (!runtime.includes("../../../vendor/mediapipe/vision_bundle.js")) throw new Error("Client must use self-hosted MediaPipe.");
if (pkg.version !== release.version) throw new Error(`package.json version (${pkg.version}) must match release.json (${release.version}).`);
if (!manifest.name.includes(release.version)) throw new Error("Manifest version must match release.json.");
if (!vercel.headers?.some(entry => entry.source === "/release.json" && entry.headers?.some(header => header.key === "Cache-Control" && /no-store/.test(header.value)))) throw new Error("release.json must be no-store on Vercel.");
if (!vercel.headers?.some(entry => entry.source === "/api/(.*)" && entry.headers?.some(header => header.key === "Cache-Control" && /no-store/.test(header.value)))) throw new Error("API routes must be no-store on Vercel.");
if (!app.includes("createReleaseManager")) throw new Error("Controlled release manager is missing.");
if (!app.includes("projectStore")) throw new Error("IndexedDB project store is missing.");
if (!app.includes("createExporter")) throw new Error("Export module is missing.");
if (!app.includes("drawStrokeWithBrush")) throw new Error("Creator brush lab is missing.");
if (!app.includes("analyzeShape") || !app.includes("recognizeAndSnap")) throw new Error("Smart Shape 2.0 engine is missing.");
if (!html.includes('id="shapeSnapMode"') || !html.includes('id="shapeIntent"') || !html.includes('id="shapeConfidence"')) throw new Error("Smart Shape 2.0 controls are missing from index.html.");
if (!html.includes('id="workspaceDock"') || !html.includes('id="workspaceTabs"') || !app.includes("setWorkspace")) throw new Error("Workspace Navigator is missing from the Studio shell.");
if (!app.includes("renderProjectGallery")) throw new Error("Project gallery is missing.");
if (!app.includes("recognizeGestureShortcut")) throw new Error("Gesture shortcut engine is missing.");
if (!app.includes("createReplayStudio")) throw new Error("Air Replay engine is missing.");
if (!app.includes("createDailyChallengeSession")) throw new Error("Daily challenge engine is missing.");
if (!app.includes("createShareCardStudio")) throw new Error("Creator Story Card engine is missing.");
if (!app.includes("createTemplateStudio")) throw new Error("Creator Pack template studio is missing.");
if (!app.includes("createAiStudio")) throw new Error("AI Studio client is missing.");
if (!app.includes("ensureKurdishFont")) throw new Error("Kurdish typography loader is missing.");
if (!app.includes("createLoadingManager") || !html.includes('id="appBoot"')) throw new Error("Loading Experience is missing.");
if (!app.includes("createPerformanceGovernor") || !html.includes('id="canvasQualityStatus"')) throw new Error("Performance Guard is missing.");
if (!app.includes("createHandCalibration") || !html.includes('id="handCalibrationOverlay"')) throw new Error("Hand Calibration is missing.");
if (!app.includes("createHandStabilizer") || !app.includes("createStrokeContinuityGate") || !html.includes('id="cameraHandSection"')) throw new Error("Phase 3 Hand Drawing Engine is missing.");
if (!app.includes("cacheHandGuide") || !app.includes("drawHeldHandGuide")) throw new Error("Closed-fist hand guide continuity is missing.");
if (!app.includes("createReliabilityCenter") || !html.includes('id="recoveryNotice"') || !html.includes('id="quickStartOverlay"')) throw new Error("Polish & Reliability recovery UI is missing.");
if (!app.includes("createOnboardingFlow") || !html.includes('id="exportStatus"')) throw new Error("Export, save and onboarding flow is missing.");
if (html.includes("fonts.googleapis.com") || html.includes("fonts.gstatic.com")) throw new Error("External Google Fonts requests must not be shipped.");
if (!html.includes("airdrow-local-noto-kufi-font") || !html.includes("NotoKufiArabic-VariableFont_wght.ttf")) throw new Error("Local Noto Kufi Arabic @font-face is missing.");
const fontPath = resolve(root, "web/assets/fonts/noto-kufi-arabic/NotoKufiArabic-VariableFont_wght.ttf");
if (statSync(fontPath).size < 100000) throw new Error("Local Noto Kufi Arabic font asset is unexpectedly small.");
if (!worker.includes("NotoKufiArabic-VariableFont_wght.ttf")) throw new Error("Service worker must pre-cache the local Kurdish font asset.");
if (!worker.includes("performance-governor.js")) throw new Error("Service worker must cache the performance governor.");
if (!worker.includes("hand-calibration.js")) throw new Error("Service worker must cache the hand calibration module.");
if (!worker.includes("hand-tracking-engine.js")) throw new Error("Service worker must cache the hand tracking engine.");
if (!worker.includes("onboarding-flow.js")) throw new Error("Service worker must cache the onboarding flow.");
if (!worker.includes("reliability-center.js")) throw new Error("Service worker must cache the reliability center.");
if (!aiFunction.includes("OPENAI_API_KEY") || !aiFunction.includes("/v1/images/edits")) throw new Error("Server-side AI image endpoint is incomplete.");
if (!html.includes('id="updateBanner"')) throw new Error("Update banner is missing from index.html.");
if (!html.includes('id="appVersionValue"') || !html.includes('id="appBuildId"')) throw new Error("Phase 5 release identity is missing from the About panel.");
if (!app.includes("syncReleaseIdentity")) throw new Error("Phase 5 runtime release identity sync is missing.");
if (!app.includes("createDeviceReadiness") || !html.includes('id="runDeviceReadinessBtn"')) throw new Error("Phase 6 Device Readiness is missing.");
if (!app.includes("createFinalLiveQa") || !html.includes('id="runFinalLiveQaBtn"')) throw new Error("Phase 7 Final Live QA is missing.");
if (!worker.includes("final-live-qa.js")) throw new Error("Service worker must cache the Phase 7 Final Live QA module.");
if (!html.includes('id="redoBtn"')) throw new Error("Redo control is missing from index.html.");
if (!html.includes(`href=\"./assets/css/icon-system.css?v=${release.assetRevision}\"`)) throw new Error("Local icon system stylesheet is missing.");
if (!html.includes(`href=\"./assets/css/phase2-ui.css?v=${release.assetRevision}\"`)) throw new Error("Phase 2 mobile UI stylesheet is missing.");
if (!html.includes('id="aiStudioSection"') || !html.includes('id="creatorPackSection"')) throw new Error("AI Final Studio UI is missing from index.html.");
if (!worker.includes("AIRDROW_SKIP_WAITING")) throw new Error("Service worker update message is missing.");

const appBuild = runtime.match(/buildId:\s*["']([^"']+)["']/)?.[1] || "missing";
const metaBuild = html.match(/name=["']air-drow-build["']\s+content=["']([^"']+)["']/)?.[1] || "missing";
const workerBuild = worker.match(/const BUILD_ID = ["']([^"']+)["']/)?.[1] || "missing";
if ([appBuild, metaBuild, workerBuild].some(value => value !== release.buildId)) {
  throw new Error(`Release build ID mismatch. expected=${release.buildId}; app=${appBuild}; index=${metaBuild}; worker=${workerBuild}`);
}
for (const name of icons) if (!html.includes(`data-airdrow-bundled-icon="${name}"`)) throw new Error(`Toolbar icon is not bundled: ${name}.svg`);
console.log(`AIR-DROW Clean Code preflight passed: ${release.version} / ${release.buildId}`);
