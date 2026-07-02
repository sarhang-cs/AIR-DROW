import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const app = readFileSync(resolve(root, "web/assets/js/app.js"), "utf8");
const bootstrap = readFileSync(resolve(root, "web/assets/js/features/hand-engine-bootstrap.js"), "utf8");

for (const marker of [
  "open-hand geometry gate",
  "HAND_GUIDE_MIN_SCORE = .34",
  "HAND_GUIDE_MIN_SCALE = .020",
  "HAND_GUIDE_HOLD_MS = 260",
  "function cacheHandGuide",
  "function drawHeldHandGuide",
  "state.lastGuideLandmarks = points.map",
  "drawHeldHandGuide(now)",
  "const guideDetected = cacheHandGuide(landmarks, geometry, now)",
  "if (state.settings.showHandGuide && guideDetected) drawHandSkeleton(landmarks)",
  "drawHandSkeleton(state.lastGuideLandmarks, opacity)",
  "function drawHandSkeleton(points, opacity = 1)",
  "handCtx.globalAlpha"
]) {
  if (!app.includes(marker)) throw new Error(`Closed-fist guide continuity marker missing: ${marker}`);
}

if (app.includes("if (state.settings.showHandGuide && assessment.usable) drawHandSkeleton(landmarks)")) {
  throw new Error("The visible guide must not be gated by open-hand drawing eligibility.");
}
if (!app.includes("const candidate = handGeometryIsUsable(geometry, rule)")) {
  throw new Error("Strict hand geometry gate for drawing safety is missing.");
}
if (!app.includes("const confidence = Math.max(.46, currentRule().confidence - .08)")) {
  throw new Error("Closed-fist detector tolerance is missing.");
}
if (!bootstrap.includes("minHandDetectionConfidence: confidence") || !bootstrap.includes("minHandPresenceConfidence: trackingConfidence")) {
  throw new Error("HandLandmarker confidence options are incomplete.");
}
console.log("AIR-DROW closed-fist guide continuity verified: guide visibility is decoupled from strict drawing eligibility.");
