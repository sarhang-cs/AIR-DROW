import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createPersistenceGuard } from "../web/assets/js/core/persistence-guard.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(resolve(root, file), "utf8");
const app = read("web/assets/js/app.js");
const exporter = read("web/assets/js/features/exporter.js");
const backup = read("web/assets/js/core/backup-manager.js");
const onboarding = read("web/assets/js/features/onboarding-flow.js");
const manager = read("web/assets/js/core/release-manager.js");
const worker = read("web/sw.js");
const i18n = read("web/assets/js/i18n/translations.js");
const release = JSON.parse(read("web/release.json"));

if (!existsSync(resolve(root, "web/assets/js/core/persistence-guard.js"))) throw new Error("Phase 4 persistence guard is missing.");
if (release.phase < 4) throw new Error("Phase 4 project-safety baseline is missing from this release.");
for (const marker of [
  "createPersistenceGuard", "captureRecoveryJournal", "recoverIfNewer", "flushProjectSave",
  'reason: "pagehide"', 'reason: "hidden"', "beforeunload", "Project could not be saved before export",
  'reason: "update"', "storageJournalRecovered"
]) if (!app.includes(marker)) throw new Error(`Phase 4 app-safety marker missing: ${marker}`);
for (const marker of ["MAX_JOURNAL_BYTES", "recoverIfNewer", "clear({ ifOlderThan", "session scoped"]) {
  const guard = read("web/assets/js/core/persistence-guard.js");
  if (!guard.includes(marker)) throw new Error(`Persistence guard marker missing: ${marker}`);
}
for (const marker of ["encodeRaster", "WebP", "fallback: true", "new File", "downloadBlob(encoded.blob"]) if (!exporter.includes(marker)) throw new Error(`Export safety marker missing: ${marker}`);
if (!backup.includes("20_000")) throw new Error("Android-safe backup download lifetime is missing.");
for (const marker of ["returnFocus", 'event.key === "ArrowRight"', "touchstart", "touchend", "previous()"]) if (!onboarding.includes(marker)) throw new Error(`Touch onboarding marker missing: ${marker}`);
for (const marker of ["The current project was not saved before the update.", "throw error", "return true"]) if (!manager.includes(marker)) throw new Error(`Update safety marker missing: ${marker}`);
if (!worker.includes('/assets/js/core/persistence-guard.js')) throw new Error("Service worker must cache the Phase 4 persistence guard.");
for (const marker of ["storageJournalRecovered", "exportFallbackPng", "updateFailed"]) if (!i18n.includes(marker)) throw new Error(`Phase 4 translation missing: ${marker}`);

const memory = new Map();
const storage = { getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
let now = new Date("2026-07-03T00:00:00Z");
const guard = createPersistenceGuard({ storage, now: () => now });
const project = { schema: "airdrow-project", savedAt: now.toISOString(), strokes: [{ points: [{ x: .1, y: .2 }] }] };
if (!guard.capture(project).stored) throw new Error("Recovery journal must store a bounded valid project.");
if (!guard.recoverIfNewer("2026-06-01T00:00:00Z")?.project) throw new Error("Recovery journal must return its project when newer.");
if (guard.recoverIfNewer("2026-08-01T00:00:00Z")) throw new Error("Recovery journal must not override a newer persisted project.");
if (!guard.clear({ ifOlderThan: "2026-08-01T00:00:00Z" })) throw new Error("Recovery journal must clear after a confirmed newer save.");
console.log(`AIR-DROW Phase 4 project safety verified: v${release.version} / protected drafts, safe export fallback, controlled update save and touch onboarding.`);
