import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHandCalibration, HAND_CALIBRATION_DEFAULT, mapHandPoint, normalizeHandCalibration } from "../web/assets/js/features/hand-calibration.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const app = readFileSync(resolve(root, "web/assets/js/app.js"), "utf8");
const html = readFileSync(resolve(root, "web/index.html"), "utf8");
const worker = readFileSync(resolve(root, "web/sw.js"), "utf8");
const modulePath = resolve(root, "web/assets/js/features/hand-calibration.js");

if (!existsSync(modulePath)) throw new Error("Hand calibration module is missing.");
for (const marker of ["createHandCalibration", "mapHandPoint", "trackingAssessment", "updateHandCalibrationStatus", "startHandCalibration"]) {
  if (!app.includes(marker)) throw new Error(`Hand calibration runtime marker missing: ${marker}`);
}
for (const id of ["handCalibrationOverlay", "handCalibrationTarget", "calibrateHandBtn", "resetHandCalibrationBtn", "handTrackingHealth", "handTrackingMeterFill"]) {
  if (!html.includes(`id=\"${id}\"`)) throw new Error(`Hand calibration UI control missing: ${id}`);
}
if (!worker.includes("hand-calibration.js")) throw new Error("Service worker must pre-cache the hand calibration module.");

const defaultMapped = mapHandPoint({ x: .25, y: .6 }, HAND_CALIBRATION_DEFAULT, { mirror: false });
if (Math.abs(defaultMapped.x - .25) > .0001 || Math.abs(defaultMapped.y - .6) > .0001) throw new Error("Default mapping must keep the original point.");

const session = createHandCalibration({ holdMs: 120, maxJitter: .05 });
session.start(1);
const displayTargets = [
  { x: .22, y: .18 }, { x: .78, y: .18 }, { x: .78, y: .82 }, { x: .22, y: .82 }
];
let completed = null;
for (const target of displayTargets) {
  // mirror:true means the raw source is horizontally inverted before capture.
  const raw = { x: 1 - target.x, y: target.y };
  for (let index = 0; index < 5; index += 1) {
    const event = session.observe(raw, { now: 1000 + index * 35, stable: true, usable: true, mirror: true });
    if (event.type === "complete") completed = event;
  }
}
if (!completed?.calibration?.enabled) throw new Error("Guided calibration did not complete.");
const safe = normalizeHandCalibration(completed.calibration);
if (!(safe.xMax > safe.xMin && safe.yMax > safe.yMin)) throw new Error("Calibration bounds are invalid.");
const mappedLeft = mapHandPoint({ x: .78, y: .18 }, safe, { mirror: true });
const mappedRight = mapHandPoint({ x: .22, y: .82 }, safe, { mirror: true });
if (mappedLeft.x > .08 || mappedRight.x < .92 || mappedLeft.y > .08 || mappedRight.y < .92) throw new Error("Calibrated mapping does not cover the drawing area.");
if (normalizeHandCalibration({ enabled: true, xMin: .6, xMax: .7, yMin: .6, yMax: .7 }).enabled) throw new Error("Unsafe tiny calibration bounds must be rejected.");

console.log("AIR-DROW Hand Calibration verified: guided mapping, local confidence guard and offline cache are wired.");
