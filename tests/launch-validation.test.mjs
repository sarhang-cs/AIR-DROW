import assert from "node:assert/strict";
import { READINESS_CHECK_IDS, summarizeReadiness } from "../web/assets/js/features/device-readiness.js";

assert.deepEqual(READINESS_CHECK_IDS, [
  "Secure", "CameraApi", "LocalModel", "Storage", "Pwa", "Gpu", "Network", "Canvas", "RasterExport", "SaveRoute"
]);

const ready = summarizeReadiness([
  { state: "ready" },
  { state: "ready" },
  { state: "limited" }
]);
assert.deepEqual(ready, { ready: 2, total: 3, complete: false });
assert.deepEqual(summarizeReadiness([{ state: "ready" }]), { ready: 1, total: 1, complete: true });
assert.deepEqual(summarizeReadiness(null), { ready: 0, total: 0, complete: false });

console.log("On-device launch validation readiness contract passed.");
