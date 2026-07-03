import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const html = read("web/index.html");
const css = read("web/assets/css/ui-clarity.css");
const app = read("web/assets/js/app.js");
const device = read("web/assets/js/features/device-readiness.js");
const live = read("web/assets/js/features/final-live-qa.js");
const translations = read("web/assets/js/i18n/translations.js");
const release = JSON.parse(read("web/release.json"));

if (!html.includes(`href="./assets/css/ui-clarity.css?v=${release.assetRevision}"`)) throw new Error("UI clarity stylesheet is not linked.");
for (const marker of ["--ui-primary-a", ".toggle-control", "camera-live:not(.active)", ".recovery-notice[data-kind=\"ai\"]", "data-user-hidden"]) {
  if (!css.includes(marker)) throw new Error(`UI clarity control is missing: ${marker}`);
}
if (!app.includes('hideRecovery("ai")')) throw new Error("AI recovery still covers the drawing canvas.");
if (app.includes('runFinalLiveQa, { timeout')) throw new Error("Hand drawing check must not run automatically before Camera is opened.");
for (const forbidden of ["Add API billing credit", "protected Vercel API key", "AI needs deployment setup", "project budget are unavailable", "OPENAI_API_KEY and AIRDROW_AI_ENABLED=true are required"]) {
  if (translations.includes(forbidden)) throw new Error(`Developer-style user copy remains: ${forbidden}`);
}
for (const forbidden of ["same-origin", "WebGL 2", "API available"]) {
  if (device.includes(forbidden)) throw new Error(`Technical device detail remains in friendly readiness UI: ${forbidden}`);
}
for (const marker of ["deviceReadinessAllReady", "finalLiveQaOpenCamera", "finalLiveQaAllReady"]) {
  if (!translations.includes(marker)) throw new Error(`Friendly status copy missing: ${marker}`);
}
if (!live.includes('cameraStarted') || !live.includes('finalLiveQaOpenCamera')) throw new Error("Hand drawing check does not use the friendly pre-camera state.");
console.log(`AIR-DROW UI clarity verified: v${release.version}`);
