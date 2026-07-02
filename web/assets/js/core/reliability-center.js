/**
 * AIR-DROW Reliability Center
 * A non-blocking, action-oriented status surface for recoverable problems.
 * It keeps camera, storage, offline and export failures understandable without
 * trapping the user in a modal dialog.
 */
export function createReliabilityCenter({ root, icon, title, body, action, dismiss }) {
  let actionHandler = null;
  let activeKind = "";
  let lastFocus = null;

  function visible() { return root && !root.hidden; }

  function hide({ restoreFocus = false } = {}) {
    if (!root) return;
    root.hidden = true;
    root.dataset.kind = "";
    action.hidden = true;
    action.textContent = "";
    actionHandler = null;
    activeKind = "";
    if (restoreFocus && lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
    lastFocus = null;
  }

  function show({ kind = "notice", iconText = "i", heading = "", message = "", actionLabel = "", onAction = null, persistent = false } = {}) {
    if (!root) return;
    lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    activeKind = kind;
    root.hidden = false;
    root.dataset.kind = kind;
    root.dataset.persistent = String(Boolean(persistent));
    if (icon) icon.textContent = iconText;
    if (title) title.textContent = heading;
    if (body) body.textContent = message;
    actionHandler = typeof onAction === "function" ? onAction : null;
    action.hidden = !actionHandler;
    action.textContent = actionHandler ? actionLabel : "";
  }

  function dismissKind(kind) {
    if (activeKind === kind) hide();
  }

  action?.addEventListener("click", async () => {
    const handler = actionHandler;
    if (!handler) return;
    try { await handler(); } catch (error) { console.warn("Recovery action failed", error); }
  });
  dismiss?.addEventListener("click", () => hide({ restoreFocus: true }));

  return { show, hide, dismissKind, visible, get activeKind() { return activeKind; } };
}
