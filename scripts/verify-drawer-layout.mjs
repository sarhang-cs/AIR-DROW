import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(root, "web/index.html"), "utf8");
const drawerCss = readFileSync(resolve(root, "web/assets/css/drawer-layout.css"), "utf8");
const app = readFileSync(resolve(root, "web/assets/js/app.js"), "utf8");
const registry = readFileSync(resolve(root, "web/assets/js/ui/registry.js"), "utf8");
if (!html.includes('drawer-layout.css?v=522')) throw new Error("Drawer layout stylesheet must be cache-versioned and linked.");
for (const marker of [
  'grid-template-rows: var(--drawer-header-height) var(--drawer-tabs-height) minmax(0, 1fr)',
  'overflow-y: auto !important', 'scroll-padding-block', 'toggle-control', 'toggle-visual',
  '#workspaceTitle', 'grid-template-columns: 30px minmax(0, 1fr) 28px',
  'grid-template-columns: 28px minmax(0, 1fr) 30px'
]) if (!drawerCss.includes(marker)) throw new Error(`Drawer contract missing: ${marker}`);
if (!registry.includes('drawerScroll:')) throw new Error("Drawer scroll container is not registered.");
if (!app.includes('function scrollOpenedSectionIntoView') || !app.includes('requestAnimationFrame(() => requestAnimationFrame(reveal))')) throw new Error("Opened cards must focus themselves after mobile disclosure layout.");
if (!html.includes('data-toolbar-icon="redo"')) throw new Error("Redo local toolbar icon slot is missing.");
console.log("AIR-DROW drawer, Android switch, RTL/LTR and history-control layout verified.");
