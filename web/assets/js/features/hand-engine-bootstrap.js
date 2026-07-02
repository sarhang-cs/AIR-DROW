/**
 * Local hand-engine bootstrap.
 *
 * This module deliberately separates asset validation from MediaPipe creation.
 * On Android the camera is started and a real video frame is available before
 * the task is initialized. Initialization uses the local model URL first,
 * then deterministic local-only fallbacks when a browser rejects one loading
 * route. No CDN or remote model URL is ever used.
 */

function describeFailure(stage, cause) {
  const message = String(cause?.message || cause || "Unknown hand-engine failure");
  const error = new Error(message);
  error.stage = stage;
  error.cause = cause;
  return error;
}

async function fetchRequired(url, label, { minimumBytes = 1 } = {}) {
  let response;
  try {
    response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  } catch (cause) {
    throw describeFailure("asset", new Error(`${label} could not be reached: ${cause?.message || cause}`));
  }
  if (!response.ok) throw describeFailure("asset", new Error(`${label} returned ${response.status}`));
  const buffer = new Uint8Array(await response.arrayBuffer());
  if (buffer.byteLength < minimumBytes) throw describeFailure("asset", new Error(`${label} is incomplete (${buffer.byteLength} bytes)`));
  return buffer;
}

export async function primeLocalHandAssets({ modelUrl, moduleUrl }) {
  // Priming only verifies/cache-warms local responses. It never creates a
  // MediaPipe task before the user has selected the camera mode.
  await Promise.all([
    fetchRequired(moduleUrl, "Local hand runtime", { minimumBytes: 32_000 }),
    fetchRequired(modelUrl, "Local hand model", { minimumBytes: 7_000_000 })
  ]);
}

export async function createLocalHandLandmarker({
  FilesetResolver,
  HandLandmarker,
  wasmRoot,
  modelUrl,
  moduleUrl,
  confidence,
  preferredDelegate = "GPU"
}) {
  // Report missing deployment assets before MediaPipe emits a generic wasm
  // error. This keeps a bad deploy distinguishable from a camera failure.
  let modelBuffer;
  try {
    const [, model] = await Promise.all([
      fetchRequired(moduleUrl, "Local hand runtime", { minimumBytes: 32_000 }),
      fetchRequired(modelUrl, "Local hand model", { minimumBytes: 7_000_000 })
    ]);
    modelBuffer = model;
  } catch (error) {
    throw error?.stage ? error : describeFailure("asset", error);
  }

  // FilesetResolver constructs `${base}/vision_wasm_*.js` itself. A trailing
  // slash creates a double-slash URL on strict hosts, which can make the task
  // loader fail even though the local files exist.
  const normalizedWasmRoot = String(wasmRoot || "").replace(/\/+$/, "");
  if (!normalizedWasmRoot) throw describeFailure("wasm", new Error("Local WASM base URL is missing"));

  let vision;
  try {
    vision = await FilesetResolver.forVisionTasks(normalizedWasmRoot);
  } catch (cause) {
    throw describeFailure("wasm", cause);
  }

  // Keep a persistent hand in the lightweight VIDEO tracker for longer. When
  // this threshold is too high, a moving hand re-runs the heavier palm detector
  // almost every frame and Android falls to single-digit FPS.
  const trackingConfidence = Math.max(.38, Math.min(.46, Number(confidence || .56) - .12));
  const common = {
    runningMode: "VIDEO",
    numHands: 1,
    minHandDetectionConfidence: confidence,
    minHandPresenceConfidence: trackingConfidence,
    minTrackingConfidence: trackingConfidence
  };

  // Prefer the MediaPipe GPU delegate on browsers that expose it. A fully
  // local CPU path remains as the deterministic fallback for unsupported
  // Android WebViews, so acceleration can never block camera drawing.
  const gpuAttempts = [
    { name: "local-url-gpu", delegate: "GPU", options: { ...common, baseOptions: { modelAssetPath: modelUrl, delegate: "GPU" } } },
    { name: "local-buffer-gpu", delegate: "GPU", options: { ...common, baseOptions: { modelAssetBuffer: modelBuffer, delegate: "GPU" } } }
  ];
  const cpuAttempts = [
    { name: "local-url-cpu", delegate: "CPU", options: { ...common, baseOptions: { modelAssetPath: modelUrl, delegate: "CPU" } } },
    { name: "local-buffer-cpu", delegate: "CPU", options: { ...common, baseOptions: { modelAssetBuffer: modelBuffer, delegate: "CPU" } } }
  ];
  // After a detection-time GPU failure the app explicitly retries in CPU mode.
  // Do not re-attempt the same GPU graph in that recovery path.
  const attempts = String(preferredDelegate).toUpperCase() === "CPU"
    ? cpuAttempts
    : [...gpuAttempts, ...cpuAttempts];

  const failures = [];
  for (const attempt of attempts) {
    try {
      const landmarker = await HandLandmarker.createFromOptions(vision, attempt.options);
      return { landmarker, vision, strategy: attempt.name, delegate: attempt.delegate };
    } catch (cause) {
      failures.push(`${attempt.name}: ${cause?.message || cause}`);
    }
  }

  try { vision?.close?.(); } catch {}
  throw describeFailure("create", new Error(failures.join(" | ")));
}
