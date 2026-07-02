const BRUSH_IDS = new Set(["classic", "neon", "glow", "rainbow", "galaxy", "particle", "ribbon", "calligraphy"]);

export function normalizeBrush(value) {
  return BRUSH_IDS.has(value) ? value : "classic";
}

export const BRUSH_LABELS = Object.freeze({
  classic: "Classic",
  neon: "Neon",
  glow: "Soft Glow",
  rainbow: "Rainbow",
  galaxy: "Galaxy",
  particle: "Particles",
  ribbon: "Silk Ribbon",
  calligraphy: "Calligraphy"
});

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function pointAt(point, width, height) { return { x: point.x * width, y: point.y * height }; }
function pressureFor(a, b, enabled) {
  if (!enabled) return 1;
  return clamp(((a?.pressure || 1) + (b?.pressure || 1)) / 2, .25, 1.5);
}
function hueColor(index, total, offset = 0) { return `hsl(${Math.round((offset + (index / Math.max(1, total)) * 320) % 360)} 92% 64%)`; }
function seeded(index, salt = 1) {
  const x = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}
function beginStroke(ctx, color) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
}

function drawBasicSegment(ctx, a, b, width, color) {
  ctx.lineWidth = Math.max(1, width);
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function drawDot(ctx, p, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, Math.max(.8, radius), 0, Math.PI * 2);
  ctx.fill();
}

