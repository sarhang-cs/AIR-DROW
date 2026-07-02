import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = resolve(root, "web/index.html");
const iconRoot = resolve(root, "web/assets/icons/toolbar");
const icons = ["brush", "eraser", "hand", "camera", "undo", "redo", "trash", "moon", "sun", "settings"];

function normalizeSvg(source, name) {
  let svg = String(source || "")
    .replace(/<\?xml[^>]*\?>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/\s+on[a-zA-Z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/g, "")
    .trim();

  if (!/^<svg\b/i.test(svg)) throw new Error(`Invalid SVG: ${name}.svg`);
  svg = svg.replace(/^<svg\b/i, `<svg data-airdrow-bundled-icon="${name}"`);
  return svg;
}

let html = readFileSync(htmlPath, "utf8");
for (const name of icons) {
  const file = resolve(iconRoot, `${name}.svg`);
  if (!existsSync(file)) throw new Error(`Missing toolbar icon: web/assets/icons/toolbar/${name}.svg`);
  const svg = normalizeSvg(readFileSync(file, "utf8"), name);
  const start = `<!-- AIRDROW_ICON:${name}:START -->`;
  const end = `<!-- AIRDROW_ICON:${name}:END -->`;
  const first = html.indexOf(start);
  const last = html.indexOf(end);
  if (first < 0 || last < first) throw new Error(`Icon slot is missing in index.html: ${name}`);
  html = html.slice(0, first + start.length) + svg + html.slice(last);
}
writeFileSync(htmlPath, html, "utf8");
console.log(`Bundled ${icons.length} editable toolbar SVG icons into web/index.html.`);
