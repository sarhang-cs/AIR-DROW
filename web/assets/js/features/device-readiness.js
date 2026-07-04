/**
 * AIR-DROW App Readiness
 *
 * A local, non-invasive preflight for the current browser. It deliberately
 * never calls getUserMedia, never triggers a file download and never sends a
 * report. The raster checks draw a tiny temporary probe canvas only; project
 * artwork, camera frames and hand landmarks are not read.
 */
const TIMEOUT_MS = 4200;

export const READINESS_CHECK_IDS = Object.freeze([
  "Secure",
  "CameraApi",
  "LocalModel",
  "Storage",
  "Pwa",
  "Gpu",
  "Network",
  "Canvas",
  "RasterExport",
  "SaveRoute"
]);

export function summarizeReadiness(results = []) {
  const total = Array.isArray(results) ? results.length : 0;
  const ready = Array.isArray(results) ? results.filter(item => item?.state === "ready").length : 0;
  return { ready, total, complete: total > 0 && ready === total };
}

function withTimeout(promise, fallback) {
  let timer = 0;
  return Promise.race([
    Promise.resolve(promise),
    new Promise(resolve => { timer = setTimeout(() => resolve(fallback), TIMEOUT_MS); })
  ]).finally(() => clearTimeout(timer));
}

function tryGraphics() {
  try {
    const canvas = document.createElement("canvas");
    return canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true }) || canvas.getContext("webgl", { failIfMajorPerformanceCaveat: true })
      ? { state: "ready", detail: "" }
      : { state: "limited", detail: "" };
  } catch {
    return { state: "limited", detail: "" };
  }
}

function createProbeCanvas() {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.clearRect(0, 0, 16, 16);
    context.fillStyle = "#102030";
    context.fillRect(0, 0, 16, 16);
    context.fillStyle = "#f5f4ff";
    context.fillRect(2, 2, 12, 12);
    context.fillStyle = "#7fd8ff";
    context.fillRect(6, 6, 4, 4);
    return { canvas, context };
  } catch {
    return null;
  }
}

function probeContainsPaint(context) {
  try {
    const pixel = context.getImageData(8, 8, 1, 1).data;
    return pixel[3] > 0 && (pixel[0] !== 0 || pixel[1] !== 0 || pixel[2] !== 0);
  } catch {
    return false;
  }
}

function canvasToBlob(canvas, type, quality) {
  if (!canvas || typeof canvas.toBlob !== "function") return Promise.resolve(null);
  return new Promise(resolve => {
    try {
      canvas.toBlob(blob => resolve(blob || null), type, quality);
    } catch {
      resolve(null);
    }
  });
}

function mimeMatches(blob, expected) {
  return Boolean(blob?.size > 0 && String(blob.type || "").toLowerCase() === expected);
}

async function checkLocalModel() {
  const url = new URL("../../../vendor/models/hand_landmarker.task", import.meta.url);
  try {
    const response = await withTimeout(fetch(url, { method: "HEAD", cache: "no-store" }), null);
    return response?.ok ? { state: "ready", detail: "" } : { state: "limited", detail: "" };
  } catch {
    return { state: "limited", detail: "" };
  }
}

async function checkStorage() {
  const probeKey = `air-drow-storage-probe-${Date.now()}`;
  try {
    localStorage.setItem(probeKey, "1");
    const roundTrip = localStorage.getItem(probeKey) === "1";
    localStorage.removeItem(probeKey);
    if (!roundTrip) return { state: "limited", detail: "" };
    const estimate = await navigator.storage?.estimate?.();
    const usage = Number(estimate?.usage || 0);
    const quota = Number(estimate?.quota || 0);
    const nearlyFull = quota > 0 && usage / quota >= .88;
    return { state: nearlyFull ? "limited" : "ready", detail: "" };
  } catch {
    return { state: "limited", detail: "" };
  }
}

async function checkPwa() {
  if (!("serviceWorker" in navigator)) return { state: "limited", detail: "" };
  try {
    const registration = await withTimeout(navigator.serviceWorker.getRegistration(), null);
    return registration ? { state: "ready", detail: "" } : { state: "limited", detail: "" };
  } catch {
    return { state: "limited", detail: "" };
  }
}

async function checkNetwork() {
  if (!navigator.onLine) return { state: "limited", detail: "" };
  try {
    const url = new URL("../../../release.json", import.meta.url);
    url.searchParams.set("probe", Date.now().toString());
    const response = await withTimeout(fetch(url, { method: "HEAD", cache: "no-store", credentials: "same-origin" }), null);
    return response?.ok ? { state: "ready", detail: "" } : { state: "limited", detail: "" };
  } catch {
    return { state: "limited", detail: "" };
  }
}

