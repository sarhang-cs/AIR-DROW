import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const cfg = JSON.parse(read("vercel.json"));
const csp = cfg.headers.flatMap(group => group.headers || []).find(header => header.key === "Content-Security-Policy")?.value || "";
assert.match(csp, /script-src[^;]*'wasm-unsafe-eval'/);
assert.match(csp, /script-src[^;]*'unsafe-eval'/);
const app = read("web/assets/js/app.js");
assert.match(app, /engineLegacyBrowserTitle/);
assert.match(app, /unsafe-eval\|content security policy\|webassembly object/);
assert.doesNotMatch(app, /body: `\$\{copy\.body\}\$\{detail\}`/);
const copy = read("web/assets/js/i18n/translations.js");
assert.match(copy, /engineLegacyBrowserBody/);
console.log("Legacy WebKit WebAssembly CSP compatibility QA passed.");
