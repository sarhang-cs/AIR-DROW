/**
 * AIR-DROW Camera & Hand Check
 *
 * Passive local state report for the master release. This module does not call
 * getUserMedia(), does not enumerate devices and does not transmit telemetry.
 * Camera and hand rows only become ready after the creator uses the existing
 * Camera control and the running app exposes active state through getRuntime.
 */
const RECENT_HAND_MS = 2400;

function text(copy, key, fallback) {
  return copy?.(key, fallback) || fallback;
}

function stateLabel(copy, state) {
  return text(copy, `finalLiveQaStatus${state[0].toUpperCase()}${state.slice(1)}`, state);
}

function copyReportToClipboard(value) {
  if (!navigator.clipboard?.writeText) return Promise.reject(new Error("Clipboard unavailable"));
  return navigator.clipboard.writeText(value);
}

export function createFinalLiveQa({ status, score, list, getCopy, release, getRuntime }) {
  let lastResults = [];
  let running = false;
  const copy = (key, fallback) => text(getCopy, key, fallback);
  const label = key => copy(`finalLiveQa${key}`, key);

  function render() {
    if (!list) return;
    list.replaceChildren();
    for (const item of lastResults) {
      const row = document.createElement("li");
      row.dataset.state = item.state;
      const title = document.createElement("span");
      title.textContent = label(item.key);
      const value = document.createElement("b");
      value.textContent = `${stateLabel(copy, item.state)}${item.detail ? ` · ${item.detail}` : ""}`;
      row.append(title, value);
      list.append(row);
    }
    const ready = lastResults.filter(item => item.state === "ready").length;
    const total = lastResults.length;
    if (score) score.textContent = total ? `${ready}/${total}` : "—";
    if (!running && status && total) {
      const pending = lastResults.filter(item => item.state === "pending").length;
      status.textContent = pending
        ? copy("finalLiveQaSummaryPending", "{ready}/{total} checks ready · {pending} waiting for your live camera test")
          .replace("{ready}", String(ready)).replace("{total}", String(total)).replace("{pending}", String(pending))
        : copy("finalLiveQaSummary", "{ready}/{total} checks ready")
          .replace("{ready}", String(ready)).replace("{total}", String(total));
    }
  }

  async function run() {
    if (running) return lastResults;
    running = true;
    if (status) status.textContent = copy("finalLiveQaRunning", "Reading final runtime state…");
    if (score) score.textContent = "…";
    const runtime = getRuntime?.() || {};
    const now = Date.now();
    const cameraReady = Boolean(runtime.cameraActive && runtime.cameraFrameReady);
    const engineReady = Boolean(runtime.handEngineReady);
    const handRecent = Number(runtime.handDetectedAt || 0) > 0 && now - Number(runtime.handDetectedAt) <= RECENT_HAND_MS;
    lastResults = [
      { key: "Release", state: release?.version && release?.buildId ? "ready" : "unavailable", detail: release?.version ? `v${release.version}` : "metadata" },
      { key: "Canvas", state: runtime.canvasReady ? "ready" : "unavailable", detail: runtime.canvasReady ? "interactive" : "not ready" },
      { key: "Project", state: runtime.hasLocalProject ? "ready" : "limited", detail: runtime.lastSavedAt ? "saved locally" : "local session" },
      { key: "Camera", state: cameraReady ? "ready" : "pending", detail: cameraReady ? "live frame" : copy("finalLiveQaCameraPending", "open camera to test") },
      { key: "HandEngine", state: cameraReady ? (engineReady ? "ready" : "limited") : "pending", detail: cameraReady ? (engineReady ? (runtime.handDelegate || "local") : "loading") : copy("finalLiveQaEnginePending", "starts after camera") },
      { key: "HandDetection", state: handRecent ? "ready" : "pending", detail: handRecent ? `${Math.round(Number(runtime.handFps || 0))} FPS` : copy("finalLiveQaHandPending", "show one hand in frame") }
    ];
    running = false;
    render();
    return lastResults;
  }

  function report() {
    const header = `AIR-DROW · ${copy("cameraHandCheckReportTitle", "Camera & Hand Check")} · v${release?.version || ""}`.trim();
    const body = lastResults.map(item => `${label(item.key)}: ${stateLabel(copy, item.state)}${item.detail ? ` (${item.detail})` : ""}`).join("\n");
    const footer = copy("finalLiveQaReportPrivacy", "Passive local report — no camera was opened and no data was transmitted by this check.");
    return `${header}\n${body}\n${footer}`.trim();
  }

  async function copyReport() {
    if (!lastResults.length) await run();
    try {
      await copyReportToClipboard(report());
      if (status) status.textContent = copy("finalLiveQaCopied", "Final QA report copied locally");
      return true;
    } catch {
      if (status) status.textContent = copy("finalLiveQaCopyFailed", "Copy is unavailable in this browser");
      return false;
    }
  }

  return { run, render, report, copyReport };
}
