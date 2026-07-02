/*
 * AIR-DROW Smart Shape 2.0
 *
 * The recognizer deliberately uses a conservative two-stage pipeline:
 * 1. Measure stroke geometry and build shape candidates.
 * 2. Snap only when the strongest candidate clears the configured confidence.
 *
 * A stroke is never recoloured or given a different brush here.  Snapped points
 * are placed inside a clone of the original stroke, so the creator's selected
 * colour, pressure rule and brush style stay intact.
 */

const EPSILON = 1e-6;
const now = () => Date.now();

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function subtract(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

function length(vector) {
  return Math.hypot(vector.x, vector.y);
}

function normalize(vector) {
  const size = length(vector) || EPSILON;
  return { x: vector.x / size, y: vector.y / size };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

function cross(a, b) {
  return a.x * b.y - a.y * b.x;
}

function rotate90(vector) {
  return { x: -vector.y, y: vector.x };
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = clamp(p, 0, 1) * (sorted.length - 1);
  const low = Math.floor(index);
  const high = Math.ceil(index);
  return sorted[low] + (sorted[high] - sorted[low]) * (index - low);
}

function cleanPoints(points = []) {
  const cleaned = [];
  for (const point of points) {
    if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) continue;
    const previous = cleaned.at(-1);
    if (!previous || distance(point, previous) > 0.00035) {
      cleaned.push({ x: point.x, y: point.y, pressure: point.pressure ?? 1, time: point.time ?? now() });
    }
  }
  return cleaned;
}

function clonePoint(point) {
  return { x: point.x, y: point.y, pressure: point.pressure ?? 1, time: point.time ?? now() };
}

function point(x, y, source = {}) {
  return { x, y, pressure: source.pressure ?? 1, time: source.time ?? now() };
}

function pathLength(points) {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) total += distance(points[index - 1], points[index]);
  return total;
}

