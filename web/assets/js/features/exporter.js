import { svgDefsForBrushes, svgMarkupForBrush } from "./brush-lab.js";

/**
 * Export Studio renderer.
 *
 * Drawings are stored in source-canvas normalized coordinates. The renderer
 * first maps that source canvas into a target layout, then draws the original
 * brush at that transform. Keeping the brush in the source coordinate space
 * is important: a 4× export scales the line, glow and particle size together
 * instead of leaving it thin against a larger image.
 */
const PRESETS = Object.freeze({
  square: Object.freeze({ width: 1080, height: 1080, label: "square" }),
  story: Object.freeze({ width: 1080, height: 1920, label: "story" }),
  widescreen: Object.freeze({ width: 1920, height: 1080, label: "widescreen" }),
  "a4-portrait": Object.freeze({ width: 2480, height: 3508, label: "a4" }),
  "a4-landscape": Object.freeze({ width: 3508, height: 2480, label: "a4" }),
  "a3-portrait": Object.freeze({ width: 3508, height: 4961, label: "a3" }),
  "a3-landscape": Object.freeze({ width: 4961, height: 3508, label: "a3" })
});

const OUTPUTS = Object.freeze({
  png: Object.freeze({ mime: "image/png", extension: "png", alpha: true }),
  jpg: Object.freeze({ mime: "image/jpeg", extension: "jpg", alpha: false }),
  webp: Object.freeze({ mime: "image/webp", extension: "webp", alpha: true })
});

export const EXPORT_LAYOUTS = Object.freeze(["fit", "fill", "stretch"]);
export const EXPORT_SCALES = Object.freeze([1, 2, 4]);
// Canvas memory rises with width × height × 4. This ceiling keeps large A3
// exports and 4× presets from exhausting Android WebViews; the plan reports
// the actual constrained output dimensions to the UI.
export const MAX_RASTER_PIXELS = 34_000_000;

function clamp(value, min, max) { return Math.min(max, Math.max(min, Number(value) || 0)); }
function finiteNumber(value, fallback = 0) { const number = Number(value); return Number.isFinite(number) ? number : fallback; }
function integer(value, fallback = 1) { return Math.max(1, Math.round(finiteNumber(value, fallback))); }

function safeFileBase(value) {
  return String(value || "air-drow")
    .trim()
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "air-drow";
}

function timestampForFilename(date = new Date()) {
  const safe = date.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  return safe.replace("T", "-");
}

function buildFilename(base, { preset = "current", width, height, extension }) {
  const label = preset === "current" ? "canvas" : String(preset).replace(/[^a-z0-9-]/gi, "-");
  return `${safeFileBase(base)}_${label}_${width}x${height}_${timestampForFilename()}.${extension}`;
}

function downloadBlob(blob, filename) {
  if (!(blob instanceof Blob) || !blob.size) throw new Error("The export file is empty");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  // Android browsers can finish the download after the current JavaScript task.
  window.setTimeout(() => URL.revokeObjectURL(url), 20_000);
}

function canvasToBlob(canvas, type, quality = .95) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("The browser could not encode this export")), type, quality);
    } catch (error) { reject(error); }
  });
}

