import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const governorPath = resolve(root, "web/assets/js/core/performance-governor.js");
if (!existsSync(governorPath)) throw new Error("Performance governor module is missing.");
const governor = readFileSync(governorPath, "utf8");
const app = readFileSync(resolve(root, "web/assets/js/app.js"), "utf8");
const registry = readFileSync(resolve(root, "web/assets/js/ui/registry.js"), "utf8");
const html = readFileSync(resolve(root, "web/index.html"), "utf8");
const worker = readFileSync(resolve(root, "web/sw.js"), "utf8");

for (const marker of ["createPerformanceGovernor", "observeRuntimeFps", "canvasDpr", "adaptivePenalty"]) {
  if (!governor.includes(marker)) throw new Error(`Performance governor marker missing: ${marker}`);
}
for (const marker of ["createPerformanceGovernor", "renderScene", "requestAnimationFrame", "refreshPerformanceProfile"]) {
  if (!app.includes(marker)) throw new Error(`Performance Guard runtime marker missing: ${marker}`);
}
if (!registry.includes("canvasQualityStatus")) throw new Error("Performance Guard UI registry marker missing: canvasQualityStatus");
if (!html.includes('id="canvasQualityStatus"')) throw new Error("Canvas quality status control is missing.");
if (!worker.includes("performance-governor.js")) throw new Error("Service worker must cache the performance governor for offline startup.");
console.log("AIR-DROW Performance Guard verified: adaptive density, frame batching and live quality status are wired.");
