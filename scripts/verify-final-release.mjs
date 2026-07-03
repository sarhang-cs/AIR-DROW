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

if (release.phase !== 7 || release.stage !== "final-live-qa-and-master-release" || !release.assetRevision) {
  throw new Error("Phase 7 release metadata is incomplete.");
}
const required = [
  "README.md", "README_KU.md", "CHANGELOG.md", "PHASE_7_FINAL_LIVE_QA_MANIFEST.json", "PHASE_7_QA_REPORT.md",
  "docs/PHASE_7_FINAL_LIVE_QA_KU.md", "docs/RELEASE_DELIVERY_KU.md",
  "scripts/verify-phase7-final-live-qa.mjs", "web/assets/js/features/final-live-qa.js",
  "termux/replace-with-phase7.sh"
];
for (const file of required) if (!existsSync(resolve(root, file))) throw new Error(`Phase 7 release file missing: ${file}`);
for (const [label, value] of Object.entries({ package: pkg.version, projectManifest: manifest.version, assetManifest: assetManifest.version })) {
  if (value !== version) throw new Error(`${label} version must be ${version}; got ${value}`);
}
for (const [label, value] of Object.entries({ release: release.buildId, projectManifest: manifest.buildId, assetManifest: assetManifest.buildId })) {
  if (value !== buildId) throw new Error(`${label} buildId must be ${buildId}; got ${value}`);
}
if (!runtime.includes(`version: "${version}"`) || !runtime.includes(`buildId: "${buildId}"`)) throw new Error("Runtime release metadata is inconsistent.");
if (!worker.includes(`const BUILD_ID = "${buildId}"`)) throw new Error("Service worker build ID is inconsistent.");
if (!worker.includes("final-live-qa.js")) throw new Error("Service worker must pre-cache Final Live QA.");
if (!index.includes(`content="${buildId}"`) || !index.includes(`v${version}`) || !index.includes('id="appVersionValue"') || !index.includes('id="appBuildId"')) throw new Error("Index release metadata is inconsistent.");
for (const marker of ['id="runDeviceReadinessBtn"', 'id="runFinalLiveQaBtn"', 'id="finalLiveQaList"', 'data-i18n="finalLiveQaPrivacy"']) {
  if (!index.includes(marker)) throw new Error(`Phase 7 final QA UI marker missing: ${marker}`);
}
const app = read("web/assets/js/app.js");
if (!app.includes("createDeviceReadiness") || !app.includes("createFinalLiveQa")) throw new Error("Phase 6/7 runtime integration is missing.");
console.log(`AIR-DROW Phase 7 master release integrity verified: v${version} / ${buildId}`);
