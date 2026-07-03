import { canvasFont, ensureKurdishFont, setCanvasTextDirection, shouldUseKurdishTypography } from "../core/font-kit.js";

function safeFileBase(value) {
  return String(value || "air-drow").trim().toLowerCase().replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "air-drow";
}

function canvasToBlob(canvas, type = "image/png") {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Template image could not be created")), type, .95);
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1600);
}

function outputFor(template) {
  if (template === "story") return { width: 1080, height: 1920 };
  if (template === "logo") return { width: 1080, height: 1080 };
  return { width: 1080, height: 1350 };
}

function normalizeTemplate(value) {
  return ["poster", "hoodie", "story", "logo"].includes(value) ? value : "poster";
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function drawFallbackTemplate({ sourceCanvas, template, title, creator, tagline, background, accent, language, labels = {} }) {
  const normalized = normalizeTemplate(template);
  const { width, height } = outputFor(normalized);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const base = background || "#080913";
  const color = accent || "#9be7ff";
  const useKurdish = shouldUseKurdishTypography({ language, title, creator, tagline });
  setCanvasTextDirection(ctx, useKurdish);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, base);
  gradient.addColorStop(1, "#02040a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(width * .22, height * .16, 0, width * .22, height * .16, Math.max(width, height) * .8);
  glow.addColorStop(0, `${color}55`);
  glow.addColorStop(.6, `${color}10`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,255,255,.62)";
  ctx.font = canvasFont(700, 24, useKurdish);
  ctx.textAlign = useKurdish ? "right" : "left";
  ctx.fillText((creator || "AIR-DROW CREATOR").slice(0, 32), useKurdish ? width - 68 : 68, 76);
  ctx.textAlign = useKurdish ? "left" : "right";
  ctx.fillText(labels.creatorPack || "AIR-DROW / CREATOR PACK", useKurdish ? 68 : width - 68, 76);

  if (normalized === "hoodie") {
    ctx.fillStyle = "#11131d";
    drawRoundedRect(ctx, 120, 195, width - 240, height - 300, 44);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.14)";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(width * .34, 240); ctx.lineTo(width * .42, 145); ctx.lineTo(width * .58, 145); ctx.lineTo(width * .66, 240);
    ctx.stroke();
    ctx.drawImage(sourceCanvas, 230, 330, width - 460, width - 460);
    ctx.fillStyle = "rgba(255,255,255,.86)";
    ctx.textAlign = "center";
    ctx.font = canvasFont(900, 56, useKurdish);
    ctx.fillText((title || "AIR-DROW").slice(0, 26).toUpperCase(), width / 2, height - 120);
  } else {
    const artSize = normalized === "story" ? 860 : 780;
    const x = (width - artSize) / 2;
    const y = normalized === "story" ? 360 : 238;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 42;
    ctx.drawImage(sourceCanvas, x, y, artSize, artSize);
    ctx.restore();

    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = canvasFont(900, normalized === "logo" ? 66 : 78, useKurdish);
    ctx.fillText((title || "AIR-DROW").slice(0, 28).toUpperCase(), width / 2, normalized === "story" ? 1450 : 1120);
    ctx.fillStyle = "rgba(255,255,255,.7)";
    ctx.font = canvasFont(500, 28, useKurdish);
    const line = (tagline || (normalized === "logo" ? "AIR-DROW MARK" : (labels.defaultTagline || "DRAWN IN THE AIR"))).slice(0, 72);
    ctx.fillText(line, width / 2, normalized === "story" ? 1515 : 1175);
  }
  return canvas;
}

export function createTemplateStudio() {
  let worker = null;
  let sequence = 0;
  const pending = new Map();

  try {
    worker = new Worker(new URL("../workers/template-render.worker.js", import.meta.url), { type: "module" });
    worker.addEventListener("message", event => {
      const { id, blob, error } = event.data || {};
      const job = pending.get(id);
      if (!job) return;
      pending.delete(id);
      if (error) job.reject(new Error(error));
      else job.resolve(blob);
    });
    worker.addEventListener("error", error => {
      for (const job of pending.values()) job.reject(error);
      pending.clear();
      worker?.terminate();
      worker = null;
    });
  } catch {
    worker = null;
  }

  async function render(options = {}) {
    const template = normalizeTemplate(options.template);
    const title = String(options.title || "AIR-DROW").trim();
    const creator = String(options.creator || "AIR-DROW Creator").trim();
    const tagline = String(options.tagline || "").trim();
    const sourceCanvas = options.sourceCanvas;
    if (!sourceCanvas) throw new Error("A source canvas is required");
    const useKurdish = shouldUseKurdishTypography({ language: options.language, title, creator, tagline });
    if (useKurdish) await ensureKurdishFont();

    // Workers do not reliably inherit page-loaded web fonts. Kurdish renders on the
    // main thread so Creator Pack exports use the same Noto Kufi Arabic font as the UI.
    if (!worker || useKurdish) {
      const canvas = drawFallbackTemplate({ ...options, template, title, creator, tagline });
      const blob = await canvasToBlob(canvas);
      return { blob, filename: `${safeFileBase(title)}-${template}.png`, template };
    }

    try {
      const source = await canvasToBlob(sourceCanvas);
      const id = ++sequence;
      const blob = await new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        worker.postMessage({ id, source, template, title, creator, tagline, background: options.background || "#080913", accent: options.accent || "#9be7ff" });
      });
      return { blob, filename: `${safeFileBase(title)}-${template}.png`, template };
    } catch {
      const canvas = drawFallbackTemplate({ ...options, template, title, creator, tagline });
      const blob = await canvasToBlob(canvas);
      return { blob, filename: `${safeFileBase(title)}-${template}.png`, template };
    }
  }

  function download(result) {
    if (!result?.blob) throw new Error("Template result is missing");
    downloadBlob(result.blob, result.filename || "air-drow-template.png");
  }

  async function share(result) {
    if (!result?.blob) throw new Error("Template result is missing");
    const file = new File([result.blob], result.filename || "air-drow-template.png", { type: result.blob.type || "image/png" });
    const payload = { title: "AIR-DROW Creator Pack", text: "Created in AIR-DROW", files: [file] };
    if (navigator.share && (!navigator.canShare || navigator.canShare(payload))) {
      await navigator.share(payload);
      return true;
    }
    download(result);
    return false;
  }

  function destroy() {
    worker?.terminate();
    worker = null;
    pending.clear();
  }

  return { render, download, share, destroy };
}
