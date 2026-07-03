import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const release = JSON.parse(read("web/release.json"));
const html = read("web/index.html");
const app = read("web/assets/js/app.js");
const registry = read("web/assets/js/ui/registry.js");
const css = read("web/assets/css/phase2-ui.css");
const worker = read("web/sw.js");
const i18n = read("web/assets/js/i18n/translations.js");

if (!existsSync(resolve(root, "web/assets/css/phase2-ui.css"))) throw new Error("Phase 2 UI stylesheet is missing.");
if (release.phase < 2) throw new Error("Phase 2 UI baseline is missing from this release.");
for (const marker of [
  'id="themeChoices"', 'data-theme-mode="dark"', 'data-theme-mode="light"',
  'data-skin="violet"', 'data-skin="pink"', 'data-skin="sapphire"',
  'data-skin="obsidian"', 'data-skin="silver"', 'data-skin="gold"',
  'data-ui-phase="2"'
]) if (!html.includes(marker)) throw new Error(`Phase 2 interface marker missing: ${marker}`);
for (const marker of ['themeChoices:', 'dataset.themeMode', 'ui.themeChoices.forEach']) {
  if (!registry.includes(marker) && !app.includes(marker)) throw new Error(`Theme mode binding is missing: ${marker}`);
}
for (const marker of [
  '.theme-mode-grid', '.skin-grid', '.settings-drawer', '.workspace-dock',
  '.toolbar', '.live-hud', '.camera-indicator', '@media (max-width: 680px)',
  '@media (min-width: 860px)', 'html[dir="rtl"] .setting-line'
]) if (!css.includes(marker)) throw new Error(`Phase 2 CSS marker missing: ${marker}`);
for (const marker of ['"themeDark"', '"themeLight"', '"ariaThemeMode"']) {
  if (!i18n.includes(marker)) throw new Error(`Phase 2 translation missing: ${marker}`);
}
for (const forbidden of ['background: transparent !important;', 'box-shadow: none !important;']) {
  if (!css.includes(forbidden)) throw new Error("Transparent status HUD contract is missing from Phase 2 styles.");
}
if (!worker.includes('/assets/css/phase2-ui.css')) throw new Error("Service worker must cache the Phase 2 UI stylesheet.");
console.log(`AIR-DROW Phase 2 UI system verified: v${release.version} / ${release.buildId}`);
