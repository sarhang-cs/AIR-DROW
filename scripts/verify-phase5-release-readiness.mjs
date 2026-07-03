import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const json = file => JSON.parse(read(file));
const release = json("web/release.json");
const pkg = json("package.json");
const project = json("PROJECT_MANIFEST.json");
const assets = json("web/assets/LOCAL_ASSETS_MANIFEST.json");
const runtime = read("web/assets/js/config/runtime.js");
const html = read("web/index.html");
const app = read("web/assets/js/app.js");
const registry = read("web/assets/js/ui/registry.js");
const i18n = read("web/assets/js/i18n/translations.js");
const docs = [
  "README.md", "README_KU.md", "CHANGELOG.md", "PHASE_5_RELEASE_MANIFEST.json",
  "PHASE_5_QA_REPORT.md", "docs/PHASE_5_RELEASE_READINESS_KU.md",
  "docs/RELEASE_DELIVERY_KU.md", "docs/RELEASE_CHECKLIST_KU.md"
];

if (release.phase !== 5 || release.stage !== "release-readiness-and-documentation") {
  throw new Error("Phase 5 release metadata is incomplete.");
}
for (const file of docs) if (!existsSync(resolve(root, file))) throw new Error(`Phase 5 release file is missing: ${file}`);
for (const [label, value] of Object.entries({ package: pkg.version, project: project.version, assets: assets.version })) {
  if (value !== release.version) throw new Error(`Phase 5 ${label} version mismatch: expected ${release.version}, got ${value}.`);
}
for (const [label, value] of Object.entries({ project: project.buildId, assets: assets.buildId })) {
  if (value !== release.buildId) throw new Error(`Phase 5 ${label} build ID mismatch: expected ${release.buildId}, got ${value}.`);
}
if (!runtime.includes(`version: "${release.version}"`) || !runtime.includes(`buildId: "${release.buildId}"`)) {
  throw new Error("Runtime release identity is not canonical.");
}
for (const marker of [
  'id="appVersionValue"', 'id="appBuildId"', `v${release.version}`, release.buildId,
  'data-i18n="buildId"', 'data-i18n="releaseFinalQA"'
]) if (!html.includes(marker)) throw new Error(`Phase 5 About UI marker missing: ${marker}`);
for (const marker of ['appVersionValue:', 'appBuildId:']) if (!registry.includes(marker)) throw new Error(`Phase 5 UI registry marker missing: ${marker}`);
for (const marker of ['function syncReleaseIdentity()', 'AIRDROW_RELEASE.version', 'AIRDROW_RELEASE.buildId', 'syncReleaseIdentity();']) {
  if (!app.includes(marker)) throw new Error(`Phase 5 release identity sync marker missing: ${marker}`);
}
for (const marker of ['"buildId"', '"releaseFinalQA"']) {
  const count = i18n.split(marker).length - 1;
  if (count < 2) throw new Error(`Phase 5 translation key is missing for Kurdish or English: ${marker}`);
}
for (const [file, marker] of [
  ['README.md', release.buildId], ['README_KU.md', `v${release.version}`],
  ['CHANGELOG.md', `Phase 5`], ['PHASE_5_QA_REPORT.md', 'npm run vercel:build'],
  ['docs/PHASE_5_RELEASE_READINESS_KU.md', 'Settings > دەربارەی ئەپ'],
  ['docs/RELEASE_DELIVERY_KU.md', 'Deployments → Create Deployment']
]) if (!read(file).includes(marker)) throw new Error(`Phase 5 documentation marker missing in ${file}: ${marker}`);

console.log(`AIR-DROW Phase 5 release readiness verified: v${release.version} / ${release.buildId}.`);
