import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(root, "web/index.html"), "utf8");
const app = readFileSync(resolve(root, "web/assets/js/app.js"), "utf8");
const workspaces = ["draw", "shape", "create", "projects", "settings"];

for (const workspace of workspaces) {
  const navPattern = new RegExp(`data-workspace-nav="${workspace}"`, "g");
  const matches = html.match(navPattern) || [];
  if (matches.length !== 2) throw new Error(`Workspace ${workspace} must exist once in the dock and once in the Studio tabs.`);
  if (!html.includes(`data-workspace-section="${workspace}"`)) throw new Error(`Workspace ${workspace} has no assigned content section.`);
}
if (!html.includes('id="workspaceDock"') || !html.includes('id="workspaceTabs"') || !html.includes('id="workspaceTitle"')) {
  throw new Error("Workspace navigator shell is incomplete.");
}
for (const symbol of ["setWorkspace", "openWorkspace", "WORKSPACES", "workspaceDock", "workspaceTabs"]) {
  if (!app.includes(symbol)) throw new Error(`Workspace navigation logic is missing: ${symbol}`);
}
if (!app.includes('openWorkspace("settings")')) throw new Error("The top settings button must target the Settings workspace.");
console.log("AIR-DROW Workspace Navigator verified: five focused destinations are wired.");
