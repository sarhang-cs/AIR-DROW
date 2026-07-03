import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const app = read("web/assets/js/app.js");
const qa = read("web/assets/js/features/final-live-qa.js");
const css = read("web/assets/css/app.css");
const translations = read("web/assets/js/i18n/translations.js");
const index = read("web/index.html");
for (const token of ["bindImmediateTextEntry", "primeHandAssetsForCamera", "scanWaitForEngine", "scanPlaceHandNow", "calibrationCheckPassed", "refreshDynamicLanguageSurfaces"]) {
  if (!app.includes(token) && !translations.includes(token)) throw new Error(`Missing v7.5.6 runtime contract: ${token}`);
}
if (!index.includes('data-airdrow-selection-lock="true"')) throw new Error("The global selection lock must be active before onboarding JavaScript loads.");
if (!qa.includes("detailKey") || !qa.includes("detailText")) throw new Error("Hand Check details must remain translatable after a language switch.");
if (!css.includes("hand-calibration-overlay.is-hiding") || !css.includes("v7.5.6 mobile text-entry contract")) throw new Error("Mobile input or calibration success transition styles are missing.");
console.log("AIR-DROW v7.5.6 input/language/hand-startup verification passed.");