function escapeXml(value) {
  return String(value).replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&apos;", '"': "&quot;"
  }[character]));
}
function normalizeColor(value) { const color = String(value || "#7fd8ff").trim(); return /^#[0-9a-f]{6}$/i.test(color) ? color : "#7fd8ff"; }
function hexToRgb(value) { const hex = normalizeColor(value).slice(1); return [0, 2, 4].map(index => Number.parseInt(hex.slice(index, index + 2), 16) / 255); }

function dimensionsFor(preset, current) {
  const safeWidth = integer(current?.width);
  const safeHeight = integer(current?.height);
  return PRESETS[preset] || { width: safeWidth, height: safeHeight, label: "current" };
}

/**
 * Resolve the complete source-to-output transform. This pure function is
 * also covered by the release QA script, so export layouts stay predictable.
 */
export function createExportPlan({ preset = "current", source, scale = 1, layout = "fit", maxSide = 0 } = {}) {
  const sourceWidth = integer(source?.width);
  const sourceHeight = integer(source?.height);
  const base = dimensionsFor(preset, { width: sourceWidth, height: sourceHeight });
  const requestedScale = EXPORT_SCALES.includes(Number(scale)) ? Number(scale) : 1;
  let multiplier = requestedScale;
  if (maxSide > 0) multiplier = Math.min(multiplier, Math.max(1 / Math.max(base.width, base.height), Number(maxSide) / Math.max(base.width, base.height)));
  const requestedPixels = base.width * multiplier * base.height * multiplier;
  if (requestedPixels > MAX_RASTER_PIXELS) multiplier *= Math.sqrt(MAX_RASTER_PIXELS / requestedPixels);
  const outputWidth = Math.max(1, Math.round(base.width * multiplier));
  const outputHeight = Math.max(1, Math.round(base.height * multiplier));
  const normalizedLayout = EXPORT_LAYOUTS.includes(layout) ? layout : "fit";

  let scaleX = outputWidth / sourceWidth;
  let scaleY = outputHeight / sourceHeight;
  if (normalizedLayout === "fit" || normalizedLayout === "fill") {
    const uniform = normalizedLayout === "fill" ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
    scaleX = uniform;
    scaleY = uniform;
  }
  const offsetX = (outputWidth - sourceWidth * scaleX) / 2;
  const offsetY = (outputHeight - sourceHeight * scaleY) / 2;
  return Object.freeze({
    preset: PRESETS[preset] ? preset : "current",
    requestedScale,
    scale: multiplier,
    limited: multiplier + .000001 < requestedScale,
    layout: normalizedLayout,
    sourceWidth,
    sourceHeight,
    baseWidth: base.width,
    baseHeight: base.height,
    width: outputWidth,
    height: outputHeight,
    scaleX,
    scaleY,
    // The geometric mean gives stretch mode a stable brush thickness.
    strokeScale: Math.sqrt(Math.abs(scaleX * scaleY)),
    offsetX,
    offsetY
  });
}

function pathSegments(stroke, width, height) {
  const points = Array.isArray(stroke?.points) ? stroke.points : [];
  if (!points.length) return [];
  const size = Math.max(1, finiteNumber(stroke?.size, 1));
  const color = normalizeColor(stroke?.color);
  if (points.length === 1) {
    return [{ dot: true, x: clamp(finiteNumber(points[0]?.x) * width, 0, width), y: clamp(finiteNumber(points[0]?.y) * height, 0, height), width: Math.max(1, size / 2), color }];
  }
  const segments = [];
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1], b = points[index];
    const pressure = stroke?.pressure ? clamp((finiteNumber(a?.pressure, 1) + finiteNumber(b?.pressure, 1)) / 2, .25, 1.5) : 1;
    segments.push({
      x1: clamp(finiteNumber(a?.x) * width, 0, width), y1: clamp(finiteNumber(a?.y) * height, 0, height),
      x2: clamp(finiteNumber(b?.x) * width, 0, width), y2: clamp(finiteNumber(b?.y) * height, 0, height),
      width: Math.max(1, size * pressure), color
    });
  }
  return segments;
}

function pdfNumber(value) { return finiteNumber(value).toFixed(2); }

