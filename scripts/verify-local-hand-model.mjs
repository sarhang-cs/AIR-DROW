import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const file = resolve(root, "web/vendor/models/hand_landmarker.task");
const expectedBytes = 7_819_105;
const expectedSha256 = "fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1";

if (!existsSync(file)) {
  throw new Error("Official HandLandmarker model is missing. Run npm run model:sync before verification.");
}
const size = statSync(file).size;
if (size !== expectedBytes) throw new Error(`Official HandLandmarker size mismatch: expected ${expectedBytes}, got ${size}`);
const payload = readFileSync(file);
const actualSha256 = createHash("sha256").update(payload).digest("hex");
if (actualSha256 !== expectedSha256) {
  throw new Error("HandLandmarker checksum mismatch. The exact official model must be synchronized with npm run model:sync.");
}
console.log(`AIR-DROW official hand model verified: ${expectedBytes} bytes / ${actualSha256}`);
