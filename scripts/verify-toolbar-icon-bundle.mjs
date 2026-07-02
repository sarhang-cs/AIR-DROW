import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(root, "web/index.html"), "utf8");
const names = ["brush", "eraser", "hand", "camera", "undo", "redo", "trash", "moon", "sun", "settings"];
for (const name of names) {
  const source = readFileSync(resolve(root, `web/assets/icons/toolbar/${name}.svg`), "utf8")
    .replace(/<\?xml[^>]*\?>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
  const bundled = source.replace(/^<svg\b/i, `<svg data-airdrow-bundled-icon="${name}"`);
  const start = `<!-- AIRDROW_ICON:${name}:START -->`;
  const end = `<!-- AIRDROW_ICON:${name}:END -->`;
  const a = html.indexOf(start), b = html.indexOf(end);
  if (a < 0 || b < a) throw new Error(`Missing slot: ${name}`);
  const actual = html.slice(a + start.length, b).trim();
  if (actual !== bundled) throw new Error(`Toolbar icon is not bundled from the user file: ${name}.svg`);
}
console.log("AIR-DROW user toolbar SVG bundle verified.");
