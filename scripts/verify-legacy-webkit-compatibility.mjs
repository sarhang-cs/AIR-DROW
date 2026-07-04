import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
for (const file of ["vercel.json", "web/assets/js/app.js", "web/assets/js/i18n/translations.js", "tests/legacy-webkit-compatibility.test.mjs", "docs/V831_LEGACY_WEBKIT_COMPATIBILITY.md", "docs/V831_LEGACY_WEBKIT_COMPATIBILITY_KU.md"]) {
  if (!existsSync(resolve(root, file))) throw new Error(`Missing legacy-WebKit compatibility file: ${file}`);
}
const vercel = JSON.parse(read("vercel.json"));
const csp = vercel.headers.flatMap(group => group.headers || []).find(header => header.key === "Content-Security-Policy")?.value || "";
if (!/script-src[^;]*'wasm-unsafe-eval'/.test(csp) || !/script-src[^;]*'unsafe-eval'/.test(csp)) {
  throw new Error("CSP must keep both modern and legacy WebAssembly compatibility tokens.");
}
const app = read("web/assets/js/app.js");
if (!app.includes("engineLegacyBrowserTitle") || !app.includes("Keep technical browser/CSP details in local Diagnostics")) {
  throw new Error("Friendly legacy browser recovery is missing.");
}
const result = spawnSync(process.execPath, ["tests/legacy-webkit-compatibility.test.mjs"], { cwd: root, encoding: "utf8" });
if (result.status !== 0) throw new Error(result.stderr || result.stdout || "Legacy WebKit compatibility test failed.");
console.log("AIR-DROW legacy WebKit compatibility QA passed.");
