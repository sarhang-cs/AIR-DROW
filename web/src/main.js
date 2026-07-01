import "./style.css";
import { DataVault } from "./data-vault.js";
import { ApiClient, ApiError } from "./api-client.js";
import { InteractionGuard } from "./interaction-guard.js";
import { TouchEngine } from "./touch-engine.js";
import { HandEngine } from "./hand-engine.js";
import lottie from "lottie-web/build/player/lottie_light";

const PROJECT_ID_DEFAULT = "airdraw-default-project";
const stage = document.querySelector("#canvasStage");
const paint = document.querySelector("#paintCanvas");
const overlay = document.querySelector("#overlayCanvas");
const camera = document.querySelector("#camera");
const paintCtx = paint.getContext("2d");
const vault = new DataVault();

const el = id => document.getElementById(id);
const ui = {
  saveBtn: el("saveBtn"), dataBtn: el("dataBtn"), apiBtn: el("apiBtn"),
  manualBtn: el("manualBtn"), handBtn: el("handBtn"), cameraBtn: el("cameraBtn"),
  undoBtn: el("undoBtn"), clearBtn: el("clearBtn"), resetViewBtn: el("resetViewBtn"), exportBtn: el("exportBtn"),
  brushSize: el("brushSize"), brushSizeOut: el("brushSizeOut"), smoothing: el("smoothing"), smoothingOut: el("smoothingOut"),
  colorPicker: el("colorPicker"), pressureToggle: el("pressureToggle"), handProfile: el("handProfile"),
  trackingFps: el("trackingFps"), cameraPreview: el("cameraPreview"), longPressToggle: el("longPressToggle"), busyLockToggle: el("busyLockToggle"),
  modeStatus: el("modeStatus"), pointerStatus: el("pointerStatus"), handStatus: el("handStatus"), fpsStatus: el("fpsStatus"),
  saveStatus: el("saveStatus"), networkStatus: el("networkStatus"), canvasNotice: el("canvasNotice"), toast: el("toast"),
  dataSheet: el("dataSheet"), apiSheet: el("apiSheet"), idbStatus: el("idbStatus"), integrityStatus: el("integrityStatus"),
  checkpointStatus: el("checkpointStatus"), mirrorStatus: el("mirrorStatus"), cacheStatus: el("cacheStatus"), storageStatus: el("storageStatus"),
  swStatus: el("swStatus"), outboxStatus: el("outboxStatus"), verifyDataBtn: el("verifyDataBtn"), restoreBtn: el("restoreBtn"),
  clearCacheBtn: el("clearCacheBtn"), protectStorageBtn: el("protectStorageBtn"),
  apiBaseInput: el("apiBaseInput"), apiProjectIdInput: el("apiProjectIdInput"), apiTokenInput: el("apiTokenInput"),
  healthBtn: el("healthBtn"), pushBtn: el("pushBtn"), pullBtn: el("pullBtn"), flushOutboxBtn: el("flushOutboxBtn"),
  apiHealthStatus: el("apiHealthStatus"), remoteRevisionStatus: el("remoteRevisionStatus"), transportStatus: el("transportStatus"),
  apiResultStatus: el("apiResultStatus"), wsRoomInput: el("wsRoomInput"), connectWsBtn: el("connectWsBtn"), disconnectWsBtn: el("disconnectWsBtn"),
  confirmOverlay: el("confirmOverlay"), confirmTitle: el("confirmTitle"), confirmText: el("confirmText"),
  confirmCancelBtn: el("confirmCancelBtn"), confirmAcceptBtn: el("confirmAcceptBtn"),
  quickMenu: el("quickMenu"), quickSaveBtn: el("quickSaveBtn"), quickResetBtn: el("quickResetBtn"), quickCancelBtn: el("quickCancelBtn"),
  styleBtn: el("styleBtn"), styleSheet: el("styleSheet"), motionStatus: el("motionStatus")
};

let project = createProject();
let mode = "manual";
let currentStroke = null;
let lastPoint = null;
let history = [];
let view = { x: 0, y: 0, scale: 1 };
let renderQueued = false;
let saveTimer = null;
let operationDepth = 0;
let actionBusy = false;
let remoteRevision = 0;
let broadcast = null;
let ws = null;
let suppressTransport = false;
let confirmResolver = null;
let lastFocused = null;
let quickAt = null;
let touchEngine;
let handEngine;
let guard;
const api = new ApiClient();

function createProject() {
  return {
    version: 100,
    id: PROJECT_ID_DEFAULT,
    name: "Untitled Motion Skin Project",
    strokes: [],
    settings: { color: "#7fd8ff", brushSize: 8, smoothing: 42, pressure: true, longPress: true, lockDuringBusy: true },
    revision: 0,
    updatedAt: new Date().toISOString()
  };
}

function clone(value) {
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function toast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ui.toast.classList.remove("show"), 3000);
}

function setText(node, value) {
  if (node) node.textContent = String(value);
}

function setMode(next) {
  mode = next;
  ui.manualBtn.classList.toggle("active", next === "manual");
  ui.handBtn.classList.toggle("active", next === "hand");
  touchEngine?.setEnabled(next === "manual");
  if (next === "manual") {
    handEngine?.stop();
    stage.classList.remove("show-camera");
    setText(ui.modeStatus, "Manual");
    setText(ui.handStatus, "Not started");
    ui.cameraBtn.textContent = "Start Camera";
    ui.canvasNotice.textContent = "Manual: one pointer draws; two touches pan / zoom; long press opens quick actions.";
  } else {
    setText(ui.modeStatus, "Hand");
    ui.canvasNotice.textContent = "Hand: start camera, then pinch thumb + index to draw.";
  }
}

