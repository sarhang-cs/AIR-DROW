import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { I18N } from "../web/assets/js/i18n/translations.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const json = file => JSON.parse(read(file));
const release = json("web/release.json");
const pkg = json("package.json");
const html = read("web/index.html");
const css = read("web/assets/css/final-layout-localization.css");
const app = read("web/assets/js/app.js");
const translations = read("web/assets/js/i18n/translations.js");
const challenge = read("web/assets/js/features/air-challenge.js");
const sourceManifest = json("web/manifest.webmanifest");

for (const file of [
  "web/assets/css/final-layout-localization.css",
  "scripts/verify-final-release.mjs",
  "scripts/verify-local-icon-package.mjs",
  "termux/replace-with-final-layout-localization.sh",
  "docs/RELEASE_NOTES.md"
]) if (!existsSync(resolve(root, file))) throw new Error(`Final layout file is missing: ${file}`);

if (pkg.version !== release.version || release.version !== "7.4.0") throw new Error("Final version metadata is not synchronized.");
if (!release.buildId.includes("v740")) throw new Error("Final build identity is not v740.");
if (!sourceManifest.start_url.includes("v740")) throw new Error("PWA start URL is not refreshed.");
if (!html.includes('href="./assets/css/final-layout-localization.css?v=740"')) throw new Error("Final layout stylesheet is not linked.");
if (!html.includes('class="settings-mark brand-badge"') || !html.includes('icon-air-drow-mark')) throw new Error("Settings does not use the AIR-DROW mark.");
for (const marker of [".brand-badge", "data-theme=\"light\"", "html[dir=\"rtl\"] .setting-line", "--final-card-gap"]) {
  if (!css.includes(marker)) throw new Error(`Final layout style is incomplete: ${marker}`);
}
for (const marker of ["data-i18n-data-title", "galleryCount", "challengeSeconds", "templateCreatorDefault", "renderProjectGallery()"] ) {
  if (!app.includes(marker)) throw new Error(`Localized runtime behavior is missing: ${marker}`);
}
for (const marker of ["exportFormatSvg", "templatePoster45", "performanceBalancedOption", "languageEnglish", "cameraModeTitle", "engineStartTitle"]) {
  const count = translations.split(`\"${marker}\"`).length - 1;
  if (count < 2) throw new Error(`Translation is not present in both languages: ${marker}`);
}

const htmlTranslationKeys = [...new Set([...html.matchAll(/data-i18n(?:-aria-label|-data-title|-alt)?="([^"]+)"/g)].map(match => match[1]))];
for (const key of htmlTranslationKeys) {
  if (!(key in I18N.ku) || !(key in I18N.en)) throw new Error(`Translation key is incomplete for Kurdish or English: ${key}`);
}
if (!challenge.includes('score(stroke, language = "ku")')) throw new Error("Daily challenge language handling is incomplete.");
for (const forbidden of ["USER_ICON_EDITION_NOTES.md", "COMPLETE_PACKAGE_README.md", "replace-with-user-icons.sh"]) {
  if (existsSync(resolve(root, forbidden)) || html.includes(forbidden)) throw new Error(`Legacy release residue remains: ${forbidden}`);
}
console.log(`AIR-DROW final layout and localization verified: v${release.version}`);
