import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const file = resolve(root, "web/vendor/models/hand_landmarker.task");
const expectedBytes = 7820242;
const expectedSha256 = "168ca8a3f698e93e2caba5c5e8234c3443e56b2ea3ebacec205e4df33bc899da";

if (!existsSync(file)) throw new Error("Local hand model is missing: web/vendor/models/hand_landmarker.task");
if (statSync(file).size !== expectedBytes) throw new Error(`Local hand model size mismatch: expected ${expectedBytes}, got ${statSync(file).size}`);
const payload = readFileSync(file);
if (payload.subarray(0, 4).toString("binary") !== "PK\x03\x04") throw new Error("Local hand model is not a valid task ZIP bundle.");
const text = payload.toString("latin1");
for (const entry of ["hand_detector.tflite", "hand_landmarks_detector.tflite"]) {
  if (!text.includes(entry)) throw new Error(`Local hand model is missing bundle entry: ${entry}`);
}
const actualSha256 = createHash("sha256").update(payload).digest("hex");
if (actualSha256 !== expectedSha256) throw new Error("Local hand model checksum mismatch. Replace it only with the verified AIR-DROW model bundle.");
console.log(`AIR-DROW local hand model verified: ${expectedBytes} bytes / ${actualSha256}`);
