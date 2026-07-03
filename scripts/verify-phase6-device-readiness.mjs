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
const modulePath = "web/assets/js/features/device-readiness.js";

if (release.phase < 6 || !release.stage) {
  throw new Error("Phase 6 release baseline is incomplete.");
}
for (const file of [modulePath, "PHASE_6_DEVICE_READINESS_MANIFEST.json", "PHASE_6_QA_REPORT.md", "docs/PHASE_6_DEVICE_READINESS_KU.md"]) {
  if (!existsSync(resolve(root, file))) throw new Error(`Phase 6 file is missing: ${file}`);
}
for (const marker of ['id="runDeviceReadinessBtn"', 'id="copyDeviceReadinessBtn"', 'id="deviceReadinessStatus"', 'id="deviceReadinessScore"', 'id="deviceReadinessList"', 'data-i18n="deviceReadinessPrivacy"']) {
  if (!html.includes(marker)) throw new Error(`Phase 6 HTML marker missing: ${marker}`);
}
for (const marker of ['runDeviceReadiness:', 'copyDeviceReadiness:', 'deviceReadinessStatus:', 'deviceReadinessScore:', 'deviceReadinessList:']) {
  if (!registry.includes(marker)) throw new Error(`Phase 6 UI registry marker missing: ${marker}`);
}
for (const marker of ['createDeviceReadiness', 'deviceReadiness?.run', 'copyDeviceReadiness']) {
  if (!app.includes(marker)) throw new Error(`Phase 6 app integration marker missing: ${marker}`);
}
const module = read(modulePath);
for (const marker of ['getUserMedia', 'never enumerates input devices', 'vendor/models/hand_landmarker.task', 'navigator.storage', 'serviceWorker', 'clipboard']) {
  if (!module.includes(marker)) throw new Error(`Phase 6 module contract missing: ${marker}`);
}
if (/\.getUserMedia\s*\(/.test(module) || /enumerateDevices\s*\(/.test(module)) {
  throw new Error("Device Readiness must never open or enumerate the camera.");
}
if (!worker.includes("device-readiness.js")) throw new Error("Phase 6 device module is missing from the PWA shell cache.");
for (const key of ['"deviceReadinessTitle"', '"deviceReadinessPrivacy"', '"deviceStatusReady"', '"deviceLocalModel"']) {
  if ((i18n.split(key).length - 1) < 2) throw new Error(`Phase 6 translation coverage missing: ${key}`);
}
console.log(`AIR-DROW Phase 6 Device Readiness baseline verified: v${release.version} / ${release.buildId}.`);
