import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const files = [
  "web/assets/js/features/exporter.js",
  "web/assets/js/features/gesture-shortcuts.js",
  "web/assets/js/features/stroke-smoother.js",
  "web/assets/js/core/diagnostics.js",
  "tests/export-gesture-reliability.test.mjs"
];
for (const file of files) if (!existsSync(resolve(root, file))) throw new Error(`Missing Export & Gesture Reliability file: ${file}`);

const html = read("web/index.html");
const app = read("web/assets/js/app.js");
const runtime = read("web/assets/js/config/runtime.js");
const exporter = read("web/assets/js/features/exporter.js");
const gesture = read("web/assets/js/features/gesture-shortcuts.js");
const diagnostics = read("web/assets/js/core/diagnostics.js");
const translations = read("web/assets/js/i18n/translations.js");
for (const id of ["quickSaveBtn", "handPalette", "exportScale", "exportLayout", "exportQuality", "exportCameraComposite", "diagnosticsStatus"]) {
  if (!html.includes(`id=\"${id}\"`)) throw new Error(`Missing v7.7.0 UI control: ${id}`);
}
if (!html.includes('value="jpg"')) throw new Error("JPG export option is missing.");
if (!html.includes('data-airdrow-surface="hand-palette"')) throw new Error("The hand palette must be a protected control surface.");
if (!app.includes("updateHandPaletteHover") || !app.includes("processGestureShortcut") || !app.includes("quickSaveCurrent")) throw new Error("Hand palette, gesture shortcut, or quick save behavior is missing.");
if (!gesture.includes('"two-finger"') || !gesture.includes('"Eraser"')) throw new Error("Two-finger eraser gesture is missing.");
if (!exporter.includes("createExportPlan") || !exporter.includes("layout = \"fit\"") || !exporter.includes('jpg')) throw new Error("High-resolution export planning is incomplete.");
if (!diagnostics.includes("no drawing, camera frame, project title, or API URL")) throw new Error("Diagnostics privacy filtering is incomplete.");
for (const key of ["exportFormatJpg", "exportScaleLabel", "exportCameraComposite", "diagnosticsTitle", "ariaHandPalette"]) {
  const matches = translations.match(new RegExp(`\\"${key}\\"`, "g")) || [];
  if (matches.length !== 2) throw new Error(`Translation key is not synchronized: ${key}`);
}
if (!runtime.includes('exportScale: 1') || !runtime.includes('gestureShortcuts: true')) throw new Error("Reliable export or gesture defaults are missing.");
const result = spawnSync(process.execPath, ["tests/export-gesture-reliability.test.mjs"], { cwd: root, encoding: "utf8" });
if (result.status !== 0) throw new Error(result.stderr || result.stdout || "Export and gesture test failed.");
console.log("AIR-DROW Export & Gesture Reliability QA passed.");
