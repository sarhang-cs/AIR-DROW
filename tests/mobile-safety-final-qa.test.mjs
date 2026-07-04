import assert from "node:assert/strict";
import { createExportPlan } from "../web/assets/js/features/exporter.js";
import { createShortcutGate } from "../web/assets/js/features/gesture-shortcuts.js";

// A portrait export must preserve its exact requested dimensions at 1× while
// Fit maps the source uniformly; this is the pure geometry underlying the
// source-first renderer used on Android.
const story = createExportPlan({ preset: "story", source: { width: 360, height: 720 }, scale: 1, layout: "fit" });
assert.equal(story.width, 1080);
assert.equal(story.height, 1920);
assert.equal(story.scaleX, story.scaleY);

// Memory limiting remains active for a high-resolution A3 request.
const a3 = createExportPlan({ preset: "a3-landscape", source: { width: 360, height: 720 }, scale: 4, layout: "fit" });
assert.equal(a3.limited, true);
assert.ok(a3.width * a3.height <= 34_000_000);

// Two-finger recognition is delayed and rate-limited. It cannot produce any
// export/download action because the shortcut module returns only its name.
const gate = createShortcutGate({ holdMs: 500, cooldownMs: 1000 });
assert.equal(gate.observe("two-finger", 0), "");
assert.equal(gate.observe("two-finger", 499), "");
assert.equal(gate.observe("two-finger", 500), "two-finger");
assert.equal(gate.observe("two-finger", 800), "");

console.log("Mobile safety, source-export geometry and gesture QA passed.");
