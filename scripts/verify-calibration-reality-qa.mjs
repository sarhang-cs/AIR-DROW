import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const { I18N } = await import(resolve(root, "web/assets/js/i18n/translations.js"));
const kuKeys = Object.keys(I18N.ku).sort();
const enKeys = Object.keys(I18N.en).sort();
if (JSON.stringify(kuKeys) !== JSON.stringify(enKeys)) throw new Error("Kurdish and English translation keys must remain identical.");
if (!I18N.ku.galleryFallback || !I18N.en.galleryFallback) throw new Error("Gallery recovery mode must be localized.");
const vercel = JSON.parse(read("vercel.json"));
const securityGroup = vercel.headers.find(item => item.source === "/(.*)");
const csp = securityGroup?.headers?.find(item => item.key === "Content-Security-Policy")?.value || "";
if (!/script-src[^;]*'wasm-unsafe-eval'/.test(csp)) throw new Error("The Content Security Policy must allow WebAssembly compilation for the local MediaPipe runtime.");
if (!/script-src[^;]*'unsafe-eval'/.test(csp)) throw new Error("Legacy WebKit compatibility requires the CSP unsafe-eval token for WebAssembly.");
const app = read("web/assets/js/app.js");
const calibration = await import(resolve(root, "web/assets/js/features/hand-calibration.js"));
const store = read("web/assets/js/core/project-store.js");
if (!store.includes("FALLBACK_KEY") || !store.includes("getStorageState") || !store.includes("IndexedDB did not respond in time")) throw new Error("Project storage fallback and timeout recovery are incomplete.");
if (!app.includes('if (workspace === "projects") void renderProjectGallery({ interactive: true });')) throw new Error("Project Gallery must load only when the Projects workspace opens.");
if (/loadProject\(\)[\s\S]{0,2600}void renderProjectGallery\(\)/.test(app)) throw new Error("Project Gallery must not load during app startup.");
const index = read("web/index.html");
const worker = read("web/sw.js");
const api = read("api/ai/generate.js");
if (index.includes('modulepreload" href="./vendor/mediapipe') || index.includes('hand_landmarker.task?model=v620')) throw new Error("Large hand assets must not preload before camera consent.");
if (worker.includes('"/vendor/models/hand_landmarker.task"') || worker.includes('"/vendor/mediapipe/vision_bundle.js"')) throw new Error("Camera runtime must be lazy-cached, not install-cached.");
if (!api.includes("AIRDROW_AI_ALLOWED_ORIGINS") || !api.includes("Retry-After") || !api.includes("MAX_BODY_BYTES")) throw new Error("AI endpoint protection is incomplete.");
const css = read("web/assets/css/app.css");
if (!css.includes("body, body *") || !css.includes("-webkit-user-select: none !important") || !css.includes("-webkit-tap-highlight-color: transparent")) throw new Error("Global mobile selection and tap-highlight guards are incomplete.");
if (!app.includes("bindMobileInteractionGuards") || !app.includes("belongsToStudioDocument") || !app.includes("selectstart") || !app.includes("selectionchange")) throw new Error("Android long-press guard must cover onboarding and every app overlay.");
if (!app.includes("HAND_CALIBRATION_STORAGE_KEY") || !app.includes('reason: "hand-calibration"')) throw new Error("Completed hand calibration must persist independently and immediately.");
if (!app.includes("refreshNetworkState") || !app.includes('method: "HEAD"')) throw new Error("Visible network status must use a real reachability probe.");
const calibrationRun = calibration.createHandCalibration({ holdMs: 90, targetRadius: .14 });
calibrationRun.start(0);
const offTarget = calibrationRun.observe({ x: .5, y: .5 }, { now: 20, stable: true, usable: true, mirror: false });
if (offTarget.type !== "aim" || offTarget.captures !== 0) throw new Error("Calibration must not capture a stable hand that is off-target.");
let result = null;
let time = 0;
for (const target of [{ x: .15, y: .20 }, { x: .85, y: .20 }, { x: .85, y: .80 }, { x: .15, y: .80 }]) {
  for (let index = 0; index < 5; index += 1) {
    time += 28;
    result = calibrationRun.observe(target, { now: time, stable: true, usable: true, mirror: false });
  }
}
if (result?.type !== "complete" || !result?.calibration?.enabled) throw new Error("Target-confirmed four-point calibration must complete with a valid mapping.");
if (!app.includes('t("handCheckPassed"') || !app.includes("hideHandScan(520)")) throw new Error("Verified hand-scan acknowledgement timing is incomplete.");
const scannerHtml = read("web/index.html");
if (!scannerHtml.includes('data-status-icon="verified"') || !scannerHtml.includes('data-status-icon="warning"')) throw new Error("Hand-scan status icons must use reliable inline SVG marks.");
console.log(`AIR-DROW calibration/reality QA passed: ${kuKeys.length} bilingual keys, global selection lock, real four-target calibration and durable hand-check confirmation.`);
