/**
 * AIR-DROW Feature Check
 *
 * A local, non-destructive validation pass for features that are otherwise
 * difficult to verify without using a real drawing or downloading a file.
 * It never opens the camera, never asks for permission, never sends data,
 * and deletes its one private project-storage probe before it returns.
 */
const TIMEOUT_MS = 4200;

export const FEATURE_VALIDATION_CHECK_IDS = Object.freeze([
  "ProjectStorage", "RasterExport", "WebP", "VectorFiles", "ShareRoute", "PwaOffline", "LegacyRuntime"
]);

export function summarizeFeatureValidation(results = []) {
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

function tempCanvas() {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 24; canvas.height = 24;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.fillStyle = "#0b1020"; context.fillRect(0, 0, 24, 24);
    context.strokeStyle = "#7fd8ff"; context.lineWidth = 3;
    context.beginPath(); context.moveTo(3, 20); context.lineTo(21, 4); context.stroke();
    return canvas;
  } catch { return null; }
}

function toBlob(canvas, type, quality = .92) {
  if (!canvas || typeof canvas.toBlob !== "function") return Promise.resolve(null);
  return new Promise(resolve => {
    try { canvas.toBlob(blob => resolve(blob || null), type, quality); }
    catch { resolve(null); }
  });
}

function validBlob(blob, type) {
  return Boolean(blob?.size > 0 && String(blob.type || "").toLowerCase() === type);
}

async function checkProjectStorage(projectStore) {
  if (!projectStore?.probeIntegrity) return { state: "limited", detail: "" };
  const probe = await withTimeout(projectStore.probeIntegrity(), { ok: false });
  return probe?.ok ? { state: "ready", detail: probe.fallback ? "fallback" : "" } : { state: "limited", detail: "" };
}

async function checkRasterExport() {
  const canvas = tempCanvas();
  if (!canvas) return { state: "limited", detail: "" };
  const [png, jpeg] = await Promise.all([toBlob(canvas, "image/png"), toBlob(canvas, "image/jpeg", .9)]);
  return validBlob(png, "image/png") && validBlob(jpeg, "image/jpeg") ? { state: "ready", detail: "" } : { state: "limited", detail: "" };
}

async function checkWebp() {
  const canvas = tempCanvas();
  if (!canvas) return { state: "limited", detail: "" };
  const webp = await toBlob(canvas, "image/webp", .9);
  return validBlob(webp, "image/webp") ? { state: "ready", detail: "" } : { state: "limited", detail: "" };
}

function checkVectorFiles() {
  try {
    const svg = new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><path d="M0 0h1"/></svg>`], { type: "image/svg+xml;charset=utf-8" });
    const pdf = new Blob(["%PDF-1.4\n% AIR-DROW probe\n"], { type: "application/pdf" });
    return svg.size > 0 && pdf.size > 0 ? { state: "ready", detail: "" } : { state: "limited", detail: "" };
  } catch { return { state: "limited", detail: "" }; }
}

function checkShareRoute() {
  try {
    const canSave = typeof Blob === "function" && typeof URL?.createObjectURL === "function" && "download" in document.createElement("a");
    if (!canSave) return { state: "limited", detail: "" };
    const blob = new Blob(["AIR-DROW"], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    URL.revokeObjectURL(url);
    // Web Share is optional. File saving remains the supported fallback.
    return { state: "ready", detail: navigator.share ? "share" : "save" };
  } catch { return { state: "limited", detail: "" }; }
}

async function checkPwaOffline() {
  if (!("serviceWorker" in navigator) || !("caches" in window)) return { state: "limited", detail: "" };
  try {
    const registration = await withTimeout(navigator.serviceWorker.getRegistration(), null);
    return registration ? { state: "ready", detail: "" } : { state: "limited", detail: "" };
  } catch { return { state: "limited", detail: "" }; }
}

function checkLegacyRuntime() {
  try {
    const ready = typeof Promise === "function" && typeof URL === "function" && typeof Blob === "function" && typeof WebAssembly === "object" && typeof TextEncoder === "function";
    return ready ? { state: "ready", detail: "" } : { state: "limited", detail: "" };
  } catch { return { state: "limited", detail: "" }; }
}

export function createFeatureValidation({ status, score, list, getCopy, release, projectStore } = {}) {
  let lastResults = [];
  let running = false;
  const copy = (key, fallback) => getCopy?.(key, fallback) || fallback;
  const label = key => copy(`featureQa${key}`, key);
  const stateLabel = state => copy(`featureQaStatus${state[0].toUpperCase()}${state.slice(1)}`, state);

  function render() {
    if (!list) return;
    list.replaceChildren();
    for (const item of lastResults) {
      const row = document.createElement("li");
      row.dataset.state = item.state;
      const title = document.createElement("span"); title.textContent = label(item.key);
      const value = document.createElement("b");
      const suffix = item.detail ? ` · ${copy(`featureQaDetail${item.detail[0].toUpperCase()}${item.detail.slice(1)}`, item.detail)}` : "";
      value.textContent = `${stateLabel(item.state)}${suffix}`;
      row.append(title, value); list.append(row);
    }
    const summary = summarizeFeatureValidation(lastResults);
    if (score) score.textContent = summary.total ? `${summary.ready}/${summary.total}` : "—";
    if (!running && status && summary.total) status.textContent = summary.complete
      ? copy("featureQaAllReady", "All feature routes are ready on this device")
      : copy("featureQaNeedsAttention", "Some optional browser routes are limited");
  }

  async function run() {
    if (running) return lastResults;
    running = true;
    if (status) status.textContent = copy("featureQaRunning", "Checking feature routes…");
    if (score) score.textContent = "…";
    const results = await Promise.all([
      checkProjectStorage(projectStore),
      checkRasterExport(),
      checkWebp(),
      Promise.resolve(checkVectorFiles()),
      Promise.resolve(checkShareRoute()),
      checkPwaOffline(),
      Promise.resolve(checkLegacyRuntime())
    ]);
    lastResults = FEATURE_VALIDATION_CHECK_IDS.map((key, index) => ({ key, ...results[index] }));
    running = false; render();
    return lastResults;
  }

  function report() {
    const header = `AIR-DROW · ${copy("featureQaReportTitle", "Feature check")} · v${release?.version || ""}`.trim();
    const body = lastResults.map(item => `${label(item.key)}: ${stateLabel(item.state)}${item.detail ? ` (${item.detail})` : ""}`).join("\n");
    return `${header}\n${body}`.trim();
  }

  async function copyReport() {
    if (!lastResults.length) await run();
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(report());
      if (status) status.textContent = copy("featureQaCopied", "Feature check result copied on this device");
      return true;
    } catch {
      if (status) status.textContent = copy("featureQaCopyFailed", "Copy is unavailable in this browser");
      return false;
    }
  }
  return { run, render, copyReport, report };
}
