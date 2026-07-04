import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
for (const file of ["web/assets/js/features/exporter.js", "web/assets/js/app.js", "web/index.html", "web/assets/css/production-ui.css", "tests/export-preview-save.test.mjs", "docs/V830_EXPORT_PREVIEW_SAVE_POLISH.md", "docs/V830_EXPORT_PREVIEW_SAVE_POLISH_KU.md"]) {
  if (!existsSync(resolve(root, file))) throw new Error(`Missing export-preview file: ${file}`);
}
const exporter = read("web/assets/js/features/exporter.js");
const app = read("web/assets/js/app.js");
const css = read("web/assets/css/production-ui.css");
if (!exporter.includes("async function previewFile") || !exporter.includes("maxSide: 900")) throw new Error("Safe preview renderer is missing.");
const block = exporter.slice(exporter.indexOf("async function previewFile"), exporter.indexOf("async function shareFile"));
if (block.includes("downloadBlob(")) throw new Error("Preview must not trigger a download.");
if (!app.includes("previewExportCurrent") || !app.includes("releaseExportPreviewUrl")) throw new Error("Preview lifecycle is incomplete.");
if (!css.includes("v8.3.0 Export Preview & Save Polish")) throw new Error("Export preview mobile CSS is missing.");
const result = spawnSync(process.execPath, ["tests/export-preview-save.test.mjs"], { cwd: root, encoding: "utf8" });
if (result.status !== 0) throw new Error(result.stderr || result.stdout || "Export preview test failed.");
console.log("AIR-DROW export preview & save polish QA passed.");
