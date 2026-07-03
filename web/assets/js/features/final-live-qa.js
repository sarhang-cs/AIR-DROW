/**
 * AIR-DROW Camera & Hand Check
 *
 * Passive local state reporting only. It never opens the camera, asks for
 * permission, enumerates devices or transmits information.
 */
const RECENT_HAND_MS = 2400;

function text(copy, key, fallback) { return copy?.(key, fallback) || fallback; }
function stateLabel(copy, state) { return text(copy, `finalLiveQaStatus${state[0].toUpperCase()}${state.slice(1)}`, state); }

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
    const cameraRow = lastResults.find(item => item.key === "Camera");
    const cameraStarted = cameraRow?.state === "ready";
    const ready = lastResults.filter(item => item.state === "ready").length;
    const total = lastResults.length;
    if (score) score.textContent = total && cameraStarted ? `${ready}/${total}` : "—";
    if (!running && status && total) {
      status.textContent = cameraStarted
        ? (ready === total ? copy("finalLiveQaAllReady", "Hand drawing is ready") : copy("finalLiveQaNeedsAttention", "Keep one hand clearly in the camera view"))
        : copy("finalLiveQaOpenCamera", "Open Camera when you want to check hand drawing");
    }
  }

  async function run() {
    if (running) return lastResults;
    running = true;
    if (status) status.textContent = copy("finalLiveQaRunning", "Checking camera and hand drawing…");
    if (score) score.textContent = "…";
    const runtime = getRuntime?.() || {};
    const now = Date.now();
    const cameraReady = Boolean(runtime.cameraActive && runtime.cameraFrameReady);
    const engineReady = Boolean(runtime.handEngineReady);
    const handRecent = Number(runtime.handDetectedAt || 0) > 0 && now - Number(runtime.handDetectedAt) <= RECENT_HAND_MS;
    lastResults = [
      { key: "Release", state: release?.version ? "ready" : "unavailable", detail: "" },
      { key: "Canvas", state: runtime.canvasReady ? "ready" : "limited", detail: "" },
      { key: "Project", state: runtime.hasLocalProject ? "ready" : "limited", detail: "" },
      { key: "Camera", state: cameraReady ? "ready" : "pending", detail: cameraReady ? "" : copy("finalLiveQaCameraPending", "Open Camera") },
      { key: "HandEngine", state: cameraReady ? (engineReady ? "ready" : "limited") : "pending", detail: cameraReady ? "" : copy("finalLiveQaEnginePending", "Open Camera") },
      { key: "HandDetection", state: handRecent ? "ready" : "pending", detail: handRecent ? "" : copy("finalLiveQaHandPending", "Show one hand") }
    ];
    running = false;
    render();
    return lastResults;
  }

  function report() {
    const header = `AIR-DROW · ${copy("cameraHandCheckReportTitle", "Camera & Hand Check")} · v${release?.version || ""}`.trim();
    const body = lastResults.map(item => `${label(item.key)}: ${stateLabel(copy, item.state)}${item.detail ? ` (${item.detail})` : ""}`).join("\n");
    return `${header}\n${body}`.trim();
  }

  async function copyReport() {
    if (!lastResults.length) await run();
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(report());
      if (status) status.textContent = copy("finalLiveQaCopied", "Camera and hand result copied on this device");
      return true;
    } catch {
      if (status) status.textContent = copy("finalLiveQaCopyFailed", "Copy is unavailable in this browser");
      return false;
    }
  }

  return { run, render, copyReport, report };
}
