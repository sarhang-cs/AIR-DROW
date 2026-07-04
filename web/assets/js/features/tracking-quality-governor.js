/**
 * Small adaptive controller for synchronous browser hand tracking.
 *
 * It changes only the inference cadence. It never changes drawing data,
 * forces a download, or restarts the camera while a stroke is active.
 */
const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

export function createTrackingQualityGovernor({ floorFps = 12 } = {}) {
  let effectiveFps = 0;
  let lowSamples = 0;
  let highSamples = 0;
  let degraded = false;
  let captureReductionRequested = false;

  function reset() {
    effectiveFps = 0;
    lowSamples = 0;
    highSamples = 0;
    degraded = false;
    captureReductionRequested = false;
  }

  function observe({ configured = 24, measured = 0, inferenceMs = 0, mode = "auto", drawing = false } = {}) {
    const requested = clamp(configured, floorFps, 30);
    if (mode === "max") {
      effectiveFps = requested;
      lowSamples = 0;
      highSamples = 0;
      return { effectiveFps, degraded: false, requestCaptureReduction: false };
    }

    const slow = (Number(measured) > 0 && measured < requested * .62) || Number(inferenceMs) > 88;
    const healthy = Number(measured) >= requested * .84 && Number(inferenceMs) > 0 && Number(inferenceMs) < 48;

    if (slow) {
      lowSamples += 1;
      highSamples = 0;
    } else if (healthy) {
      highSamples += 1;
      lowSamples = 0;
    } else {
      lowSamples = 0;
      highSamples = 0;
    }

    if (lowSamples >= 2) {
      lowSamples = 0;
      const basedOnMeasurement = Number(measured) > 0 ? Math.floor(measured + 1) : requested - 3;
      effectiveFps = clamp(Math.min(requested, basedOnMeasurement), floorFps, requested);
      degraded = effectiveFps < requested;
      if (degraded && !drawing && !captureReductionRequested) captureReductionRequested = true;
    } else if (highSamples >= 3 && effectiveFps > 0 && effectiveFps < requested) {
      highSamples = 0;
      effectiveFps = Math.min(requested, effectiveFps + 2);
      degraded = effectiveFps < requested;
    }

    if (!effectiveFps) effectiveFps = requested;
    const requestCaptureReduction = captureReductionRequested && !drawing;
    if (requestCaptureReduction) captureReductionRequested = false;
    return { effectiveFps, degraded, requestCaptureReduction };
  }

  return { reset, observe, snapshot: () => ({ effectiveFps, lowSamples, highSamples, degraded }) };
}
