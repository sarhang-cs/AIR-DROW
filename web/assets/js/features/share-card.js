import { drawStrokeWithBrush } from "./brush-lab.js";
import { canvasFont, ensureKurdishFont, setCanvasTextDirection, shouldUseKurdishTypography } from "../core/font-kit.js";

function safeName(value) { return String(value || "air-drow").trim().toLowerCase().replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "air-drow"; }
function download(blob, filename) { const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1500); }
function canvasBlob(canvas, type = "image/png") { return new Promise(resolve => canvas.toBlob(resolve, type)); }
function rounded(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

function renderCard({ strokes = [], title = "AIR-DROW", background = "#080913", accent = "#9be7ff", language = "" } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  const useKurdish = shouldUseKurdishTypography({ language, title });
  setCanvasTextDirection(ctx, useKurdish);
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, background); gradient.addColorStop(1, "#02030a");
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const glow = ctx.createRadialGradient(170, 220, 0, 170, 220, 900);
  glow.addColorStop(0, "rgba(166,130,255,.30)"); glow.addColorStop(.48, "rgba(80,219,255,.08)"); glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,.72)"; ctx.font = canvasFont(700, 27, useKurdish); ctx.fillText("MADE WITH AIR-DROW", 540, 148);
  ctx.fillStyle = "#ffffff"; ctx.font = canvasFont(800, 54, useKurdish); ctx.fillText(String(title).slice(0, 32), 540, 215);
  const frame = { x: 70, y: 310, width: 940, height: 1090 };
  ctx.save();
  ctx.shadowColor = accent; ctx.shadowBlur = 52;
  ctx.fillStyle = "rgba(255,255,255,.04)"; ctx.strokeStyle = "rgba(230,244,255,.28)"; ctx.lineWidth = 3;
  rounded(ctx, frame.x, frame.y, frame.width, frame.height, 48); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.save(); rounded(ctx, frame.x, frame.y, frame.width, frame.height, 48); ctx.clip(); ctx.translate(frame.x, frame.y);
  for (const stroke of strokes) drawStrokeWithBrush(ctx, stroke, frame.width, frame.height);
  ctx.restore();
  ctx.fillStyle = "rgba(210,234,255,.84)"; ctx.font = canvasFont(700, 31, useKurdish); ctx.fillText("DRAW · CREATE · SHARE", 540, 1600);
  ctx.fillStyle = accent; ctx.font = canvasFont(800, 44, useKurdish); ctx.fillText("AIR-DROW", 540, 1680);
  ctx.fillStyle = "rgba(255,255,255,.56)"; ctx.font = canvasFont(600, 24, useKurdish); ctx.fillText("Create your moment in the air", 540, 1740);
  return canvas;
}

export function createShareCardStudio() {
  async function createStoryCard(options = {}) {
    if (shouldUseKurdishTypography(options)) await ensureKurdishFont();
    const canvas = renderCard(options);
    const blob = await canvasBlob(canvas);
    if (!blob) throw new Error("Creator card could not be created");
    return { blob, filename: `${safeName(options.title)}-story-card.png` };
  }
  function downloadCard(card) { download(card.blob, card.filename); }
  async function shareCard(card) {
    const file = new File([card.blob], card.filename, { type: "image/png" });
    const payload = { title: "AIR-DROW", text: "Made with AIR-DROW", files: [file] };
    if (navigator.share && (!navigator.canShare || navigator.canShare(payload))) { await navigator.share(payload); return true; }
    downloadCard(card); return false;
  }
  return { createStoryCard, downloadCard, shareCard };
}
