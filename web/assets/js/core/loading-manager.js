import { lastItem } from "./legacy-compat.js";
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Number(value) || 0));
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

/**
 * AIR-DROW loading runtime.
 *
 * It deliberately distinguishes between:
 * - boot work (full-screen branded intro)
 * - long-running user tasks (determinate/indeterminate progress)
 * - gallery hydration (skeleton cards)
 *
 * No fake percentage is shown for external work such as an AI request. Instead,
 * the task keeps a calm indeterminate rail until a real stage changes.
 */
export function createLoadingManager({ root = document } = {}) {
  const byId = id => root.getElementById(id);
  const boot = byId("appBoot");
  const bootLabel = byId("bootLabel");
  const bootPercent = byId("bootPercent");
  const bootFill = byId("bootProgressFill");
  const route = byId("routeProgress");
  const routeFill = byId("routeProgressFill");
  const gallery = byId("galleryList");
  const bootStartedAt = performance.now();
  const active = new Map();
  let finished = false;

  function setBoot({ progress = 0, label = "" } = {}) {
    const safeProgress = clamp(progress);
    if (bootFill) bootFill.style.setProperty("--progress", `${safeProgress}%`);
    if (bootPercent) bootPercent.textContent = `${Math.round(safeProgress)}%`;
    if (bootLabel && label) bootLabel.textContent = label;
  }

  function syncRoute() {
    if (!route || !routeFill) return;
    const tasks = [...active.values()].filter(task => task.global !== false);
    if (!tasks.length) {
      route.hidden = true;
      routeFill.style.setProperty("--progress", "0%");
      return;
    }
    const latest = lastItem(tasks);
    route.hidden = false;
    route.dataset.indeterminate = latest.indeterminate ? "true" : "false";
    routeFill.style.setProperty("--progress", `${latest.indeterminate ? 72 : clamp(latest.progress, 6, 96)}%`);
  }

  function updateTaskNode(id, task) {
    const node = root.querySelector(`[data-progress-task="${id}"]`);
    if (!node) return;
    const fill = node.querySelector("[data-progress-fill]");
    const label = node.querySelector("[data-progress-label]");
    const percent = node.querySelector("[data-progress-percent]");
    node.hidden = false;
    node.dataset.indeterminate = task.indeterminate ? "true" : "false";
    node.classList.add("is-active");
    if (fill) fill.style.setProperty("--progress", `${task.indeterminate ? 72 : clamp(task.progress, 5, 100)}%`);
    if (label && task.label) label.textContent = task.label;
    if (percent) percent.textContent = task.indeterminate ? "…" : `${Math.round(clamp(task.progress))}%`;
  }

  function beginTask(id, { label = "", progress = 8, indeterminate = false, global = true } = {}) {
    const task = { id, label, progress: clamp(progress), indeterminate: Boolean(indeterminate), global };
    active.set(id, task);
    updateTaskNode(id, task);
    syncRoute();
    return task;
  }

  function updateTask(id, { label, progress, indeterminate } = {}) {
    const task = active.get(id) || beginTask(id, {});
    if (typeof label === "string") task.label = label;
    if (typeof progress === "number") task.progress = clamp(progress);
    if (typeof indeterminate === "boolean") task.indeterminate = indeterminate;
    active.set(id, task);
    updateTaskNode(id, task);
    syncRoute();
    return task;
  }

  function endTask(id, { keepVisible = false } = {}) {
    const task = active.get(id);
    active.delete(id);
    const node = root.querySelector(`[data-progress-task="${id}"]`);
    if (node) {
      node.dataset.indeterminate = "false";
      node.classList.remove("is-active");
      const fill = node.querySelector("[data-progress-fill]");
      if (fill) fill.style.setProperty("--progress", "100%");
      if (!keepVisible) setTimeout(() => { if (!active.has(id)) node.hidden = true; }, 280);
    }
    syncRoute();
    return task;
  }

  function showGallerySkeleton({ cards = 3 } = {}) {
    if (!gallery) return;
    const skeletons = Array.from({ length: cards }, () => {
      const card = root.createElement("article");
      card.className = "gallery-skeleton";
      card.setAttribute("aria-hidden", "true");
      card.innerHTML = '<span class="gallery-skeleton-thumb"></span><span class="gallery-skeleton-lines"><i></i><i></i></span><span class="gallery-skeleton-actions"><i></i><i></i></span>';
      return card;
    });
    gallery.replaceChildren(...skeletons);
  }

  async function finishBoot({ label = "", minimumDuration = 720 } = {}) {
    if (finished) return;
    finished = true;
    setBoot({ progress: 100, label });
    const remaining = Math.max(0, minimumDuration - (performance.now() - bootStartedAt));
    if (remaining) await delay(remaining);
    if (!boot) return;
    boot.dataset.state = "leaving";
    await delay(380);
    boot.hidden = true;
    document.documentElement.classList.add("app-ready");
  }

  function failBoot(label = "Studio could not start") {
    setBoot({ progress: 100, label });
    return finishBoot({ label, minimumDuration: 420 });
  }

  return { setBoot, beginTask, updateTask, endTask, showGallerySkeleton, finishBoot, failBoot };
}
