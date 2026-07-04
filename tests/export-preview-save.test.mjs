import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const exporter = read("web/assets/js/features/exporter.js");
const app = read("web/assets/js/app.js");
const html = read("web/index.html");
const registry = read("web/assets/js/ui/registry.js");

assert.match(exporter, /async function previewFile/);
const previewBlock = exporter.slice(exporter.indexOf("async function previewFile"), exporter.indexOf("async function shareFile"));
assert.doesNotMatch(previewBlock, /downloadBlob\(/);
assert.match(previewBlock, /maxSide: 900/);
assert.match(html, /id="exportPreviewBtn"/);
assert.match(html, /id="exportPreviewDialog"/);
assert.match(html, /data-airdrow-surface/);
assert.match(registry, /exportPreviewDialog/);
assert.match(app, /async function previewExportCurrent/);
assert.match(app, /bindPhysicalAction\(ui\.exportPreview/);
assert.match(app, /bindPhysicalAction\(ui\.exportPreviewDownload/);
assert.match(app, /bindPhysicalAction\(ui\.exportPreviewShare/);
assert.match(app, /releaseExportPreviewUrl/);
console.log("Export preview and explicit-save safety QA passed.");
