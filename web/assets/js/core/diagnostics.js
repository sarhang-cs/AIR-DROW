/**
 * Local-only diagnostics for recovery and support. The log deliberately never
 * records drawing points, camera frames, project titles, or API URLs.
 */
const STORAGE_KEY = "air-drow.diagnostics.v1";
const MAX_ENTRIES = 40;

function safeText(value, max = 220) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function readEntries() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(item => item && typeof item === "object").slice(-MAX_ENTRIES) : [];
  } catch { return []; }
}

function persist(entries) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES))); } catch {}
}

function errorSummary(error) {
  if (error instanceof Error) return safeText(`${error.name}: ${error.message}`);
  return safeText(error);
}

export function createDiagnostics({ release = "AIR-DROW", getContext = () => ({}) } = {}) {
  let entries = readEntries();
  const record = (kind, errorOrDetail = "", extra = {}) => {
    const entry = {
      at: new Date().toISOString(),
      kind: safeText(kind, 48) || "runtime",
      detail: errorSummary(errorOrDetail),
      ...extra
    };
    entries = [...entries, entry].slice(-MAX_ENTRIES);
    persist(entries);
    return entry;
  };

  const attachGlobalHandlers = () => {
    window.addEventListener("error", event => {
      record("window-error", event.error || event.message, { source: safeText(event.filename || "", 96), line: Number(event.lineno) || 0 });
    });
    window.addEventListener("unhandledrejection", event => record("unhandled-rejection", event.reason));
  };

  const report = () => {
    const context = getContext() || {};
    const lines = [
      `AIR-DROW diagnostics · ${release}`,
      `Created: ${new Date().toISOString()}`,
      "Privacy: no drawing, camera frame, project title, or API URL is included.",
      `Runtime: ${safeText(navigator.userAgent, 180)}`,
      ...Object.entries(context).map(([key, value]) => `${safeText(key, 48)}: ${safeText(value, 180)}`),
      "Recent local events:"
    ];
    if (!entries.length) lines.push("- No recorded errors.");
    else entries.forEach(entry => lines.push(`- ${entry.at} · ${entry.kind}${entry.detail ? ` · ${entry.detail}` : ""}`));
    return lines.join("\n");
  };

  const clear = () => { entries = []; try { localStorage.removeItem(STORAGE_KEY); } catch {} };
  return { record, report, clear, attachGlobalHandlers, get size() { return entries.length; } };
}
