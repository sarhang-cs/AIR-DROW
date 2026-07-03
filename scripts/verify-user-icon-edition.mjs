import { existsSync, readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const iconRoot = resolve(root, "web/assets/icons");
const manifestPath = resolve(iconRoot, "USER_ICON_PACKAGE.json");
if (!existsSync(manifestPath)) throw new Error("User icon package manifest is missing.");

const pack = JSON.parse(readFileSync(manifestPath, "utf8"));
if (pack.version !== "7.2.1" || pack.buildId !== "air-drow-v721-user-icon-edition") {
  throw new Error("User icon package metadata is inconsistent.");
}
if (!Array.isArray(pack.files) || pack.files.length < 30) {
  throw new Error("The complete user icon package is incomplete.");
}
for (const asset of pack.files) {
  const file = resolve(iconRoot, asset.path);
  if (!existsSync(file) || !statSync(file).isFile()) throw new Error(`Imported icon is missing: ${asset.path}`);
  const hash = createHash("sha256").update(readFileSync(file)).digest("hex");
  if (hash !== asset.sha256) throw new Error(`Imported icon was changed or is corrupt: ${asset.path}`);
}

const required = [
  "brand/air-drow-mark.svg", "actions/reset.svg", "status/problem.svg",
  "settings/camera-hand.svg", "settings/ai-studio.svg", "settings/creator-pack.svg",
  "workspace/draw.svg", "workspace/shape.svg", "workspace/create.svg",
  "workspace/projects.svg", "workspace/settings.svg"
];
for (const path of required) {
  if (!pack.files.some(asset => asset.path === path)) throw new Error(`Required imported icon is absent: ${path}`);
}

const worker = readFileSync(resolve(root, "web/sw.js"), "utf8");
for (const asset of pack.files.filter(item => item.path.endsWith(".svg"))) {
  const cachedPath = `/assets/icons/${asset.path}`;
  if (!worker.includes(`"${cachedPath}"`)) throw new Error(`Imported icon is not in the offline app shell: ${asset.path}`);
}
console.log(`AIR-DROW user icon package verified: ${pack.files.length} local files.`);
