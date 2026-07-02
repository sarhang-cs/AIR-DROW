import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const html = read("web/index.html");
const appCss = read("web/assets/css/app.css");
const visualCss = read("web/assets/css/visual-system.css");

for (const marker of ['id="liveHud" class="live-hud"', 'id="liveFps"', 'id="liveNetwork"', 'id="cameraIndicator" class="camera-indicator"']) {
  if (!html.includes(marker)) throw new Error(`Live status markup is missing: ${marker}`);
}
for (const declaration of [
  "background: transparent",
  "border: 0",
  "box-shadow: none",
  "backdrop-filter: none",
  "-webkit-backdrop-filter: none"
]) {
  if (!appCss.includes(declaration)) throw new Error(`Base HUD transparency declaration is missing: ${declaration}`);
  if (!visualCss.includes(declaration)) throw new Error(`Visual HUD transparency declaration is missing: ${declaration}`);
}
if (visualCss.includes("background: color-mix(in srgb, var(--panel-2) 72%, transparent)")) {
  throw new Error("Legacy boxed HUD background must not ship.");
}
if (!visualCss.includes("Live camera status is intentionally text-only")) {
  throw new Error("Transparent HUD must be maintained as a core visual-system rule.");
}
if (!/\.live-hud\s*\{[\s\S]*?text-shadow:/m.test(visualCss) || !/\.camera-indicator\s*\{[\s\S]*?text-shadow:/m.test(visualCss)) {
  throw new Error("Transparent status text must retain an explicit camera-safe text shadow.");
}
console.log("AIR-DROW transparent status HUD verified: FPS, Online and CAM have no panel, border or blur surface.");
