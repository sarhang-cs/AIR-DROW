import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const app = read("web/assets/js/app.js");
const html = read("web/index.html");
const css = read("web/assets/css/app.css");
const worker = read("web/sw.js");
const release = JSON.parse(read("web/release.json"));
const modulePath = resolve(root, "web/assets/js/core/reliability-center.js");
if (!existsSync(modulePath)) throw new Error("Reliability Center module is missing.");
for (const marker of ["createReliabilityCenter", "applyNetworkState", "openQuickStart", "reportCameraFailure", "reportAiFailure", "reportExportFailure", "scheduleViewportRefresh"]) {
  if (!app.includes(marker)) throw new Error(`Reliability runtime marker missing: ${marker}`);
}
for (const id of ["recoveryNotice", "recoveryActionBtn", "recoveryDismissBtn", "quickStartOverlay", "quickStartNextBtn", "quickStartSkipBtn", "openQuickStartBtn"]) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Reliability UI control missing: ${id}`);
}
if (!html.includes("data-i18n-placeholder=\"aiDirectionPlaceholder\"")) throw new Error("Localized AI direction placeholder is missing.");
if (!css.includes('html[lang="ku"] input[type="url"]')) throw new Error("RTL/LTR typography guard is missing.");
if (!worker.includes("reliability-center.js")) throw new Error("Service worker must cache reliability center.");
if (release.version !== "5.0.6" || release.buildId !== "air-drow-v506-hand-runtime-loader-fix") throw new Error("Release metadata is not v5.0.6.");
console.log("AIR-DROW reliability baseline verified: onboarding, localized typography, recoverable states and offline guard are wired.");
