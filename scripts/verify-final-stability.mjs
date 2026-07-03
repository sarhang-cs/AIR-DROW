import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const app = read("web/assets/js/app.js");
const html = read("web/index.html");
const worker = read("web/sw.js");
const release = JSON.parse(read("web/release.json"));
const packageJson = JSON.parse(read("package.json"));

for (const file of ["web/assets/js/core/backup-manager.js", "web/assets/js/core/final-stability.js"]) {
  if (!existsSync(resolve(root, file))) throw new Error(`Reliability module missing: ${file}`);
}
for (const marker of ["createBackupManager", "createFinalStability", "exportBackupArchive", "restoreBackupArchive", "refreshStabilityStatus"]) {
  if (!app.includes(marker)) throw new Error(`Reliability app marker missing: ${marker}`);
}
for (const id of ["exportBackupBtn", "importBackupBtn", "importBackupInput", "restoreCurrentBackupToggle", "runStabilityCheckBtn", "stabilityStatus"]) {
  if (!html.includes(`id=\"${id}\"`)) throw new Error(`Reliability UI control missing: ${id}`);
}
for (const marker of ["backup-manager.js", "final-stability.js", "AIRDROW_SKIP_WAITING"]) {
  if (!worker.includes(marker)) throw new Error(`Reliability service-worker marker missing: ${marker}`);
}
if (!release.version || !release.buildId || release.phase !== 1) throw new Error("Release metadata is invalid.");
if (packageJson.version !== release.version) throw new Error("Package metadata is invalid.");
console.log("AIR-DROW reliability release verified: backup, safe restore, PWA update safety and stability audit are wired.");
