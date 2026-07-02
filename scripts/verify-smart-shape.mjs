import { analyzeShape, recognizeAndSnap } from "../web/assets/js/features/shape-engine.js";

const point = (x, y) => ({ x, y, pressure: 1, time: 0 });

function line(start, end, count = 24) {
  return Array.from({ length: count }, (_, index) => {
    const progress = index / (count - 1);
    return point(start[0] + (end[0] - start[0]) * progress, start[1] + (end[1] - start[1]) * progress);
  });
}

function polygon(vertices, count = 18, wobble = 0) {
  const points = [];
  for (let edge = 0; edge < vertices.length; edge += 1) {
    const start = vertices[edge];
    const end = vertices[(edge + 1) % vertices.length];
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const size = Math.hypot(dx, dy) || 1;
    const nx = -dy / size;
    const ny = dx / size;
    for (let index = 0; index < count; index += 1) {
      const progress = index / count;
      const drift = wobble * Math.sin(progress * Math.PI * 2);
      points.push(point(start[0] + dx * progress + nx * drift, start[1] + dy * progress + ny * drift));
    }
  }
  points.push(point(vertices[0][0], vertices[0][1]));
  return points;
}

function ellipse(cx, cy, rx, ry, count = 96, wobble = 0) {
  return Array.from({ length: count + 1 }, (_, index) => {
    const theta = (Math.PI * 2 * index) / count;
    const radius = 1 + wobble * Math.sin(theta * 3);
    return point(cx + rx * Math.cos(theta) * radius, cy + ry * Math.sin(theta) * radius);
  });
}

const cases = [
  ["clean line", line([0.1, 0.14], [0.84, 0.42]), "line"],
  ["rough rectangle", polygon([[0.2, 0.2], [0.72, 0.22], [0.69, 0.71], [0.21, 0.68]], 18, 0.005), "rectangle"],
  ["triangle", polygon([[0.2, 0.72], [0.51, 0.2], [0.8, 0.72]], 18, 0.004), "triangle"],
  ["ellipse", ellipse(0.5, 0.5, 0.24, 0.34, 96, 0.035), "ellipse"],
  ["open curve", Array.from({ length: 30 }, (_, index) => point(0.1 + index * 0.025, 0.5 + 0.17 * Math.sin((index / 29) * Math.PI))), null],
  ["crossing scribble", [point(.2, .2), point(.75, .3), point(.28, .72), point(.76, .7), point(.2, .2)], null]
];

for (const [name, points, expected] of cases) {
  const candidate = analyzeShape({ points });
  const actual = candidate?.type || null;
  if (actual !== expected) throw new Error(`${name}: expected ${expected || "no match"}, received ${actual || "no match"}`);
  if (candidate && candidate.confidence < 0.78) throw new Error(`${name}: confidence is too low (${candidate.confidence})`);
}

const rectangle = polygon([[0.2, 0.2], [0.7, 0.2], [0.7, 0.7], [0.2, 0.7]], 16, 0.004);
const locked = recognizeAndSnap({ points: rectangle, color: "#ff778c", brush: "rainbow" }, { intent: "rectangle", minConfidence: 0.86 });
if (!locked || locked.type !== "rectangle") throw new Error("Rectangle lock did not snap a rectangle.");
if (locked.stroke.color !== "#ff778c" || locked.stroke.brush !== "rainbow") throw new Error("Shape snap changed the original stroke style.");
if (recognizeAndSnap({ points: rectangle }, { intent: "ellipse", minConfidence: 0.78 })) throw new Error("Rectangle must not snap as ellipse when shape intent is locked.");

console.log("AIR-DROW Smart Shape 2.0 recognition tests passed.");
