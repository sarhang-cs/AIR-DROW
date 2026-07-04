import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const sourceFont = resolve(root, "web/assets/fonts/noto-kufi-arabic/NotoKufiArabic-VariableFont_wght.ttf");
const sourceHtml = read("web/index.html");
const fontKit = read("web/assets/js/core/font-kit.js");
const vercel = JSON.parse(read("vercel.json"));
if (!existsSync(sourceFont) || statSync(sourceFont).size < 100_000) throw new Error("The local Kurdish typography asset is missing or incomplete.");
if (!sourceHtml.includes('NotoKufiArabic-VariableFont_wght.ttf') || !sourceHtml.includes('airdrow-local-noto-kufi-font')) throw new Error("The local Kurdish font-face or preload route is missing.");
if (!fontKit.includes('Noto Kufi Arabic')) throw new Error("The Kurdish typography stack is missing from font-kit.");
const fontHeader = vercel.headers.flatMap(entry => entry.headers || []).find(header => header.key === "Content-Type" && header.value.includes("font/ttf"));
if (!fontHeader) throw new Error("The Vercel font content-type header is missing.");
console.log("AIR-DROW local Kurdish typography source QA passed.");