function stageSize() {
  const rect = stage.getBoundingClientRect();
  return { width: rect.width, height: rect.height, dpr: Math.min(window.devicePixelRatio || 1, 2) };
}

function resize() {
  const { width, height, dpr } = stageSize();
  for (const canvas of [paint, overlay]) {
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }
  paintCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  handEngine?.resize(width, height, dpr);
  render();
}

function screenToWorld(point) {
  const { width, height } = stageSize();
  return {
    x: ((point.x - view.x) / view.scale) / width,
    y: ((point.y - view.y) / view.scale) / height,
    pressure: point.pressure ?? 1,
    pointerType: point.pointerType || "unknown",
    time: point.time || performance.now()
  };
}

function handToWorld(point) {
  const { width, height } = stageSize();
  return screenToWorld({
    x: (1 - point.x) * width,
    y: point.y * height,
    pressure: 1,
    pointerType: "hand",
    time: point.time
  });
}

function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

function drawStroke(ctx, stroke, width, height) {
  const points = stroke.points || [];
  if (!points.length) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;

  if (points.length === 1) {
    const p = points[0];
    ctx.beginPath();
    ctx.arc(p.x * width, p.y * height, Math.max(1, stroke.baseWidth / 2), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const pressure = stroke.usePressure ? Math.max(.24, Math.min(1.5, (a.pressure + b.pressure) / 2)) : 1;
    ctx.lineWidth = Math.max(1, stroke.baseWidth * pressure);
    ctx.beginPath();
    ctx.moveTo(a.x * width, a.y * height);
    if (i < points.length - 1) {
      const next = points[i + 1];
      const mx = (b.x + next.x) * .5 * width;
      const my = (b.y + next.y) * .5 * height;
      ctx.quadraticCurveTo(b.x * width, b.y * height, mx, my);
    } else {
      ctx.lineTo(b.x * width, b.y * height);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function render() {
  const { width, height } = stageSize();
  paintCtx.clearRect(0, 0, width, height);
  paintCtx.save();
  paintCtx.translate(view.x, view.y);
  paintCtx.scale(view.scale, view.scale);
  for (const stroke of project.strokes) drawStroke(paintCtx, stroke, width, height);
  if (currentStroke) drawStroke(paintCtx, currentStroke, width, height);
  paintCtx.restore();
}

function markChanged() {
  project.revision += 1;
  project.updatedAt = new Date().toISOString();
}

function pushHistory() {
  history.push(clone(project.strokes));
  if (history.length > 40) history.shift();
}

function undo() {
  if (!project.strokes.length) return;
  pushHistory();
  project.strokes.pop();
  markChanged();
  queueSave();
  scheduleRender();
}

function beginStroke(point, source = "pointer") {
  if (guard.busy) return;
  if ((mode === "hand") !== (source === "hand")) return;
  pushHistory();
  const world = source === "hand" ? handToWorld(point) : screenToWorld(point);
  currentStroke = {
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    color: project.settings.color,
    baseWidth: Number(project.settings.brushSize),
    usePressure: project.settings.pressure,
    source,
    points: [world]
  };
  lastPoint = world;
  scheduleRender();
}

function addStrokePoint(point, source = "pointer") {
  if (!currentStroke || guard.busy) return;
  const raw = source === "hand" ? handToWorld(point) : screenToWorld(point);
  const smooth = Math.max(0, Math.min(.90, Number(project.settings.smoothing) / 100));
  const previous = lastPoint || raw;
  const next = { ...raw, x: previous.x + (raw.x - previous.x) * (1 - smooth), y: previous.y + (raw.y - previous.y) * (1 - smooth) };
  if (Math.hypot(next.x - previous.x, next.y - previous.y) < .001) return;
  currentStroke.points.push(next);
  lastPoint = next;
  scheduleRender();
}

function endStroke() {
  if (!currentStroke) return;
  if (currentStroke.points.length) {
    project.strokes.push(currentStroke);
    markChanged();
    queueSave();
  }
  currentStroke = null;
  lastPoint = null;
  scheduleRender();
}

function pan(dx, dy) {
  if (guard.busy) return;
  view.x += dx;
  view.y += dy;
  scheduleRender();
}

function zoom(factor, anchor) {
  if (guard.busy) return;
  const before = screenToWorld(anchor);
  view.scale = Math.max(.5, Math.min(3.2, view.scale * factor));
  const { width, height } = stageSize();
  view.x = anchor.x - before.x * width * view.scale;
  view.y = anchor.y - before.y * height * view.scale;
  scheduleRender();
}

function resetView() {
  view = { x: 0, y: 0, scale: 1 };
  scheduleRender();
}

function queueSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void saveLocal({ sync: true }), 320);
}

async function withOperation(label, work, { lockCanvas = true } = {}) {
  operationDepth += 1;
  if (lockCanvas && project.settings.lockDuringBusy) {
    guard.setBusy(true);
    touchEngine?.setEnabled(false);
  }
  document.querySelectorAll("[data-busy-lock]").forEach(button => { button.disabled = true; });
  setText(ui.saveStatus, label);
  try {
    return await work();
  } finally {
    operationDepth = Math.max(0, operationDepth - 1);
    if (!operationDepth) {
      guard.setBusy(false);
      touchEngine?.setEnabled(mode === "manual");
      document.querySelectorAll("[data-busy-lock]").forEach(button => { button.disabled = false; });
    }
  }
}

async function saveLocal({ sync = false } = {}) {
  return withOperation("Saving…", async () => {
    const result = await vault.saveProject(clone(project));
    setText(ui.saveStatus, result.mirror.ok ? "Saved + reload mirror" : "Saved (IndexedDB)");
    await refreshDataStatus(result);
    if (sync) {
      sendLocalBroadcast();
      if (ws?.readyState === WebSocket.OPEN) sendWebSocketState();
    }
    return result;
  }, { lockCanvas: false }).catch(error => {
    setText(ui.saveStatus, "Save failed");
    toast(`Local save failed: ${error?.message || "unknown error"}`);
    throw error;
  });
}

async function loadLocal() {
  return withOperation("Loading local data…", async () => {
    const loaded = await vault.loadBest();
    if (loaded.record?.project) {
      project = loaded.record.project;
      project.settings ||= {};
      project.settings.longPress ??= true;
      project.settings.lockDuringBusy ??= true;
      applySettingsToControls();
      setText(ui.saveStatus, loaded.verification.verified ? "Recovered + verified" : "Recovered (unverified)");
    } else {
      setText(ui.saveStatus, "New local project");
    }
    await refreshDataStatus(loaded);
    resize();
  });
}

function applySettingsToControls() {
  ui.colorPicker.value = project.settings.color || "#7fd8ff";
  ui.brushSize.value = String(project.settings.brushSize || 8);
  ui.smoothing.value = String(project.settings.smoothing || 42);
  ui.pressureToggle.checked = project.settings.pressure !== false;
  ui.longPressToggle.checked = project.settings.longPress !== false;
  ui.busyLockToggle.checked = project.settings.lockDuringBusy !== false;
  updateSettingsFromControls();
}

function updateSettingsFromControls() {
  project.settings.color = ui.colorPicker.value;
  project.settings.brushSize = Number(ui.brushSize.value);
  project.settings.smoothing = Number(ui.smoothing.value);
  project.settings.pressure = ui.pressureToggle.checked;
  project.settings.longPress = ui.longPressToggle.checked;
  project.settings.lockDuringBusy = ui.busyLockToggle.checked;
  ui.brushSizeOut.value = String(project.settings.brushSize);
  ui.smoothingOut.value = `${project.settings.smoothing}%`;
  guard?.setOptions({ longPressEnabled: project.settings.longPress, lockDuringBusy: project.settings.lockDuringBusy });
}

function openSheet(sheet) {
  sheet.classList.add("open");
}

function closeSheets() {
  ui.dataSheet.classList.remove("open");
  ui.apiSheet.classList.remove("open");
}

function confirmAction({ title, text, confirmText = "Confirm" }) {
  if (confirmResolver) return Promise.resolve(false);
  lastFocused = document.activeElement;
  ui.confirmTitle.textContent = title;
  ui.confirmText.textContent = text;
  ui.confirmAcceptBtn.textContent = confirmText;
  ui.confirmOverlay.hidden = false;
  requestAnimationFrame(() => ui.confirmCancelBtn.focus());
  return new Promise(resolve => { confirmResolver = resolve; });
}

function resolveConfirm(result) {
  if (!confirmResolver) return;
  const resolve = confirmResolver;
  confirmResolver = null;
  ui.confirmOverlay.hidden = true;
  resolve(Boolean(result));
  try { lastFocused?.focus?.(); } catch {}
}

function showQuickMenu({ x, y }) {
  const rect = stage.getBoundingClientRect();
  quickAt = { x: x - rect.left, y: y - rect.top };
  ui.quickMenu.style.left = `${Math.max(8, Math.min(rect.width - 130, quickAt.x))}px`;
  ui.quickMenu.style.top = `${Math.max(8, Math.min(rect.height - 142, quickAt.y))}px`;
  ui.quickMenu.hidden = false;
}

function hideQuickMenu() {
  ui.quickMenu.hidden = true;
  quickAt = null;
}

async function refreshDataStatus(result = null) {
  try {
    await vault.open();
    setText(ui.idbStatus, "Available");
  } catch {
    setText(ui.idbStatus, "Unavailable");
  }

  const loaded = result?.record ? result : await vault.loadBest();
  if (loaded?.verification) setText(ui.integrityStatus, loaded.verification.verified ? loaded.verification.reason : loaded.verification.reason);
  const checkpoint = await vault.read("meta", "recovery-checkpoint").catch(() => null);
  setText(ui.checkpointStatus, checkpoint?.savedAt ? new Date(checkpoint.savedAt).toLocaleString() : "None");

  const mirror = vault.readMirror();
  setText(ui.mirrorStatus, mirror?.savedAt ? "Available" : "Not stored");
  const estimate = await vault.storageEstimate().catch(() => null);
  setText(ui.storageStatus, estimate ? `${Math.round((estimate.usage || 0) / 1024)} KB used` : "Unavailable");

  const cacheNames = "caches" in window ? await caches.keys().catch(() => []) : [];
  setText(ui.cacheStatus, cacheNames.length ? `${cacheNames.length} cache(s)` : "No cache");
  const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration().catch(() => null) : null;
  setText(ui.swStatus, registration ? "Registered" : "Not registered");
  const outbox = await vault.outboxItems().catch(() => []);
  setText(ui.outboxStatus, `${outbox.length} queued`);
}

function setupBroadcast() {
  if (!("BroadcastChannel" in window)) return;
  broadcast = new BroadcastChannel("airdraw-phase22-local");
  broadcast.onmessage = event => {
    const message = event.data;
    if (message?.type !== "project:update" || message.source === tabId() || !message.project?.strokes) return;
    if ((message.project.revision || 0) <= (project.revision || 0)) return;
    suppressTransport = true;
    project = message.project;
    applySettingsToControls();
    scheduleRender();
    void saveLocal({ sync: false });
    suppressTransport = false;
    toast("Local tab update received.");
  };
  setText(ui.transportStatus, "BroadcastChannel ready");
}

function tabId() {
  sessionStorage.airdrawPhase22Tab ||= `tab-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  return sessionStorage.airdrawPhase22Tab;
}

function transportMessage() {
  return { type: "project:update", source: tabId(), project: clone(project), sentAt: Date.now() };
}

function sendLocalBroadcast() {
  if (suppressTransport) return;
  try { broadcast?.postMessage(transportMessage()); } catch {}
}

function configureApi() {
  const base = ui.apiBaseInput.value.trim();
  const token = ui.apiTokenInput.value;
  api.configure({ baseUrl: base, token });
  sessionStorage.airdrawApiBase = base;
  // Token intentionally stays in memory/session field; it is not saved to IndexedDB/localStorage.
}

function apiProjectId() {
  const value = ui.apiProjectIdInput.value.trim();
  if (!/^[A-Za-z0-9_.-]{1,64}$/.test(value)) throw new Error("Project ID must use only letters, numbers, dot, underscore or dash.");
  return value;
}

async function healthCheck() {
  return withOperation("Checking API…", async () => {
    configureApi();
    const health = await api.health();
    setText(ui.apiHealthStatus, health.auth_required ? `OK • auth required` : "OK • development open mode");
    setText(ui.apiResultStatus, `v${health.version || "?"} • ${health.project_count ?? "?"} project(s)`);
    toast("API health check completed.");
    return health;
  }, { lockCanvas: false }).catch(error => {
    setText(ui.apiHealthStatus, error.code || "Failed");
    setText(ui.apiResultStatus, error.message);
    toast(`Health check failed: ${error.message}`);
  });
}

async function pushServer({ allowOutbox = true } = {}) {
  return withOperation("Pushing server…", async () => {
    configureApi();
    await saveLocal({ sync: false });
    const projectId = apiProjectId();
    try {
      const result = await api.putProject(projectId, {
        project: clone(project),
        baseRevision: remoteRevision,
        updatedAt: project.updatedAt
      });
      remoteRevision = result.revision || remoteRevision;
      setText(ui.remoteRevisionStatus, remoteRevision);
      setText(ui.apiResultStatus, `Saved revision ${remoteRevision}`);
      toast("Project pushed to server.");
      return result;
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setText(ui.apiResultStatus, "Conflict: pull before push");
        toast("Server conflict: pull remote project before pushing again.");
        return null;
      }
      if (allowOutbox && ["NETWORK", "TIMEOUT"].includes(error.code)) {
        await vault.enqueueOutbox({
          kind: "push-project",
          endpoint: api.baseUrl,
          projectId,
          baseRevision: remoteRevision,
          project: clone(project),
          updatedAt: project.updatedAt
        });
        await refreshDataStatus();
        setText(ui.apiResultStatus, "Queued in local outbox");
        toast("Network unavailable: project push queued locally.");
        return null;
      }
      throw error;
    }
  }).catch(error => {
    setText(ui.apiResultStatus, error.message);
    toast(`Push failed: ${error.message}`);
  });
}

async function pullServer() {
  return withOperation("Pulling server…", async () => {
    configureApi();
    const projectId = apiProjectId();
    const remote = await api.getProject(projectId);
    if (!remote?.project?.strokes) throw new Error("Server response has no valid project.");
    const ok = await confirmAction({
      title: "Replace local project?",
      text: "The remote project will replace the current canvas after it is saved locally as a checkpoint.",
      confirmText: "Pull Remote"
    });
    if (!ok) return;
    await saveLocal({ sync: false });
    project = remote.project;
    remoteRevision = remote.revision || 0;
    applySettingsToControls();
    resetView();
    await saveLocal({ sync: false });
    setText(ui.remoteRevisionStatus, remoteRevision);
    setText(ui.apiResultStatus, `Pulled revision ${remoteRevision}`);
    toast("Remote project loaded.");
  }).catch(error => {
    setText(ui.apiResultStatus, error.message);
    toast(`Pull failed: ${error.message}`);
  });
}

async function flushOutbox() {
  return withOperation("Flushing outbox…", async () => {
    configureApi();
    const entries = await vault.outboxItems();
    let sent = 0;
    for (const entry of entries) {
      if (entry.kind !== "push-project") continue;
      if (entry.endpoint !== api.baseUrl) continue;
      try {
        const result = await api.putProject(entry.projectId, {
          project: entry.project,
          baseRevision: entry.baseRevision,
          updatedAt: entry.updatedAt
        });
        remoteRevision = result.revision || remoteRevision;
        await vault.delete("outbox", entry.id);
        sent += 1;
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          toast("Outbox stopped by conflict. Pull the remote project first.");
          break;
        }
        if (["NETWORK", "TIMEOUT"].includes(error.code)) break;
        await vault.delete("outbox", entry.id);
      }
    }
    await refreshDataStatus();
    setText(ui.apiResultStatus, `${sent} outbox item(s) sent`);
  }, { lockCanvas: false }).catch(error => toast(`Outbox failed: ${error.message}`));
}

function sendWebSocketState() {
  if (suppressTransport || ws?.readyState !== WebSocket.OPEN) return;
  try { ws.send(JSON.stringify(transportMessage())); } catch {}
}

function connectWebSocket() {
  configureApi();
  let room = ui.wsRoomInput.value.trim();
  if (!/^[A-Za-z0-9_.-]{1,64}$/.test(room)) return toast("WebSocket room format is invalid.");
  let url;
  try { url = api.webSocketUrl(room); } catch (error) { return toast(error.message); }
  disconnectWebSocket(false);
  setText(ui.transportStatus, "WebSocket connecting…");
  try {
    ws = new WebSocket(url);
  } catch (error) {
    setText(ui.transportStatus, "WebSocket unavailable");
    return toast(error.message);
  }
  ws.addEventListener("open", () => {
    setText(ui.transportStatus, "WebSocket connected");
    sendWebSocketState();
  });
  ws.addEventListener("message", event => {
    try {
      const message = JSON.parse(event.data);
      if (message?.type !== "project:update" || message.source === tabId() || !message.project?.strokes) return;
      if ((message.project.revision || 0) <= (project.revision || 0)) return;
      suppressTransport = true;
      project = message.project;
      applySettingsToControls();
      scheduleRender();
      void saveLocal({ sync: false });
      suppressTransport = false;
      toast("WebSocket project update received.");
    } catch {
      setText(ui.transportStatus, "WebSocket invalid message");
    }
  });
  ws.addEventListener("close", () => setText(ui.transportStatus, broadcast ? "BroadcastChannel ready" : "Not connected"));
  ws.addEventListener("error", () => setText(ui.transportStatus, "WebSocket error"));
}

function disconnectWebSocket(showToast = true) {
  try { ws?.close(1000, "Client disconnect"); } catch {}
  ws = null;
  setText(ui.transportStatus, broadcast ? "BroadcastChannel ready" : "Not connected");
  if (showToast) toast("WebSocket disconnected.");
}

async function clearAppCache() {
  const ok = await confirmAction({
    title: "Clear application cache?",
    text: "This removes cached app files only. IndexedDB project data and recovery checkpoint remain.",
    confirmText: "Clear Cache"
  });
  if (!ok) return;
  await withOperation("Clearing cache…", async () => {
    const controller = navigator.serviceWorker?.controller;
    if (controller) {
      const result = await new Promise(resolve => {
        const channel = new MessageChannel();
        channel.port1.onmessage = event => resolve(event.data);
        controller.postMessage({ type: "CLEAR_APP_CACHE" }, [channel.port2]);
        setTimeout(() => resolve({ ok: false, timeout: true }), 2500);
      });
      if (!result?.ok) throw new Error("Service worker cache clear was not confirmed");
    } else if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.filter(name => name.startsWith("airdraw-phase22")).map(name => caches.delete(name)));
    } else {
      throw new Error("Cache Storage is unavailable");
    }
    await refreshDataStatus();
    toast("Application cache cleared. Local project data remains.");
  }, { lockCanvas: false }).catch(error => toast(`Cache clear failed: ${error.message}`));
}

async function restoreCheckpoint() {
  const ok = await confirmAction({
    title: "Restore checkpoint?",
    text: "The recovery checkpoint will replace the current canvas. The current project is saved first.",
    confirmText: "Restore"
  });
  if (!ok) return;
  await withOperation("Restoring checkpoint…", async () => {
    await saveLocal({ sync: false });
    const restored = await vault.restoreCheckpoint();
    project = restored.record.project;
    applySettingsToControls();
    resetView();
    await saveLocal({ sync: false });
    toast("Recovery checkpoint restored.");
  }).catch(error => toast(`Restore failed: ${error.message}`));
}

async function protectStorage() {
  try {
    const result = await vault.requestPersistence();
    toast(result.supported ? (result.granted ? "Browser granted persistent storage." : "Browser did not grant persistent storage.") : "Persistent storage API unavailable.");
  } catch (error) {
    toast(`Storage protection check failed: ${error.message}`);
  }
}

function exportPNG() {
  const { width, height, dpr } = stageSize();
  const out = document.createElement("canvas");
  out.width = Math.round(width * dpr);
  out.height = Math.round(height * dpr);
  const ctx = out.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#06101d";
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(view.x, view.y);
  ctx.scale(view.scale, view.scale);
  for (const stroke of project.strokes) drawStroke(ctx, stroke, width, height);
  ctx.restore();
  out.toBlob(blob => {
    if (!blob) return toast("PNG export failed.");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `airdraw-${Date.now()}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
}

function bindUI() {
  ui.manualBtn.addEventListener("click", () => setMode("manual"));
  ui.handBtn.addEventListener("click", () => setMode("hand"));
  ui.cameraBtn.addEventListener("click", async () => {
    if (mode !== "hand") setMode("hand");
    if (handEngine.running) {
      handEngine.stop();
      stage.classList.remove("show-camera");
      ui.cameraBtn.textContent = "Start Camera";
      return;
    }
    await withOperation("Starting camera…", async () => {
      try {
        await handEngine.start({
          profileName: ui.handProfile.value,
          targetFps: Number(ui.trackingFps.value),
          preview: ui.cameraPreview.checked
        });
        stage.classList.toggle("show-camera", ui.cameraPreview.checked);
        ui.cameraBtn.textContent = "Stop Camera";
      } catch (error) {
        setText(ui.handStatus, "Unavailable");
        ui.cameraBtn.textContent = "Start Camera";
        toast(`Camera / hand tracking failed: ${error?.message || "unknown error"}`);
      }
    });
  });
  ui.undoBtn.addEventListener("click", undo);
  ui.clearBtn.addEventListener("click", async () => {
    if (!project.strokes.length) return;
    const ok = await confirmAction({ title: "Clear all strokes?", text: "This removes every current stroke from the local project.", confirmText: "Clear" });
    if (!ok) return;
    pushHistory();
    project.strokes = [];
    markChanged();
    await saveLocal({ sync: true });
    resetView();
  });
  ui.resetViewBtn.addEventListener("click", resetView);
  ui.exportBtn.addEventListener("click", exportPNG);
  ui.saveBtn.addEventListener("click", () => void saveLocal({ sync: true }));
  ui.dataBtn.addEventListener("click", () => { openSheet(ui.dataSheet); void refreshDataStatus(); });
  ui.apiBtn.addEventListener("click", () => openSheet(ui.apiSheet));
  document.querySelectorAll(".close-sheet").forEach(button => button.addEventListener("click", closeSheets));

  [ui.brushSize, ui.smoothing, ui.colorPicker, ui.pressureToggle, ui.longPressToggle, ui.busyLockToggle].forEach(control => {
    control.addEventListener("input", () => {
      updateSettingsFromControls();
      queueSave();
    });
  });
  ui.handProfile.addEventListener("change", () => handEngine.applyProfile(ui.handProfile.value).catch(() => toast("Profile will apply when hand tracking starts.")));
  ui.trackingFps.addEventListener("change", () => { handEngine.targetFps = Number(ui.trackingFps.value); });
  ui.cameraPreview.addEventListener("change", () => stage.classList.toggle("show-camera", ui.cameraPreview.checked && handEngine.running));

  ui.verifyDataBtn.addEventListener("click", async () => {
    const loaded = await vault.loadBest();
    await refreshDataStatus(loaded);
    toast(loaded.verification.reason);
  });
  ui.restoreBtn.addEventListener("click", () => void restoreCheckpoint());
  ui.clearCacheBtn.addEventListener("click", () => void clearAppCache());
  ui.protectStorageBtn.addEventListener("click", () => void protectStorage());

  ui.healthBtn.addEventListener("click", () => void healthCheck());
  ui.pushBtn.addEventListener("click", () => void pushServer());
  ui.pullBtn.addEventListener("click", () => void pullServer());
  ui.flushOutboxBtn.addEventListener("click", () => void flushOutbox());
  ui.connectWsBtn.addEventListener("click", connectWebSocket);
  ui.disconnectWsBtn.addEventListener("click", () => disconnectWebSocket());

  ui.confirmCancelBtn.addEventListener("click", () => resolveConfirm(false));
  ui.confirmAcceptBtn.addEventListener("click", () => resolveConfirm(true));
  ui.confirmOverlay.addEventListener("click", event => { if (event.target === ui.confirmOverlay) resolveConfirm(false); });
  window.addEventListener("keydown", event => {
    if (!ui.confirmOverlay.hidden && event.key === "Escape") {
      event.preventDefault();
      resolveConfirm(false);
    } else if (event.key === "Escape") {
      closeSheets();
      hideQuickMenu();
    }
  });

  ui.quickSaveBtn.addEventListener("click", () => { hideQuickMenu(); void saveLocal({ sync: true }); });
  ui.quickResetBtn.addEventListener("click", () => { hideQuickMenu(); resetView(); });
  ui.quickCancelBtn.addEventListener("click", hideQuickMenu);

  window.addEventListener("resize", resize, { passive: true });
  window.visualViewport?.addEventListener("resize", resize, { passive: true });
  window.addEventListener("online", () => { setText(ui.networkStatus, "Online"); void flushOutbox(); });
  window.addEventListener("offline", () => setText(ui.networkStatus, "Offline"));
  document.addEventListener("visibilitychange", () => { if (document.hidden) void saveLocal({ sync: false }); });
  window.addEventListener("pagehide", () => { void saveLocal({ sync: false }); });
  window.addEventListener("beforeunload", () => { try { handEngine.stop(); } catch {} });
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    if (registration.waiting) toast("App update is ready after refresh.");
  } catch {
    // UI status will remain truthful: not registered.
  }
}


/* ===== Phase 23: Motion Skin, Lottie Logo, Dynamic Tabs & Property Management ===== */
const PHASE23_SKIN_RECORD = "phase23-motion-skin";
const PHASE23_DEFAULT_SKIN = {
  skin: "aurora",
  blur: 16,
  radius: 22,
  motion: 70,
  logo: true,
  icons: true,
  glass: true,
  buttons: true
};

let phase23Skin = { ...PHASE23_DEFAULT_SKIN };
let phase23Draft = { ...PHASE23_DEFAULT_SKIN };
let phase23Lottie = null;

const phase23 = {
  logo: el("logoLottie"),
  styleSheet: el("styleSheet"),
  styleBtn: el("styleBtn"),
  apply: el("applySkinBtn"),
  cancel: el("cancelSkinBtn"),
  reset: el("resetSkinBtn"),
  blur: el("skinBlur"),
  blurOut: el("skinBlurOut"),
  radius: el("skinRadius"),
  radiusOut: el("skinRadiusOut"),
  motion: el("skinMotion"),
  motionOut: el("skinMotionOut"),
  logoToggle: el("skinLogoToggle"),
  iconToggle: el("skinIconToggle"),
  glassToggle: el("skinGlassToggle"),
  buttonToggle: el("skinButtonToggle"),
  preview: el("skinPreviewText"),
  status: el("skinStatus"),
  choices: [...document.querySelectorAll("[data-skin-choice]")],
  tabs: [...document.querySelectorAll("[data-ui-tab]")],
  close: [...document.querySelectorAll(".close-style-sheet")]
};

function phase23Clamp(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function phase23NormalizeSkin(value = {}) {
  return {
    skin: ["aurora", "berry", "midnight"].includes(value.skin) ? value.skin : PHASE23_DEFAULT_SKIN.skin,
    blur: phase23Clamp(value.blur, 0, 28, PHASE23_DEFAULT_SKIN.blur),
    radius: phase23Clamp(value.radius, 12, 30, PHASE23_DEFAULT_SKIN.radius),
    motion: phase23Clamp(value.motion, 0, 100, PHASE23_DEFAULT_SKIN.motion),
    logo: value.logo !== false,
    icons: value.icons !== false,
    glass: value.glass !== false,
    buttons: value.buttons !== false
  };
}

function phase23ApplySkin(state, { preview = false } = {}) {
  const skin = phase23NormalizeSkin(state);
  const root = document.documentElement;
  root.dataset.skin = skin.skin;
  root.style.setProperty("--glass-blur", `${skin.blur}px`);
  root.style.setProperty("--card-radius", `${skin.radius}px`);
  root.style.setProperty("--motion-factor", String(Math.max(.08, skin.motion / 100)));
  root.classList.toggle("phase23-no-logo", !skin.logo);
  root.classList.toggle("phase23-static-icons", !skin.icons);
  root.classList.toggle("phase23-no-glass", !skin.glass);
  root.classList.toggle("phase23-no-buttons", !skin.buttons);
  root.classList.toggle("phase23-no-motion", skin.motion === 0 || matchMedia("(prefers-reduced-motion: reduce)").matches);

  if (phase23Lottie) {
    if (skin.logo && skin.motion > 0 && !matchMedia("(prefers-reduced-motion: reduce)").matches) phase23Lottie.play();
    else phase23Lottie.pause();
  }

  if (preview) phase23Draft = skin;
  else phase23Skin = skin;
  phase23RenderControls();
  setText(ui.motionStatus, skin.motion === 0 ? "Motion paused" : `${skin.skin} • ${skin.motion}% motion`);
}

function phase23RenderControls() {
  const skin = phase23Draft;
  if (!phase23.blur) return;
  phase23.blur.value = String(skin.blur);
  phase23.radius.value = String(skin.radius);
  phase23.motion.value = String(skin.motion);
  phase23.blurOut.value = `${skin.blur}px`;
  phase23.radiusOut.value = `${skin.radius}px`;
  phase23.motionOut.value = `${skin.motion}%`;
  phase23.logoToggle.checked = skin.logo;
  phase23.iconToggle.checked = skin.icons;
  phase23.glassToggle.checked = skin.glass;
  phase23.buttonToggle.checked = skin.buttons;
  phase23.preview.textContent = `${skin.skin.replace(/^./, char => char.toUpperCase())} • ${skin.blur}px blur • ${skin.radius}px cards • ${skin.motion}% motion`;
  phase23.status.textContent = phase23Draft === phase23Skin ? "Saved" : "Preview";
  phase23.choices.forEach(button => button.classList.toggle("active", button.dataset.skinChoice === skin.skin));
}

async function phase23LoadSkin() {
  try {
    const record = await vault.read("meta", PHASE23_SKIN_RECORD);
    phase23Skin = phase23NormalizeSkin(record?.value || PHASE23_DEFAULT_SKIN);
  } catch {
    phase23Skin = { ...PHASE23_DEFAULT_SKIN };
  }
  phase23Draft = { ...phase23Skin };
  phase23ApplySkin(phase23Skin);
}

async function phase23SaveSkin() {
  phase23Skin = phase23NormalizeSkin(phase23Draft);
  await vault.write("meta", {
    id: PHASE23_SKIN_RECORD,
    value: phase23Skin,
    updatedAt: new Date().toISOString()
  });
  phase23Draft = { ...phase23Skin };
  phase23ApplySkin(phase23Skin);
  phase23.status.textContent = "Saved locally";
  toast("Motion skin saved in local app preferences.");
}

async function phase23ResetSkin() {
  const ok = await confirmAction({
    title: "Reset motion skin?",
    text: "The visual properties will return to Aurora Glass defaults. Project drawing data stays unchanged.",
    confirmText: "Reset Skin"
  });
  if (!ok) return;
  phase23Draft = { ...PHASE23_DEFAULT_SKIN };
  phase23ApplySkin(phase23Draft, { preview: true });
  await phase23SaveSkin();
}

function phase23OpenStyle() {
  openSheet(phase23.styleSheet);
  phase23Draft = { ...phase23Skin };
  phase23ApplySkin(phase23Draft, { preview: true });
}

function phase23CloseStyle({ cancel = false } = {}) {
  if (cancel) {
    phase23Draft = { ...phase23Skin };
    phase23ApplySkin(phase23Skin);
  }
  phase23.styleSheet.classList.remove("open");
}

function phase23SetTab(name) {
  phase23.tabs.forEach(tab => {
    const active = tab.dataset.uiTab === name;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-pressed", String(active));
  });
  if (name === "style") phase23OpenStyle();
  if (name === "data") openSheet(ui.dataSheet);
  if (name === "api") openSheet(ui.apiSheet);
  if (name === "studio") {
    closeSheets();
    phase23CloseStyle();
    document.querySelector(".workspace-card")?.scrollIntoView({ behavior: phase23Skin.motion ? "smooth" : "auto", block: "start" });
  }
}

function phase23SyncDraftFromInputs() {
  phase23Draft = phase23NormalizeSkin({
    skin: phase23Draft.skin,
    blur: phase23.blur.value,
    radius: phase23.radius.value,
    motion: phase23.motion.value,
    logo: phase23.logoToggle.checked,
    icons: phase23.iconToggle.checked,
    glass: phase23.glassToggle.checked,
    buttons: phase23.buttonToggle.checked
  });
  phase23ApplySkin(phase23Draft, { preview: true });
}

async function phase23InitLottie() {
  if (!phase23.logo) return;
  try {
    const response = await fetch("/assets/airdraw-logo-lottie.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Logo JSON HTTP ${response.status}`);
    const animationData = await response.json();
    phase23Lottie = lottie.loadAnimation({
      container: phase23.logo,
      renderer: "svg",
      loop: true,
      autoplay: false,
      animationData,
      rendererSettings: { progressiveLoad: true, preserveAspectRatio: "xMidYMid meet" }
    });
    phase23.logo.parentElement?.classList.add("lottie-ready");
    phase23ApplySkin(phase23Skin);
  } catch (error) {
    phase23.logo.parentElement?.classList.remove("lottie-ready");
    console.warn("Lottie logo fallback:", error);
  }
}

function phase23BindSkinUI() {
  phase23.styleBtn?.addEventListener("click", phase23OpenStyle);
  phase23.close.forEach(button => button.addEventListener("click", () => phase23CloseStyle({ cancel: true })));
  phase23.apply?.addEventListener("click", () => void phase23SaveSkin());
  phase23.cancel?.addEventListener("click", () => phase23CloseStyle({ cancel: true }));
  phase23.reset?.addEventListener("click", () => void phase23ResetSkin());

  phase23.choices.forEach(button => {
    button.addEventListener("click", () => {
      phase23Draft = { ...phase23Draft, skin: button.dataset.skinChoice || "aurora" };
      phase23ApplySkin(phase23Draft, { preview: true });
    });
  });
  [phase23.blur, phase23.radius, phase23.motion, phase23.logoToggle, phase23.iconToggle, phase23.glassToggle, phase23.buttonToggle]
    .forEach(control => control?.addEventListener("input", phase23SyncDraftFromInputs));
  [phase23.logoToggle, phase23.iconToggle, phase23.glassToggle, phase23.buttonToggle]
    .forEach(control => control?.addEventListener("change", phase23SyncDraftFromInputs));

  phase23.tabs.forEach(tab => tab.addEventListener("click", () => phase23SetTab(tab.dataset.uiTab || "studio")));
  document.querySelectorAll(".close-sheet").forEach(button => button.addEventListener("click", () => phase23SetTab("studio")));

  const systemMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const onMotionChange = () => phase23ApplySkin(phase23Draft);
  systemMotion.addEventListener?.("change", onMotionChange);
  systemMotion.addListener?.(onMotionChange);
}

async function initPhase23() {
  await phase23LoadSkin();
  phase23BindSkinUI();
  await phase23InitLottie();
}


async function boot() {
  setText(ui.networkStatus, navigator.onLine ? "Online" : "Offline");
  ui.apiBaseInput.value = import.meta.env.VITE_API_BASE_URL || sessionStorage.airdrawApiBase || "";

  guard = new InteractionGuard(stage, {
    onLongPress: showQuickMenu,
    onBusyChange: busy => {
      stage.style.pointerEvents = busy && project.settings.lockDuringBusy ? "none" : "";
    }
  });

  touchEngine = new TouchEngine(stage, {
    onPointerType: type => setText(ui.pointerStatus, type),
    onStrokeStart: point => beginStroke(point, "pointer"),
    onStrokePoint: point => addStrokePoint(point, "pointer"),
    onStrokeEnd: endStroke,
    onPan: pan,
    onPinch: ({ scale, previousCenter, dx, dy }) => {
      pan(dx, dy);
      zoom(scale, previousCenter);
    },
    onWheelZoom: zoom,
    onGesture: message => { ui.canvasNotice.textContent = message; }
  }, guard);

  handEngine = new HandEngine({
    video: camera,
    overlay,
    onStrokeStart: point => beginStroke(point, "hand"),
    onPoint: point => addStrokePoint(point, "hand"),
    onStrokeEnd: endStroke,
    onStatus: message => setText(ui.handStatus, message),
    onFps: value => setText(ui.fpsStatus, `${value} FPS`)
  });

  bindUI();
  resize();
  await initPhase23();
  await loadLocal();
  setupBroadcast();
  await registerServiceWorker();
  toast("Motion Skin Studio is ready.");
}

boot().catch(error => {
  console.error(error);
  toast(`Startup failed: ${error?.message || "unknown error"}`);
});
