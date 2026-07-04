import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
for (const file of [
  "web/assets/js/app.js",
  "web/assets/js/features/exporter.js",
  "web/assets/js/config/runtime.js",
  "tests/mobile-safety.test.mjs",
  "docs/V800_RELEASE_CACHE_INTEGRITY.md"
]) if (!existsSync(resolve(root, file))) throw new Error(`Missing mobile-final QA file: ${file}`);

const app = read("web/assets/js/app.js");
const exporter = read("web/assets/js/features/exporter.js");
const runtime = read("web/assets/js/config/runtime.js");
const release = JSON.parse(read("web/release.json"));
const index = read("web/index.html");

for (const token of ["PHYSICAL_ACTION_WINDOW_MS", "bindPhysicalAction", "consumePhysicalAction", "event?.isTrusted", "markPhysicalAction"]) {
  if (!app.includes(token)) throw new Error(`Trusted action gate is incomplete: ${token}`);
}
for (const binding of ["bindPhysicalAction(ui.quickSave", "bindPhysicalAction(ui.export", "bindPhysicalAction(ui.share", "bindPhysicalAction(ui.exportBackup", "bindPhysicalAction(ui.downloadDiagnostics"]) {
  if (!app.includes(binding)) throw new Error(`Protected action is not bound: ${binding}`);
}
if (!runtime.includes("inputSafetyVersion: 4") || !app.includes("inputSafetyVersion || 0) < 4")) throw new Error("Existing local settings do not migrate to the v7.9 safety contract.");
if (index.includes('id="handGuideToggle" type="checkbox" checked')) throw new Error("Hand guide must be opt-in for a new install.");
if (!app.includes("!state.handDrawing) drawHandSkeleton") || !app.includes("full hand skeleton")) throw new Error("Hand guide must be quiet and hidden while drawing.");
const sourceFirst = exporter.indexOf("const strokeRendererUsed") < exporter.indexOf("let snapshotUsed");
if (!sourceFirst || !exporter.includes("if (!strokeRendererUsed &&")) throw new Error("Raster export must render source strokes before a live-canvas fallback.");
if (release.version !== "8.0.0" || release.stage !== "release-cache-integrity") throw new Error("Mobile final QA release metadata is stale.");
const result = spawnSync(process.execPath, ["tests/mobile-safety.test.mjs"], { cwd: root, encoding: "utf8" });
if (result.status !== 0) throw new Error(result.stderr || result.stdout || "Mobile safety tests failed.");
console.log("AIR-DROW mobile safety contract passed for the current release.");
