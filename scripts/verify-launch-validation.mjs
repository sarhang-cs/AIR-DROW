import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const { I18N } = await import(resolve(root, "web/assets/js/i18n/translations.js"));
const feature = read("web/assets/js/features/device-readiness.js");
const index = read("web/index.html");
const docs = [
  "docs/V810_ON_DEVICE_VALIDATION.md",
  "docs/V810_ON_DEVICE_VALIDATION_KU.md",
  "docs/DEVICE_VALIDATION_CHECKLIST.md",
  "docs/DEVICE_VALIDATION_CHECKLIST_KU.md"
];

for (const file of docs) {
  if (!existsSync(resolve(root, file))) throw new Error(`Launch-validation document is missing: ${file}`);
}
for (const key of ["deviceCanvas", "deviceRasterExport", "deviceSaveRoute"]) {
  if (!I18N.ku[key] || !I18N.en[key]) throw new Error(`Missing bilingual launch-validation copy: ${key}`);
}
for (const check of ["Canvas", "RasterExport", "SaveRoute"]) {
  if (!feature.includes(`"${check}"`)) throw new Error(`Missing readiness check: ${check}`);
}
for (const token of ["canvas.toBlob", "URL.createObjectURL", "URL.revokeObjectURL", "never triggers a file download"]) {
  if (!feature.includes(token)) throw new Error(`Launch-validation safety contract missing: ${token}`);
}
if (!index.includes('id="deviceReadinessList"') || !index.includes('id="runDeviceReadinessBtn"')) {
  throw new Error("The visible on-device readiness UI is missing.");
}
console.log("AIR-DROW on-device launch validation contract passed.");
