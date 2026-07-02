import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const html = read("web/index.html");
const css = read("web/assets/css/icon-system.css");
const i18n = read("web/assets/js/i18n/translations.js");
const app = read("web/assets/js/app.js");
const builder = read("scripts/build-selfhosted-mediapipe.mjs");
const release = JSON.parse(read("web/release.json"));

const requiredIcons = [
  "brand/air-drow-mark.svg", "actions/close.svg", "actions/clear.svg", "actions/redo.svg", "actions/reset.svg",
  "workspace/draw.svg", "workspace/shape.svg", "workspace/create.svg", "workspace/projects.svg", "workspace/settings.svg",
  "status/success.svg", "status/missing.svg", "status/problem.svg",
  "settings/creator-lab.svg", "settings/project-gallery.svg", "settings/viral-studio.svg", "settings/creator-pack.svg",
  "settings/ai-studio.svg", "settings/camera-hand.svg", "settings/appearance.svg", "settings/display.svg",
  "settings/info.svg", "settings/system.svg", "settings/about.svg", "settings/backend.svg"
];
for (const file of requiredIcons) {
  const absolute = resolve(root, "web/assets/icons", file);
  if (!existsSync(absolute) || statSync(absolute).size < 50) throw new Error(`Missing local icon: ${file}`);
}
if (!existsSync(resolve(root, "web/assets/icons/toolbar/hand.svg"))) throw new Error("Existing editable toolbar icons must remain available.");
if (!html.includes('href="./assets/css/icon-system.css?v=509"')) throw new Error("Icon system CSS is not linked.");
if (!html.includes('class="app-icon')) throw new Error("Semantic icon classes are not used by the UI.");
const inlineSvgs = [...html.matchAll(/<svg\b/gi)].length;
if (inlineSvgs !== 10) throw new Error(`Expected only the ten preserved toolbar SVG bundles; found ${inlineSvgs}.`);
if (i18n.includes("Object.assign(I18N")) throw new Error("Translations must be a single immutable dictionary, not layered legacy Object.assign calls.");
for (const marker of ["[data-i18n-title]", "[data-i18n-aria-label]", "ariaManualDrawing", "placeholderProjectName"]) {
  if (!i18n.includes(marker) && !app.includes(marker) && !html.includes(marker)) throw new Error(`Translation marker missing: ${marker}`);
}
if (!app.includes('document.querySelectorAll("[data-i18n-title]")')) throw new Error("Browser tooltip translation is not applied.");
if (!builder.includes("verify-local-hand-model.mjs") || builder.includes("fetchWithRetry") || builder.includes("storage.googleapis.com")) {
  throw new Error("MediaPipe static build must verify the bundled local model and remain network-free.");
}
if (release.version !== "5.0.9" || release.buildId !== "air-drow-v509-official-task-binary-fix") throw new Error("Completion-pass version metadata is inconsistent.");
console.log("AIR-DROW Final Completion Pass verified: local icons, centralized translations and strict local model build contract are correct.");
