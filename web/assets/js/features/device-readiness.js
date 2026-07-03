/**
 * AIR-DROW App Readiness
 *
 * A local, non-invasive status view. It never opens the camera, asks for
 * camera permission, enumerates devices or sends a report anywhere.
 */
const TIMEOUT_MS = 4200;

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
    const total = lastResults.length;
    if (score) score.textContent = total ? `${ready}/${total}` : "—";
    if (!running && status && total) {
      status.textContent = ready === total
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
      checkLocalModel(), checkStorage(), checkPwa(), Promise.resolve(tryGraphics()), checkNetwork()
    ]);
    lastResults = [
      { key: "Secure", ...secure },
      { key: "CameraApi", ...camera },
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
