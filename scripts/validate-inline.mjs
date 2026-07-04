import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const modules = [
  "web/assets/js/app.js",
  "web/assets/js/config/runtime.js",
  "web/assets/js/i18n/translations.js",
  "web/assets/js/ui/registry.js",
  "web/assets/js/core/project-store.js",
  "web/assets/js/core/release-manager.js",
  "web/assets/js/core/font-kit.js",
  "web/assets/js/core/loading-manager.js",
  "web/assets/js/core/performance-governor.js",
  "web/assets/js/core/reliability-center.js",
  "web/assets/js/core/backup-manager.js",
  "web/assets/js/core/final-stability.js",
  "web/assets/js/features/hand-calibration.js",
  "web/assets/js/features/hand-tracking-engine.js",
  "web/assets/js/features/hand-frame-scheduler.js",
  "web/assets/js/features/tracking-quality-governor.js",
  "web/assets/js/features/device-readiness.js",
  "web/assets/js/features/final-live-qa.js",
  "web/assets/js/features/exporter.js",
  "web/assets/js/features/brush-lab.js",
  "web/assets/js/features/shape-engine.js",
  "web/assets/js/features/gesture-shortcuts.js",
  "web/assets/js/features/replay-engine.js",
  "web/assets/js/features/share-card.js",
  "web/assets/js/features/air-challenge.js",
  "web/assets/js/features/template-studio.js",
  "web/assets/js/features/ai-studio.js",
  "web/assets/js/workers/template-render.worker.js",
  "api/health.js",
  "api/ai/generate.js"
];
for (const file of modules) {
  const absolute = resolve(root, file);
  if (!existsSync(absolute)) throw new Error(`Required module missing: ${file}`);
  execFileSync(process.execPath, ["--check", absolute], { stdio: "inherit" });
}
const index = readFileSync(resolve(root, "web/index.html"), "utf8");
if (!index.includes("air-drow-bootstrap-repair") || !index.includes('entry.type = "module"')) throw new Error("Recoverable application bootstrap is not linked from index.html.");
if (index.includes("gateNewestRelease")) throw new Error("Legacy forced-update gate must not be shipped.");
/* Parse inline scripts too. A declaration collision in the initial bootstrap can
 * freeze the UI before app.js is requested, so module-only syntax checking is
 * insufficient. */
const inlineScripts = [...index.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1].trim()).filter(Boolean);
for (const [position, script] of inlineScripts.entries()) {
  const temporary = resolve(root, `.tmp-inline-${position}.js`);
  try {
    writeFileSync(temporary, script, "utf8");
    execFileSync(process.execPath, ["--check", temporary], { stdio: "inherit" });
  } finally {
    rmSync(temporary, { force: true });
  }
}
console.log("AIR-DROW source modules and inline bootstrap passed syntax validation.");

await import(new URL("./verify-toolbar-icon-bundle.mjs", import.meta.url));
