function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function angle(a, b, c) {
  const abx = a.x - b.x, aby = a.y - b.y, cbx = c.x - b.x, cby = c.y - b.y;
  const den = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
  if (!den) return 0;
  return Math.acos(Math.max(-1, Math.min(1, (abx * cbx + aby * cby) / den))) * 180 / Math.PI;
}
function extended(points, mcp, pip, tip) { return angle(points[mcp], points[pip], points[tip]) > 148 && distance(points[tip], points[0]) > distance(points[pip], points[0]) * 1.08; }
function folded(points, mcp, pip, tip) { return angle(points[mcp], points[pip], points[tip]) < 125 || distance(points[tip], points[0]) < distance(points[pip], points[0]) * 1.06; }

export function recognizeGestureShortcut(points, pinchRatio = 1) {
  if (!Array.isArray(points) || points.length < 21 || pinchRatio < .22) return "";
  const index = extended(points, 5, 6, 8);
  const middle = extended(points, 9, 10, 12);
  const ring = extended(points, 13, 14, 16);
  const pinky = extended(points, 17, 18, 20);
  const ringFolded = folded(points, 13, 14, 16);
  const pinkyFolded = folded(points, 17, 18, 20);
  const thumbExtended = distance(points[4], points[2]) > distance(points[3], points[2]) * 1.14;
  const thumbUp = thumbExtended && ringFolded && pinkyFolded && !index && !middle && points[4].y < points[2].y - .035;
  if (index && middle && ringFolded && pinkyFolded) return "victory";
  if (index && middle && ring && pinky) return "palm";
  if (!index && !middle && ringFolded && pinkyFolded && !thumbExtended) return "fist";
  if (thumbUp) return "thumb-up";
  return "";
}

export function createShortcutGate({ holdMs = 650, cooldownMs = 1500 } = {}) {
  let active = "";
  let activeAt = 0;
  let lastTriggeredAt = 0;
  return {
    observe(name, now = performance.now()) {
      if (!name) { active = ""; activeAt = 0; return ""; }
      if (name !== active) { active = name; activeAt = now; return ""; }
      if (now - activeAt < holdMs || now - lastTriggeredAt < cooldownMs) return "";
      lastTriggeredAt = now;
      activeAt = now;
      return name;
    },
    reset() { active = ""; activeAt = 0; lastTriggeredAt = 0; }
  };
}

export const SHORTCUT_LABELS = Object.freeze({
  palm: "Save",
  victory: "Undo",
  "thumb-up": "Export",
  fist: "Eraser"
});
