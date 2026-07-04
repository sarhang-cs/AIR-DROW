/**
 * Video-frame aware scheduler for synchronous MediaPipe hand inference.
 *
 * `detectForVideo()` is intentionally executed at most once for each usable
 * camera frame and never faster than the active tracking budget. Modern
 * Chromium uses requestVideoFrameCallback; older Android browsers safely fall
 * back to requestAnimationFrame while still rejecting duplicate media times.
 */
const defaultNow = () => (globalThis.performance?.now?.() ?? Date.now());

export function createHandFrameScheduler({
  getMinInterval = () => 1000 / 24,
  now = defaultNow,
  requestAnimationFrameFn = callback => globalThis.requestAnimationFrame(callback),
  cancelAnimationFrameFn = id => globalThis.cancelAnimationFrame(id)
} = {}) {
  let running = false;
  let video = null;
  let onFrame = null;
  let rafId = 0;
  let videoFrameId = 0;
  let lastMediaTime = Number.NaN;
  let lastProcessedAt = -Infinity;
  let source = "idle";

  function clearScheduledWork() {
    if (rafId) {
      cancelAnimationFrameFn(rafId);
      rafId = 0;
    }
    if (videoFrameId && typeof video?.cancelVideoFrameCallback === "function") {
      try { video.cancelVideoFrameCallback(videoFrameId); } catch {}
      videoFrameId = 0;
    }
  }

  function eligible(timestamp, mediaTime) {
    if (!running || !video || typeof onFrame !== "function") return false;
    if (Number(video.readyState || 0) < 2) return false;
    const interval = Math.max(8, Number(getMinInterval?.() || 0));
    if (timestamp - lastProcessedAt < interval) return false;
    if (Number.isFinite(mediaTime) && mediaTime === lastMediaTime) return false;
    return true;
  }

  function dispatch(timestamp, mediaTime, mode) {
    if (!eligible(timestamp, mediaTime)) return false;
    lastProcessedAt = timestamp;
    if (Number.isFinite(mediaTime)) lastMediaTime = mediaTime;
    onFrame({ now: timestamp, mediaTime, source: mode });
    return true;
  }

  function scheduleVideoFrame() {
    if (!running || !video) return;
    if (typeof video.requestVideoFrameCallback !== "function") {
      scheduleAnimationFrame();
      return;
    }
    source = "video-frame";
    videoFrameId = video.requestVideoFrameCallback((timestamp, metadata = {}) => {
      videoFrameId = 0;
      if (!running) return;
      const frameTime = Number.isFinite(Number(timestamp)) ? Number(timestamp) : now();
      dispatch(frameTime, Number(metadata.mediaTime), "video-frame");
      scheduleVideoFrame();
    });
  }

  function scheduleAnimationFrame() {
    if (!running) return;
    source = "animation-frame";
    rafId = requestAnimationFrameFn(timestamp => {
      rafId = 0;
      if (!running) return;
      const mediaTime = Number(video?.currentTime);
      const frameTime = Number.isFinite(Number(timestamp)) ? Number(timestamp) : now();
      dispatch(frameTime, mediaTime, "animation-frame");
      scheduleAnimationFrame();
    });
  }

  function start(nextVideo, nextOnFrame) {
    stop();
    video = nextVideo || null;
    onFrame = nextOnFrame;
    running = Boolean(video && typeof onFrame === "function");
    lastMediaTime = Number.NaN;
    lastProcessedAt = -Infinity;
    if (!running) return false;
    scheduleVideoFrame();
    return true;
  }

  function stop() {
    running = false;
    clearScheduledWork();
    source = "idle";
  }

  function reset() {
    lastMediaTime = Number.NaN;
    lastProcessedAt = -Infinity;
  }

  function snapshot() {
    return { running, source, lastMediaTime, lastProcessedAt };
  }

  return { start, stop, reset, snapshot };
}
