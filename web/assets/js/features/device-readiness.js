/**
 * AIR-DROW Device Readiness
 *
 * This module is intentionally non-invasive. It never calls getUserMedia(),
 * never enumerates input devices and never sends telemetry. It only checks
 * browser APIs and AIR-DROW same-origin runtime assets that are already part
 * of the deployed app.
 */
const TIMEOUT_MS = 4200;

function withTimeout(promise, fallback) {
  let timer = 0;
  return Promise.race([
    Promise.resolve(promise),
    new Promise(resolve => { timer = setTimeout(() => resolve(fallback), TIMEOUT_MS); })
  ]).finally(() => clearTimeout(timer));
}

function formatBytes(bytes = 0) {
  const value = Number(bytes) || 0;
  if (!value) return "";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function tryGraphics() {
  try {
    const canvas = document.createElement("canvas");
    const webgl2 = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    if (webgl2) return { state: "ready", detail: "WebGL 2" };
    const webgl = canvas.getContext("webgl", { failIfMajorPerformanceCaveat: true });
    return webgl ? { state: "limited", detail: "WebGL" } : { state: "unavailable", detail: "—" };
  } catch {
    return { state: "unavailable", detail: "—" };
  }
}

async function checkLocalModel() {
  const url = new URL("../../../vendor/models/hand_landmarker.task", import.meta.url);
  try {
    const response = await withTimeout(fetch(url, { method: "HEAD", cache: "no-store" }), null);
    if (!response) return { state: "limited", detail: "timeout" };
    const length = formatBytes(response.headers.get("content-length"));
    return response.ok
      ? { state: "ready", detail: length || "same-origin" }
      : { state: "unavailable", detail: String(response.status) };
  } catch {
    return { state: "limited", detail: "offline cache" };
  }
}

async function checkStorage() {
  try {
    const estimate = await navigator.storage?.estimate?.();
    const persisted = await navigator.storage?.persisted?.();
    const detail = estimate?.quota ? `${formatBytes(estimate.usage)} / ${formatBytes(estimate.quota)}` : "local storage";
    return { state: persisted === false ? "limited" : "ready", detail };
  } catch {
    return { state: "limited", detail: "browser-managed" };
  }
}

function checkPwa() {
  if (!("serviceWorker" in navigator)) return { state: "limited", detail: "unsupported" };
  return navigator.serviceWorker.controller
    ? { state: "ready", detail: "active" }
    : { state: "limited", detail: "installing" };
}

function checkNetwork() {
  return navigator.onLine
    ? { state: "ready", detail: "online" }
    : { state: "limited", detail: "offline" };
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
    const ready = lastResults.filter(item => item.state === "ready").length;
    if (score) score.textContent = lastResults.length ? `${ready}/${lastResults.length}` : "—";
    if (!running && status && lastResults.length) status.textContent = copy("deviceReadinessSummary", "{ready}/{total} checks ready")
      .replace("{ready}", String(ready)).replace("{total}", String(lastResults.length));
  }

  async function run({ silent = false } = {}) {
    if (running) return lastResults;
    running = true;
    if (status) status.textContent = copy("deviceReadinessRunning", "Checking device readiness…");
    if (score) score.textContent = "…";
    const secure = window.isSecureContext
      ? { state: "ready", detail: location.protocol.replace(":", "") }
      : { state: "unavailable", detail: location.protocol.replace(":", "") || "insecure" };
    const cameraApi = navigator.mediaDevices?.getUserMedia
      ? { state: "ready", detail: "API available" }
      : { state: "unavailable", detail: "API unavailable" };
    const core = await Promise.all([
      checkLocalModel(), checkStorage(), Promise.resolve(checkPwa()), Promise.resolve(tryGraphics()), Promise.resolve(checkNetwork())
    ]);
    lastResults = [
      { key: "Secure", ...secure },
      { key: "CameraApi", ...cameraApi },
      { key: "LocalModel", ...core[0] },
      { key: "Storage", ...core[1] },
      { key: "Pwa", ...core[2] },
      { key: "Gpu", ...core[3] },
      { key: "Network", ...core[4] }
    ];
    running = false;
    render();
    return lastResults;
  }

  function report() {
    const header = `AIR-DROW · ${copy("appCheckReportTitle", "App Check")} · v${release?.version || ""}`.trim();
    const body = lastResults.map(item => `${label(item.key)}: ${stateLabel(item.state)}${item.detail ? ` (${item.detail})` : ""}`).join("\n");
    return `${header}\n${body}`.trim();
  }

  async function copyReport() {
    if (!lastResults.length) await run();
    const text = report();
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      if (status) status.textContent = copy("deviceReadinessCopied", "Device report copied locally");
      return true;
    } catch {
      if (status) status.textContent = copy("deviceReadinessCopyFailed", "Copy is unavailable in this browser");
      return false;
    }
  }

  return { run, render, copyReport, report };
}
