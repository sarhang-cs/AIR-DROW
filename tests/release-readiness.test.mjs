import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const json = file => JSON.parse(read(file));
const release = json("web/release.json");
const source = read("web/index.html");
const worker = read("web/sw.js");
const manifest = json("web/manifest.webmanifest");

assert.equal(release.version, "8.3.2");
assert.equal(release.assetRevision, "832");
assert.match(source, /assets\/css\/production-ui\.css\?v=832/);
assert.doesNotMatch(source, /(?:manifest|assets\/css|toolbar-icons)\.\w+(?:\?v=)(?:770|790|800|810|820)/);
assert.match(source, new RegExp(`const BUILD_ID = "${release.buildId}"`));
assert.match(worker, new RegExp(`const BUILD_ID = "${release.buildId}"`));
assert.match(worker, /assets\/css\/production-ui\.css\?v=832/);
assert.match(manifest.start_url, /build=v832/);
const docs = [read("README.md"), read("README_KU.md"), read("docs/RELEASE_NOTES.md")].join("\n");
assert.doesNotMatch(docs, /Palm quick-saves|thumb-up opens|کف دەست وێنەکە خێرا دابەزێنێت|شەست export/iu);
assert.match(docs, /No hand pose can save, export, clear, share or download/);
assert.match(docs, /temporary canvas|canvas ـێکی کاتی/iu);
console.log("Release metadata, cache identity, launch-validation and safe gesture documentation QA passed.");