function drawNeonStroke(ctx, points, stroke, width, height, glow = false) {
  ctx.save();
  beginStroke(ctx, stroke.color);
  ctx.globalAlpha = glow ? .34 : .48;
  ctx.shadowColor = stroke.color;
  ctx.shadowBlur = Math.max(8, stroke.size * (glow ? 2.4 : 1.7));
  for (let i = 1; i < points.length; i += 1) {
    const a = pointAt(points[i - 1], width, height), b = pointAt(points[i], width, height);
    drawBasicSegment(ctx, a, b, stroke.size * pressureFor(points[i - 1], points[i], stroke.pressure) * (glow ? 1.9 : 1.45), stroke.color);
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = glow ? Math.max(3, stroke.size * .6) : Math.max(2, stroke.size * .35);
  for (let i = 1; i < points.length; i += 1) {
    const a = pointAt(points[i - 1], width, height), b = pointAt(points[i], width, height);
    drawBasicSegment(ctx, a, b, stroke.size * pressureFor(points[i - 1], points[i], stroke.pressure), "#f7fbff");
  }
  ctx.restore();
}

function drawRainbowStroke(ctx, points, stroke, width, height) {
  ctx.save();
  beginStroke(ctx, stroke.color);
  for (let i = 1; i < points.length; i += 1) {
    const a = pointAt(points[i - 1], width, height), b = pointAt(points[i], width, height);
    drawBasicSegment(ctx, a, b, stroke.size * pressureFor(points[i - 1], points[i], stroke.pressure), hueColor(i, points.length, 210));
  }
  ctx.restore();
}

function drawParticleStroke(ctx, points, stroke, width, height, galaxy = false) {
  ctx.save();
  beginStroke(ctx, stroke.color);
  ctx.globalAlpha = galaxy ? .7 : .5;
  ctx.shadowColor = stroke.color;
  ctx.shadowBlur = galaxy ? 9 : 5;
  for (let i = 1; i < points.length; i += 1) {
    const a = pointAt(points[i - 1], width, height), b = pointAt(points[i], width, height);
    const dx = b.x - a.x, dy = b.y - a.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const count = Math.min(7, Math.max(2, Math.round(length / 14)));
    for (let j = 0; j < count; j += 1) {
      const t = j / count;
      const jitter = (seeded(i * 13 + j, galaxy ? 5 : 2) - .5) * stroke.size * 1.7;
      const normalX = -dy / length, normalY = dx / length;
      const p = { x: a.x + dx * t + normalX * jitter, y: a.y + dy * t + normalY * jitter };
      const size = galaxy ? .8 + seeded(i * 7 + j, 8) * Math.max(2.2, stroke.size * .34) : .7 + seeded(i * 7 + j, 9) * Math.max(1.8, stroke.size * .25);
      drawDot(ctx, p, size, galaxy ? (j % 3 ? stroke.color : "#f7fbff") : stroke.color);
    }
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  if (galaxy) {
    ctx.globalAlpha = .42;
    for (let i = 1; i < points.length; i += 1) {
      const a = pointAt(points[i - 1], width, height), b = pointAt(points[i], width, height);
      drawBasicSegment(ctx, a, b, Math.max(1, stroke.size * .22), stroke.color);
    }
  }
  ctx.restore();
}

function drawRibbonStroke(ctx, points, stroke, width, height) {
  ctx.save();
  ctx.globalAlpha = .78;
  for (let i = 1; i < points.length; i += 1) {
    const a = pointAt(points[i - 1], width, height), b = pointAt(points[i], width, height);
    const dx = b.x - a.x, dy = b.y - a.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const nx = (-dy / length) * Math.max(2, stroke.size * .46);
    const ny = (dx / length) * Math.max(2, stroke.size * .46);
    const gradient = ctx.createLinearGradient(a.x - nx, a.y - ny, b.x + nx, b.y + ny);
    gradient.addColorStop(0, "rgba(255,255,255,.86)");
    gradient.addColorStop(.18, stroke.color);
    gradient.addColorStop(.7, stroke.color);
    gradient.addColorStop(1, "rgba(255,255,255,.32)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(a.x + nx, a.y + ny);
    ctx.lineTo(b.x + nx, b.y + ny);
    ctx.lineTo(b.x - nx, b.y - ny);
    ctx.lineTo(a.x - nx, a.y - ny);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawCalligraphyStroke(ctx, points, stroke, width, height) {
  ctx.save();
  beginStroke(ctx, stroke.color);
  for (let i = 1; i < points.length; i += 1) {
    const a = pointAt(points[i - 1], width, height), b = pointAt(points[i], width, height);
    const angle = Math.abs(Math.atan2(b.y - a.y, b.x - a.x));
    const axis = .48 + Math.abs(Math.cos(angle - .45)) * .82;
    drawBasicSegment(ctx, a, b, stroke.size * axis * pressureFor(points[i - 1], points[i], stroke.pressure), stroke.color);
  }
  ctx.restore();
}

export function drawStrokeWithBrush(ctx, stroke, width, height) {
  const points = stroke?.points || [];
  if (!points.length) return;
  const brush = normalizeBrush(stroke.brush);
  const size = Math.max(1, Number(stroke.size) || 1);
  if (points.length === 1) {
    const p = pointAt(points[0], width, height);
    ctx.save();
    if (brush === "neon" || brush === "glow" || brush === "galaxy") {
      ctx.shadowColor = stroke.color;
      ctx.shadowBlur = brush === "glow" ? size * 2 : size;
    }
    drawDot(ctx, p, size / 2, brush === "neon" ? "#f7fbff" : stroke.color);
    ctx.restore();
    return;
  }
  if (brush === "neon") return drawNeonStroke(ctx, points, stroke, width, height, false);
  if (brush === "glow") return drawNeonStroke(ctx, points, stroke, width, height, true);
  if (brush === "rainbow") return drawRainbowStroke(ctx, points, stroke, width, height);
  if (brush === "galaxy") return drawParticleStroke(ctx, points, stroke, width, height, true);
  if (brush === "particle") return drawParticleStroke(ctx, points, stroke, width, height, false);
  if (brush === "ribbon") return drawRibbonStroke(ctx, points, stroke, width, height);
  if (brush === "calligraphy") return drawCalligraphyStroke(ctx, points, stroke, width, height);

  ctx.save();
  beginStroke(ctx, stroke.color);
  for (let i = 1; i < points.length; i += 1) {
    const a = pointAt(points[i - 1], width, height), b = pointAt(points[i], width, height);
    drawBasicSegment(ctx, a, b, size * pressureFor(points[i - 1], points[i], stroke.pressure), stroke.color);
  }
  ctx.restore();
}

function escape(value) { return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&apos;", '"': "&quot;" }[char])); }
function segmentPath(stroke, width, height) {
  const points = stroke?.points || [];
  if (!points.length) return "";
  return points.map((p, i) => `${i ? "L" : "M"}${(p.x * width).toFixed(2)} ${(p.y * height).toFixed(2)}`).join(" ");
}

export function svgDefsForBrushes() {
  return `<defs><linearGradient id="adRainbow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#40d9ff"/><stop offset=".28" stop-color="#9f7bff"/><stop offset=".55" stop-color="#ff70b7"/><stop offset=".78" stop-color="#ffd56d"/><stop offset="1" stop-color="#6df0b3"/></linearGradient><filter id="adGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><linearGradient id="adRibbon" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".24" stop-color="currentColor"/><stop offset=".82" stop-color="currentColor"/><stop offset="1" stop-color="#fff" stop-opacity=".28"/></linearGradient></defs>`;
}

export function svgMarkupForBrush(stroke, width, height) {
  const points = stroke?.points || [];
  if (!points.length) return "";
  const brush = normalizeBrush(stroke.brush);
  const color = escape(stroke.color || "#7fd8ff");
  const size = Math.max(1, Number(stroke.size) || 1);
  if (points.length === 1) {
    const p = points[0];
    return `<circle cx="${(p.x * width).toFixed(2)}" cy="${(p.y * height).toFixed(2)}" r="${(size / 2).toFixed(2)}" fill="${color}"${brush === "neon" || brush === "glow" || brush === "galaxy" ? ' filter="url(#adGlow)"' : ""}/>`;
  }
  const d = segmentPath(stroke, width, height);
  if (brush === "rainbow") {
    return `<path d="${d}" fill="none" stroke="url(#adRainbow)" stroke-width="${size}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (brush === "neon" || brush === "glow" || brush === "galaxy") {
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${size}" stroke-linecap="round" stroke-linejoin="round" filter="url(#adGlow)"/><path d="${d}" fill="none" stroke="#f7fbff" stroke-opacity=".86" stroke-width="${Math.max(1, size * .44).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (brush === "particle") {
    const dots = points.filter((_, i) => i % 2 === 0).map((p, i) => `<circle cx="${(p.x * width).toFixed(2)}" cy="${(p.y * height).toFixed(2)}" r="${Math.max(1, size * (.12 + (i % 3) * .04)).toFixed(2)}" fill="${color}"/>`).join("");
    return `<path d="${d}" fill="none" stroke="${color}" stroke-opacity=".28" stroke-width="${Math.max(1, size * .2).toFixed(2)}" stroke-linecap="round"/>${dots}`;
  }
  if (brush === "ribbon") {
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${(size * 1.1).toFixed(2)}" stroke-opacity=".75" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${size}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
