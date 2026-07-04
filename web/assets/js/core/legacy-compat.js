/**
 * Legacy WebKit safety helpers.
 *
 * iPhone 7-era Safari can lack structuredClone() and Array.prototype.at().
 * AIR-DROW uses only serializable drawing/settings records here, so the JSON
 * fallback preserves the project semantics without crashing the editor.
 */
export function cloneValue(value) {
  if (typeof globalThis.structuredClone === "function") {
    try { return globalThis.structuredClone(value); } catch { /* fall through */ }
  }
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

export function lastItem(list) {
  return Array.isArray(list) && list.length ? list[list.length - 1] : undefined;
}
