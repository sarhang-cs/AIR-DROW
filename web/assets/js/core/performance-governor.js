const VALID_MODES = new Set(["auto", "battery", "balanced", "max"]);

function normalizeMode(mode) {
  return VALID_MODES.has(mode) ? mode : "auto";
}

function connectionPenalty() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!connection) return 0;
  if (connection.saveData) return 0.5;
  if (["slow-2g", "2g"].includes(String(connection.effectiveType || ""))) return 0.25;
  return 0;
}

function autoCap() {
  const memory = Number(navigator.deviceMemory || 0);
  const cores = Number(navigator.hardwareConcurrency || 0);
  let cap = 1.5;
  if ((memory > 0 && memory <= 2) || (cores > 0 && cores <= 4)) cap = 1.25;
  if (memory >= 8 && cores >= 8) cap = 2;
  return Math.max(1, cap - connectionPenalty());
}

function modeCap(mode) {
  if (mode === "battery") return 1;
  if (mode === "balanced") return 1.5;
  if (mode === "max") return 2;
  return autoCap();
}

function roundCap(value) {
  return Math.max(1, Math.min(2, Math.round(value * 4) / 4));
}

/**
 * Keeps canvas density proportional to actual mobile capacity while preserving
 * the user's selected quality mode. It never changes drawing data, strokes,
 * brush settings or exports; it only controls display work on the live canvas.
 */
export function createPerformanceGovernor({ mode = "auto" } = {}) {
  let selectedMode = normalizeMode(mode);
  let adaptivePenalty = 0;
  let lowSamples = 0;
  let highSamples = 0;
  let cap = roundCap(modeCap(selectedMode));

  function recompute() {
    const next = roundCap(Math.max(1, modeCap(selectedMode) - adaptivePenalty));
    const changed = next !== cap;
    cap = next;
    return changed;
  }

  function setMode(nextMode) {
    const normalized = normalizeMode(nextMode);
    const modeChanged = normalized !== selectedMode;
    selectedMode = normalized;
    if (modeChanged) {
      adaptivePenalty = 0;
      lowSamples = 0;
      highSamples = 0;
    }
    return recompute();
  }

  function refreshEnvironment() {
    if (selectedMode !== "auto") return false;
    return recompute();
  }

  function observeRuntimeFps(fps) {
    if (selectedMode !== "auto" || !Number.isFinite(fps) || fps < 1) return false;

    if (fps < 38) {
      lowSamples += 1;
      highSamples = 0;
    } else if (fps >= 55) {
      highSamples += 1;
      lowSamples = 0;
    } else {
      lowSamples = 0;
      highSamples = 0;
    }

    if (lowSamples >= 3) {
      lowSamples = 0;
      adaptivePenalty = Math.min(0.75, adaptivePenalty + 0.25);
      return recompute();
    }

    if (highSamples >= 4 && adaptivePenalty > 0) {
      highSamples = 0;
      adaptivePenalty = Math.max(0, adaptivePenalty - 0.25);
      return recompute();
    }

    return false;
  }

  function canvasDpr(devicePixelRatio = 1) {
    const device = Math.max(1, Number(devicePixelRatio) || 1);
    return Math.min(device, cap);
  }

  function snapshot(devicePixelRatio = 1) {
    return {
      mode: selectedMode,
      cap,
      devicePixelRatio: Math.max(1, Number(devicePixelRatio) || 1),
      effectiveDpr: canvasDpr(devicePixelRatio),
      adaptive: selectedMode === "auto"
    };
  }

  return { setMode, refreshEnvironment, observeRuntimeFps, canvasDpr, snapshot };
}
