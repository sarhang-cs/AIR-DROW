import { existsSync, readFileSync } from "node:fs";
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
if (!index.includes('src="./assets/js/app.js?v=509"')) throw new Error("Application module is not linked from index.html.");
if (index.includes("gateNewestRelease")) throw new Error("Legacy forced-update gate must not be shipped.");
console.log("AIR-DROW source modules passed syntax and entrypoint validation.");

await import(new URL("./verify-toolbar-icon-bundle.mjs", import.meta.url));
await import(new URL("./verify-loading-experience.mjs", import.meta.url));
await import(new URL("./verify-performance-guard.mjs", import.meta.url));
