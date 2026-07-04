import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
for (const file of [
  "web/index.html", "web/assets/js/app.js", "web/assets/js/ui/registry.js",
  "web/assets/js/i18n/translations.js", "web/assets/css/production-ui.css",
  "docs/V850_SETTINGS_KURDISH_RESPONSIVE_POLISH.md",
  "docs/V850_SETTINGS_KURDISH_RESPONSIVE_POLISH_KU.md", "tests/settings-kurdish-polish.test.mjs"
]) if (!existsSync(resolve(root, file))) throw new Error(`Missing Settings/Kurdish polish file: ${file}`);
const html = read("web/index.html");
const app = read("web/assets/js/app.js");
const css = read("web/assets/css/production-ui.css");
const i18n = read("web/assets/js/i18n/translations.js");
for (const token of ["settingsCommandCenter", "data-settings-jump=\"cameraHandSection\"", "appearanceSection", "displaySection", "infoSection", "settingsSavedChip", "resetSettingsKeeps", "resetSettingsChanges"]) if (!html.includes(token)) throw new Error(`Settings shell token missing: ${token}`);
for (const token of ["openSettingsSection", "settingsJumpLinks", "reselectingSettings"]) if (!app.includes(token)) throw new Error(`Settings navigation token missing: ${token}`);
if (!css.includes("v8.5.0 Settings + Kurdish Responsive Polish") || !css.includes("settings-command-center")) throw new Error("Settings responsive CSS is missing.");
for (const key of ["settingsQuickTitle", "settingsQuickHint", "settingsSavedChip", "resetSettingsKeeps", "resetSettingsChanges"]) {
  const count = (i18n.match(new RegExp(`\"${key}\"`, "g")) || []).length;
  if (count !== 2) throw new Error(`Expected bilingual translation for ${key}.`);
}
const result = spawnSync(process.execPath, ["tests/settings-kurdish-polish.test.mjs"], { cwd: root, encoding: "utf8" });
if (result.status !== 0) throw new Error(result.stderr || result.stdout || "Settings/Kurdish test failed.");
console.log("AIR-DROW Settings + Kurdish responsive polish QA passed.");
