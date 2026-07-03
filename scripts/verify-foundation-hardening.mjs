import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const release = JSON.parse(read("web/release.json"));
const pkg = JSON.parse(read("package.json"));
const vercel = JSON.parse(read("vercel.json"));
const index = read("web/index.html");
const runtime = read("web/assets/js/config/runtime.js");
const worker = read("web/sw.js");
const manifest = JSON.parse(read("PROJECT_MANIFEST.json"));
const assets = JSON.parse(read("web/assets/LOCAL_ASSETS_MANIFEST.json"));

if (release.phase < 1 || release.version !== pkg.version || !release.buildId || !release.assetRevision) {
  throw new Error("Canonical release baseline metadata is incomplete or inconsistent.");
}
for (const [name, data] of Object.entries({ project: manifest, localAssets: assets })) {
  if (data.version !== release.version || data.buildId !== release.buildId) {
    throw new Error(`${name} release metadata is not synchronized.`);
  }
}
for (const source of [index, runtime, worker]) {
  if (!source.includes(release.buildId)) throw new Error("A runtime surface is missing the active build ID.");
}
if (!index.includes(`?v=${release.assetRevision}`)) throw new Error("Static assets are not cache-revisioned from release metadata.");
if (vercel.installCommand !== "npm ci --no-audit --no-fund") throw new Error("Vercel must use deterministic npm ci installation.");
if (vercel.buildCommand !== "npm run vercel:build") throw new Error("Vercel must use the explicit hardened build command.");
const scripts = pkg.scripts || {};
for (const command of ["model:ensure", "build", "vercel:build", "verify:all"]) {
  if (!scripts[command]) throw new Error(`Missing required package script: ${command}`);
}
if (!scripts.build.includes("verify:source") || !scripts.build.includes("build:static") || !scripts.build.includes("verify:deploy-output")) {
  throw new Error("Build pipeline ordering is incomplete.");
}
if (!existsSync(resolve(root, "web/vendor/models/MODEL_MANIFEST.json"))) throw new Error("Official model manifest is missing.");
console.log(`AIR-DROW foundation baseline verified: v${release.version} / ${release.buildId}`);
