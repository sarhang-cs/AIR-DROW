import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputFont = resolve(root, "public/assets/fonts/noto-kufi-arabic/NotoKufiArabic-VariableFont_wght.ttf");
const outputIndex = resolve(root, "public/index.html");
if (!existsSync(outputFont) || statSync(outputFont).size < 100_000) throw new Error("Generated output is missing the local Kurdish typography asset.");
if (!existsSync(outputIndex) || !readFileSync(outputIndex, "utf8").includes("NotoKufiArabic-VariableFont_wght.ttf")) throw new Error("Generated output is missing the Kurdish font-face route.");
console.log("AIR-DROW generated Kurdish typography output QA passed.");
