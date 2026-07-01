import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const required = [
  "package.json",
  "vercel.json",
  "web/index.html",
  "web/package.json",
  "web/package-lock.json",
  "web/src/main.js",
  "web/src/style.css",
  "web/src/data-vault.js",
  "web/src/api-client.js",
  "web/src/interaction-guard.js",
  "web/src/touch-engine.js",
  "web/src/hand-engine.js",
  "web/public/assets/airdraw-logo-lottie.json",
  "web/public/sw.js",
  "server/app/main.py",
  "server/requirements.txt",
  "README.md",
  "README_KU.md",
  "DEPLOYMENT_KU.md",
  "SECURITY.md",
  "scripts/github-upload-termux.sh",
  "scripts/vercel-publish-termux.sh"
];

const missing = required.filter(file => !existsSync(resolve(root, file)));
if (missing.length) {
  console.error("Missing required release files:\n" + missing.map(file => `- ${file}`).join("\n"));
  process.exit(1);
}

const rootPkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const webPkg = JSON.parse(readFileSync(resolve(root, "web/package.json"), "utf8"));
const vercel = JSON.parse(readFileSync(resolve(root, "vercel.json"), "utf8"));

if (!rootPkg?.scripts?.["vercel-build"]) {
  console.error("Root package.json is missing vercel-build.");
  process.exit(1);
}
if (!webPkg?.scripts?.build || !webPkg?.dependencies?.["lottie-web"]) {
  console.error("web/package.json is missing build or lottie-web configuration.");
  process.exit(1);
}
if (vercel.outputDirectory !== "web/dist") {
  console.error("vercel.json outputDirectory must be web/dist.");
  process.exit(1);
}

console.log("AIR-DROW release preflight passed.");
