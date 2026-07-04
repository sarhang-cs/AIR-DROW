import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
for (const file of ["web/assets/js/features/hand-tracking-engine.js", "web/assets/js/app.js", "web/assets/js/config/runtime.js", "web/assets/css/app.css", "tests/hand-input-reliability.test.mjs", "docs/V840_HAND_INPUT_RELIABILITY.md", "docs/V840_HAND_INPUT_RELIABILITY_KU.md", "docs/V840_QA_REPORT.md"]) {
  if (!existsSync(resolve(root, file))) throw new Error(`Missing hand-reliability file: ${file}`);
}
const engine = read("web/assets/js/features/hand-tracking-engine.js");
const app = read("web/assets/js/app.js");
const runtime = read("web/assets/js/config/runtime.js");
const css = read("web/assets/css/app.css");
if (!engine.includes("createHandIntentGate") || !engine.includes("intentTravel")) throw new Error("Hand intent gate is missing.");
if (!app.includes("handNeedsRepinch") || !app.includes("handRecoveryOpenSeen") || !app.includes("resolveHandRepinch") || !app.includes("gestureOpenHandFirst")) throw new Error("Lost-hand recovery or deliberate gesture wiring is missing.");
if (!runtime.includes("armFrames: 5") || !runtime.includes("intentTravel: .011")) throw new Error("Balanced hand reliability profile is stale.");
if (!css.includes("v8.4.0 hand-reliability scan UX")) throw new Error("Compact scan UX CSS is missing.");
const result = spawnSync(process.execPath, ["tests/hand-input-reliability.test.mjs"], { cwd: root, encoding: "utf8" });
if (result.status !== 0) throw new Error(result.stderr || result.stdout || "Hand input reliability tests failed.");
console.log("AIR-DROW hand input reliability QA passed.");
