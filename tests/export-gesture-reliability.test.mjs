import assert from "node:assert/strict";
import { createExportPlan } from "../web/assets/js/features/exporter.js";
import { smoothStrokePoint } from "../web/assets/js/features/stroke-smoother.js";
import { createShortcutGate, recognizeGestureShortcut, SHORTCUT_LABELS } from "../web/assets/js/features/gesture-shortcuts.js";

// Geometry deliberately represents two raised fingers with the ring and pinky folded.
function twoFingerHand() {
  const points = Array.from({ length: 21 }, () => ({ x: .5, y: .82 }));
  points[0] = { x: .50, y: .94 };
  points[2] = { x: .38, y: .82 }; points[3] = { x: .34, y: .75 }; points[4] = { x: .30, y: .68 };
  points[5] = { x: .43, y: .78 }; points[6] = { x: .43, y: .56 }; points[7] = { x: .43, y: .40 }; points[8] = { x: .43, y: .25 };
  points[9] = { x: .55, y: .78 }; points[10] = { x: .55, y: .55 }; points[11] = { x: .55, y: .39 }; points[12] = { x: .55, y: .22 };
  points[13] = { x: .65, y: .80 }; points[14] = { x: .65, y: .72 }; points[15] = { x: .62, y: .78 }; points[16] = { x: .67, y: .79 };
  points[17] = { x: .74, y: .82 }; points[18] = { x: .74, y: .76 }; points[19] = { x: .72, y: .82 }; points[20] = { x: .77, y: .83 };
  return points;
}

const squareFit = createExportPlan({ preset: "square", source: { width: 400, height: 800 }, scale: 1, layout: "fit" });
assert.equal(squareFit.width, 1080);
assert.equal(squareFit.height, 1080);
assert.equal(squareFit.scaleX, 1.35);
assert.equal(squareFit.scaleY, 1.35);
assert.equal(squareFit.offsetX, 270);
assert.equal(squareFit.offsetY, 0);

const squareFill = createExportPlan({ preset: "square", source: { width: 400, height: 800 }, scale: 2, layout: "fill" });
assert.equal(squareFill.width, 2160);
assert.equal(squareFill.height, 2160);
assert.equal(squareFill.scaleX, 5.4);
assert.equal(squareFill.scaleY, 5.4);
assert.equal(squareFill.offsetX, 0);
assert.equal(squareFill.offsetY, -1080);

const stretched = createExportPlan({ preset: "widescreen", source: { width: 400, height: 800 }, layout: "stretch" });
assert.equal(stretched.scaleX, 4.8);
assert.equal(stretched.scaleY, 1.35);
assert.ok(stretched.strokeScale > 2);

const printSafe = createExportPlan({ preset: "a3-landscape", source: { width: 400, height: 800 }, scale: 4, layout: "fit" });
assert.equal(printSafe.limited, true);
assert.ok(printSafe.width * printSafe.height <= 34_100_000);

const previous = { x: .20, y: .20, pressure: 1, time: 100 };
const raw = { x: .24, y: .21, pressure: .8, time: 116 };
const smoothed = smoothStrokePoint(previous, raw, { smoothing: 70, source: "pointer" });
assert.ok(smoothed && smoothed.x > previous.x && smoothed.x < raw.x);
assert.equal(smoothed.pressure, .8);
assert.equal(smoothStrokePoint(previous, { ...previous, time: 110 }, { smoothing: 60, source: "hand" }), null);

assert.equal(recognizeGestureShortcut(twoFingerHand(), .45), "two-finger");
assert.equal(SHORTCUT_LABELS["two-finger"], "Eraser");
const gate = createShortcutGate({ holdMs: 100, cooldownMs: 300 });
assert.equal(gate.observe("two-finger", 1000), "");
assert.equal(gate.observe("two-finger", 1099), "");
assert.equal(gate.observe("two-finger", 1100), "two-finger");
assert.equal(gate.observe("two-finger", 1220), "");
assert.equal(gate.observe("two-finger", 1401), "two-finger");

console.log("Export, smoothing and hand-gesture QA passed.");
