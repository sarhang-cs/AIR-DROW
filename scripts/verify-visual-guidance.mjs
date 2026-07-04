import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
for (const file of [
  "web/assets/js/app.js", "web/assets/js/config/runtime.js", "web/assets/js/ui/registry.js",
  "web/assets/js/i18n/translations.js", "docs/V820_VISUAL_GUIDANCE_PERSISTENCE.md",
  "docs/V820_VISUAL_GUIDANCE_PERSISTENCE_KU.md", "tests/visual-guidance.test.mjs"
]) if (!existsSync(resolve(root, file))) throw new Error(`Missing visual-guidance file: ${file}`);

const app = read("web/assets/js/app.js");
const runtime = read("web/assets/js/config/runtime.js");
const html = read("web/index.html");
const css = read("web/assets/css/production-ui.css");
const translation = read("web/assets/js/i18n/translations.js");
if (!runtime.includes("showHandGuide: true") || !runtime.includes("handGuideOpacity: 68") || !runtime.includes("inputSafetyVersion: 5")) throw new Error("Guide defaults are missing.");
for (const token of ["HAND_BONES", "handGuideOpacity", "handGuideThickness", "normalizeHandGuideSettings", "settings-reset"]) if (!app.includes(token)) throw new Error(`Guide/persistence token missing: ${token}`);
if (!app.includes("updateModeButtons();\n    updateLiveHud")) throw new Error("Palette is not resynchronized after camera startup.");
for (const id of ["handGuideOpacity", "handGuideThickness", "handGuideOpacityOut", "handGuideThicknessOut"]) if (!html.includes(`id=\"${id}\"`)) throw new Error(`Guide UI control missing: ${id}`);
for (const key of ["handGuideOpacity", "handGuideThickness", "handGuideHint"]) if (!translation.includes(`\"${key}\"`)) throw new Error(`Missing bilingual guide copy: ${key}`);
if (!css.includes("v8.3.2 final Kurdish layout") || !css.includes("about-meta-input")) throw new Error("Compact Kurdish card CSS is missing.");
if ((app.match(/bindPhysicalAction\(ui\.clear, clearCanvas\)/g) || []).length !== 1) throw new Error("Clear action has duplicate or missing physical binding.");
const result = spawnSync(process.execPath, ["tests/visual-guidance.test.mjs"], { cwd: root, encoding: "utf8" });
if (result.status !== 0) throw new Error(result.stderr || result.stdout || "Visual guidance test failed.");
console.log("AIR-DROW visual guidance and persistence QA passed.");
