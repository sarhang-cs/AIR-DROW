import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const need = [
  "web/assets/js/features/exporter.js",
  "web/assets/js/features/gesture-shortcuts.js",
  "web/assets/js/features/stroke-smoother.js",
  "web/assets/js/app.js",
  "web/assets/css/production-ui.css",
  "tests/export-gesture-reliability.test.mjs"
];
for (const file of need) if (!existsSync(resolve(root, file))) throw new Error(`Missing Critical Input & Export Recovery file: ${file}`);

const html = read("web/index.html");
const app = read("web/assets/js/app.js");
const runtime = read("web/assets/js/config/runtime.js");
const exporter = read("web/assets/js/features/exporter.js");
const gesture = read("web/assets/js/features/gesture-shortcuts.js");
const css = read("web/assets/css/production-ui.css");

for (const id of ["quickSaveBtn", "handPalette", "exportScale", "exportLayout", "exportQuality", "exportCameraComposite"]) {
  if (!html.includes(`id=\"${id}\"`)) throw new Error(`Missing export/input UI control: ${id}`);
}
if (!html.includes('data-airdrow-surface="hand-palette"')) throw new Error("Hand palette must remain a protected UI surface.");
if (!runtime.includes("gestureShortcuts: false") || !runtime.includes("showHandGuide: false") || !runtime.includes("inputSafetyVersion: 2")) throw new Error("Safe hand defaults are missing.");
if (gesture.includes("thumb-up") || gesture.includes('"palm"') || gesture.includes("Save image") || gesture.includes('"Export"')) throw new Error("A hand gesture may not trigger save/export.");
if (!gesture.includes('"two-finger"') || !app.includes('action !== "two-finger"')) throw new Error("Two-finger eraser guard is missing.");
if (!app.includes("getArtworkCanvas: () => ui.draw") || !app.includes("render({ immediate: true })")) throw new Error("Artwork snapshot export path is not wired from the live canvas.");
if (!exporter.includes("drawArtworkSnapshot") || !exporter.includes("snapshotUsed") || !exporter.includes("drawProjectStrokes")) throw new Error("Raster export recovery is incomplete.");
if (!css.includes('html[lang="ku"]') || !css.includes(".hand-palette[hidden]")) throw new Error("Kurdish typography or hand palette safety CSS is missing.");

const result = spawnSync(process.execPath, ["tests/export-gesture-reliability.test.mjs"], { cwd: root, encoding: "utf8" });
if (result.status !== 0) throw new Error(result.stderr || result.stdout || "Critical input/export test failed.");
console.log("AIR-DROW Critical Input & Export Recovery QA passed.");
