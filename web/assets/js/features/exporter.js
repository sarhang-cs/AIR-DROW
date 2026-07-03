import { svgDefsForBrushes, svgMarkupForBrush } from "./brush-lab.js";

const PRESETS = Object.freeze({
  square: Object.freeze({ width: 1080, height: 1080 }),
  story: Object.freeze({ width: 1080, height: 1920 }),
  widescreen: Object.freeze({ width: 1920, height: 1080 })
});

const OUTPUTS = Object.freeze({
  png: Object.freeze({ mime: "image/png", extension: "png" }),
  webp: Object.freeze({ mime: "image/webp", extension: "webp" })
});

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function finiteNumber(value, fallback = 0) { const number = Number(value); return Number.isFinite(number) ? number : fallback; }

function safeFileBase(value) {
  return String(value || "air-drow")
    .trim()
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "air-drow";
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
  // Mobile browsers can finish a download after the current task.
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
  const safeWidth = Math.max(1, Math.round(Number(current?.width) || 1));
  const safeHeight = Math.max(1, Math.round(Number(current?.height) || 1));
  return PRESETS[preset] || { width: safeWidth, height: safeHeight };
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

function buildPdfBlob({ project, dimensions, background, transparent }) {
  const pageWidth = 612;
  const pageHeight = Math.max(144, pageWidth * (dimensions.height / dimensions.width));
  const scale = pageWidth / dimensions.width;
  const commands = ["1 J", "1 j"];
  if (!transparent) {
    const [r, g, b] = hexToRgb(background);
    commands.push(`${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)} rg`, `0 0 ${pdfNumber(pageWidth)} ${pdfNumber(pageHeight)} re f`);
  }
  for (const stroke of project.strokes || []) {
    for (const segment of pathSegments(stroke, dimensions.width, dimensions.height)) {
      const [r, g, b] = hexToRgb(segment.color);
      commands.push(`${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)} RG`);
      if (segment.dot) {
        const x = segment.x * scale, y = pageHeight - segment.y * scale, radius = Math.max(.5, segment.width * scale);
        commands.push(`${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)} rg`, `${pdfNumber(x - radius)} ${pdfNumber(y - radius)} ${pdfNumber(radius * 2)} ${pdfNumber(radius * 2)} re f`);
      } else {
        commands.push(`${pdfNumber(segment.width * scale)} w`, `${pdfNumber(segment.x1 * scale)} ${pdfNumber(pageHeight - segment.y1 * scale)} m ${pdfNumber(segment.x2 * scale)} ${pdfNumber(pageHeight - segment.y2 * scale)} l S`);
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

export function createExporter({ getProject, getCanvasSize, drawStroke, getBackground }) {
  function projectSnapshot() {
    const project = getProject?.();
    if (!project || !Array.isArray(project.strokes)) throw new Error("The current project is unavailable");
    return project;
  }
  function buildCanvas({ preset = "current", transparent = false, maxSide = 0 } = {}) {
    const dimensions = dimensionsFor(preset, getCanvasSize?.());
    const scale = maxSide > 0 ? Math.min(1, maxSide / Math.max(dimensions.width, dimensions.height)) : 1;
    const output = document.createElement("canvas");
    output.width = Math.max(1, Math.round(dimensions.width * scale));
    output.height = Math.max(1, Math.round(dimensions.height * scale));
    const context = output.getContext("2d", { alpha: true });
    if (!context) throw new Error("Canvas export is not supported by this browser");
    if (!transparent) { context.fillStyle = getBackground?.() || "#07101b"; context.fillRect(0, 0, output.width, output.height); }
    for (const stroke of projectSnapshot().strokes) drawStroke(context, stroke, output.width, output.height);
    return output;
  }
  function buildThumbnail() { const canvas = buildCanvas({ preset: "current", transparent: false, maxSide: 360 }); try { return canvas.toDataURL("image/jpeg", .78); } catch { return ""; } }
  function buildSvg({ preset = "current", transparent = false } = {}) {
    const dimensions = dimensionsFor(preset, getCanvasSize?.());
    const layers = [];
    if (!transparent) layers.push(`<rect width="100%" height="100%" fill="${escapeXml(getBackground?.() || "#07101b")}"/>`);
    for (const stroke of projectSnapshot().strokes) layers.push(svgMarkupForBrush(stroke, dimensions.width, dimensions.height));
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.width}" height="${dimensions.height}" viewBox="0 0 ${dimensions.width} ${dimensions.height}">${svgDefsForBrushes()}${layers.join("")}</svg>`;
  }
  function buildPdf({ preset = "current", transparent = false } = {}) {
    const dimensions = dimensionsFor(preset, getCanvasSize?.());
    return buildPdfBlob({ project: projectSnapshot(), dimensions, background: getBackground?.() || "#07101b", transparent });
  }
  async function encodeRaster({ format = "png", preset = "current", transparent = false } = {}) {
    const requested = OUTPUTS[format] || OUTPUTS.png;
    const canvas = buildCanvas({ preset, transparent });
    try {
      const blob = await canvasToBlob(canvas, requested.mime, .95);
      return { blob, format: requested.extension, fallback: false };
    } catch (error) {
      // Older Android webviews sometimes expose the WebP option but refuse to
      // encode it. Exporting a PNG is safer than making the creator retry.
      if (requested.extension !== "webp") throw error;
      const blob = await canvasToBlob(canvas, OUTPUTS.png.mime, .95);
      return { blob, format: "png", fallback: true };
    }
  }

  async function exportFile({ format = "png", preset = "current", transparent = false, filenameBase = "air-drow" } = {}) {
    const base = safeFileBase(filenameBase);
    if (format === "airdrow") {
      const project = { ...projectSnapshot(), exportedAt: new Date().toISOString(), format: "airdrow-project" };
      const blob = new Blob([`${JSON.stringify(project, null, 2)}\n`], { type: "application/json;charset=utf-8" });
      const filename = `${base}.airdrow`; downloadBlob(blob, filename); return { blob, filename, format, fallback: false };
    }
    if (format === "svg") { const blob = new Blob([buildSvg({ preset, transparent })], { type: "image/svg+xml;charset=utf-8" }); const filename = `${base}.svg`; downloadBlob(blob, filename); return { blob, filename, format, fallback: false }; }
    if (format === "pdf") { const blob = buildPdf({ preset, transparent }); const filename = `${base}.pdf`; downloadBlob(blob, filename); return { blob, filename, format, fallback: false }; }
    const encoded = await encodeRaster({ format, preset, transparent });
    const filename = `${base}.${encoded.format}`; downloadBlob(encoded.blob, filename);
    return { blob: encoded.blob, filename, format: encoded.format, fallback: encoded.fallback };
  }
  async function shareFile({ preset = "story", transparent = false, filenameBase = "air-drow" } = {}) {
    const encoded = await encodeRaster({ format: "png", preset, transparent });
    const filename = `${safeFileBase(filenameBase)}.png`;
    let file = null;
    try { file = new File([encoded.blob], filename, { type: "image/png" }); } catch {}
    const payload = file ? { title: "AIR-DROW", text: "Created in AIR-DROW", files: [file] } : null;
    const canShare = Boolean(payload && typeof navigator.share === "function" && (typeof navigator.canShare !== "function" || navigator.canShare(payload)));
    if (canShare) { await navigator.share(payload); return { shared: true, downloaded: false, filename }; }
    downloadBlob(encoded.blob, filename); return { shared: false, downloaded: true, filename };
  }
  return { exportFile, shareFile, buildSvg, buildPdf, buildCanvas, buildThumbnail, encodeRaster };
}
