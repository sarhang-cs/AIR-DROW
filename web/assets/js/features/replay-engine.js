import { lastItem } from "../core/legacy-compat.js";
import { drawStrokeWithBrush } from "./brush-lab.js";
import { canvasFont, ensureKurdishFont, setCanvasTextDirection, shouldUseKurdishTypography } from "../core/font-kit.js";

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function safeName(value) {
  return String(value || "air-drow").trim().toLowerCase().replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "air-drow";
}
function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function supportedMimeType() {
  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  return candidates.find(type => globalThis.MediaRecorder?.isTypeSupported?.(type)) || "";
}
function partialStrokes(strokes, progress) {
  const clean = (strokes || []).filter(stroke => Array.isArray(stroke?.points) && stroke.points.length);
  const total = clean.reduce((sum, stroke) => sum + Math.max(1, stroke.points.length), 0);
  let quota = Math.max(0, Math.ceil(total * clamp(progress, 0, 1)));
  const visible = [];
  let cursor = null;
  for (const stroke of clean) {
    const take = Math.min(stroke.points.length, quota);
    if (take > 0) {
      const points = stroke.points.slice(0, take);
      visible.push({ ...stroke, points });
      cursor = lastItem(points) || cursor;
    }
    quota -= take;
    if (quota <= 0) break;
  }
  return { visible, cursor };
}
function drawBackground(ctx, width, height, background) {
  const base = background || "#080913";
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, base);
  gradient.addColorStop(1, "#02030a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  const bloom = ctx.createRadialGradient(width * .18, height * .12, 1, width * .18, height * .12, width * .82);
  bloom.addColorStop(0, "rgba(162,124,255,.18)");
  bloom.addColorStop(.46, "rgba(81,190,255,.06)");
  bloom.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.globalAlpha = .07;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 42) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
  for (let y = 0; y < height; y += 42) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
  ctx.restore();
}
function drawBrand(ctx, width, height, title, progress, branded, useKurdish = false) {
  if (!branded) return;
  const alpha = clamp(progress * 7, 0, 1) * clamp((1 - progress) * 9 + .45, 0, 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  setCanvasTextDirection(ctx, useKurdish);
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,.68)";
  ctx.font = canvasFont(700, Math.round(width * .023), useKurdish);
  ctx.fillText("MADE WITH AIR-DROW", width / 2, height * .075);
  ctx.fillStyle = "#ffffff";
  ctx.font = canvasFont(800, Math.round(width * .047), useKurdish);
  ctx.fillText(String(title || "AIR-DROW").slice(0, 34), width / 2, height * .115);
  ctx.font = canvasFont(700, Math.round(width * .021), useKurdish);
  ctx.fillStyle = "rgba(210,232,255,.82)";
  ctx.fillText("DRAW · CREATE · SHARE", width / 2, height * .92);
  ctx.restore();
}
function drawCursor(ctx, point, x, y, width, height, progress) {
  if (!point) return;
  const px = x + point.x * width, py = y + point.y * height;
  const pulse = 1 + Math.sin(progress * Math.PI * 18) * .16;
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(pulse, pulse);
  ctx.shadowColor = "#9be7ff";
  ctx.shadowBlur = 18;
  ctx.strokeStyle = "rgba(255,255,255,.95)";
  ctx.fillStyle = "rgba(99,214,255,.92)";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.globalAlpha = .62;
  ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
function renderFrame(canvas, { strokes, title, progress, branded, background, useKurdish }) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width, height = canvas.height;
  drawBackground(ctx, width, height, background);
  drawBrand(ctx, width, height, title, progress, branded, useKurdish);
  const frame = { x: Math.round(width * .075), y: Math.round(height * .18), width: Math.round(width * .85), height: Math.round(height * .63) };
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,.035)";
  ctx.strokeStyle = "rgba(213,237,255,.20)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(frame.x, frame.y, frame.width, frame.height, Math.round(width * .035));
  ctx.fill(); ctx.stroke();
  ctx.save();
  ctx.beginPath(); ctx.roundRect(frame.x, frame.y, frame.width, frame.height, Math.round(width * .035)); ctx.clip();
  const { visible, cursor } = partialStrokes(strokes, progress);
  ctx.translate(frame.x, frame.y);
  for (const stroke of visible) drawStrokeWithBrush(ctx, stroke, frame.width, frame.height);
  ctx.restore();
  const latest = partialStrokes(strokes, progress).cursor;
  drawCursor(ctx, latest, frame.x, frame.y, frame.width, frame.height, progress);
  ctx.restore();
  ctx.save();
  const barWidth = frame.width * .72;
  const bx = (width - barWidth) / 2, by = height * .86;
  ctx.fillStyle = "rgba(255,255,255,.14)";
  ctx.fillRect(bx, by, barWidth, 5);
  ctx.fillStyle = "#a7eaff";
  ctx.fillRect(bx, by, barWidth * progress, 5);
  ctx.restore();
}

export function createReplayStudio() {
  async function createReplay({ strokes, title = "AIR-DROW", duration = 6, branded = true, background = "#080913", language = "", onProgress = () => {} } = {}) {
    const readyStrokes = (strokes || []).filter(stroke => stroke?.points?.length);
    const useKurdish = shouldUseKurdishTypography({ language, title });
    if (useKurdish) await ensureKurdishFont();
    if (!readyStrokes.length) throw new Error("Draw something before creating a replay");
    if (!("MediaRecorder" in globalThis) || !(HTMLCanvasElement.prototype.captureStream)) {
      throw new Error("Replay video is not supported in this browser");
    }
    const fps = 30;
    const seconds = clamp(Number(duration) || 6, 3, 10);
    const frames = Math.max(1, Math.round(seconds * fps));
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 1280;
    const stream = canvas.captureStream(fps);
    const track = stream.getVideoTracks()[0];
    const mimeType = supportedMimeType();
    let recorder;
    try { recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 3_200_000 } : { videoBitsPerSecond: 3_200_000 }); }
    catch { recorder = new MediaRecorder(stream); }
    const chunks = [];
    const complete = new Promise((resolve, reject) => {
      recorder.addEventListener("dataavailable", event => { if (event.data?.size) chunks.push(event.data); });
      recorder.addEventListener("error", () => reject(recorder.error || new Error("Replay recording failed")), { once: true });
      recorder.addEventListener("stop", () => resolve(), { once: true });
    });
    recorder.start(120);
    try {
      for (let index = 0; index < frames; index += 1) {
        const progress = frames <= 1 ? 1 : index / (frames - 1);
        renderFrame(canvas, { strokes: readyStrokes, title, progress, branded, background, useKurdish });
        track?.requestFrame?.();
        onProgress(progress);
        await wait(1000 / fps);
      }
      await wait(80);
      recorder.stop();
      await complete;
    } finally {
      stream.getTracks().forEach(trackItem => trackItem.stop());
    }
    const type = recorder.mimeType || mimeType || "video/webm";
    const blob = new Blob(chunks, { type });
    if (!blob.size) throw new Error("Replay video could not be created");
    return { blob, filename: `${safeName(title)}-air-replay.webm` };
  }
  function downloadReplay(replay) { download(replay.blob, replay.filename); }
  async function shareReplay(replay) {
    const file = new File([replay.blob], replay.filename, { type: replay.blob.type || "video/webm" });
    const payload = { title: "AIR-DROW Replay", text: "Made with AIR-DROW", files: [file] };
    if (navigator.share && (!navigator.canShare || navigator.canShare(payload))) { await navigator.share(payload); return true; }
    downloadReplay(replay);
    return false;
  }
  return { createReplay, downloadReplay, shareReplay };
}
