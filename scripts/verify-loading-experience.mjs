import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(root, "web/index.html"), "utf8");
const app = readFileSync(resolve(root, "web/assets/js/app.js"), "utf8");
const manager = readFileSync(resolve(root, "web/assets/js/core/loading-manager.js"), "utf8");
const worker = readFileSync(resolve(root, "web/sw.js"), "utf8");

for (const id of [
  "appBoot", "bootLabel", "bootPercent", "bootProgressFill", "routeProgress", "routeProgressFill",
  "exportProgress", "galleryProgress", "replayProgress", "aiProgress"
]) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Loading Experience UI is missing: ${id}`);
}
for (const marker of ["createLoadingManager", "finishBoot", "showGallerySkeleton", "beginTask", "updateTask", "endTask"]) {
  if (!manager.includes(marker)) throw new Error(`Loading manager marker missing: ${marker}`);
}
for (const marker of ["createLoadingManager", "loadingManager.setBoot", "await loadingManager.finishBoot", 'image.loading = "lazy"']) {
  if (!app.includes(marker)) throw new Error(`Loading runtime marker missing: ${marker}`);
}
if (!html.includes('rel="preload" href="./assets/fonts/noto-kufi-arabic/NotoKufiArabic-VariableFont_wght.ttf"')) {
  throw new Error("The local Kurdish font must preload during branded boot.");
}
if (!worker.includes("loading-manager.js")) throw new Error("Service worker must cache the loading manager for offline boot.");
console.log("AIR-DROW Loading Experience verified: branded boot, task progress and gallery skeletons are wired.");