async function checkCanvas() {
  const probe = createProbeCanvas();
  return probe && probeContainsPaint(probe.context)
    ? { state: "ready", detail: "" }
    : { state: "limited", detail: "" };
}

async function checkRasterExport() {
  const probe = createProbeCanvas();
  if (!probe || !probeContainsPaint(probe.context)) return { state: "limited", detail: "" };
  const [png, jpeg] = await Promise.all([
    withTimeout(canvasToBlob(probe.canvas, "image/png"), null),
    withTimeout(canvasToBlob(probe.canvas, "image/jpeg", .9), null)
  ]);
  return mimeMatches(png, "image/png") && mimeMatches(jpeg, "image/jpeg")
    ? { state: "ready", detail: "" }
    : { state: "limited", detail: "" };
}

function checkSaveRoute() {
  try {
    if (typeof Blob !== "function" || typeof URL?.createObjectURL !== "function") return { state: "limited", detail: "" };
    const blob = new Blob(["AIR-DROW launch validation"], { type: "text/plain" });
    const objectUrl = URL.createObjectURL(blob);
    if (!objectUrl) return { state: "limited", detail: "" };
    URL.revokeObjectURL(objectUrl);
    return { state: "ready", detail: "" };
  } catch {
    return { state: "limited", detail: "" };
  }
}

export function createDeviceReadiness({ status, score, list, getCopy, release }) {
  let lastResults = [];
  let running = false;

  const copy = (key, fallback) => getCopy?.(key, fallback) || fallback;
  const label = key => copy(`device${key}`, key);
  const stateLabel = value => copy(`deviceStatus${value[0].toUpperCase()}${value.slice(1)}`, value);

  function render() {
    if (!list) return;
    list.replaceChildren();
    for (const item of lastResults) {
      const row = document.createElement("li");
      row.dataset.state = item.state;
      const title = document.createElement("span");
      title.textContent = label(item.key);
      const value = document.createElement("b");
      value.textContent = `${stateLabel(item.state)}${item.detail ? ` · ${item.detail}` : ""}`;
      row.append(title, value);
      list.append(row);
    }
    const summary = summarizeReadiness(lastResults);
    if (score) score.textContent = summary.total ? `${summary.ready}/${summary.total}` : "—";
    if (!running && status && summary.total) {
      status.textContent = summary.complete
        ? copy("deviceReadinessAllReady", "Everything is ready on this device")
        : copy("deviceReadinessNeedsAttention", "Some features may need attention");
    }
  }

  async function run() {
    if (running) return lastResults;
    running = true;
    if (status) status.textContent = copy("deviceReadinessRunning", "Checking AIR-DROW…");
    if (score) score.textContent = "…";
    const secure = window.isSecureContext
      ? { state: "ready", detail: "" }
      : { state: "limited", detail: "" };
    const camera = navigator.mediaDevices?.getUserMedia
      ? { state: "ready", detail: "" }
      : { state: "limited", detail: "" };
    const core = await Promise.all([
      checkLocalModel(),
      checkStorage(),
      checkPwa(),
      Promise.resolve(tryGraphics()),
      checkNetwork(),
      checkCanvas(),
      checkRasterExport(),
      Promise.resolve(checkSaveRoute())
    ]);
    lastResults = [
      { key: "Secure", ...secure },
      { key: "CameraApi", ...camera },
      { key: "LocalModel", ...core[0] },
      { key: "Storage", ...core[1] },
      { key: "Pwa", ...core[2] },
      { key: "Gpu", ...core[3] },
      { key: "Network", ...core[4] },
      { key: "Canvas", ...core[5] },
      { key: "RasterExport", ...core[6] },
      { key: "SaveRoute", ...core[7] }
    ];
    running = false;
    render();
    return lastResults;
  }

  function report() {
    const header = `AIR-DROW · ${copy("appCheckReportTitle", "App readiness")} · v${release?.version || ""}`.trim();
    const body = lastResults.map(item => `${label(item.key)}: ${stateLabel(item.state)}`).join("\n");
    return `${header}\n${body}`.trim();
  }

  async function copyReport() {
    if (!lastResults.length) await run();
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(report());
      if (status) status.textContent = copy("deviceReadinessCopied", "App check result copied on this device");
      return true;
    } catch {
      if (status) status.textContent = copy("deviceReadinessCopyFailed", "Copy is unavailable in this browser");
      return false;
    }
  }

  return { run, render, copyReport, report };
}
