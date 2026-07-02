import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const version = "5.0.9";
const buildId = "air-drow-v509-official-task-binary-fix";
const packageJson = JSON.parse(read("package.json"));
const release = JSON.parse(read("web/release.json"));
const manifest = JSON.parse(read("PROJECT_MANIFEST.json"));
const assetManifest = JSON.parse(read("web/assets/LOCAL_ASSETS_MANIFEST.json"));
const modelManifest = JSON.parse(read("web/vendor/models/MODEL_MANIFEST.json"));
const runtime = read("web/assets/js/config/runtime.js");
const worker = read("web/sw.js");
const index = read("web/index.html");
const health = read("api/health.js");

for (const file of [
  "README.md", "README_KU.md", "CHANGELOG.md", "docs/CODEBASE_KU.md",
  "docs/DEPLOYMENT_KU.md", "docs/ASSET_REQUIREMENTS_KU.md", "docs/LOCAL_HAND_MODEL_KU.md",
  "docs/RELEASE_CHECKLIST_KU.md", "docs/TERMUX_FINAL_REPLACE_KU.md",
  "termux/replace-with-final-release.sh", "termux/verify-final-release.sh",
  "web/vendor/models/README.md", "web/vendor/models/MODEL_MANIFEST.json",
  "web/vendor/models/hand_landmarker.task", "scripts/verify-local-hand-model.mjs",
  "scripts/build-selfhosted-mediapipe.mjs"
]) {
  if (!existsSync(resolve(root, file))) throw new Error(`Required final-release file is missing: ${file}`);
}

for (const [label, value] of Object.entries({
  package: packageJson.version, release: release.version, projectManifest: manifest.version, assetManifest: assetManifest.version
})) {
  if (value !== version) throw new Error(`${label} version must be ${version}; got ${value}`);
}
for (const [label, value] of Object.entries({ release: release.buildId, projectManifest: manifest.buildId, assetManifest: assetManifest.buildId })) {
  if (value !== buildId) throw new Error(`${label} buildId must be ${buildId}; got ${value}`);
}
if (!runtime.includes(`version: "${version}"`) || !runtime.includes(`buildId: "${buildId}"`)) throw new Error("Runtime release metadata is inconsistent.");
if (!worker.includes(`const BUILD_ID = "${buildId}"`)) throw new Error("Service worker build ID is inconsistent.");
if (!worker.includes('/vendor/models/hand_landmarker.task') || !worker.includes('/vendor/mediapipe/vision_bundle.js')) throw new Error("Local hand runtime is not covered by the service-worker cache.");
if (!index.includes(`content="${buildId}"`) || !index.includes(`v${version}`)) throw new Error("Index release metadata is inconsistent.");
if (!health.includes(`version: "${version}"`)) throw new Error("Health endpoint version is inconsistent.");
if (!read("web/manifest.webmanifest").includes(`v${version}`)) throw new Error("PWA manifest version is inconsistent.");
if (modelManifest.bytes !== 7819105 || modelManifest.sha256 !== "fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1") throw new Error("Official model manifest integrity values are inconsistent.");
if (!/SHA-256/.test(String(modelManifest.validation || ""))) throw new Error("Official model manifest validation policy is missing.");
if (statSync(resolve(root, "web/vendor/models/hand_landmarker.task")).size !== modelManifest.bytes) throw new Error("Bundled hand-model size is inconsistent.");
if (!read("scripts/sync-official-hand-model.mjs").includes("storage.googleapis.com")) throw new Error("Official hand-model synchronization source is missing.");
if (read("termux/replace-with-final-release.sh").includes("rm -rf /")) throw new Error("Unsafe Termux replacement command found.");
const localModel = spawnSync(process.execPath, [resolve(root, "scripts/verify-local-hand-model.mjs")], { cwd: root, encoding: "utf8" });
if (localModel.status !== 0) throw new Error(`Bundled local model verification failed: ${localModel.stderr || localModel.stdout}`);
console.log(`AIR-DROW release integrity verified: v${version} / ${buildId}`);
