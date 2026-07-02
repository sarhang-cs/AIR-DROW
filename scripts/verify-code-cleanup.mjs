import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const html = read("web/index.html");
const css = read("web/assets/css/app.css");
const app = read("web/assets/js/app.js");
const runtime = read("web/assets/js/config/runtime.js");
const appearance = read("web/assets/js/config/appearance.js");
const translations = read("web/assets/js/i18n/translations.js");
const registry = read("web/assets/js/ui/registry.js");

for (const file of [
  "web/assets/css/app.css",
  "web/assets/js/config/runtime.js",
  "web/assets/js/config/appearance.js",
  "web/assets/css/visual-system.css",
  "web/assets/js/i18n/translations.js",
  "web/assets/js/ui/registry.js",
  "docs/CODEBASE_KU.md",
  "docs/DEPLOYMENT_KU.md"
]) {
  if (!existsSync(resolve(root, file))) throw new Error(`Clean Code source missing: ${file}`);
}
for (const oldArtifact of [
  "PHASE_4_MANIFEST.json",
  "TERMUX_FULL_REPLACE_KU.md",
  "TERMUX_PHASE_4_KU.md",
  "TERMUX_SMART_SHAPE_PRECISION_KU.md",
  "TERMUX_WORKSPACE_NAVIGATOR_KU.md",
  "install-complete-project-termux.sh"
]) {
  if (existsSync(resolve(root, oldArtifact))) throw new Error(`Obsolete artifact must not remain: ${oldArtifact}`);
}
if (!html.includes('href="./assets/css/app.css?v=509"')) throw new Error("External application stylesheet is not linked.");
if (html.includes("<style>")) throw new Error("The application stylesheet must not remain embedded in index.html.");
if (!app.includes('from "./config/runtime.js"') || !app.includes('from "./i18n/translations.js"') || !app.includes('from "./ui/registry.js"')) {
  throw new Error("App shell must use the modular config, translation and UI registry files.");
}
if (!runtime.includes("createDefaultSettings") || !appearance.includes("normalizeSkin") || !translations.includes("export const I18N") || !registry.includes("collectUi")) {
  throw new Error("Expected clean-code modules are incomplete.");
}
const prohibitedEmoji = /[\u{1F300}-\u{1FAFF}]/u;
for (const [name, source] of [["HTML", html], ["CSS", css], ["app", app], ["translations", translations]]) {
  if (prohibitedEmoji.test(source)) throw new Error(`Simple emoji must not ship in ${name}.`);
}
console.log("AIR-DROW Clean Code verified: modular source, current docs and emoji-free product copy are in place.");
