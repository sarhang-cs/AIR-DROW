import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const modelDirectory = resolve(root, "web/vendor/models");
const modelFile = resolve(modelDirectory, "hand_landmarker.task");
const manifestFile = resolve(modelDirectory, "MODEL_MANIFEST.json");

// Google's official asset is an opaque MediaPipe Task binary. Do not treat this
// exact release as a generic ZIP: its integrity is established by byte length
// and SHA-256, which are stronger and format-independent checks.
const MODEL_URL = process.env.AIR_DROW_HAND_MODEL_URL ||
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const EXPECTED_BYTES = 7_819_105;
const EXPECTED_SHA256 = "fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1";

function verifyOfficialTask(payload) {
  if (payload.byteLength !== EXPECTED_BYTES) {
    throw new Error(`Official HandLandmarker size mismatch: expected ${EXPECTED_BYTES}, got ${payload.byteLength}`);
  }
  const sha256 = createHash("sha256").update(payload).digest("hex");
  if (sha256 !== EXPECTED_SHA256) {
    throw new Error(`Official HandLandmarker checksum mismatch: expected ${EXPECTED_SHA256}, got ${sha256}`);
  }
  return sha256;
}

async function writeManifest() {
  const manifest = {
    format: "MediaPipe Task binary asset",
    runtime: "@mediapipe/tasks-vision@0.10.35",
    asset: "hand_landmarker.task",
    modelId: "hand_landmarker/float16/1",
    source: "Google MediaPipe official model registry",
    sourceUrl: MODEL_URL,
    bytes: EXPECTED_BYTES,
    sha256: EXPECTED_SHA256,
    validation: "Exact byte length and SHA-256. No ZIP-header or archive-entry assumptions are made.",
    delivery: "Final release packages include this exact verified task asset. npm run model:sync is a controlled build-time fallback only when the source file is absent.",
    networkPolicy: "No runtime hand-model download is allowed. The deployed app only reads /vendor/models/hand_landmarker.task?model=v800-release-cache-integrity.",
    integrityPolicy: "Build fails unless the exact official task binary is present."
  };
  await mkdir(modelDirectory, { recursive: true });
  await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function useExistingVerifiedTask() {
  if (!existsSync(modelFile)) return false;
  try {
    const sha256 = verifyOfficialTask(await readFile(modelFile));
    await writeManifest();
    console.log(`AIR-DROW official hand model already verified: ${EXPECTED_BYTES} bytes / ${sha256}`);
    return true;
  } catch {
    return false;
  }
}

if (!await useExistingVerifiedTask()) {
  let response;
  let lastFailure;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      response = await fetch(MODEL_URL, { cache: "no-store", signal: AbortSignal.timeout(90_000) });
      if (response.ok) break;
      lastFailure = new Error(`Official HandLandmarker download returned HTTP ${response.status}.`);
    } catch (cause) {
      lastFailure = cause;
    }
    if (attempt < 3) await new Promise(resolveDelay => setTimeout(resolveDelay, attempt * 1_500));
  }
  if (!response?.ok) {
    throw new Error(`Could not download the official HandLandmarker model after 3 attempts. Add the exact verified file at web/vendor/models/hand_landmarker.task for an offline build, then retry. ${lastFailure?.message || lastFailure || "Unknown network failure"}`);
  }

  const payload = Buffer.from(await response.arrayBuffer());
  const sha256 = verifyOfficialTask(payload);
  await mkdir(modelDirectory, { recursive: true });
  const temporary = `${modelFile}.${process.pid}.tmp`;
  try {
    await writeFile(temporary, payload);
    await rename(temporary, modelFile);
    await writeManifest();
  } finally {
    await rm(temporary, { force: true });
  }
  console.log(`AIR-DROW official hand model synchronized: ${EXPECTED_BYTES} bytes / ${sha256}`);
}
