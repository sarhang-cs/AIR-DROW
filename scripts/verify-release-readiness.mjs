import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const json = file => JSON.parse(read(file));
const packageJson = json("package.json");
const release = json("web/release.json");
const manifest = json("web/manifest.webmanifest");
const index = read("web/index.html");
const worker = read("web/sw.js");
const runtime = read("web/assets/js/config/runtime.js");
const docs = [read("README.md"), read("README_KU.md"), read("docs/RELEASE_NOTES.md")].join("\n");
const required = ["docs/DEVICE_VALIDATION_CHECKLIST.md", "docs/DEVICE_VALIDATION_CHECKLIST_KU.md", "docs/V810_ON_DEVICE_VALIDATION.md", "docs/V810_ON_DEVICE_VALIDATION_KU.md"];
for (const file of required) if (!existsSync(resolve(root, file))) throw new Error(`Release readiness document is missing: ${file}`);
if (packageJson.version !== release.version) throw new Error("Package and release versions differ.");
if (!release.buildId || !release.assetRevision) throw new Error("Release build identity is incomplete.");
const revision = String(release.assetRevision);
if (!index.includes(`content="${release.buildId}"`) || !index.includes(`const BUILD_ID = "${release.buildId}"`)) throw new Error("Index build identity is stale.");
if (!runtime.includes(`version: "${release.version}"`) || !runtime.includes(`buildId: "${release.buildId}"`)) throw new Error("Runtime build identity is stale.");
if (!worker.includes(`const BUILD_ID = "${release.buildId}"`)) throw new Error("Service-worker build identity is stale.");
if (!manifest.start_url.includes(`v${release.version.replaceAll(".", "")}`)) throw new Error("Manifest start URL is stale.");
for (const resource of ["manifest.webmanifest", "toolbar-icons.css", "app.css", "visual-system.css", "icon-system.css", "drawer-layout.css", "production-ui.css"]) {
  if (!index.includes(`${resource}?v=${revision}`)) throw new Error(`Index cache revision is missing for ${resource}.`);
}
for (const resource of ["manifest.webmanifest", "toolbar-icons.css", "app.css", "visual-system.css", "icon-system.css", "drawer-layout.css", "production-ui.css"]) {
  if (!worker.includes(`${resource}?v=${revision}`)) throw new Error(`Service-worker shell does not cache the current revision for ${resource}.`);
}
if (/Palm quick-saves|thumb-up opens|کف دەست وێنەکە خێرا دابەزێنێت|شەست export/iu.test(docs)) throw new Error("Documentation still claims an unsafe hand save/export shortcut.");
if (!/No hand pose can save, export, clear, share or download|هیچ gesture ـێکی دەست ناتوانێت Save، Export، Clear، Share یان Download/u.test(docs)) throw new Error("The physical-action safety contract is not documented.");
console.log(`AIR-DROW release readiness contract passed: v${release.version} / revision ${revision}`);
