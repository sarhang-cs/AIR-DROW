import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FEATURE_VALIDATION_CHECK_IDS, summarizeFeatureValidation } from "../web/assets/js/features/feature-validation.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
assert.deepEqual(FEATURE_VALIDATION_CHECK_IDS, ["ProjectStorage", "RasterExport", "WebP", "VectorFiles", "ShareRoute", "PwaOffline", "LegacyRuntime"]);
assert.deepEqual(summarizeFeatureValidation([{ state:"ready" }, { state:"limited" }]), { ready:1, total:2, complete:false });
assert.deepEqual(summarizeFeatureValidation(FEATURE_VALIDATION_CHECK_IDS.map(() => ({ state:"ready" }))), { ready:7, total:7, complete:true });
assert.match(read("web/assets/js/core/project-store.js"), /async probeIntegrity\(\)/);
assert.match(read("web/assets/js/core/project-store.js"), /finally \{\s*try \{ await removeRecord\(id\); \} catch \{\}/);
assert.match(read("web/assets/js/features/feature-validation.js"), /never opens the camera/i);
console.log("Final release candidate feature-validation safety contract passed.");