function buildPdfBlob({ project, plan, background, transparent }) {
  // A vector PDF stays intentionally simple and compatible. Raster formats
  // retain every animated/special brush exactly; PDF prioritizes editability.
  const pageWidth = 612;
  const pageHeight = Math.max(144, pageWidth * (plan.height / plan.width));
  const pageScale = pageWidth / plan.width;
  const commands = ["1 J", "1 j"];
  if (!transparent) {
    const [r, g, b] = hexToRgb(background);
    commands.push(`${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)} rg`, `0 0 ${pdfNumber(pageWidth)} ${pdfNumber(pageHeight)} re f`);
  }
  const mapX = value => (value * plan.scaleX + plan.offsetX) * pageScale;
  const mapY = value => pageHeight - ((value * plan.scaleY + plan.offsetY) * pageScale);
  for (const stroke of project.strokes || []) {
    for (const segment of pathSegments(stroke, plan.sourceWidth, plan.sourceHeight)) {
      const [r, g, b] = hexToRgb(segment.color);
      commands.push(`${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)} RG`);
      if (segment.dot) {
        const x = mapX(segment.x), y = mapY(segment.y), radius = Math.max(.5, segment.width * plan.strokeScale * pageScale);
        commands.push(`${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)} rg`, `${pdfNumber(x - radius)} ${pdfNumber(y - radius)} ${pdfNumber(radius * 2)} ${pdfNumber(radius * 2)} re f`);
      } else {
        commands.push(`${pdfNumber(segment.width * plan.strokeScale * pageScale)} w`, `${pdfNumber(mapX(segment.x1))} ${pdfNumber(mapY(segment.y1))} m ${pdfNumber(mapX(segment.x2))} ${pdfNumber(mapY(segment.y2))} l S`);
      }
    }
  }
  const stream = `${commands.join("\n")}\n`;
  const encoder = new TextEncoder();
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfNumber(pageWidth)} ${pdfNumber(pageHeight)}] /Resources << >> /Contents 4 0 R >>`,
    `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}endstream`
  ];
  let pdf = "%PDF-1.4\n% AIR-DROW\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(encoder.encode(pdf).length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

/**
 * Draw the visible artwork layer into an export plan. `drawCanvas` is kept
 * separate from the hand guide and all HTML controls, so this path cannot
 * accidentally export landmarks, the toolbar or an empty CSS background.
 *
 * The source canvas may be backed at device-pixel-ratio resolution. Supplying
 * both source and destination rectangles normalises it back to logical canvas
 * coordinates before Fit/Fill/Stretch is applied.
 */
function drawArtworkSnapshot(context, artwork, plan) {
  if (!artwork || !Number(artwork.width) || !Number(artwork.height)) return false;
  try {
    context.save();
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.translate(plan.offsetX, plan.offsetY);
    context.scale(plan.scaleX, plan.scaleY);
    context.drawImage(artwork, 0, 0, artwork.width, artwork.height, 0, 0, plan.sourceWidth, plan.sourceHeight);
    context.restore();
    return true;
  } catch (error) {
    try { context.restore(); } catch {}
    console.warn("AIR-DROW artwork snapshot failed; using stroke renderer.", error);
    return false;
  }
}

function drawProjectStrokes(context, project, plan, drawStroke) {
  // Source strokes are the authoritative artwork. Rendering them first avoids
  // an Android canvas snapshot race where the visible layer has not repainted
  // yet and an export would otherwise contain only the background.
  try {
    context.save();
    context.translate(plan.offsetX, plan.offsetY);
    context.scale(plan.scaleX, plan.scaleY);
    for (const stroke of project.strokes || []) drawStroke(context, stroke, plan.sourceWidth, plan.sourceHeight);
    context.restore();
    return true;
  } catch (error) {
    try { context.restore(); } catch {}
    console.warn("AIR-DROW stroke export renderer failed; trying the artwork snapshot.", error);
    return false;
  }
}

function drawVideoCover(context, video, width, height) {
  const sourceWidth = Number(video?.videoWidth) || 0;
  const sourceHeight = Number(video?.videoHeight) || 0;
  if (!sourceWidth || !sourceHeight) throw new Error("Camera frame is not ready for export");
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = width / height;
  let sx = 0, sy = 0, sw = sourceWidth, sh = sourceHeight;
  if (sourceRatio > targetRatio) { sw = sourceHeight * targetRatio; sx = (sourceWidth - sw) / 2; }
  else if (sourceRatio < targetRatio) { sh = sourceWidth / targetRatio; sy = (sourceHeight - sh) / 2; }
  context.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);
}

export function createExporter({ getProject, getCanvasSize, drawStroke, getArtworkCanvas, getBackground, getCameraFrame } = {}) {
  function projectSnapshot() {
    const project = getProject?.();
    if (!project || !Array.isArray(project.strokes)) throw new Error("The current project is unavailable");
    return project;
  }
  function exportPlan(options = {}) { return createExportPlan({ source: getCanvasSize?.(), ...options }); }

  function buildCanvas({ preset = "current", transparent = false, scale = 1, layout = "fit", includeCamera = false, maxSide = 0 } = {}) {
    const plan = exportPlan({ preset, scale, layout, maxSide });
    const output = document.createElement("canvas");
    output.width = plan.width;
    output.height = plan.height;
    const context = output.getContext("2d", { alpha: true });
    if (!context) throw new Error("Canvas export is not supported by this browser");
    const camera = includeCamera ? getCameraFrame?.() : null;
    if (camera) drawVideoCover(context, camera, plan.width, plan.height);
    else if (!transparent) { context.fillStyle = getBackground?.() || "#07101b"; context.fillRect(0, 0, plan.width, plan.height); }

    const project = projectSnapshot();
    // Stored source points are rendered first. The artwork canvas remains a
    // recovery-only snapshot if a custom brush renderer throws; it is never the
    // primary source of truth for a download.
    const strokeRendererUsed = project.strokes.length > 0 && drawProjectStrokes(context, project, plan, drawStroke);
    let snapshotUsed = false;
    if (!strokeRendererUsed && project.strokes.length > 0) {
      snapshotUsed = drawArtworkSnapshot(context, getArtworkCanvas?.(), plan);
    }
    return { canvas: output, plan, cameraIncluded: Boolean(camera), snapshotUsed, strokeRendererUsed };
  }

  function buildThumbnail() {
    try { return buildCanvas({ preset: "current", transparent: false, maxSide: 360 }).canvas.toDataURL("image/jpeg", .78); }
    catch { return ""; }
  }

  function buildSvg({ preset = "current", transparent = false, layout = "fit" } = {}) {
    const plan = exportPlan({ preset, scale: 1, layout });
    const layers = [];
    if (!transparent) layers.push(`<rect width="100%" height="100%" fill="${escapeXml(getBackground?.() || "#07101b")}"/>`);
    const groupStart = `<g transform="translate(${plan.offsetX.toFixed(4)} ${plan.offsetY.toFixed(4)}) scale(${plan.scaleX.toFixed(8)} ${plan.scaleY.toFixed(8)})">`;
    const strokes = projectSnapshot().strokes.map(stroke => svgMarkupForBrush(stroke, plan.sourceWidth, plan.sourceHeight)).join("");
    layers.push(`${groupStart}${strokes}</g>`);
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${plan.width}" height="${plan.height}" viewBox="0 0 ${plan.width} ${plan.height}">${svgDefsForBrushes()}${layers.join("")}</svg>`;
  }

  function buildPdf({ preset = "current", transparent = false, layout = "fit" } = {}) {
    const plan = exportPlan({ preset, scale: 1, layout });
    return buildPdfBlob({ project: projectSnapshot(), plan, background: getBackground?.() || "#07101b", transparent });
  }

  async function encodeRaster({ format = "png", preset = "current", transparent = false, scale = 1, layout = "fit", quality = 92, includeCamera = false } = {}) {
    const requested = OUTPUTS[format] || OUTPUTS.png;
    const forceOpaque = !requested.alpha || Boolean(includeCamera);
    const built = buildCanvas({ preset, transparent: forceOpaque ? false : transparent, scale, layout, includeCamera });
    try {
      const blob = await canvasToBlob(built.canvas, requested.mime, clamp(quality, 1, 100) / 100);
      return { blob, format: requested.extension, fallback: false, flattened: forceOpaque && transparent, plan: built.plan, cameraIncluded: built.cameraIncluded };
    } catch (error) {
      // Older Android WebViews can advertise WebP while refusing to encode it.
      if (requested.extension !== "webp") throw error;
      const blob = await canvasToBlob(built.canvas, OUTPUTS.png.mime, .95);
      return { blob, format: "png", fallback: true, flattened: forceOpaque && transparent, plan: built.plan, cameraIncluded: built.cameraIncluded };
    }
  }

  function getOutputInfo({ preset = "current", scale = 1, layout = "fit" } = {}) {
    const plan = exportPlan({ preset, scale, layout });
    return { width: plan.width, height: plan.height, layout: plan.layout, preset: plan.preset, limited: plan.limited, scale: plan.scale, requestedScale: plan.requestedScale };
  }

  async function exportFile({ format = "png", preset = "current", transparent = false, scale = 1, layout = "fit", quality = 92, includeCamera = false, filenameBase = "air-drow" } = {}) {
    if (format === "airdrow") {
      const project = { ...projectSnapshot(), exportedAt: new Date().toISOString(), format: "airdrow-project" };
      const blob = new Blob([`${JSON.stringify(project, null, 2)}\n`], { type: "application/json;charset=utf-8" });
      const filename = buildFilename(filenameBase, { preset: "project", width: 0, height: 0, extension: "airdrow" });
      downloadBlob(blob, filename); return { blob, filename, format, fallback: false, flattened: false, info: null };
    }
    if (format === "svg") {
      if (includeCamera) throw new Error("Camera Composite is available for raster images only");
      const info = getOutputInfo({ preset, scale: 1, layout });
      const blob = new Blob([buildSvg({ preset, transparent, layout })], { type: "image/svg+xml;charset=utf-8" });
      const filename = buildFilename(filenameBase, { preset, width: info.width, height: info.height, extension: "svg" });
      downloadBlob(blob, filename); return { blob, filename, format, fallback: false, flattened: false, info };
    }
    if (format === "pdf") {
      if (includeCamera) throw new Error("Camera Composite is available for raster images only");
      const info = getOutputInfo({ preset, scale: 1, layout });
      const blob = buildPdf({ preset, transparent, layout });
      const filename = buildFilename(filenameBase, { preset, width: info.width, height: info.height, extension: "pdf" });
      downloadBlob(blob, filename); return { blob, filename, format, fallback: false, flattened: false, info };
    }
    const encoded = await encodeRaster({ format, preset, transparent, scale, layout, quality, includeCamera });
    const filename = buildFilename(filenameBase, { preset, width: encoded.plan.width, height: encoded.plan.height, extension: encoded.format });
    downloadBlob(encoded.blob, filename);
    return { ...encoded, filename, info: { width: encoded.plan.width, height: encoded.plan.height, layout: encoded.plan.layout, preset: encoded.plan.preset } };
  }

  /**
   * Build a compact on-device preview without invoking the download path.
   * The preview is capped to a safe edge length so Android can show an
   * accurate crop/layout check without allocating the full export canvas.
   */
  async function previewFile({ format = "png", preset = "current", transparent = false, scale = 1, layout = "fit", quality = 92, includeCamera = false } = {}) {
    const project = projectSnapshot();
    const selected = String(format || "png").toLowerCase();
    const vector = selected === "svg" || selected === "pdf";
    const projectFile = selected === "airdrow";
    const exact = getOutputInfo({ preset, scale: vector || projectFile ? 1 : scale, layout });
    if (projectFile) {
      return Object.freeze({
        previewable: false,
        format: "airdrow",
        info: exact,
        strokeCount: project.strokes.length,
        cameraIncluded: false,
        note: "project-file"
      });
    }

    const requested = OUTPUTS[selected] || OUTPUTS.png;
    const forceOpaque = !requested.alpha || Boolean(includeCamera);
    // Keep the preview below a modest edge limit. It still uses the same fit,
    // fill or stretch transform as the full output, so crop/letterbox choices
    // remain truthful.
    const built = buildCanvas({
      preset,
      transparent: forceOpaque ? false : transparent,
      scale: vector ? 1 : scale,
      layout,
      includeCamera,
      maxSide: 900
    });
    let blob;
    let previewFormat = requested.extension;
    let fallback = false;
    try {
      blob = await canvasToBlob(built.canvas, requested.mime, clamp(quality, 1, 100) / 100);
    } catch (error) {
      if (requested.extension !== "webp") throw error;
      blob = await canvasToBlob(built.canvas, OUTPUTS.png.mime, .95);
      previewFormat = "png";
      fallback = true;
    }
    return Object.freeze({
      previewable: true,
      blob,
      format: previewFormat,
      fallback,
      info: exact,
      preview: { width: built.plan.width, height: built.plan.height },
      cameraIncluded: built.cameraIncluded,
      flattened: forceOpaque && transparent,
      strokeCount: project.strokes.length
    });
  }

  async function shareFile({ format = "png", preset = "current", transparent = false, scale = 1, layout = "fit", quality = 92, includeCamera = false, filenameBase = "air-drow" } = {}) {
    const supportedFormat = OUTPUTS[format] ? format : "png";
    const encoded = await encodeRaster({ format: supportedFormat, preset, transparent, scale, layout, quality, includeCamera });
    const filename = buildFilename(filenameBase, { preset, width: encoded.plan.width, height: encoded.plan.height, extension: encoded.format });
    let file = null;
    try { file = new File([encoded.blob], filename, { type: encoded.blob.type || OUTPUTS[encoded.format]?.mime || "image/png" }); } catch {}
    const payload = file ? { title: "AIR-DROW", text: "Created in AIR-DROW", files: [file] } : null;
    const canShare = Boolean(payload && typeof navigator.share === "function" && (typeof navigator.canShare !== "function" || navigator.canShare(payload)));
    if (canShare) { await navigator.share(payload); return { shared: true, downloaded: false, filename, ...encoded, formatFallback: supportedFormat !== format }; }
    downloadBlob(encoded.blob, filename);
    return { shared: false, downloaded: true, filename, ...encoded, formatFallback: supportedFormat !== format };
  }

  return { exportFile, shareFile, previewFile, buildSvg, buildPdf, buildCanvas, buildThumbnail, encodeRaster, getOutputInfo };
}
