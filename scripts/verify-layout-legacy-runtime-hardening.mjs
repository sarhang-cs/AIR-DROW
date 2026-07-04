import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
for (const file of ["web/assets/js/core/legacy-compat.js", "tests/layout-legacy-runtime-hardening.test.mjs", "docs/V832_LAYOUT_LEGACY_RUNTIME_HARDENING.md", "docs/V832_LAYOUT_LEGACY_RUNTIME_HARDENING_KU.md", "docs/V832_QA_REPORT.md"]) {
  if (!existsSync(resolve(root, file))) throw new Error(`Missing v8.3.2 layout/runtime file: ${file}`);
}
const app = read("web/assets/js/app.js");
const css = read("web/assets/css/production-ui.css");
if (!app.includes("cloneValue, lastItem") || !app.includes("const wasOpen = ui.app.classList.contains(\"settings-open\")")) throw new Error("Legacy WebKit fallbacks or Settings-entry reset are missing.");
if (!css.includes("about-meta-input") || !css.includes('grid-template-areas:"inputs version"')) throw new Error("Wider Kurdish About card is missing.");
const result = spawnSync(process.execPath, ["tests/layout-legacy-runtime-hardening.test.mjs"], { cwd: root, encoding: "utf8" });
if (result.status !== 0) throw new Error(result.stderr || result.stdout || "v8.3.2 layout/runtime test failed.");
console.log("AIR-DROW v8.3.2 layout and legacy-runtime hardening QA passed.");
