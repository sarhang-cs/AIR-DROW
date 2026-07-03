import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const json = file => JSON.parse(read(file));
const release = json("web/release.json");
const html = read("web/index.html");
const app = read("web/assets/js/app.js");
const registry = read("web/assets/js/ui/registry.js");
const i18n = read("web/assets/js/i18n/translations.js");
const worker = read("web/sw.js");
const modulePath = "web/assets/js/features/final-live-qa.js";

if (release.phase !== 7 || release.stage !== "final-live-qa-and-master-release") {
  throw new Error("Phase 7 release metadata is incomplete.");
}
for (const file of [modulePath, "PHASE_7_FINAL_LIVE_QA_MANIFEST.json", "PHASE_7_QA_REPORT.md", "docs/PHASE_7_FINAL_LIVE_QA_KU.md", "termux/replace-with-phase7.sh"]) {
  if (!existsSync(resolve(root, file))) throw new Error(`Phase 7 file is missing: ${file}`);
}
for (const marker of ['id="runFinalLiveQaBtn"', 'id="copyFinalLiveQaBtn"', 'id="finalLiveQaStatus"', 'id="finalLiveQaScore"', 'id="finalLiveQaList"', 'data-i18n="finalLiveQaPrivacy"']) {
  if (!html.includes(marker)) throw new Error(`Phase 7 HTML marker missing: ${marker}`);
}
for (const marker of ['runFinalLiveQa:', 'copyFinalLiveQa:', 'finalLiveQaStatus:', 'finalLiveQaScore:', 'finalLiveQaList:']) {
  if (!registry.includes(marker)) throw new Error(`Phase 7 UI registry marker missing: ${marker}`);
}
for (const marker of ['createFinalLiveQa', 'finalLiveQa?.run', 'copyFinalLiveQa']) {
  if (!app.includes(marker)) throw new Error(`Phase 7 app integration marker missing: ${marker}`);
}
const module = read(modulePath);
if (/\.getUserMedia\s*\(/.test(module) || /enumerateDevices\s*\(/.test(module)) {
  throw new Error("Final Live QA must never open or enumerate the camera.");
}
for (const marker of ['canvasReady', 'cameraActive', 'handEngineReady', 'handDetectedAt', 'copyReportToClipboard', 'Passive local report']) {
  if (!module.includes(marker)) throw new Error(`Phase 7 module contract missing: ${marker}`);
}
if (!worker.includes("final-live-qa.js")) throw new Error("Phase 7 module is missing from the PWA shell cache.");
for (const key of ['"finalLiveQaTitle"', '"finalLiveQaPrivacy"', '"finalLiveQaCamera"', '"finalLiveQaStatusPending"']) {
  if ((i18n.split(key).length - 1) < 2) throw new Error(`Phase 7 translation coverage missing: ${key}`);
}
console.log(`AIR-DROW Phase 7 Final Live QA verified: v${release.version} / ${release.buildId}.`);
