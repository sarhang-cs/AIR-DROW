import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const html = read("web/index.html");
const css = read("web/assets/css/visual-system.css");
const app = read("web/assets/js/app.js");
const appearance = read("web/assets/js/config/appearance.js");

for (const file of [
  "web/assets/css/visual-system.css",
  "web/assets/js/config/appearance.js"
]) {
  if (!existsSync(resolve(root, file))) throw new Error(`Premium visual source missing: ${file}`);
}
if (!html.includes('href="./assets/css/visual-system.css?v=506"')) throw new Error("Premium visual stylesheet is not linked.");
if (!app.includes('normalizeSkin') || !app.includes('from "./config/appearance.js"')) throw new Error("Appearance normalizer is not used by app.js.");
for (const skin of ["violet", "pink", "sapphire", "obsidian", "silver", "gold"]) {
  if (!html.includes(`data-skin="${skin}"`)) throw new Error(`Premium skin control missing: ${skin}`);
  if (!appearance.includes(`"${skin}"`)) throw new Error(`Premium skin config missing: ${skin}`);
  if (!css.includes(`[data-skin="${skin}"]`)) throw new Error(`Premium skin CSS missing: ${skin}`);
}
for (const selector of [".settings-drawer", ".settings-section", ".workspace-dock", ".tool-button", ".quick-start-card"]) {
  if (!css.includes(selector)) throw new Error(`Premium surface selector missing: ${selector}`);
}
const forbiddenEmoji = /[\u{1F300}-\u{1FAFF}]/u;
if (forbiddenEmoji.test(css)) throw new Error("Simple emoji must not ship in the premium visual stylesheet.");
console.log("AIR-DROW Premium Visual System verified: six skins, glass surfaces and modular appearance source are present.");
