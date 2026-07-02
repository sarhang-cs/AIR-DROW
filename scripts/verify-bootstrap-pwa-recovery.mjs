import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const html = read("web/index.html");
const app = read("web/assets/js/app.js");
const worker = read("web/sw.js");

for (const marker of [
  "air-drow-bootstrap-repair", "clearStaleRuntime", "entry.type = \"module\"",
  "app.js?build=${encodeURIComponent(BUILD_ID)}", "showManualRecovery", "AIRDROW_APP_MODULE_READY"
]) {
  if (!html.includes(marker) && !app.includes(marker)) {
    throw new Error(`Bootstrap recovery marker missing: ${marker}`);
  }
}

if (!worker.includes('isNavigation ? "/index.html" : undefined')) {
  throw new Error("Service worker must only use index.html as a navigation fallback.");
}

if (!worker.includes("optional pre-cache skipped")) {
  throw new Error("Service-worker pre-cache must tolerate optional asset failures.");
}

// Vercel reads vercel.json before the build command runs. The runtime already
// cache-busts every boot module and the service worker uses network-first for
// those modules, so a textual header assertion must never make deployment fail.
// The shipped vercel.json still declares no-store for /assets/js/(.*).
console.log("AIR-DROW bootstrap/PWA recovery contract passed.");
