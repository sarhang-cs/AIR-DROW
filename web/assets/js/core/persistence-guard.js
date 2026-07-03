/**
 * A tiny same-tab recovery journal for the gap between a drawing gesture and
 * IndexedDB committing it. The journal is intentionally session scoped: it
 * protects refresh, renderer restart and background-tab eviction without
 * turning browser storage into an unbounded second project database.
 */
const JOURNAL_KEY = "air-drow.project-recovery-journal";
const JOURNAL_SCHEMA = "air-drow-recovery-journal";
const JOURNAL_VERSION = 1;
const MAX_JOURNAL_BYTES = 1_750_000;

function asRecord(value) {
  if (!value || typeof value !== "object" || value.schema !== JOURNAL_SCHEMA || value.version !== JOURNAL_VERSION) return null;
  if (!value.project || typeof value.project !== "object" || !Array.isArray(value.project.strokes)) return null;
  const savedAt = Date.parse(value.savedAt || value.project.savedAt || "");
  if (!Number.isFinite(savedAt)) return null;
  return { ...value, savedAt: new Date(savedAt).toISOString() };
}

function encode(record) {
  try { return JSON.stringify(record); } catch { return ""; }
}

export function createPersistenceGuard({ storage = globalThis.sessionStorage, now = () => new Date() } = {}) {
  function read() {
    try { return asRecord(JSON.parse(storage?.getItem?.(JOURNAL_KEY) || "null")); } catch { return null; }
  }

  function capture(project) {
    if (!project || !Array.isArray(project.strokes)) return { stored: false, reason: "invalid" };
    const savedAt = project.savedAt || now().toISOString();
    const record = {
      schema: JOURNAL_SCHEMA,
      version: JOURNAL_VERSION,
      savedAt,
      project: { ...project, savedAt }
    };
    const encoded = encode(record);
    if (!encoded) return { stored: false, reason: "encode" };
    if (new Blob([encoded]).size > MAX_JOURNAL_BYTES) return { stored: false, reason: "large" };
    try {
      storage?.setItem?.(JOURNAL_KEY, encoded);
      return { stored: true, savedAt: record.savedAt, bytes: encoded.length };
    } catch {
      return { stored: false, reason: "storage" };
    }
  }

  function clear({ ifOlderThan = "" } = {}) {
    const current = read();
    if (!current) return false;
    if (ifOlderThan) {
      const limit = Date.parse(ifOlderThan);
      const journalAt = Date.parse(current.savedAt);
      if (Number.isFinite(limit) && Number.isFinite(journalAt) && journalAt > limit) return false;
    }
    try { storage?.removeItem?.(JOURNAL_KEY); return true; } catch { return false; }
  }

  function recoverIfNewer(savedAt = "") {
    const record = read();
    if (!record) return null;
    const journalAt = Date.parse(record.savedAt);
    const persistedAt = Date.parse(savedAt || "");
    if (!Number.isFinite(journalAt)) return null;
    if (Number.isFinite(persistedAt) && journalAt <= persistedAt) return null;
    return record;
  }

  return { read, capture, clear, recoverIfNewer, key: JOURNAL_KEY, maxBytes: MAX_JOURNAL_BYTES };
}
