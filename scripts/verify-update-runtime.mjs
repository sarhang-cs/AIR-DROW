import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const app = readFileSync(resolve(root, "web/assets/js/app.js"), "utf8");
const runtime = readFileSync(resolve(root, "web/assets/js/config/runtime.js"), "utf8");
const manager = readFileSync(resolve(root, "web/assets/js/core/release-manager.js"), "utf8");
const worker = readFileSync(resolve(root, "web/sw.js"), "utf8");
const release = JSON.parse(readFileSync(resolve(root, "web/release.json"), "utf8"));

const requiredApp = ["createReleaseManager", "showUpdateBanner", "beforeApply: () => saveProject"];
const requiredManager = ["30 * 60 * 1000", "AIRDROW_SKIP_WAITING", "onUpdateAvailable", "location.replace"];
const requiredWorker = [`const BUILD_ID = "${release.buildId}"`, "AIRDROW_SKIP_WAITING", "AIRDROW_PURGE_RELEASE_CACHE", "cache: \"no-store\""];
for (const marker of requiredApp) if (!app.includes(marker)) throw new Error(`Release application marker missing: ${marker}`);
if (!runtime.includes(`buildId: "${release.buildId}"`)) throw new Error("Release build ID is missing from runtime configuration.");
for (const marker of requiredManager) if (!manager.includes(marker)) throw new Error(`Release manager marker missing: ${marker}`);
for (const marker of requiredWorker) if (!worker.includes(marker)) throw new Error(`Service-worker marker missing: ${marker}`);
if (worker.includes("await self.skipWaiting();")) throw new Error("Worker must not skip waiting during install; updates must be user-controlled.");
console.log("AIR-DROW controlled update runtime verified.");
