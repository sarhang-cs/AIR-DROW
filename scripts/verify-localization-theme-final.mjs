import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const { I18N } = await import(resolve(root, "web/assets/js/i18n/translations.js"));
const keySets = ["ku", "en"].map(language => Object.keys(I18N[language]).sort());
if (JSON.stringify(keySets[0]) !== JSON.stringify(keySets[1])) throw new Error("Kurdish and English dictionaries must have identical keys.");
const index = read("web/index.html");
const app = read("web/assets/js/app.js");
const css = read("web/assets/css/visual-system.css");
const allMarkupKeys = new Set();
for (const attribute of ["data-i18n", "data-i18n-placeholder", "data-i18n-aria-label", "data-i18n-title", "data-i18n-data-title", "data-i18n-alt"]) {
  const expression = new RegExp(`${attribute}="([^"]+)"`, "g");
  for (const match of index.matchAll(expression)) allMarkupKeys.add(match[1]);
}
for (const key of allMarkupKeys) {
  if (!(key in I18N.ku) || !(key in I18N.en)) throw new Error(`Missing bilingual markup copy: ${key}`);
}
const appKeys = new Set([...app.matchAll(/\bt\(\s*["']([\w-]+)["']/g)].map(match => match[1]));
for (const key of appKeys) {
  if (!(key in I18N.ku) || !(key in I18N.en)) throw new Error(`Missing bilingual runtime copy: ${key}`);
}
for (const key of ["calibrationAim", "calibrationSaved", "calibrationInvalid", "networkChecking", "copyUnavailable"]) {
  if (!I18N.ku[key] || !I18N.en[key]) throw new Error(`Required localization key is missing: ${key}`);
}
if (!app.includes("finalLiveQa?.render();") || !app.includes("deviceReadiness?.render();") || !app.includes("void refreshStabilityStatus();")) throw new Error("Language switching must repaint every dynamic readiness surface.");
if (!app.includes("selectionClearTimer") || !app.includes("unselectable") || !app.includes("pointerdown")) throw new Error("The complete Android long-press selection guard is missing.");
for (const skin of ["violet", "pink", "sapphire", "obsidian", "silver", "gold"]) {
  for (const theme of ["dark", "light"]) {
    if (!css.includes(`:root[data-theme="${theme}"][data-skin="${skin}"]`)) throw new Error(`Missing ${theme} token set for ${skin}.`);
  }
}
if (!css.includes("--theme-icon-ink") || !css.includes("icon contrast contract")) throw new Error("Theme icon contrast contract is missing.");
console.log(`AIR-DROW localization/theme verification passed: ${keySets[0].length} bilingual keys, 6 paired dark/light palettes and dynamic runtime re-rendering.`);