function bounds(points) {
  const xs = points.map(item => item.x);
  const ys = points.map(item => item.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = Math.max(EPSILON, maxX - minX);
  const height = Math.max(EPSILON, maxY - minY);
  return {
    minX,
    maxX,
    minY,
    maxY,
    width,
    height,
    diagonal: Math.hypot(width, height),
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2
  };
}

function interpolate(a, b, amount) {
  return point(
    a.x + (b.x - a.x) * amount,
    a.y + (b.y - a.y) * amount,
    { pressure: (a.pressure ?? 1) + ((b.pressure ?? 1) - (a.pressure ?? 1)) * amount, time: a.time ?? now() }
  );
}

function resample(points, count, closed = false) {
  const source = cleanPoints(points);
  if (source.length < 2 || count < 2) return source;
  const route = closed ? [...source, clonePoint(source[0])] : source;
  const total = pathLength(route);
  if (total < EPSILON) return source;
  const step = total / (closed ? count : count - 1);
  const result = [clonePoint(route[0])];
  let travelled = 0;
  let target = step;
  for (let index = 1; index < route.length && result.length < count; index += 1) {
    const start = route[index - 1];
    const end = route[index];
    const segment = distance(start, end);
    if (segment < EPSILON) continue;
    while (travelled + segment >= target - EPSILON && result.length < count) {
      const amount = clamp((target - travelled) / segment, 0, 1);
      result.push(interpolate(start, end, amount));
      target += step;
    }
    travelled += segment;
  }
  while (result.length < count) result.push(clonePoint(route.at(-1)));
  return result;
}

function pointToSegmentDistance(sample, start, end) {
  const direction = subtract(end, start);
  const denominator = dot(direction, direction);
  if (denominator < EPSILON) return distance(sample, start);
  const progress = clamp(dot(subtract(sample, start), direction) / denominator, 0, 1);
  return distance(sample, point(start.x + direction.x * progress, start.y + direction.y * progress));
}

function averageEdgeError(samples, vertices, closed = true) {
  const edges = [];
  const limit = closed ? vertices.length : vertices.length - 1;
  for (let index = 0; index < limit; index += 1) edges.push([vertices[index], vertices[(index + 1) % vertices.length]]);
  return average(samples.map(sample => Math.min(...edges.map(([start, end]) => pointToSegmentDistance(sample, start, end)))));
}

function extractCorners(points) {
  const samples = resample(points, 96, true);
  if (samples.length < 18) return [];
  const step = 4;
  const window = 7;
  const scores = samples.map((center, index) => {
    const previous = samples[(index - step + samples.length) % samples.length];
    const next = samples[(index + step) % samples.length];
    const a = normalize(subtract(previous, center));
    const b = normalize(subtract(next, center));
    const angle = Math.acos(clamp(dot(a, b), -1, 1));
    return Math.PI - angle; // straight/rounded = low, a hard corner = high
  });

  const peaks = [];
  for (let index = 0; index < scores.length; index += 1) {
    const score = scores[index];
    if (score < 0.36) continue;
    let isPeak = true;
    for (let offset = 1; offset <= window; offset += 1) {
      if (scores[(index - offset + scores.length) % scores.length] > score || scores[(index + offset) % scores.length] > score) {
        isPeak = false;
        break;
      }
    }
    if (isPeak) peaks.push({ index, score, point: samples[index] });
  }

  const selected = [];
  for (const candidate of peaks.sort((a, b) => b.score - a.score)) {
    const tooClose = selected.some(existing => {
      const delta = Math.abs(existing.index - candidate.index);
      return Math.min(delta, samples.length - delta) < 12;
    });
    if (!tooClose) selected.push(candidate);
    if (selected.length >= 8) break;
  }
  return selected.sort((a, b) => a.index - b.index);
}

function polygonArea(vertices) {
  let area = 0;
  for (let index = 0; index < vertices.length; index += 1) {
    const a = vertices[index];
    const b = vertices[(index + 1) % vertices.length];
    area += a.x * b.y - a.y * b.x;
  }
  return Math.abs(area) / 2;
}

function createStroke(stroke, points, shape, confidence) {
  return {
    ...structuredClone(stroke),
    points,
    meta: {
      ...(stroke.meta || {}),
      shape,
      shapeConfidence: Math.round(confidence * 100),
      snappedAt: new Date().toISOString()
    }
  };
}

function describeStroke(stroke) {
  const points = cleanPoints(stroke?.points || []);
  if (points.length < 3) return null;
  const box = bounds(points);
  const lengthValue = pathLength(points);
  const start = points[0];
  const end = points.at(-1);
  const endpointDistance = distance(start, end);
  const closedness = endpointDistance / Math.max(box.diagonal, EPSILON);
  return { points, box, length: lengthValue, start, end, endpointDistance, closedness, directness: endpointDistance / Math.max(lengthValue, EPSILON) };
}

function lineCandidate(stroke, info) {
  if (info.closedness <= 0.19 || info.directness < 0.9 || info.endpointDistance < 0.055) return null;
  const maxDeviation = Math.max(...info.points.map(sample => pointToSegmentDistance(sample, info.start, info.end)));
  const normalizedDeviation = maxDeviation / Math.max(info.endpointDistance, EPSILON);
  if (normalizedDeviation > 0.045) return null;
  const confidence = clamp(
    0.76 + clamp((info.directness - 0.9) / 0.1) * 0.13 + clamp((0.045 - normalizedDeviation) / 0.045) * 0.1,
    0,
    0.99
  );
  return {
    type: "line",
    confidence,
    stroke: createStroke(stroke, [clonePoint(info.start), clonePoint(info.end)], "line", confidence)
  };
}

function rectangleCandidate(stroke, info) {
  if (info.closedness > 0.16 || info.box.width < 0.045 || info.box.height < 0.045) return null;
  const corners = extractCorners(info.points);
  const strongCorners = corners.filter(corner => corner.score >= 0.52);
  if (strongCorners.length !== 4 || corners.length > 5) return null;
  const vertices = strongCorners.map(corner => corner.point);
  const sides = vertices.map((vertex, index) => subtract(vertices[(index + 1) % 4], vertex));
  const sideLengths = sides.map(length);
  const smallest = Math.min(...sideLengths);
  if (smallest < info.box.diagonal * 0.075) return null;
  const directions = sides.map(normalize);
  const rightAngleScore = average(directions.map((direction, index) => 1 - clamp(Math.abs(dot(direction, directions[(index + 1) % 4])) / 0.34)));
  const parallelScore = average([
    clamp((Math.abs(dot(directions[0], directions[2])) - 0.78) / 0.22),
    clamp((Math.abs(dot(directions[1], directions[3])) - 0.78) / 0.22)
  ]);
  const closureScore = clamp((0.16 - info.closedness) / 0.16);
  const edgeError = averageEdgeError(info.points, vertices);
  const edgeScore = 1 - clamp(edgeError / Math.max(smallest * 0.115, EPSILON));
  const areaScore = clamp(polygonArea(vertices) / Math.max(info.box.width * info.box.height * 0.55, EPSILON));
  const confidence = clamp(
    rightAngleScore * 0.33 + parallelScore * 0.27 + edgeScore * 0.2 + closureScore * 0.12 + areaScore * 0.08,
    0,
    0.99
  );
  if (confidence < 0.7 || rightAngleScore < 0.62 || parallelScore < 0.58 || edgeScore < 0.5) return null;

  const firstDirection = directions[0];
  const turnDirection = Math.sign(cross(firstDirection, directions[1])) || 1;
  const normal = rotate90(firstDirection);
  const secondary = { x: normal.x * turnDirection, y: normal.y * turnDirection };
  const center = {
    x: average(vertices.map(vertex => vertex.x)),
    y: average(vertices.map(vertex => vertex.y))
  };
  const halfWidth = (sideLengths[0] + sideLengths[2]) / 4;
  const halfHeight = (sideLengths[1] + sideLengths[3]) / 4;
  const generated = [
    point(center.x - firstDirection.x * halfWidth - secondary.x * halfHeight, center.y - firstDirection.y * halfWidth - secondary.y * halfHeight, vertices[0]),
    point(center.x + firstDirection.x * halfWidth - secondary.x * halfHeight, center.y + firstDirection.y * halfWidth - secondary.y * halfHeight, vertices[1]),
    point(center.x + firstDirection.x * halfWidth + secondary.x * halfHeight, center.y + firstDirection.y * halfWidth + secondary.y * halfHeight, vertices[2]),
    point(center.x - firstDirection.x * halfWidth + secondary.x * halfHeight, center.y - firstDirection.y * halfWidth + secondary.y * halfHeight, vertices[3])
  ];
  generated.push(clonePoint(generated[0]));
  return { type: "rectangle", confidence, stroke: createStroke(stroke, generated, "rectangle", confidence) };
}

function triangleCandidate(stroke, info) {
  if (info.closedness > 0.16 || info.box.diagonal < 0.07) return null;
  const corners = extractCorners(info.points);
  const strongCorners = corners.filter(corner => corner.score >= 0.5);
  if (strongCorners.length !== 3 || corners.length > 4) return null;
  const vertices = strongCorners.map(corner => corner.point);
  const sideLengths = vertices.map((vertex, index) => distance(vertex, vertices[(index + 1) % 3]));
  const smallest = Math.min(...sideLengths);
  if (smallest < info.box.diagonal * 0.08) return null;
  const area = polygonArea(vertices);
  const areaScore = clamp(area / Math.max(info.box.width * info.box.height * 0.2, EPSILON));
  const edgeError = averageEdgeError(info.points, vertices);
  const edgeScore = 1 - clamp(edgeError / Math.max(smallest * 0.13, EPSILON));
  const closureScore = clamp((0.16 - info.closedness) / 0.16);
  const cornerScore = average(strongCorners.map(corner => clamp((corner.score - 0.5) / 1.25)));
  const confidence = clamp(edgeScore * 0.35 + closureScore * 0.22 + cornerScore * 0.25 + areaScore * 0.18, 0, 0.99);
  if (confidence < 0.7 || edgeScore < 0.48 || areaScore < 0.42) return null;
  const generated = [...vertices.map(clonePoint), clonePoint(vertices[0])];
  return { type: "triangle", confidence, stroke: createStroke(stroke, generated, "triangle", confidence) };
}

function ellipseCandidate(stroke, info) {
  if (info.closedness > 0.16 || info.points.length < 12 || info.box.diagonal < 0.08) return null;
  const corners = extractCorners(info.points);
  // Smooth ellipses still produce gentle curvature peaks at their narrow ends.
  // Only a genuinely sharp turn (triangle/rectangle) should reject the ellipse.
  const sharpestCorner = Math.max(0, ...corners.map(corner => corner.score));
  if (sharpestCorner >= 0.7) return null;
  const samples = resample(info.points, 96, true);
  const center = { x: average(samples.map(sample => sample.x)), y: average(samples.map(sample => sample.y)) };
  const covariance = samples.reduce((result, sample) => {
    const x = sample.x - center.x;
    const y = sample.y - center.y;
    result.xx += x * x;
    result.xy += x * y;
    result.yy += y * y;
    return result;
  }, { xx: 0, xy: 0, yy: 0 });
  covariance.xx /= samples.length;
  covariance.xy /= samples.length;
  covariance.yy /= samples.length;
  const angle = 0.5 * Math.atan2(2 * covariance.xy, covariance.xx - covariance.yy);
  const primary = { x: Math.cos(angle), y: Math.sin(angle) };
  const secondary = rotate90(primary);
  const projections = samples.map(sample => {
    const relative = subtract(sample, center);
    return { primary: dot(relative, primary), secondary: dot(relative, secondary) };
  });
  const radiusPrimary = Math.max(percentile(projections.map(item => Math.abs(item.primary)), 0.96), EPSILON);
  const radiusSecondary = Math.max(percentile(projections.map(item => Math.abs(item.secondary)), 0.96), EPSILON);
  const ratio = radiusPrimary / radiusSecondary;
  if (ratio < 0.28 || ratio > 3.6) return null;
  const radialError = average(projections.map(item => Math.abs(Math.hypot(item.primary / radiusPrimary, item.secondary / radiusSecondary) - 1)));
  const radiusScore = 1 - clamp(radialError / 0.19);
  const circumference = Math.PI * (3 * (radiusPrimary + radiusSecondary) - Math.sqrt((3 * radiusPrimary + radiusSecondary) * (radiusPrimary + 3 * radiusSecondary)));
  const perimeterRatio = info.length / Math.max(circumference, EPSILON);
  const perimeterScore = 1 - clamp(Math.abs(1 - perimeterRatio) / 0.28);
  const cornerScore = 1 - clamp((sharpestCorner - 0.34) / 0.36);
  const closureScore = clamp((0.16 - info.closedness) / 0.16);
  const confidence = clamp(radiusScore * 0.46 + perimeterScore * 0.22 + cornerScore * 0.2 + closureScore * 0.12, 0, 0.99);
  if (confidence < 0.7 || radiusScore < 0.52 || cornerScore < 0.4) return null;
  const generated = [];
  for (let index = 0; index <= 64; index += 1) {
    const theta = (Math.PI * 2 * index) / 64;
    generated.push(point(
      center.x + primary.x * Math.cos(theta) * radiusPrimary + secondary.x * Math.sin(theta) * radiusSecondary,
      center.y + primary.y * Math.cos(theta) * radiusPrimary + secondary.y * Math.sin(theta) * radiusSecondary,
      samples[index % samples.length]
    ));
  }
  return { type: "ellipse", confidence, stroke: createStroke(stroke, generated, "ellipse", confidence) };
}

function requestedType(intent) {
  return ["line", "rectangle", "ellipse", "triangle"].includes(intent) ? intent : "auto";
}

/**
 * Returns the strongest geometric candidate without mutating the stroke.
 * intent can lock the recognizer to line, rectangle, ellipse or triangle.
 */
export function analyzeShape(stroke, { intent = "auto" } = {}) {
  const info = describeStroke(stroke);
  if (!info) return null;
  const target = requestedType(intent);
  const builders = {
    line: () => lineCandidate(stroke, info),
    rectangle: () => rectangleCandidate(stroke, info),
    ellipse: () => ellipseCandidate(stroke, info),
    triangle: () => triangleCandidate(stroke, info)
  };
  const candidates = target === "auto"
    ? [builders.line(), builders.rectangle(), builders.triangle(), builders.ellipse()]
    : [builders[target]()];
  const ready = candidates.filter(Boolean);
  if (!ready.length) return null;
  return ready.sort((a, b) => b.confidence - a.confidence)[0];
}

/**
 * Returns a snapped clone only when a conservative confidence threshold is met.
 * The default avoids converting uncertain circles, triangles and rectangles.
 */
export function recognizeAndSnap(stroke, { intent = "auto", minConfidence = 0.86 } = {}) {
  const candidate = analyzeShape(stroke, { intent });
  if (!candidate || candidate.confidence < clamp(Number(minConfidence) || 0.86, 0.5, 0.99)) return null;
  return candidate;
}

export function expandSymmetry(stroke, count = 1, mirror = false) {
  const copies = [];
  const turns = Math.max(1, Math.min(12, Number(count) || 1));
  const rotatePoint = (source, angle, reflected) => {
    let x = source.x - 0.5;
    let y = source.y - 0.5;
    if (reflected) x = -x;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    return { ...source, x: 0.5 + x * cosine - y * sine, y: 0.5 + x * sine + y * cosine };
  };
  for (let index = 0; index < turns; index += 1) {
    const angle = (Math.PI * 2 * index) / turns;
    copies.push({ ...structuredClone(stroke), points: stroke.points.map(source => rotatePoint(source, angle, false)), meta: { ...(stroke.meta || {}), symmetry: turns, mirror } });
    if (mirror && turns > 1) copies.push({ ...structuredClone(stroke), points: stroke.points.map(source => rotatePoint(source, angle, true)), meta: { ...(stroke.meta || {}), symmetry: turns, mirror } });
  }
  return copies;
}

export function previewSymmetry(stroke, count = 1, mirror = false) {
  return expandSymmetry(stroke, count, mirror);
}
