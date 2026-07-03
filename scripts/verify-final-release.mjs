import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const json = file => JSON.parse(read(file));
const release = json("web/release.json");
const pkg = json("package.json");
const manifest = json("PROJECT_MANIFEST.json");
const assetManifest = json("web/assets/LOCAL_ASSETS_MANIFEST.json");
const runtime = read("web/assets/js/config/runtime.js");
const worker = read("web/sw.js");
const index = read("web/index.html");
const buildId = release.buildId;
const version = release.version;

if (release.phase !== 6 || release.stage !== "device-readiness-and-runtime-diagnostics" || !release.assetRevision) {
  throw new Error("Phase 6 release metadata is incomplete.");
}
const required = [
  "README.md", "README_KU.md", "CHANGELOG.md", "PHASE_6_DEVICE_READINESS_MANIFEST.json", "PHASE_6_QA_REPORT.md",
  "docs/PHASE_6_DEVICE_READINESS_KU.md", "scripts/verify-phase6-device-readiness.mjs",
  "web/assets/js/features/device-readiness.js"
];
for (const file of required) if (!existsSync(resolve(root, file))) throw new Error(`Phase 6 release file missing: ${file}`);
for (const [label, value] of Object.entries({ package: pkg.version, projectManifest: manifest.version, assetManifest: assetManifest.version })) {
  if (value !== version) throw new Error(`${label} version must be ${version}; got ${value}`);
}
for (const [label, value] of Object.entries({ release: release.buildId, projectManifest: manifest.buildId, assetManifest: assetManifest.buildId })) {
  if (value !== buildId) throw new Error(`${label} buildId must be ${buildId}; got ${value}`);
}
if (!runtime.includes(`version: "${version}"`) || !runtime.includes(`buildId: "${buildId}"`)) throw new Error("Runtime release metadata is inconsistent.");
if (!worker.includes(`const BUILD_ID = "${buildId}"`)) throw new Error("Service worker build ID is inconsistent.");
if (!worker.includes("device-readiness.js")) throw new Error("Service worker must pre-cache the device readiness module.");
if (!index.includes(`content="${buildId}"`) || !index.includes(`v${version}`) || !index.includes('id="appVersionValue"') || !index.includes('id="appBuildId"')) throw new Error("Index release metadata is inconsistent.");
if (!index.includes('id="runDeviceReadinessBtn"') || !index.includes('id="deviceReadinessList"')) throw new Error("Phase 6 device-readiness UI is missing.");
if (!read("web/assets/js/app.js").includes("createDeviceReadiness")) throw new Error("Phase 6 device-readiness runtime integration is missing.");
console.log(`AIR-DROW Phase 6 release integrity verified: v${version} / ${buildId}`);
