import { projectStore } from "./core/project-store.js";
import { createReleaseManager } from "./core/release-manager.js";
import { createExporter } from "./features/exporter.js";
import { drawStrokeWithBrush, normalizeBrush } from "./features/brush-lab.js";
import { analyzeShape, recognizeAndSnap, expandSymmetry, previewSymmetry } from "./features/shape-engine.js";
import { createShortcutGate, recognizeGestureShortcut, SHORTCUT_LABELS } from "./features/gesture-shortcuts.js";
import { createReplayStudio } from "./features/replay-engine.js";
import { createShareCardStudio } from "./features/share-card.js";
import { createDailyChallengeSession, challengeText } from "./features/air-challenge.js";
import { createTemplateStudio } from "./features/template-studio.js";
import { createAiStudio } from "./features/ai-studio.js";
import { createOnboardingFlow } from "./features/onboarding-flow.js";
import { ensureKurdishFont } from "./core/font-kit.js";
import { createLoadingManager } from "./core/loading-manager.js";
import { createPerformanceGovernor } from "./core/performance-governor.js";
import { HAND_CALIBRATION_DEFAULT, createHandCalibration, mapHandPoint, normalizeHandCalibration } from "./features/hand-calibration.js";
import { createReliabilityCenter } from "./core/reliability-center.js";
import { createBackupManager } from "./core/backup-manager.js";
import { createFinalStability } from "./core/final-stability.js";
import { createHandStabilizer, createPinchGate, effectiveTrackingFps, handGeometryIsUsable, landmarkDistance, normalizedPinch, readHandGeometry } from "./features/hand-tracking-engine.js";
import { createLocalHandLandmarker, primeLocalHandAssets } from "./features/hand-engine-bootstrap.js";
import { APP_RELEASE as AIRDROW_RELEASE, HAND_MODEL, LEGACY_STORAGE_KEY, MEDIAPIPE_MODULE_URLS, MEDIAPIPE_WASM_URLS, OLD_MIRROR_KEY, PROFILE_RULES, QUICK_START_KEY, STORAGE_KEY, createDefaultSettings } from "./config/runtime.js";
import { normalizeSkin } from "./config/appearance.js";
import { I18N } from "./i18n/translations.js";
import { collectUi, setText } from "./ui/registry.js";

window.__AIRDROW_APP_MODULE_READY = true;

// Signal the inline bootstrap as soon as this module graph has evaluated.
const defaults = createDefaultSettings();

// Create DOM bindings during boot so a registry failure is handled instead of
// leaving the branded loading screen visible forever.
let ui = null;
let drawCtx = null;
let handCtx = null;

// Runtime services are local module state, never implicit globals.
let reliabilityCenter = null;
let loadingManager = null;
let performanceGovernor = null;
let backupManager = null;
let finalStability = null;
let releaseManager = null;
let exporter = null;
let replayStudio = null;
let shareCardStudio = null;
let templateStudio = null;
let aiStudio = null;
let challengeSession = null;
let onboardingFlow = null;
let pendingUpdate = null;
const handCalibration = createHandCalibration();

const state = {
  strokes: [],
  currentStroke: null,
  undoStack: [],
  redoStack: [],
  settings: { ...defaults },
  mode: "manual",
  workspace: "draw",
  view: { x: 0, y: 0, scale: 1 },
  pointers: new Map(),
  gesture: null,
  stream: null,
  landmarker: null,
  mediaPipeModule: null,
  mediaPipeWasmRoot: null,
  handLoadPromise: null,
  handEngineStrategy: "",
  handDelegate: "GPU",
  handEngineError: "",
  handLoop: 0,
  handDrawing: false,
  handPoint: null,
  lastDetection: 0,
  lastFpsAt: 0,
  fps: 0,
  saveTimer: 0,
  cameraStarting: false,
  consentPendingMode: null,
  erasingGesture: false,
  uiFrames: 0,
  uiFpsLast: performance.now(),
  uiFps: 0,
  handScanStartedAt: 0,
  handScanPulse: 0,
  handScanHideTimer: 0,
  handScanStatusVisual: "idle",
  handScanHasDetected: false,
  handStartPromise: null,
  handWarmTimer: 0,
  handWarmed: false,
  handRawPoint: null,
  lastGuideLandmarks: null,
  lastGuideSeenAt: 0,
  lastGuideScore: 0,
  handPalmScale: 0,
  handStableFrames: 0,
  handMissingFrames: 0,
  pinchOnFrames: 0,
  pinchOffFrames: 0,
  pinchHoldFrames: 0,
  lastVideoTime: -1,
  inferenceFrames: 0,
  inferenceFpsAt: performance.now(),
  inferenceFps: 0,
  localAssetsReady: false,
  handOpenFrames: 0,
  handArmed: false,
  handIntentFrames: 0,
  handIntentAnchor: null,
  handGestureAnchor: null,
  handScore: 0,
  handGeometry: null,
  handStabilizer: createHandStabilizer(),
  pinchGate: createPinchGate(),
  handRejectedFrames: 0,
  handActionStartedAt: 0,
  effectiveTargetFps: 0,
  cameraPerformanceReduced: false,
  renderFrame: 0,
  projectTitle: "Untitled",
  challengeTimer: 0,
  replayBusy: false,
  templateBusy: false,
  aiBusy: false,
  aiResult: null,
  exportBusy: false,
  lastShapeCandidate: null,
  trackingHealth: 0,
  calibrationPending: false,
  viewportRefreshFrame: 0,
  shortcutGate: createShortcutGate()
};

function currentRule() {
  return PROFILE_RULES[state.settings.profile] || PROFILE_RULES.balanced;
}

function preferredHandDelegate() {
  // GPU is attempted first by the local bootstrap. The CPU path is retained
  // automatically when the browser does not expose a compatible GPU delegate.
  return "GPU";
}

function isTouchLayout() {
  const coarse = matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  const viewportWidth = window.visualViewport?.width || window.innerWidth;
  return coarse || viewportWidth < 900;
}


function toast(message) {
  setText(ui.toast, message);
  ui.toast.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ui.toast.classList.remove("show"), 2300);
}


function setupReliabilityCenter() {
  reliabilityCenter = createReliabilityCenter({
    root: ui.recoveryNotice,
    icon: ui.recoveryNoticeIcon,
    title: ui.recoveryNoticeTitle,
    body: ui.recoveryNoticeBody,
    action: ui.recoveryAction,
    dismiss: ui.recoveryDismiss
  });
}

function showRecovery({ kind = "notice", icon = "i", title = "", body = "", actionLabel = "", action = null, persistent = false } = {}) {
  reliabilityCenter?.show({ kind, iconText: icon, heading: title, message: body, actionLabel, onAction: action, persistent });
}

function hideRecovery(kind = "") {
  if (!reliabilityCenter) return;
  if (!kind || reliabilityCenter.activeKind === kind) reliabilityCenter.hide();
}

function hasBlockingOverlay() {
  return Boolean(
    (onboardingFlow && onboardingFlow.isOpen)
    || (ui.consent && !ui.consent.hidden)
    || (ui.calibrationOverlay && !ui.calibrationOverlay.hidden)
    || (ui.clearDialog && !ui.clearDialog.hidden)
    || (ui.resetDialog && !ui.resetDialog.hidden)
    || (ui.aiResultModal && !ui.aiResultModal.hidden)
  );
}

function syncBodyScroll() {
  const blocked = hasBlockingOverlay() || (ui.app.classList.contains("settings-open") && isTouchLayout());
  document.body.style.overflow = blocked ? "hidden" : "";
  if (!blocked) presentDeferredUpdate();
}

function createOnboarding() {
  if (onboardingFlow || !ui.quickStart) return onboardingFlow;
  onboardingFlow = createOnboardingFlow({
    root: ui.quickStart,
    nextButton: ui.quickStartNext,
    skipButton: ui.quickStartSkip,
    count: ui.quickStartCount,
    dots: ui.quickStartDots,
    getCopy: kind => kind === "finish" ? t("quickStartFinish", "Start drawing") : t("quickStartNext", "Continue"),
    onVisibilityChange: (visible, { completed = true } = {}) => {
      if (!visible && completed) localStorage.setItem(QUICK_START_KEY, "1");
      syncBodyScroll();
    }
  });
  return onboardingFlow;
}

function openQuickStart({ remember = false } = {}) {
  const flow = createOnboarding();
  if (!flow) return;
  if (remember) localStorage.removeItem(QUICK_START_KEY);
  flow.open();
}

function closeQuickStart({ completed = true } = {}) { onboardingFlow?.close({ completed }); }

function cameraFailureCopy(error) {
  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
    return { title: t("cameraPermissionTitle", "Camera permission is needed"), body: t("cameraPermissionBody", "Allow camera access in your browser, then try again.") };
  }
  if (error?.name === "NotFoundError") {
    return { title: t("cameraMissingTitle", "Camera was not found"), body: t("cameraMissingBody", "Connect or enable a camera, then try again.") };
  }
  return { title: t("cameraUnavailableTitle", "Camera cannot start"), body: t("cameraUnavailableBody", "Your drawing is still safe. You can continue with touch or try the camera again.") };
}

function reportCameraFailure(error) {
  const copy = cameraFailureCopy(error);
  showRecovery({ kind: "camera", icon: "◌", title: copy.title, body: copy.body, actionLabel: t("cameraTryAgain", "Try camera again"), action: () => openCameraConsent({ hand: true }) });
}

function handEngineFailureCopy(error) {
  const stage = String(error?.stage || "").toLowerCase();
  const message = String(error?.message || error || "").toLowerCase();
  if (stage === "asset" || /hand_landmarker|model|404|failed to fetch/.test(message)) {
    return { title: t("engineModelTitle", "Hand model is unavailable"), body: t("engineModelBody", "The local hand model could not be opened. Reload the engine and try again.") };
  }
  if (stage === "wasm" || /wasm|modulefactory|vision_bundle|dynamically imported module/.test(message)) {
    return { title: t("engineRuntimeTitle", "Hand runtime is unavailable"), body: t("engineRuntimeBody", "The local hand runtime could not start. Reload the engine and try again.") };
  }
  if (stage === "create") {
    return { title: t("engineStartTitle", "Hand engine could not start"), body: t("engineStartBody", "The camera is ready, but the local hand task did not initialize. Reload the engine once.") };
  }
  return { title: t("engineFailureTitle", "Hand engine is unavailable"), body: t("engineFailureBody", "Touch drawing still works. You can reload the hand engine.") };
}

function reportHandEngineFailure(error) {
  state.handEngineError = String(error?.message || error || "");
  const copy = handEngineFailureCopy(error);
  const stage = String(error?.stage || error?.airdrowStage || "engine");
  const raw = String(error?.message || "").replace(/\s+/g, " ").trim();
  const detail = raw ? `\n${t("engineDiagnostic", "Diagnostic")}: ${stage} — ${raw.slice(0, 180)}` : "";
  showRecovery({
    kind: "hand-engine",
    icon: "!",
    title: copy.title,
    body: `${copy.body}${detail}`,
    actionLabel: t("engineTryAgain", "Reload engine"),
    action: () => ui.retryHand?.click()
  });
}

function aiFailureMessage(error) {
  const raw = String(error?.message || error || "").toLowerCase();
  if (/billing hard limit|insufficient_quota|quota|usage limit/.test(raw)) return t("aiBillingLimit", "AI credits or the project budget are unavailable. Add API billing credit, then try again.");
  if (/unauthorized|api key|401/.test(raw)) return t("aiKeyProblem", "AI is not authorized. Check the protected Vercel API key and redeploy.");
  if (/failed to fetch|network|offline/.test(raw)) return t("aiOffline", "AI needs an internet connection. Your local drawing is still safe.");
  return t("aiFailed", "AI artwork could not be created");
}

function reportAiFailure(error) {
  const message = aiFailureMessage(error);
  setText(ui.aiStatus, message);
  showRecovery({ kind: "ai", icon: "", title: t("aiRecoveryTitle", "AI needs attention"), body: message, actionLabel: t("aiCheckAgain", "Check AI"), action: () => checkAiStudio() });
}

function reportExportFailure(retry) {
  showRecovery({ kind: "export", icon: "↓", title: t("exportRecoveryTitle", "Export was not completed"), body: t("exportRecoveryBody", "Your drawing is still saved locally. Try again or choose another format."), actionLabel: t("exportTryAgain", "Try again"), action: retry });
}

function applyNetworkState({ announce = false } = {}) {
  const online = navigator.onLine;
  setText(ui.networkStatus, online ? t("online", "Online") : t("offline", "Offline"));
  document.documentElement.classList.toggle("is-offline", !online);
  [ui.checkAi, ui.generateAi].filter(Boolean).forEach(button => {
    button.dataset.networkState = online ? "online" : "offline";
    button.setAttribute("aria-disabled", String(!online));
  });
  if (!online) {
    if (!state.aiBusy) setText(ui.aiStatus, t("aiOffline", "AI needs an internet connection. Your local drawing is still safe."));
    showRecovery({ kind: "offline", icon: "⌁", title: t("offlineTitle", "You are offline"), body: t("offlineBody", "Drawing, projects and local exports still work. AI and online sharing will return when the connection does."), actionLabel: t("offlineContinue", "Keep drawing"), action: () => hideRecovery("offline") });
  } else {
    hideRecovery("offline");
    if (announce) toast(t("onlineRestored", "Connection restored"));
  }
  updateLiveHud();
}

function scheduleViewportRefresh() {
  if (state.viewportRefreshFrame) return;
  state.viewportRefreshFrame = requestAnimationFrame(() => {
    state.viewportRefreshFrame = 0;
    updateLayoutClass();
    render();
  });
}

function canvasMetrics() {
  const rect = ui.studio.getBoundingClientRect();
  const nativeDpr = Math.min(window.devicePixelRatio || 1, 2);
  const dpr = performanceGovernor ? performanceGovernor.canvasDpr(nativeDpr) : nativeDpr;
  return { width: rect.width, height: rect.height, dpr };
}

function resizeCanvas() {
  const { width, height, dpr } = canvasMetrics();
  for (const canvas of [ui.draw, ui.hand]) {
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }
  drawCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  handCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  render({ immediate: true });
}

function updateLayoutClass() {
  const touch = isTouchLayout();
  document.documentElement.classList.toggle("touch-layout", touch);
  setText(ui.layoutOut, touch ? t("mobile", "Mobile") : t("desktop", "Desktop"));
  if (!touch) openSettings(true);
  resizeCanvas();
}

function localDate(value) {
  try { return new Date(value).toLocaleDateString(state.settings.language === "ku" ? "ku-IQ" : "en-US"); } catch { return ""; }
}

function projectFromStorage(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.strokes)) return null;
  return {
    strokes: value.strokes,
    settings: { ...defaults, ...(value.settings || {}) },
    view: value.view && typeof value.view === "object" ? value.view : { x: 0, y: 0, scale: 1 },
    title: typeof value.title === "string" ? value.title.slice(0, 72) : "Untitled"
  };
}

async function readOldIndexedProject() {
  return new Promise(resolve => {
    try {
      const request = indexedDB.open("airdraw-phase22-data-vault");
      request.onerror = () => resolve(null);
      request.onsuccess = () => {
        try {
          const db = request.result;
          if (!db.objectStoreNames.contains("projects")) return resolve(null);
          const tx = db.transaction("projects", "readonly");
          const get = tx.objectStore("projects").get("current-project");
          get.onsuccess = () => { db.close(); resolve(get.result?.project || null); };
          get.onerror = () => { db.close(); resolve(null); };
        } catch { resolve(null); }
      };
    } catch { resolve(null); }
  });
}

async function loadProject() {
  let candidate = null;
  let migrated = false;
  try { candidate = projectFromStorage(await projectStore.loadCurrent()); } catch {}
  if (!candidate) {
    try { candidate = projectFromStorage(JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "null")); migrated = Boolean(candidate); } catch {}
  }
  if (!candidate) {
    try {
      const oldMirror = JSON.parse(localStorage.getItem(OLD_MIRROR_KEY) || "null");
      candidate = projectFromStorage(oldMirror?.project || oldMirror);
      migrated = Boolean(candidate);
    } catch {}
  }
  if (!candidate) { candidate = projectFromStorage(await readOldIndexedProject()); migrated = Boolean(candidate); }

  if (candidate) {
    state.strokes = candidate.strokes;
    state.settings = { ...defaults, ...candidate.settings };
    state.view = { x: 0, y: 0, scale: 1, ...candidate.view };
    state.projectTitle = candidate.title || "Untitled";
    setText(ui.saveStatus, migrated ? t("storageMigrated", "Migrated") : t("storageRecovered", "Recovered"));
    if (migrated) void projectStore.saveCurrent(serializeProject());
  } else { setText(ui.saveStatus, t("storageReady", "Ready")); }

  state.settings.skin = normalizeSkin(state.settings.skin);
  if (!["ku", "en"].includes(state.settings.language)) state.settings.language = "ku";
  if (!["dark", "light"].includes(state.settings.theme)) state.settings.theme = "dark";
  if (typeof state.settings.warmHandEngine !== "boolean") state.settings.warmHandEngine = true;
  if (typeof state.settings.safePinch !== "boolean") state.settings.safePinch = true;
  syncSettingsUI();
  if (ui.projectName) ui.projectName.value = state.projectTitle;
  applySettings();
  render();
  void renderProjectGallery();
}

function serializeProject() {
  return {
    schema: "airdrow-project",
    version: 400,
    appVersion: AIRDROW_RELEASE.version,
    savedAt: new Date().toISOString(),
    title: state.projectTitle || "Untitled",
    strokes: state.strokes,
    settings: state.settings,
    view: state.view
  };
}

async function saveProject({ quiet = false } = {}) {
  const snapshot = serializeProject();
  try {
    await projectStore.saveCurrent(snapshot);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: snapshot.version, savedAt: snapshot.savedAt, storage: "indexeddb" }));
    setText(ui.saveStatus, t("storageSaved", "Saved"));
    if (!quiet) toast(t("savedLocally", "Saved locally"));
  } catch (error) {
    try {
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(snapshot));
      setText(ui.saveStatus, t("storageBackup", "Local backup"));
      if (!quiet) toast(t("storageFallback", "IndexedDB is unavailable — local backup used"));
    } catch {
      setText(ui.saveStatus, t("storageFull", "Storage is full"));
      showRecovery({ kind: "storage", icon: "!", title: t("storageRecoveryTitle", "Saving is limited"), body: t("storageFullBody", "Browser storage is full. Export your project and free up browser storage."), actionLabel: t("storageOpenSettings", "Open settings"), action: () => openWorkspace("settings") });
      if (!quiet) toast(t("storageFull", "Storage is full"));
    }
  }
}

function bytesLabel(value) {
  const bytes = Number(value || 0);
  if (!bytes) return state.settings.language === "ku" ? "زانیاری بەردەست نییە" : "No estimate available";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) { size /= 1024; index += 1; }
  return `${size >= 10 || index === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[index]}`;
}

async function refreshStabilityStatus({ announce = false } = {}) {
  if (!backupManager || !finalStability) return;
  try {
    const snapshot = await finalStability.snapshot({ language: state.settings.language });
    const health = snapshot.health;
    const status = state.settings.language === "ku"
      ? `${snapshot.stable ? "جێگیر" : "پێویستی بە سەرنج"} · ${snapshot.text.projects} · ${snapshot.text.storage}`
      : `${snapshot.stable ? "Stable" : "Needs attention"} · ${snapshot.text.projects} · ${snapshot.text.storage}`;
    setText(ui.stabilityStatus, status);
    setText(ui.backupStatus, state.settings.language === "ku"
      ? `${health.galleryProjects} پڕۆژە · backupی JSON بە ئامادەیی`
      : `${health.galleryProjects} projects · JSON backup ready`);
    if (announce) toast(snapshot.stable
      ? t("stabilityPassed", "Stability check passed")
      : t("stabilityNeedsAttention", "Review the stability status"));
    return snapshot;
  } catch (error) {
    console.warn("AIR-DROW stability audit failed", error);
    setText(ui.stabilityStatus, t("stabilityUnavailable", "Stability status is unavailable"));
    return null;
  }
}

async function exportBackupArchive() {
  if (!backupManager) return;
  try {
    await saveProject({ quiet: true });
    loadingManager?.beginTask("backup", { label: t("backupPreparing", "Preparing backup…"), progress: 20, global: true });
    const result = await backupManager.download({ title: state.projectTitle || "AIR-DROW" });
    loadingManager?.updateTask("backup", { label: t("backupDownloaded", "Backup downloaded"), progress: 100 });
    loadingManager?.endTask("backup");
    setText(ui.backupStatus, `${t("backupDownloaded", "Backup downloaded")} · ${bytesLabel(result.bytes)}`);
    toast(t("backupDownloaded", "Backup downloaded"));
  } catch (error) {
    console.warn("Backup export failed", error);
    loadingManager?.endTask("backup");
    showRecovery({
      kind: "storage",
      icon: "!",
      title: t("backupFailedTitle", "Backup could not be created"),
      body: t("backupFailedBody", "Your local project is still safe. Try again after checking browser storage."),
      actionLabel: t("backupTryAgain", "Try again"),
      action: () => exportBackupArchive()
    });
  }
}

async function restoreBackupArchive(file) {
  if (!file || !backupManager) return;
  try {
    loadingManager?.beginTask("backup", { label: t("backupRestoring", "Restoring backup…"), progress: 25, global: true });
    const result = await backupManager.restore(file, { restoreCurrent: Boolean(ui.restoreCurrentBackup?.checked) });
    loadingManager?.updateTask("backup", { label: t("backupRestored", "Backup restored"), progress: 82 });
    if (result.restoredCurrent) await loadProject();
    else await renderProjectGallery();
    await refreshStabilityStatus();
    loadingManager?.endTask("backup");
    const detail = result.restoredGallery ? ` · ${result.restoredGallery}` : "";
    setText(ui.backupStatus, `${t("backupRestored", "Backup restored")}${detail}`);
    toast(t("backupRestored", "Backup restored"));
  } catch (error) {
    console.warn("Backup restore failed", error);
    loadingManager?.endTask("backup");
    showRecovery({
      kind: "storage",
      icon: "!",
      title: t("backupRestoreFailedTitle", "Backup could not be restored"),
      body: t("backupRestoreFailedBody", "Choose a valid AIR-DROW backup JSON file and try again."),
      actionLabel: t("backupTryAgain", "Try again"),
      action: () => ui.importBackupInput?.click()
    });
  }
}

function queueSave() {
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(() => { void saveProject({ quiet: true }); }, 350);
}

function syncSettingsUI() {
  ui.brush.value = state.settings.brushSize;
  ui.smoothing.value = state.settings.smoothing;
  ui.color.value = state.settings.color;
  if (ui.brushStyle) ui.brushStyle.value = normalizeBrush(state.settings.brushStyle);
  if (ui.symmetryCount) ui.symmetryCount.value = String(state.settings.symmetry || 1);
  if (ui.symmetryMirror) ui.symmetryMirror.checked = Boolean(state.settings.symmetryMirror);
  if (ui.shapeAssist) ui.shapeAssist.checked = state.settings.shapeAssist !== false;
  if (ui.shapeSnapMode) ui.shapeSnapMode.value = ["auto", "suggest"].includes(state.settings.shapeSnapMode) ? state.settings.shapeSnapMode : "auto";
  if (ui.shapeIntent) ui.shapeIntent.value = ["auto", "line", "rectangle", "ellipse", "triangle"].includes(state.settings.shapeIntent) ? state.settings.shapeIntent : "auto";
  if (ui.shapeConfidence) ui.shapeConfidence.value = String(Math.max(78, Math.min(96, Number(state.settings.shapeConfidence) || 86)));
  if (ui.gestureShortcuts) ui.gestureShortcuts.checked = Boolean(state.settings.gestureShortcuts);
  if (ui.replayDuration) ui.replayDuration.value = String(state.settings.replayDuration || 6);
  if (ui.replayBrand) ui.replayBrand.checked = state.settings.replayBrand !== false;
  if (ui.creatorName) ui.creatorName.value = state.settings.creatorName || "";
  if (ui.creatorTagline) ui.creatorTagline.value = state.settings.creatorTagline || "";
  if (ui.templatePack) ui.templatePack.value = state.settings.templatePack || "poster";
  if (ui.aiPreset) ui.aiPreset.value = state.settings.aiPreset || "poster";
  if (ui.aiSize) ui.aiSize.value = state.settings.aiSize || "1024x1024";
  if (ui.aiDirection) ui.aiDirection.value = state.settings.aiDirection || "";
  if (ui.performanceMode) ui.performanceMode.value = state.settings.performanceMode || "auto";
  ui.pressure.checked = state.settings.pressure;
  ui.eraserSize.value = state.settings.eraserSize;
  ui.profile.value = state.settings.profile;
  ui.trackingFps.value = state.settings.targetFps;
  ui.bright.checked = state.settings.brightCamera;
  ui.mirror.checked = state.settings.mirrorCamera;
  ui.resolution.value = state.settings.cameraWidth;
  ui.cameraView.value = state.settings.cameraView;
  ui.handGuide.checked = state.settings.showHandGuide;
  ui.safePinch.checked = state.settings.safePinch !== false;
  ui.warmEngine.checked = state.settings.warmHandEngine !== false;
  ui.grid.value = state.settings.grid;
  ui.reduceMotion.checked = state.settings.reduceMotion;
  ui.themeMode.value = state.settings.theme;
  ui.apiUrl.value = state.settings.apiUrl || "";
  ui.colorSwatches.forEach(button => button.classList.toggle("active", button.dataset.color.toLowerCase() === String(state.settings.color).toLowerCase()));
  updateSettingOutputs();
  updatePerformanceStatus();
  updateHandCalibrationStatus();
}

function updateRangeProgress(input) {
  if (!input) return;
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const value = Number(input.value);
  const percent = Math.max(0, Math.min(100, ((value - min) / Math.max(1, max - min)) * 100));
  input.style.setProperty("--range-progress", `${percent}%`);
}

function updateSettingOutputs() {
  setText(ui.brushOut, state.settings.brushSize);
  setText(ui.smoothingOut, `${state.settings.smoothing}%`);
  setText(ui.eraserSizeOut, state.settings.eraserSize);
  setText(ui.gridOut, `${state.settings.grid}%`);
  setText(ui.shapeConfidenceOut, `${Math.round(Number(state.settings.shapeConfidence) || 86)}%`);
  [ui.brush, ui.smoothing, ui.eraserSize, ui.grid, ui.shapeConfidence].forEach(updateRangeProgress);
}


function shapeLabel(type) {
  const key = { line: "shapeLine", rectangle: "shapeRectangle", ellipse: "shapeEllipse", triangle: "shapeTriangle" }[type];
  return key ? t(key, type) : type;
}


function setShapeStatus(candidate, { snapped = false } = {}) {
  if (!ui.shapeStatus) return;
  if (!candidate) {
    setText(ui.shapeStatus, t("shapeReady", "Ready"));
    return;
  }
  const prefix = snapped ? t("shapeSnapped", "Snapped to") : t("shapeSuggested", "Suggested");
  setText(ui.shapeStatus, `${prefix}: ${shapeLabel(candidate.type)} · ${Math.round(candidate.confidence * 100)}%`);
}

function t(key, fallback = key) {
  return I18N[state.settings.language]?.[key] || fallback;
}

function applyLanguage() {
  const language = state.settings.language === "en" ? "en" : "ku";
  state.settings.language = language;
  const root = document.documentElement;
  root.lang = language;
  root.dir = language === "en" ? "ltr" : "rtl";
  root.dataset.language = language;
  root.classList.toggle("is-rtl", language === "ku");
  root.classList.toggle("is-ltr", language === "en");

  // Only text is replaced. Cards, icons, settings state and open sections are
  // not rebuilt, so the drawer stays stable while language changes.
  document.querySelectorAll("[data-i18n]").forEach(node => {
    const key = node.dataset.i18n;
    node.textContent = t(key, node.textContent);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(node => {
    const key = node.dataset.i18nPlaceholder;
    node.placeholder = t(key, node.placeholder);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach(node => {
    const key = node.dataset.i18nAriaLabel;
    node.setAttribute("aria-label", t(key, node.getAttribute("aria-label") || ""));
  });
  document.querySelectorAll("[data-i18n-title]").forEach(node => {
    const key = node.dataset.i18nTitle;
    node.setAttribute("title", t(key, node.getAttribute("title") || ""));
  });
  document.title = language === "ku" ? "AIR-DROW — ستۆدیۆی کێشان" : "AIR-DROW — Drawing Studio";
  onboardingFlow?.render();
  if (language === "ku") {
    void ensureKurdishFont().then(loaded => root.classList.toggle("kufi-ready", Boolean(loaded)));
  } else {
    root.classList.remove("kufi-ready");
  }
  if (challengeSession) renderChallengeStatus();
  if (ui.cameraModePicker) ui.cameraModePicker.dataset.title = state.settings.language === "en" ? "Choose camera mode" : "شێوازی کامێرا هەڵبژێرە";
  ui.languageChoices.forEach(button => button.classList.toggle("selected", button.dataset.language === language));
  setText(ui.fontStatus, language === "en" ? "System Sans" : "Noto Kufi Arabic");
  setWorkspace(state.workspace, { resetPanels: false });
  updateLiveHud();
}

function resolvedTheme() {
  return state.settings.theme === "light" ? "light" : "dark";
}

function applySkin() {
  const skin = normalizeSkin(state.settings.skin);
  state.settings.skin = skin;
  document.documentElement.dataset.skin = skin;
  ui.skinChoices.forEach(button => button.classList.toggle("selected", button.dataset.skin === skin));
}

function applyTheme() {
  const activeTheme = resolvedTheme();
  const light = activeTheme === "light";
  const root = document.documentElement;
  root.dataset.theme = activeTheme;
  document.body.dataset.theme = activeTheme;
  ui.app.dataset.theme = activeTheme;
  // The palette lives in visual-system.css; JavaScript only exposes the active
  // mode and updates browser chrome, preventing inline style drift.
  root.style.removeProperty("--bg");
  root.style.removeProperty("--panel");
  root.style.removeProperty("--panel-2");
  root.style.removeProperty("--text");
  root.style.removeProperty("--muted");
  root.style.removeProperty("--line");
  root.style.removeProperty("--line-soft");
  root.style.removeProperty("--hud");
  root.style.removeProperty("--hud-muted");
  ui.studio.style.removeProperty("background");
  ui.studio.style.removeProperty("background-size");
  document.body.style.removeProperty("background");
  ui.app.style.removeProperty("background");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", light ? "#f5f3ff" : "#080914");
  ui.theme.classList.toggle("theme-active", light);
}

function applyCameraView() {
  ui.studio.classList.toggle("camera-hidden", state.settings.cameraView === "board");
  document.querySelectorAll("[data-camera-view]").forEach(button => {
    button.classList.toggle("selected", button.dataset.cameraView === state.settings.cameraView);
  });
}

function updateLiveHud() {
  const handMode = ["hand", "hand-eraser"].includes(state.mode);
  const fps = handMode && state.inferenceFps ? state.inferenceFps : state.uiFps;
  setText(ui.liveFps, `${t("fps", "FPS")} ${fps || "—"}`);
  ui.liveHud.dataset.source = handMode && state.inferenceFps ? "ai" : "screen";
  const online = navigator.onLine;
  setText(ui.liveNetwork, online ? t("online", "Online") : t("offline", "Offline"));
  ui.liveHud.classList.toggle("offline", !online);
}

function applySettings() {
  state.settings.handCalibration = normalizeHandCalibration(state.settings.handCalibration);
  state.settings.targetFps = [15, 24, 30].includes(Number(state.settings.targetFps)) ? Number(state.settings.targetFps) : 24;
  state.settings.cameraWidth = [480, 640, 960].includes(Number(state.settings.cameraWidth)) ? Number(state.settings.cameraWidth) : 480;
  state.settings.brushStyle = normalizeBrush(state.settings.brushStyle);
  state.settings.symmetry = Math.max(1, Math.min(12, Number(state.settings.symmetry || 1)));
  if (!["dark", "light"].includes(state.settings.theme)) state.settings.theme = "dark";
  document.documentElement.style.setProperty("--grid-alpha", String(Number(state.settings.grid || 0) / 100));
  document.documentElement.classList.toggle("reduce-motion", Boolean(state.settings.reduceMotion));
  ui.camera.style.filter = state.settings.brightCamera ? "brightness(1.13) contrast(1.04) saturate(1.06)" : "none";
  ui.camera.style.transform = state.settings.mirrorCamera ? "scaleX(-1)" : "none";
  applySkin();
  applyTheme();
  applyLanguage();
  applyCameraView();
  ui.app.classList.toggle("camera-session-active", Boolean(state.stream));
  refreshPerformanceProfile();
  updateSettingOutputs();
  updateLiveHud();
}

function pointFromEvent(event) {
  const rect = ui.studio.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    pressure: event.pressure > 0 ? event.pressure : (event.pointerType === "pen" ? .5 : 1),
    pointerType: event.pointerType || "unknown",
    time: performance.now()
  };
}

function screenToWorld(point) {
  const { width, height } = canvasMetrics();
  return {
    x: (point.x - state.view.x) / Math.max(1, width * state.view.scale),
    y: (point.y - state.view.y) / Math.max(1, height * state.view.scale),
    pressure: point.pressure,
    time: point.time
  };
}

function cameraContentRect() {
  // The hand landmarks are normalised to the decoded camera frame, while the
  // preview uses CSS `object-fit: cover`. Resolve the exact rendered video
  // box first, then apply the identical cover crop to the overlay. Using the
  // studio size alone causes a visible offset whenever Android changes the
  // camera's delivered aspect ratio or browser viewport metrics.
  const fallback = canvasMetrics();
  const studioRect = ui.studio.getBoundingClientRect();
  const videoRect = ui.camera.getBoundingClientRect();
  const boxWidth = Math.max(1, videoRect.width || fallback.width || 1);
  const boxHeight = Math.max(1, videoRect.height || fallback.height || 1);
  const videoWidth = Math.max(1, ui.camera.videoWidth || fallback.width || 1);
  const videoHeight = Math.max(1, ui.camera.videoHeight || fallback.height || 1);
  const scale = Math.max(boxWidth / videoWidth, boxHeight / videoHeight);
  const drawWidth = videoWidth * scale;
  const drawHeight = videoHeight * scale;
  return {
    x: (videoRect.left - studioRect.left) + (boxWidth - drawWidth) / 2,
    y: (videoRect.top - studioRect.top) + (boxHeight - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight
  };
}

function normalizedToCanvasPoint(point) {
  const rect = cameraContentRect();
  const rawX = Math.max(0, Math.min(1, Number(point?.x) || 0));
  const rawY = Math.max(0, Math.min(1, Number(point?.y) || 0));
  // Camera mirroring is visual-only CSS. Mirror the landmark exactly once so
  // its projected point remains on the user's displayed hand.
  const nx = state.settings.mirrorCamera ? (1 - rawX) : rawX;
  return {
    x: rect.x + nx * rect.width,
    y: rect.y + rawY * rect.height
  };
}

function mappedHandPoint(point) {
  return mapHandPoint(point, state.settings.handCalibration, { mirror: state.settings.mirrorCamera });
}

function displayPointToScreen(point) {
  const rect = cameraContentRect();
  return {
    x: rect.x + point.x * rect.width,
    y: rect.y + point.y * rect.height
  };
}

function mappedHandPointToScreen(point) {
  return displayPointToScreen(mappedHandPoint(point));
}

function handToWorld(point) {
  const screen = mappedHandPointToScreen(point);
  return screenToWorld({ x: screen.x, y: screen.y, pressure: 1, time: point.time });
}

function renderScene() {
  const { width, height } = canvasMetrics();
  drawCtx.clearRect(0, 0, width, height);
  drawCtx.save();
  drawCtx.translate(state.view.x, state.view.y);
  drawCtx.scale(state.view.scale, state.view.scale);
  for (const stroke of state.strokes) drawStroke(drawCtx, stroke, width, height);
  if (state.currentStroke) {
    for (const preview of previewSymmetry(state.currentStroke, state.settings.symmetry, state.settings.symmetryMirror)) drawStroke(drawCtx, preview, width, height);
  }
  drawCtx.restore();
}

// Pointer events may carry dozens of coalesced samples per frame. Queue a
// single canvas paint so high-frequency pens remain smooth without doing the
// same full-scene render repeatedly in one animation frame.
function render({ immediate = false } = {}) {
  if (immediate) {
    if (state.renderFrame) cancelAnimationFrame(state.renderFrame);
    state.renderFrame = 0;
    renderScene();
    return;
  }
  if (state.renderFrame) return;
  state.renderFrame = requestAnimationFrame(() => {
    state.renderFrame = 0;
    renderScene();
  });
}

function drawStroke(ctx, stroke, width, height) {
  drawStrokeWithBrush(ctx, stroke, width, height);
}

function pushUndoSnapshot() {
  state.undoStack.push(structuredClone(state.strokes));
  if (state.undoStack.length > 40) state.undoStack.shift();
  state.redoStack = [];
  updateHistoryControls();
}

function updateHistoryControls() {
  if (ui.undo) ui.undo.disabled = state.undoStack.length === 0;
  if (ui.redo) ui.redo.disabled = state.redoStack.length === 0;
}

function startStroke(point, source) {
  if (source === "pointer" && state.mode !== "manual") return;
  if (source === "hand" && state.mode !== "hand") return;
  const world = source === "hand" ? handToWorld(point) : screenToWorld(point);
  pushUndoSnapshot();
  state.currentStroke = {
    color: state.settings.color,
    size: Number(state.settings.brushSize),
    pressure: state.settings.pressure,
    brush: normalizeBrush(state.settings.brushStyle),
    points: [world]
  };
}

function addStrokePoint(point, source) {
  if (!state.currentStroke) return;
  const raw = source === "hand" ? handToWorld(point) : screenToWorld(point);
  const previous = state.currentStroke.points.at(-1) || raw;
  const smooth = Number(state.settings.smoothing) / 100;
  const distance = Math.hypot(raw.x - previous.x, raw.y - previous.y);
  // In hand mode, refuse an implausibly large landmark leap before it enters
  // the drawn history. This is separate from the detector-side jump gate.
  if (source === "hand" && distance > .16) return;
  const next = {
    x: previous.x + (raw.x - previous.x) * (1 - smooth),
    y: previous.y + (raw.y - previous.y) * (1 - smooth),
    pressure: raw.pressure,
    time: raw.time
  };
  const minDistance = source === "hand" ? .003 : .001;
  if (Math.hypot(next.x - previous.x, next.y - previous.y) < minDistance) return;
  state.currentStroke.points.push(next);
  render();
}

function shapeOptions() {
  return {
    intent: state.settings.shapeIntent || "auto",
    minConfidence: Math.max(0.78, Math.min(0.96, Number(state.settings.shapeConfidence || 86) / 100))
  };
}

function finishStroke() {
  if (!state.currentStroke) return;
  let finished = state.currentStroke;
  const original = structuredClone(finished);
  state.currentStroke = null;
  state.lastShapeCandidate = null;
  if (finished.points.length) {
    const options = shapeOptions();
    const suggestion = state.settings.shapeAssist !== false ? analyzeShape(original, options) : null;
    const confidentSuggestion = suggestion && suggestion.confidence >= options.minConfidence ? suggestion : null;
    const snapped = state.settings.shapeAssist !== false && state.settings.shapeSnapMode !== "suggest"
      ? recognizeAndSnap(original, options)
      : null;
    if (snapped) {
      finished = snapped.stroke;
      setShapeStatus(snapped, { snapped: true });
    } else if (confidentSuggestion) {
      setShapeStatus(confidentSuggestion, { snapped: false });
    } else {
      setShapeStatus(null);
    }
    const copies = expandSymmetry(finished, state.settings.symmetry, state.settings.symmetryMirror);
    const startIndex = state.strokes.length;
    state.strokes.push(...copies);
    if (confidentSuggestion) {
      state.lastShapeCandidate = { candidate: confidentSuggestion, source: original, startIndex, count: copies.length };
    }
  }
  queueSave();
  render();
}

function beginGesture() {
  const pointers = [...state.pointers.values()].slice(0, 2);
  if (pointers.length < 2) return;
  state.gesture = {
    distance: Math.hypot(pointers[0].x - pointers[1].x, pointers[0].y - pointers[1].y),
    center: { x: (pointers[0].x + pointers[1].x) / 2, y: (pointers[0].y + pointers[1].y) / 2 }
  };
}

function updateGesture() {
  const pointers = [...state.pointers.values()].slice(0, 2);
  if (pointers.length < 2) return;
  if (!state.gesture) beginGesture();
  const distance = Math.hypot(pointers[0].x - pointers[1].x, pointers[0].y - pointers[1].y);
  const center = { x: (pointers[0].x + pointers[1].x) / 2, y: (pointers[0].y + pointers[1].y) / 2 };
  const scale = Math.max(.65, Math.min(1.45, distance / Math.max(1, state.gesture.distance)));
  const before = screenToWorld(state.gesture.center);
  state.view.scale = Math.max(.5, Math.min(3, state.view.scale * scale));
  const { width, height } = canvasMetrics();
  state.view.x = center.x - before.x * width * state.view.scale;
  state.view.y = center.y - before.y * height * state.view.scale;
  state.gesture = { distance, center };
  render();
}

function bindPointerEvents() {
  ui.studio.addEventListener("pointerdown", event => {
    if (event.target.closest?.(".toolbar, .settings-drawer")) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    ui.studio.setPointerCapture?.(event.pointerId);
    const point = pointFromEvent(event);
    state.pointers.set(event.pointerId, point);
    setText(ui.pointerStatus, point.pointerType);

    if (state.pointers.size >= 2 && event.pointerType === "touch") {
      finishStroke();
      beginGesture();
    } else if (state.mode === "eraser") {
      state.erasingGesture = false;
      eraseAt(point);
      drawEraserTarget(point, true);
    } else if (state.mode === "manual") {
      startStroke(point, "pointer");
      render();
    }
    event.preventDefault();
  }, { passive: false });

  ui.studio.addEventListener("pointermove", event => {
    if (!state.pointers.has(event.pointerId)) return;
    const point = pointFromEvent(event);
    state.pointers.set(event.pointerId, point);

    if (state.pointers.size >= 2 && event.pointerType === "touch") {
      finishStroke();
      updateGesture();
    } else if (state.mode === "eraser") {
      eraseAt(point);
      drawEraserTarget(point, true);
    } else if (state.mode === "manual") {
      const events = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [event];
      for (const sample of events) addStrokePoint(pointFromEvent(sample), "pointer");
    }
    event.preventDefault();
  }, { passive: false });

  const release = event => {
    state.pointers.delete(event.pointerId);
    if (state.pointers.size < 2) state.gesture = null;
    state.erasingGesture = false;
    if (state.mode === "eraser") clearHandCanvas();
    finishStroke();
    try { ui.studio.releasePointerCapture?.(event.pointerId); } catch {}
  };
  ui.studio.addEventListener("pointerup", release, { passive: true });
  ui.studio.addEventListener("pointercancel", release, { passive: true });

  ui.studio.addEventListener("wheel", event => {
    if (!(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    const before = screenToWorld(point);
    state.view.scale = Math.max(.5, Math.min(3, state.view.scale * (event.deltaY < 0 ? 1.08 : .92)));
    const { width, height } = canvasMetrics();
    state.view.x = point.x - before.x * width * state.view.scale;
    state.view.y = point.y - before.y * height * state.view.scale;
    render();
  }, { passive: false });
}


function warmHandEngineNow() {
  if (state.settings.warmHandEngine === false || state.landmarker || state.handLoadPromise) return;
  // Never instantiate MediaPipe in the background. Some Android WebViews
  // reject a pre-created task before a live camera frame exists.
  primeLocalHandAssets({ modelUrl: HAND_MODEL, moduleUrl: MEDIAPIPE_MODULE_URLS[0] })
    .then(() => { state.handWarmed = true; })
    .catch(error => console.warn("Local hand assets could not be primed.", error));
}

function scheduleHandEngineWarmup() {
  clearTimeout(state.handWarmTimer);
  if (state.settings.warmHandEngine === false || state.landmarker || state.handLoadPromise) return;
  const warm = () => warmHandEngineNow();
  if ("requestIdleCallback" in window) window.requestIdleCallback(warm, { timeout: 1200 });
  else state.handWarmTimer = setTimeout(warm, 900);
}

/* Camera and hand engine lifecycle: this is the only path that requests
   the camera, starts/stops the stream, and initializes MediaPipe. */
function openCameraConsent({ hand = true } = {}) {
  state.consentPendingMode = hand ? "hand" : "camera";
  ui.consent.hidden = false;
  syncBodyScroll();
  document.querySelectorAll("[data-camera-view]").forEach(button => {
    button.classList.toggle("selected", button.dataset.cameraView === state.settings.cameraView);
  });

  // The actual MediaPipe task starts only after the user chooses a camera
  // mode and the video element has delivered a frame. This avoids Android
  // WebView startup races between camera allocation and wasm initialization.
  if (hand) warmHandEngineNow();
}

function closeCameraConsent() {
  ui.consent.hidden = true;
  syncBodyScroll();
  state.consentPendingMode = null;
}

async function selectCameraView(view) {
  state.settings.cameraView = view === "preview" ? "preview" : "board";
  ui.cameraView.value = state.settings.cameraView;
  applySettings();
  queueSave();

  const startHand = state.consentPendingMode !== "camera";
  closeCameraConsent();

  // User selected one of the two explicit camera choices. Only here does
  // getUserMedia run and the device's browser permission prompt appear.
  if (startHand) {
    state.mode = "hand";
    updateModeButtons();
    await startHandTracker();
  } else {
    await startCamera();
  }
}

async function startCamera() {
  if (state.stream) {
    ui.studio.classList.add("camera-on");
    applyCameraView();
    return state.stream;
  }
  if (state.cameraStarting) {
    // Wait briefly for an already-starting camera so a double tap never makes
    // two permission requests or two streams.
    await new Promise(resolve => setTimeout(resolve, 120));
    return state.stream;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera API is unavailable");
  }

  state.cameraStarting = true;
  ui.cameraButton.classList.add("camera-live");
  setText(ui.handStatus, t("cameraStarting", "Opening camera"));

  const requestedWidth = Number(state.settings.cameraWidth) || 480;
  const handSession = ["hand", "hand-eraser"].includes(state.mode);
  // A 320×240 tracking feed is sufficient for the task's internal input size
  // and cuts camera upload/scaling work substantially on Android. The Max
  // profile preserves the creator-selected resolution for preview quality.
  const trackingWidth = handSession && state.settings.performanceMode !== "max"
    ? Math.min(requestedWidth, 320)
    : requestedWidth;
  const videoConstraints = {
    facingMode: { ideal: "user" },
    width: { ideal: trackingWidth, max: handSession && state.settings.performanceMode !== "max" ? 480 : requestedWidth },
    height: { ideal: Math.round(trackingWidth * 0.75), max: handSession && state.settings.performanceMode !== "max" ? 360 : Math.round(requestedWidth * 0.75) },
    frameRate: { ideal: handSession ? 24 : Math.min(30, Number(state.settings.targetFps) || 24), max: 30 }
  };

  try {
    try {
      state.stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
    } catch (constraintError) {
      // Some Android camera drivers reject requested resolution/frame settings.
      // Fallback to the browser's safe default rather than appearing to do nothing.
      if (!["OverconstrainedError", "ConstraintNotSatisfiedError"].includes(constraintError?.name)) {
        throw constraintError;
      }
      state.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }

    ui.camera.srcObject = state.stream;
    try {
      await ui.camera.play();
    } catch (playError) {
      console.warn("Camera stream exists but video.play() deferred.", playError);
    }

    ui.studio.classList.add("camera-on");
    state.cameraPerformanceReduced = false;
    ui.app.classList.add("camera-session-active");
    applyCameraView();
    ui.cameraButton.classList.add("camera-live");
    ui.indicator.hidden = false;
    hideRecovery("camera");

    const track = state.stream.getVideoTracks?.()[0];
    track?.addEventListener?.("ended", () => {
      if (state.stream) {
        toast(t("cameraStopped", "Camera stopped by the device"));
        stopCamera();
      }
    });

    setText(ui.handStatus, ["hand", "hand-eraser"].includes(state.mode) ? t("scanDetect", "Scanning hand…") : t("cameraReady", "Camera ready"));
    updateLiveHud();
    return state.stream;
  } catch (error) {
    state.stream?.getTracks?.().forEach(track => track.stop());
    state.stream = null;
    ui.camera.srcObject = null;
    ui.cameraButton.classList.remove("camera-live");
    setText(ui.handStatus, error?.name === "NotAllowedError" ? t("cameraPermissionTitle", "Camera permission is needed") : t("cameraUnavailableTitle", "Camera cannot start"));
    reportCameraFailure(error);
    throw error;
  } finally {
    state.cameraStarting = false;
  }
}

function stopCamera() {
  stopHandLoop();
  state.stream?.getTracks?.().forEach(track => track.stop());
  state.stream = null;
  ui.camera.srcObject = null;
  ui.studio.classList.remove("camera-on");
  ui.app.classList.remove("camera-session-active");
  state.cameraPerformanceReduced = false;
  ui.cameraButton.classList.remove("camera-live");
  ui.indicator.hidden = true;
  hideHandScan();
  if (handCalibration?.current?.().active) cancelHandCalibration({ quiet: true });
  clearHandCanvas();
  state.erasingGesture = false;
  setText(ui.handStatus, t("ready", "Ready"));
  setText(ui.fpsStatus, "0");
  updateLiveHud();
}

async function restartCameraCapture() {
  if (!state.stream || state.cameraStarting) return;
  const mode = state.mode;
  stopCamera();
  try {
    await startCamera();
    if (["hand", "hand-eraser"].includes(mode)) {
      state.mode = mode;
      updateModeButtons();
      await startHandTracker();
    }
  } catch (error) {
    state.mode = "manual";
    updateModeButtons();
    reportCameraFailure(error);
  }
}

async function reloadHandEngineForProfile() {
  if (!state.landmarker) return;
  const mode = state.mode;
  state.landmarker.close?.();
  state.landmarker = null;
  if (state.stream && ["hand", "hand-eraser"].includes(mode)) await startHandTracker({ forceReload: true });
}

async function loadMediaPipeModule() {
  if (state.mediaPipeModule) return state.mediaPipeModule;
  let lastError = null;

  for (let index = 0; index < MEDIAPIPE_MODULE_URLS.length; index += 1) {
    const moduleUrl = MEDIAPIPE_MODULE_URLS[index];
    try {
      const module = await import(moduleUrl);
      if (!module?.FilesetResolver || !module?.HandLandmarker) {
        throw new Error("MediaPipe module is missing required exports");
      }
      state.mediaPipeModule = module;
      const root = MEDIAPIPE_WASM_URLS[index];
      state.mediaPipeWasmRoot = String(root || "").replace(/\/+$/, "");
      return module;
    } catch (error) {
      lastError = error;
      console.warn(`MediaPipe module failed: ${moduleUrl}`, error);
    }
  }
  throw lastError || new Error("MediaPipe module is unavailable");
}

async function loadHandLandmarker({ forceReload = false } = {}) {
  if (state.landmarker && !forceReload) return state.landmarker;
  if (state.handLoadPromise && !forceReload) return state.handLoadPromise;

  state.handLoadPromise = (async () => {
    const { FilesetResolver, HandLandmarker } = await loadMediaPipeModule();
    // A closed fist naturally shortens finger reach. Keep the detector a little
    // more tolerant so it can return landmarks, while the separate geometry
    // and pinch gates continue to enforce strict drawing safety.
    const confidence = Math.max(.46, currentRule().confidence - .08);
    const result = await createLocalHandLandmarker({
      FilesetResolver,
      HandLandmarker,
      wasmRoot: state.mediaPipeWasmRoot,
      modelUrl: HAND_MODEL,
      moduleUrl: MEDIAPIPE_MODULE_URLS[0],
      confidence,
      preferredDelegate: state.handDelegate
    });
    state.landmarker = result.landmarker;
    state.handDelegate = result.delegate || (result.strategy.includes("cpu") ? "CPU" : "GPU");
    state.handEngineStrategy = result.strategy;
    state.handEngineError = "";
    return state.landmarker;
  })();

  try {
    return await state.handLoadPromise;
  } finally {
    state.handLoadPromise = null;
  }
}

function updateModeButtons() {
  const handActive = state.mode === "hand";
  const eraserActive = state.mode === "eraser" || state.mode === "hand-eraser";
  ui.manual.classList.toggle("active", state.mode === "manual");
  ui.eraser.classList.toggle("eraser-active", eraserActive);
  ui.handMode.classList.toggle("active", handActive);
  const labels = { manual: t("manual", "Manual"), eraser: t("eraser", "Eraser"), hand: t("handMode", "Hand"), "hand-eraser": t("handEraser", "Hand eraser") };
  setText(ui.modeStatus, labels[state.mode] || t("manual", "Manual"));
}

function setGestureStatus(stateName, message) {
  if (!ui.handGestureStatus || !ui.gestureStatusValue) return;
  ui.handGestureStatus.dataset.state = stateName;
  setText(ui.gestureStatusValue, message);
}

function trackingAssessment(geometry, stable, jumped = false) {
  if (!geometry) return { score: 0, state: "searching", label: t("trackingSearching", "Looking for a hand…"), usable: false };
  const rule = currentRule();
  const confidence = Math.min(1, Math.max(0, geometry.score));
  const palm = Math.min(1, geometry.scale / Math.max(.001, rule.minPalm * 2));
  const reach = Math.min(1, geometry.indexReach / Math.max(.001, rule.minIndexReach * 1.6));
  const form = geometry.palmAspect >= rule.minPalmAspect && geometry.palmAspect <= rule.maxPalmAspect && geometry.fingerSpan >= rule.minFingerSpan ? 1 : .18;
  const depth = geometry.tipDepth <= rule.maxTipDepth ? 1 : .28;
  const score = Math.round(Math.max(0, Math.min(100, (confidence * .36 + palm * .18 + reach * .18 + form * .18 + depth * .10) * 100 - (jumped ? 28 : 0))));
  const geometryUsable = handGeometryIsUsable(geometry, rule);
  const usable = geometryUsable && stable && !jumped;
  if (!geometryUsable && geometry.score < rule.confidence) return { score, state: "searching", label: t("trackingRejected", "Hold a clear hand in frame"), usable: false };
  if (!geometryUsable && (geometry.palmAspect < rule.minPalmAspect || geometry.palmAspect > rule.maxPalmAspect || geometry.fingerSpan < rule.minFingerSpan)) return { score, state: "steady", label: t("trackingRejected", "Hold a clear hand in frame"), usable: false };
  if (!usable && geometry.scale < rule.minPalm) return { score, state: "close", label: t("trackingMoveCloser", "Move your hand a little closer"), usable: false };
  if (!usable) return { score, state: "steady", label: t("trackingSteady", "Hold your hand steady"), usable: false };
  return { score, state: "stable", label: t("trackingStable", "Stable and ready"), usable: true };
}

function updateTrackingHealth(assessment) {
  state.trackingHealth = assessment?.score || 0;
  if (ui.handTrackingHealth) {
    ui.handTrackingHealth.dataset.state = assessment?.state || "searching";
    setText(ui.handTrackingHealth, assessment?.label || t("trackingSearching", "Looking for a hand…"));
  }
  if (ui.handTrackingMeterFill) ui.handTrackingMeterFill.style.setProperty("--tracking-health", `${Math.max(0, Math.min(100, assessment?.score || 0))}%`);
}

function updateHandCalibrationStatus() {
  if (!ui.handCalibrationStatus) return;
  const calibration = normalizeHandCalibration(state.settings.handCalibration);
  setText(ui.handCalibrationStatus, calibration.enabled ? t("calibrationReady", "Hand calibration is ready") : t("calibrationDefault", "Default hand mapping is active"));
  if (ui.resetHandCalibration) ui.resetHandCalibration.disabled = !calibration.enabled;
}

function updateCalibrationOverlay(event = handCalibration?.current?.()) {
  if (!ui.calibrationOverlay) return;
  const active = Boolean(event?.active);
  ui.calibrationOverlay.hidden = !active;
  if (!active) return;
  const target = event.target;
  if (target && ui.calibrationTarget) {
    ui.calibrationTarget.style.setProperty("--target-x", `${Math.round(target.x * 100)}%`);
    ui.calibrationTarget.style.setProperty("--target-y", `${Math.round(target.y * 100)}%`);
  }
  setText(ui.calibrationTitle, t("handCalibration", "Hand calibration"));
  setText(ui.calibrationStep, `${t("calibrationStep", "Step")} ${Math.min((event.index || 0) + 1, event.total || 4)}/${event.total || 4}`);
  const hint = event.status === "holding" ? t("calibrationHold", "Hold your hand steady…") : t("calibrationStart", "Move your hand to the target and hold it steady");
  setText(ui.calibrationHint, hint);
  if (ui.calibrationMeterFill) ui.calibrationMeterFill.style.setProperty("--calibration-progress", `${Math.round((event.progress || 0) * 100)}%`);
}

async function startHandCalibration() {
  finishStroke();
  state.calibrationPending = true;
  const session = handCalibration.start();
  updateCalibrationOverlay(session);
  if (!state.stream) {
    openCameraConsent({ hand: true });
    return;
  }
  state.mode = "hand";
  updateModeButtons();
  try {
    await startHandTracker();
  } catch {
    cancelHandCalibration({ quiet: true });
  }
}

function cancelHandCalibration({ quiet = false } = {}) {
  state.calibrationPending = false;
  handCalibration.cancel();
  updateCalibrationOverlay();
  if (!quiet) toast(t("calibrationCancelled", "Calibration cancelled"));
}

function resetHandCalibration() {
  state.settings.handCalibration = { ...HAND_CALIBRATION_DEFAULT };
  updateHandCalibrationStatus();
  queueSave();
  toast(t("calibrationResetDone", "Calibration reset to default"));
}

function setHandPoint(point, stateName = "ready") {
  if (!point) {
    ui.handPoint.classList.remove("visible");
    return;
  }
  const screen = handPointToScreen(point);
  const studioRect = ui.studio.getBoundingClientRect();
  ui.handPoint.style.left = `${studioRect.left + screen.x}px`;
  ui.handPoint.style.top = `${studioRect.top + screen.y}px`;
  ui.handPoint.dataset.state = stateName;
  ui.handPoint.classList.add("visible");
}

function resetHandGestureState() {
  state.handDrawing = false;
  state.handPoint = null;
  state.handRawPoint = null;
  state.lastGuideLandmarks = null;
  state.lastGuideSeenAt = 0;
  state.lastGuideScore = 0;
  state.handPalmScale = 0;
  state.handStableFrames = 0;
  state.handMissingFrames = 0;
  state.pinchOnFrames = 0;
  state.pinchOffFrames = 0;
  state.pinchHoldFrames = 0;
  state.handOpenFrames = 0;
  state.handArmed = false;
  state.handIntentFrames = 0;
  state.handIntentAnchor = null;
  state.handGestureAnchor = null;
  state.handScore = 0;
  state.handGeometry = null;
  state.handRejectedFrames = 0;
  state.handStabilizer.reset();
  state.pinchGate.reset();
  state.handActionStartedAt = 0;
  state.lastVideoTime = -1;
  state.inferenceFrames = 0;
  state.inferenceFpsAt = performance.now();
  state.inferenceFps = 0;
  state.effectiveTargetFps = 0;
  state.erasingGesture = false;
  setHandPoint(null);
  setGestureStatus("ready", t("gestureReady", "Ready"));
}

function requestedHandFps() {
  const configured = Math.max(12, Math.min(30, Number(state.settings.targetFps) || 24));
  return state.effectiveTargetFps || configured;
}

async function enableTrackingSafeCapture() {
  if (state.cameraPerformanceReduced || state.settings.performanceMode === "max") return;
  const track = state.stream?.getVideoTracks?.()[0];
  if (!track?.applyConstraints) return;
  state.cameraPerformanceReduced = true;
  try {
    await track.applyConstraints({
      width: { ideal: 320, max: 480 },
      height: { ideal: 240, max: 360 },
      frameRate: { ideal: 20, max: 24 }
    });
    toast(t("trackingOptimized", "Hand tracking was optimised for this phone"));
  } catch (error) {
    state.cameraPerformanceReduced = false;
    console.warn("Tracking capture fallback was not supported.", error);
  }
}

function updateInferenceFps(now) {
  state.inferenceFrames += 1;
  const elapsed = now - state.inferenceFpsAt;
  if (elapsed >= 700) {
    state.inferenceFps = Math.round((state.inferenceFrames * 1000) / elapsed);
    state.fps = state.inferenceFps;
    const configured = Math.max(12, Math.min(30, Number(state.settings.targetFps) || 24));
    state.effectiveTargetFps = effectiveTrackingFps({ configured, measured: state.inferenceFps });
    if (state.inferenceFps <= 9) void enableTrackingSafeCapture();
    state.inferenceFrames = 0;
    state.inferenceFpsAt = now;
  }
}

function setMode(next) {
  if (handCalibration?.current?.().active && next !== "hand") cancelHandCalibration({ quiet: true });
  finishStroke();
  resetHandGestureState();

  if (next === "hand") {
    if (!state.stream) {
      openCameraConsent({ hand: true });
      return;
    }
    state.mode = "hand";
    updateModeButtons();
    startHandTracker().catch(error => {
      console.warn("Hand start failed.", error);
      const key = error?.airdrowStage === "camera" ? "cameraPermissionTitle" : "engineUnavailable";
      toast(t(key, error?.airdrowStage === "camera" ? "Camera permission is needed" : "Hand engine unavailable"));
    });
  } else if (next === "eraser") {
    state.mode = state.stream ? "hand-eraser" : "eraser";
    updateModeButtons();
    if (state.mode === "hand-eraser") startHandTracker();
  } else {
    state.mode = "manual";
    stopHandLoop();
    clearHandCanvas();
    setText(ui.handStatus, state.stream ? t("cameraReady", "Camera ready") : t("ready", "Ready"));
    updateModeButtons();
  }
  updateLiveHud();
}

function setHandScanVisual(visual = "idle") {
  state.handScanStatusVisual = visual;
  if (ui.handScanStatus) ui.handScanStatus.dataset.visual = visual;
}

function showHandScan(label = t("scanWarming", "Preparing hand engine…"), hint = "") {
  clearTimeout(state.handScanHideTimer);
  state.handScanStartedAt = performance.now();
  state.handScanHasDetected = false;
  ui.handScan.classList.remove("is-hiding");
  ui.handScan.dataset.stage = "warm";
  setHandScanVisual("idle");
  setText(ui.handScanLabel, label);
  setText(ui.handScanHint, hint);
  ui.handScan.hidden = false;
}

function setHandScanStage(stage, label, hint) {
  clearTimeout(state.handScanHideTimer);
  ui.handScan.classList.remove("is-hiding");
  ui.handScan.dataset.stage = stage;
  if (label) setText(ui.handScanLabel, label);
  if (hint !== undefined) setText(ui.handScanHint, hint);
  if (stage === "found") setHandScanVisual("success");
  else if (stage === "missing") setHandScanVisual("missing");
  else if (stage === "problem") setHandScanVisual("problem");
  else setHandScanVisual("idle");
}

function hideHandScan(delay = 180) {
  clearTimeout(state.handScanHideTimer);
  ui.handScan.classList.add("is-hiding");
  state.handScanHideTimer = setTimeout(() => {
    ui.handScan.hidden = true;
    ui.handScan.classList.remove("is-hiding");
    ui.handScan.dataset.stage = "warm";
    setHandScanVisual("idle");
  }, delay);
}

async function waitForCameraFrame(timeoutMs = 1800) {
  if (ui.camera.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return;
  await new Promise(resolve => {
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      ui.camera.removeEventListener("loadeddata", done);
      resolve();
    };
    ui.camera.addEventListener("loadeddata", done, { once: true });
    setTimeout(done, timeoutMs);
  });
}

async function startHandTracker({ forceReload = false } = {}) {
  if (!["hand", "hand-eraser"].includes(state.mode)) return;
  if (state.handStartPromise && !forceReload) return state.handStartPromise;

  const startTask = (async () => {
    showHandScan(
      state.landmarker ? t("scanCamera", "Camera is ready; hold your hand in view") : t("scanWarming", "Preparing hand engine…"),
      state.landmarker ? t("scanDetect", "Checking hand stability…") : t("scanWarming", "Preparing hand engine…")
    );
    setText(ui.handStatus, t("scanWarming", "Preparing hand engine…"));

    let cameraReady = false;
    try {
      await startCamera();
      cameraReady = true;
      if (!state.handScanHasDetected) {
        setHandScanStage("camera", t("scanCamera", "Camera is ready; place your hand in frame"), t("scanDetect", "Checking hand stability…"));
        setText(ui.handStatus, t("scanDetect", "Scanning hand…"));
      }
    } catch (error) {
      error.airdrowStage = "camera";
      throw error;
    }

    try {
      // A live frame exists before wasm/task creation. This is essential on
      // Android devices where camera allocation and wasm initialization can
      // otherwise contend for the same startup window.
      await waitForCameraFrame(2200);
      if (ui.camera.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) throw new Error("Camera did not deliver a video frame");
      await loadHandLandmarker({ forceReload });
    } catch (error) {
      error.airdrowStage = "engine";
      throw error;
    }

    try {
      stopHandLoop();
      state.lastDetection = 0;
      state.lastFpsAt = performance.now();
      setHandScanStage("detect", t("gestureScan", "Checking hand stability"), t("gestureHelp", "Open your hand, hold your fingers together, then move to draw"));
      hideRecovery("camera");
      handFrame();
    } catch (error) {
      error.airdrowStage = cameraReady ? "engine" : "camera";
      throw error;
    }
  })().catch(error => {
    console.warn("Hand engine failed without stopping AIR-DROW.", error);
    setText(ui.handStatus, error.airdrowStage === "camera" ? t("cameraUnavailableTitle", "Camera cannot start") : t("engineUnavailable", "Hand engine unavailable"));
    setText(ui.fpsStatus, "—");
    setHandScanStage("problem", error.airdrowStage === "camera" ? t("cameraUnavailableTitle", "Camera cannot start") : t("engineUnavailable", "Hand engine unavailable"), t("engineTryAgain", "Reload engine"));
    hideHandScan(1800);
    state.mode = "manual";
    updateModeButtons();
    if (error.airdrowStage === "camera") {
      reportCameraFailure(error);
    } else {
      // A failed task must not leave a live preview that looks like tracking is
      // active. The retry action starts both camera and task from a clean state.
      stopCamera();
      reportHandEngineFailure(error);
    }
    throw error;
  });

  state.handStartPromise = startTask;
  try {
    return await startTask;
  } finally {
    if (state.handStartPromise === startTask) state.handStartPromise = null;
  }
}

function handleHandRuntimeFailure(error) {
  console.warn("Hand detection frame failed.", error);
  stopHandLoop();
  state.landmarker?.close?.();
  state.landmarker = null;
  setText(ui.handStatus, t("engineUnavailable", "Hand engine unavailable"));
  setGestureStatus("lost", t("engineUnavailable", "Hand engine unavailable"));
  setHandScanStage("problem", t("engineUnavailable", "Hand engine unavailable"), t("engineTryAgain", "Reload engine"));
  hideHandScan(1800);

  // Desktop starts with GPU. A detection-time GPU failure is retried once with
  // CPU instead of leaving the camera preview on a stale error state.
  if (state.handDelegate !== "CPU" && state.stream) {
    state.handDelegate = "CPU";
    toast(t("engineCpuFallback", "Switching the hand engine to safe mode…"));
    window.setTimeout(() => {
      state.mode = "hand";
      updateModeButtons();
      startHandTracker({ forceReload: true }).catch(() => {});
    }, 0);
    return;
  }

  state.mode = "manual";
  updateModeButtons();
  reportHandEngineFailure(error);
}

function stopHandLoop() {
  cancelAnimationFrame(state.handLoop);
  state.handLoop = 0;
  if (state.handDrawing) finishStroke();
  resetHandGestureState();
}

function clearHandCanvas() {
  const { width, height } = canvasMetrics();
  handCtx.clearRect(0, 0, width, height);
}

// The guide is visual feedback only. It must not be coupled to the stricter
// open-hand geometry gate used for pinch drawing: a closed fist has valid
// landmarks but intentionally fails open-finger reach tests.
const HAND_GUIDE_MIN_SCORE = .34;
const HAND_GUIDE_MIN_SCALE = .020;
const HAND_GUIDE_HOLD_MS = 260;

function cacheHandGuide(points, geometry, now) {
  if (!Array.isArray(points) || points.length < 21) return false;
  const score = Number(geometry?.score);
  const scale = Number(geometry?.scale);
  if (!Number.isFinite(score) || score < HAND_GUIDE_MIN_SCORE) return false;
  if (!Number.isFinite(scale) || scale < HAND_GUIDE_MIN_SCALE) return false;

  // Copy numeric values because a MediaPipe result can be reused by the next
  // synchronous inference call.
  state.lastGuideLandmarks = points.map(point => ({
    x: Number(point?.x) || 0,
    y: Number(point?.y) || 0,
    z: Number(point?.z) || 0
  }));
  state.lastGuideSeenAt = now;
  state.lastGuideScore = score;
  return true;
}

function drawHeldHandGuide(now) {
  if (!state.settings.showHandGuide || !state.lastGuideLandmarks?.length) return false;
  const elapsed = now - state.lastGuideSeenAt;
  if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > HAND_GUIDE_HOLD_MS) return false;

  // Covers a single detector miss caused by finger occlusion while avoiding a
  // long-lived frozen guide when the hand actually leaves the camera.
  const opacity = Math.max(.28, 1 - (elapsed / HAND_GUIDE_HOLD_MS) * .72);
  drawHandSkeleton(state.lastGuideLandmarks, opacity);
  return true;
}

function processGestureShortcut(landmarks, pinchRatio, now) {
  if (!state.settings.gestureShortcuts || state.handDrawing) return;
  const name = recognizeGestureShortcut(landmarks, pinchRatio);
  const action = state.shortcutGate.observe(name, now);
  if (ui.shortcutStatus) setText(ui.shortcutStatus, name ? `${SHORTCUT_LABELS[name] || name}…` : t("shortcutOff", "Shortcuts are off"));
  if (!action) return;
  if (action === "palm") { void saveProject(); toast(t("shortcutSaved", "Saved")); }
  if (action === "victory") { undo(); toast(t("shortcutUndo", "Undo")); }
  if (action === "thumb-up") { void exportCurrent(); toast(t("shortcutExport", "Export")); }
  if (action === "fist") { setMode(state.mode === "hand-eraser" ? "hand" : "eraser"); toast(t("shortcutEraser", "Eraser")); }
}

function handFrame() {
  if (!["hand", "hand-eraser"].includes(state.mode) || !state.stream || !state.landmarker) return;
  state.handLoop = requestAnimationFrame(handFrame);

  const now = performance.now();
  const frameInterval = 1000 / requestedHandFps();
  if (ui.camera.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
  const videoTime = ui.camera.currentTime;
  if (videoTime === state.lastVideoTime || now - state.lastDetection < frameInterval) return;
  state.lastVideoTime = videoTime;
  state.lastDetection = now;

  try {
    const result = state.landmarker.detectForVideo(ui.camera, now);
    const landmarks = result?.landmarks?.[0];
    clearHandCanvas();

    if (!landmarks) {
      drawHeldHandGuide(now);
      state.handMissingFrames += 1;
      state.pinchGate.observe({ usable: false, rule: currentRule() });
      state.pinchOnFrames = 0;
      state.pinchOffFrames = 0;
      setHandPoint(null);
      updateTrackingHealth({ score: 0, state: "searching", label: t("trackingSearching", "Looking for a hand…"), usable: false });
      if (state.handDrawing && state.handMissingFrames >= currentRule().lostFrames) finishStroke();
      if (state.handMissingFrames >= currentRule().lostFrames) {
        setGestureStatus("lost", t("gestureLost", "Hand not found"));
        setText(ui.handStatus, t("handNotFound", "Hand not found"));
      }
      if (performance.now() - state.handScanStartedAt > 3200 && !state.handScanHasDetected) {
        setHandScanStage("missing", t("handNotFound", "Hand not found"), t("scanCamera", "Camera is ready; place your hand in frame"));
      }
      updateLiveHud();
      return;
    }

    const rule = currentRule();
    const geometry = readHandGeometry(landmarks, result);
    const guideDetected = cacheHandGuide(landmarks, geometry, now);
    if (state.settings.showHandGuide && guideDetected) drawHandSkeleton(landmarks);
    const candidate = handGeometryIsUsable(geometry, rule);
    const index = landmarks[8];
    const raw = { x: index.x, y: index.y, pressure: 1, time: now };
    const stabilised = state.handStabilizer.observe(raw, { scale: geometry?.scale || .05, rule, eligible: candidate });
    state.handRawPoint = raw;
    state.handPalmScale = geometry?.scale || 0;
    state.handStableFrames = state.handStabilizer.snapshot().stableFrames;
    state.handGeometry = geometry;

    const stablePosition = stabilised.stable;
    const assessment = trackingAssessment(geometry, stablePosition, stabilised.jumped);
    updateTrackingHealth(assessment);

    if (!candidate || !stabilised.point) {
      state.handRejectedFrames += 1;
      state.handMissingFrames = 0;
      state.pinchGate.observe({ usable: false, rule });
      state.pinchOnFrames = 0;
      state.pinchOffFrames = 0;
      if (state.handDrawing) finishStroke();
      setHandPoint(null);
      setGestureStatus("blocked", assessment.label);
      setText(ui.handStatus, assessment.label);
      updateInferenceFps(now);
      setText(ui.fpsStatus, state.inferenceFps || "—");
      updateLiveHud();
      return;
    }

    state.handMissingFrames = 0;
    state.handRejectedFrames = 0;
    state.handPoint = stabilised.point;

    const calibrationEvent = handCalibration?.observe(state.handPoint, {
      now,
      stable: stablePosition,
      usable: assessment.usable,
      mirror: state.settings.mirrorCamera
    });
    if (calibrationEvent?.active) {
      state.pinchGate.reset();
      state.pinchOnFrames = 0;
      state.pinchOffFrames = 0;
      updateCalibrationOverlay(calibrationEvent);
      setHandPoint(state.handPoint, assessment.usable ? "ready" : "hold");
      setGestureStatus(assessment.usable ? "hold" : "blocked", assessment.usable ? t("calibrationHold", "Hold your hand steady…") : assessment.label);
      setText(ui.handStatus, assessment.usable ? t("calibrationHold", "Hold your hand steady…") : assessment.label);
      updateInferenceFps(now);
      setText(ui.fpsStatus, state.inferenceFps || "—");
      updateLiveHud();
      return;
    }
    if (calibrationEvent?.type === "complete") {
      state.settings.handCalibration = calibrationEvent.calibration;
      state.calibrationPending = false;
      updateHandCalibrationStatus();
      queueSave();
      updateCalibrationOverlay();
      toast(t("calibrationComplete", "Hand calibration completed"));
    }

    const pinch = state.pinchGate.observe({
      pinchRatio: geometry.pinchRatio,
      usable: assessment.usable,
      jumped: stabilised.jumped,
      rule,
      safe: state.settings.safePinch !== false
    });
    state.pinchOnFrames = pinch.onFrames;
    state.pinchOffFrames = pinch.offFrames;
    const pinchConfirmed = pinch.active;
    const releaseConfirmed = pinch.released;
    const stableHand = assessment.usable;

    if (!state.handScanHasDetected && stableHand) {
      state.handScanHasDetected = true;
      setHandScanStage("found", t("scanFound", "Hand found"), t("gestureArm", "Open hand detected — pinch is armed"));
      hideHandScan(3000);
    }

    if (!assessment.usable && state.handDrawing) {
      state.handDrawing = false;
      finishStroke();
      setGestureStatus("blocked", t("trackingBlocked", "Tracking is unstable — drawing paused"));
      setText(ui.handStatus, t("trackingBlocked", "Tracking is unstable — drawing paused"));
    }

    if (state.mode === "hand-eraser") {
      drawEraserTargetFromHand(state.handPoint, pinchConfirmed);
      setHandPoint(state.handPoint, pinchConfirmed ? "erasing" : (state.pinchOnFrames ? "hold" : "ready"));
      if (pinchConfirmed) {
        eraseAtWorld(handToWorld(state.handPoint));
        setGestureStatus("erasing", t("gestureErasing", "Erasing"));
        setText(ui.handStatus, t("erasing", "Erasing"));
      } else if (state.pinchOnFrames > 0) {
        setGestureStatus("hold", `${t("gestureHold", "Hold pinch")} ${state.pinchOnFrames}/${rule.enterFrames}`);
        setText(ui.handStatus, t("targetReady", "Target ready"));
        state.erasingGesture = false;
      } else {
        setGestureStatus("ready", t("gestureReady", "Ready"));
        setText(ui.handStatus, t("targetReady", "Target ready"));
        state.erasingGesture = false;
      }
    } else {
      setHandPoint(state.handPoint, state.handDrawing ? "drawing" : (state.pinchOnFrames ? "hold" : "ready"));
      if (!state.handDrawing && pinch.started) {
        state.handDrawing = true;
        startStroke(state.handPoint, "hand");
      }
      if (state.handDrawing && releaseConfirmed) {
        state.handDrawing = false;
        finishStroke();
      }
      if (state.handDrawing) {
        addStrokePoint(state.handPoint, "hand");
        setGestureStatus("drawing", t("gestureDrawing", "Drawing"));
        setText(ui.handStatus, t("drawing", "Drawing"));
      } else if (state.pinchOnFrames > 0) {
        setGestureStatus("hold", `${t("gestureHold", "Hold pinch")} ${state.pinchOnFrames}/${rule.enterFrames}`);
        setText(ui.handStatus, t("tracking", "Tracking"));
      } else {
        setGestureStatus("ready", stableHand ? t("gestureTracking", "Tracking") : t("gestureReady", "Ready"));
        setText(ui.handStatus, stableHand ? t("tracking", "Tracking") : t("scanDetect", "Scanning hand…"));
      }
    }

    if (state.settings.gestureShortcuts && state.mode === "hand" && assessment.usable) processGestureShortcut(landmarks, geometry.pinchRatio, now);
    else if (ui.shortcutStatus) setText(ui.shortcutStatus, state.settings.gestureShortcuts ? t("gestureReady", "Ready") : t("shortcutOff", "Shortcuts are off"));

    updateInferenceFps(now);
    setText(ui.fpsStatus, state.inferenceFps || "—");
    updateLiveHud();
  } catch (error) {
    handleHandRuntimeFailure(error);
  }
}

function drawHandSkeleton(points, opacity = 1) {
  const { width, height } = canvasMetrics();
  handCtx.clearRect(0, 0, width, height);
  const map = point => normalizedToCanvasPoint(point);
  const links = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],[0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17]];
  handCtx.save();
  handCtx.globalAlpha = Math.max(.18, Math.min(1, Number(opacity) || 1));
  handCtx.lineWidth = 1.45;
  handCtx.strokeStyle = "rgba(118,203,255,.90)";
  handCtx.fillStyle = "rgba(105,224,190,.96)";
  for (const [a, b] of links) {
    const pa = map(points[a]), pb = map(points[b]);
    handCtx.beginPath();
    handCtx.moveTo(pa.x, pa.y);
    handCtx.lineTo(pb.x, pb.y);
    handCtx.stroke();
  }
  for (const point of points) {
    const p = map(point);
    handCtx.beginPath();
    handCtx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
    handCtx.fill();
  }
  handCtx.restore();
}

function undo() {
  const previous = state.undoStack.pop();
  if (!previous) return;
  state.redoStack.push(structuredClone(state.strokes));
  state.strokes = previous;
  state.currentStroke = null;
  updateHistoryControls();
  queueSave();
  render();
}

function redo() {
  const next = state.redoStack.pop();
  if (!next) return;
  state.undoStack.push(structuredClone(state.strokes));
  state.strokes = next;
  state.currentStroke = null;
  updateHistoryControls();
  queueSave();
  render();
}

function openClearDialog() {
  if (!state.strokes.length) return;
  ui.clearDialog.hidden = false;
  syncBodyScroll();
}

function closeClearDialog() {
  ui.clearDialog.hidden = true;
  syncBodyScroll();
}

function confirmClearCanvas() {
  if (!state.strokes.length) {
    closeClearDialog();
    return;
  }
  pushUndoSnapshot();
  state.strokes = [];
  state.currentStroke = null;
  queueSave();
  render();
  closeClearDialog();
  toast(t("savedLocally", "Saved locally"));
}

function clearCanvas() {
  if (!state.strokes.length) return;
  openClearDialog();
}

function distanceToSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

function eraseAtWorld(world) {
  const { width, height } = canvasMetrics();
  const radius = Number(state.settings.eraserSize) / Math.max(1, Math.min(width, height) * state.view.scale);
  const before = state.strokes.length;

  const hitsStroke = stroke => {
    const points = stroke.points || [];
    if (!points.length) return false;
    if (points.length === 1) return Math.hypot(world.x - points[0].x, world.y - points[0].y) < radius;
    for (let index = 1; index < points.length; index += 1) {
      const lineRadius = (Number(stroke.size) / Math.max(1, Math.min(width, height) * state.view.scale)) / 2;
      if (distanceToSegment(world, points[index - 1], points[index]) <= radius + lineRadius) return true;
    }
    return false;
  };

  if (!state.erasingGesture) {
    pushUndoSnapshot();
    state.erasingGesture = true;
  }
  state.strokes = state.strokes.filter(stroke => !hitsStroke(stroke));
  if (state.strokes.length !== before) {
    queueSave();
    render();
  }
}

function eraseAt(point) {
  eraseAtWorld(screenToWorld(point));
}

function handPointToScreen(point) {
  // Calibration must show the unmodified pointer while collecting targets;
  // otherwise an older mapping could visually hide where the camera sees the hand.
  if (handCalibration?.current?.().active) {
    return displayPointToScreen(mapHandPoint(point, HAND_CALIBRATION_DEFAULT, { mirror: state.settings.mirrorCamera }));
  }
  return mappedHandPointToScreen(point);
}

function drawEraserTarget(screenPoint, active = false) {
  const { width, height } = canvasMetrics();
  const radius = Math.max(10, Number(state.settings.eraserSize) / 2);
  handCtx.save();
  handCtx.clearRect(0, 0, width, height);
  handCtx.strokeStyle = active ? "rgba(255,126,151,.98)" : "rgba(255,205,215,.92)";
  handCtx.fillStyle = active ? "rgba(255,126,151,.20)" : "rgba(255,205,215,.10)";
  handCtx.lineWidth = 1.8;
  handCtx.beginPath();
  handCtx.arc(screenPoint.x, screenPoint.y, radius, 0, Math.PI * 2);
  handCtx.fill();
  handCtx.stroke();
  handCtx.beginPath();
  handCtx.moveTo(screenPoint.x - radius - 7, screenPoint.y);
  handCtx.lineTo(screenPoint.x + radius + 7, screenPoint.y);
  handCtx.moveTo(screenPoint.x, screenPoint.y - radius - 7);
  handCtx.lineTo(screenPoint.x, screenPoint.y + radius + 7);
  handCtx.stroke();
  handCtx.restore();
}

function drawEraserTargetFromHand(point, active = false) {
  const { width, height } = canvasMetrics();
  const screen = handPointToScreen(point);
  // Preserve the skeleton when enabled, then paint the target on top.
  const radius = Math.max(10, Number(state.settings.eraserSize) / 2);
  handCtx.save();
  handCtx.strokeStyle = active ? "rgba(255,126,151,.98)" : "rgba(255,205,215,.92)";
  handCtx.fillStyle = active ? "rgba(255,126,151,.20)" : "rgba(255,205,215,.10)";
  handCtx.lineWidth = 1.8;
  handCtx.beginPath();
  handCtx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
  handCtx.fill();
  handCtx.stroke();
  handCtx.beginPath();
  handCtx.moveTo(screen.x - radius - 7, screen.y);
  handCtx.lineTo(screen.x + radius + 7, screen.y);
  handCtx.moveTo(screen.x, screen.y - radius - 7);
  handCtx.lineTo(screen.x, screen.y + radius + 7);
  handCtx.stroke();
  handCtx.restore();
}

function projectNameFromInput() {
  const value = String(ui.projectName?.value || state.projectTitle || "Untitled").trim().replace(/\s+/g, " ");
  state.projectTitle = value.slice(0, 72) || "Untitled";
  if (ui.projectName) ui.projectName.value = state.projectTitle;
  return state.projectTitle;
}

function makeGalleryAction(label, action, id, danger = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `gallery-action${danger ? " danger" : ""}`;
  button.dataset.galleryAction = action;
  button.dataset.galleryId = id;
  button.textContent = label;
  return button;
}

async function renderProjectGallery() {
  if (!ui.galleryList) return;
  loadingManager?.beginTask("gallery", { label: t("galleryLoading", "Loading gallery…"), progress: 28, global: false });
  loadingManager?.showGallerySkeleton();
  try {
    const projects = await projectStore.listGalleryProjects();
    loadingManager?.updateTask("gallery", { progress: 76 });
    ui.galleryList.replaceChildren();
    if (!projects.length) {
      const empty = document.createElement("p");
      empty.className = "gallery-empty";
      empty.textContent = t("noProjects", "No saved gallery projects yet");
      ui.galleryList.append(empty);
      if (ui.galleryStatus) setText(ui.galleryStatus, "0 projects");
      return;
    }
    for (const project of projects) {
      const card = document.createElement("article"); card.className = "gallery-card";
      if (project.thumbnail) {
        const image = document.createElement("img");
        image.className = "gallery-thumb"; image.alt = ""; image.src = project.thumbnail;
        image.loading = "lazy"; image.width = 112; image.height = 104; image.decoding = "async";
        card.append(image);
      }
      const meta = document.createElement("div"); meta.className = "gallery-meta";
      const title = document.createElement("b"); title.textContent = project.name; meta.append(title);
      const small = document.createElement("small"); small.textContent = `${project.strokeCount} ${t("drawing", "strokes")} · ${localDate(project.savedAt)}`; meta.append(small);
      const actions = document.createElement("div"); actions.className = "gallery-actions";
      actions.append(makeGalleryAction("Open", "load", project.id), makeGalleryAction("Delete", "delete", project.id, true));
      card.append(meta, actions); ui.galleryList.append(card);
    }
    if (ui.galleryStatus) setText(ui.galleryStatus, `${projects.length} projects`);
  } catch (error) {
    console.warn("Gallery could not load", error);
    showRecovery({ kind: "storage", icon: "!", title: t("galleryFailureTitle", "Gallery could not open"), body: t("galleryFailureBody", "Your local projects remain safe. Try loading the gallery again."), actionLabel: t("galleryTryAgain", "Retry gallery"), action: () => renderProjectGallery() });
    ui.galleryList.replaceChildren();
    if (ui.galleryStatus) setText(ui.galleryStatus, "Gallery unavailable");
  } finally {
    loadingManager?.endTask("gallery");
  }
}

async function saveProjectToGallery() {
  try {
    projectNameFromInput();
    await saveProject({ quiet: true });
    const thumbnail = ensureExporter().buildThumbnail();
    await projectStore.saveGalleryProject({ name: state.projectTitle, project: serializeProject(), thumbnail });
    await renderProjectGallery();
    toast(t("projectSaved", "Project saved to gallery"));
  } catch (error) { console.error(error); toast(t("projectDeleteFailed", "Save failed")); showRecovery({ kind: "storage", icon: "!", title: t("storageRecoveryTitle", "Saving is limited"), body: t("storageFullBody", "Browser storage is full. Export your project and free up browser storage."), actionLabel: t("storageOpenSettings", "Open settings"), action: () => openWorkspace("settings") }); }
}

async function loadGalleryProject(id) {
  try {
    const project = projectFromStorage(await projectStore.loadGalleryProject(id));
    if (!project) throw new Error("Invalid gallery project");
    state.strokes = project.strokes;
    state.settings = { ...defaults, ...project.settings };
    state.view = { x: 0, y: 0, scale: 1, ...project.view };
    state.projectTitle = project.title || "Untitled";
    state.undoStack = []; state.redoStack = []; state.currentStroke = null;
    syncSettingsUI();
    if (ui.projectName) ui.projectName.value = state.projectTitle;
    applySettings(); updateHistoryControls(); render();
    await saveProject({ quiet: true });
    toast("Project opened");
  } catch (error) { console.error(error); toast(t("galleryFailureTitle", "Gallery could not open")); showRecovery({ kind: "storage", icon: "!", title: t("galleryFailureTitle", "Gallery could not open"), body: t("galleryFailureBody", "Your local projects remain safe. Try loading the gallery again."), actionLabel: t("galleryTryAgain", "Retry gallery"), action: () => renderProjectGallery() }); }
}

async function importProjectFile(file) {
  if (!file) return;
  try {
    const raw = JSON.parse(await file.text());
    const project = projectFromStorage(raw);
    if (!project) throw new Error("Invalid AIR-DROW file");
    state.strokes = project.strokes;
    state.settings = { ...defaults, ...project.settings };
    state.view = { x: 0, y: 0, scale: 1, ...project.view };
    state.projectTitle = project.title || file.name.replace(/\.airdrow$/i, "") || "Imported project";
    state.undoStack = []; state.redoStack = []; state.currentStroke = null;
    syncSettingsUI();
    if (ui.projectName) ui.projectName.value = state.projectTitle;
    applySettings(); updateHistoryControls(); render();
    await saveProject({ quiet: true });
    await renderProjectGallery();
    toast(t("projectImported", "Project imported"));
  } catch (error) { console.error(error); toast("Invalid .airdrow project"); }
}

function snapLastStroke() {
  const last = state.strokes.at(-1);
  if (!last) return toast(t("viralNeedDrawing", "Draw a stroke first"));
  const previous = state.lastShapeCandidate;
  const source = previous?.source || last;
  const options = shapeOptions();
  const snapped = previous?.candidate?.confidence >= options.minConfidence
    ? previous.candidate
    : recognizeAndSnap(source, options);
  if (!snapped) {
    setText(ui.shapeStatus, t("shapeNoMatch", "No confident shape found"));
    return toast(t("shapeNoMatch", "No confident shape found"));
  }
  const startIndex = Number.isInteger(previous?.startIndex) ? previous.startIndex : state.strokes.length - 1;
  const count = Math.max(1, Number(previous?.count) || 1);
  const copies = expandSymmetry(snapped.stroke, state.settings.symmetry, state.settings.symmetryMirror);
  pushUndoSnapshot();
  state.strokes.splice(startIndex, count, ...copies);
  state.lastShapeCandidate = { candidate: snapped, source: structuredClone(source), startIndex, count: copies.length };
  setShapeStatus(snapped, { snapped: true });
  queueSave();
  render();
  toast(`${t("shapeSnapped", "Snapped to")} ${shapeLabel(snapped.type)}`);
}

function openResetSettingsDialog() {
  ui.resetDialog.hidden = false;
  syncBodyScroll();
}

function closeResetSettingsDialog() {
  ui.resetDialog.hidden = true;
  syncBodyScroll();
}

function resetAllSettings() {
  // Drawings and view are deliberately preserved. Only app preferences reset.
  stopCamera();
  state.landmarker?.close?.();
  state.landmarker = null;
  state.mediaPipeModule = null;
  state.mediaPipeWasmRoot = null;
  state.handLoadPromise = null;
  state.handStartPromise = null;
  state.handEngineStrategy = "";
  state.handDelegate = preferredHandDelegate();
  state.handEngineError = "";
  state.handWarmed = false;
  state.settings = { ...defaults };
  state.shortcutGate.reset();
  state.mode = "manual";
  updateModeButtons();
  syncSettingsUI();
  applySettings();
  closeResetSettingsDialog();
  saveProject({ quiet: true });
  toast(t("settingsResetDone", "Settings restored to default"));
}


function performanceTarget(mode) {
  if (mode === "battery") return 20;
  if (mode === "balanced") return 30;
  if (mode === "max") return 45;
  const memory = Number(navigator.deviceMemory || 0);
  const cores = Number(navigator.hardwareConcurrency || 0);
  return memory >= 6 || cores >= 8 ? 45 : 30;
}

function formatCanvasQuality() {
  const native = Math.min(window.devicePixelRatio || 1, 2);
  const effective = performanceGovernor ? performanceGovernor.canvasDpr(native) : native;
  const precision = Math.abs(effective - Math.round(effective)) < .01 ? 0 : 2;
  return `${effective.toFixed(precision)}×`;
}

function refreshPerformanceProfile({ repaint = true } = {}) {
  if (!performanceGovernor) return false;
  const changed = performanceGovernor.setMode(state.settings.performanceMode || "auto");
  updatePerformanceStatus();
  if (changed && repaint) resizeCanvas();
  return changed;
}

function updatePerformanceStatus() {
  const mode = state.settings.performanceMode || "auto";
  const labels = { auto: t("performanceAuto", "Auto selects a safe target for this device."), battery: t("performanceBattery", "Battery saver uses a lower hand-tracking target."), balanced: t("performanceBalanced", "Balanced keeps drawing smooth without unnecessary battery use."), max: t("performanceMax", "Maximum uses the highest available hand-tracking target.") };
  if (ui.performanceStatus) setText(ui.performanceStatus, `${labels[mode] || labels.auto} ${state.settings.targetFps || performanceTarget(mode)} FPS`);
  if (ui.canvasQuality) setText(ui.canvasQuality, formatCanvasQuality());
}

function ensureTemplateStudio() {
  if (!templateStudio) templateStudio = createTemplateStudio();
  return templateStudio;
}

function ensureAiStudio() {
  if (!aiStudio) aiStudio = createAiStudio({ getApiBase: () => state.settings.apiUrl || "" });
  return aiStudio;
}

function templateSourceCanvas() {
  const transparent = ["logo", "hoodie"].includes(state.settings.templatePack || "poster");
  return ensureExporter().buildCanvas({ preset: "square", transparent, maxSide: 900 });
}

function setCreatorBusy(busy, message = "") {
  state.templateBusy = Boolean(busy);
  [ui.exportTemplate, ui.shareTemplate].filter(Boolean).forEach(button => { button.disabled = Boolean(busy); });
  if (message && ui.templateStatus) setText(ui.templateStatus, message);
}

async function createCreatorTemplate(share = false) {
  if (!state.strokes.length) return toast(t("viralNeedDrawing", "Draw something first"));
  if (state.templateBusy) return;
  try {
    setCreatorBusy(true, t("templatePreparing", "Building creator template…"));
    loadingManager?.beginTask("creator", { label: t("templateRendering", "Building template…"), progress: 18, global: true });
    const result = await ensureTemplateStudio().render({
      sourceCanvas: templateSourceCanvas(),
      template: state.settings.templatePack,
      title: state.projectTitle || "AIR-DROW",
      creator: state.settings.creatorName || "AIR-DROW Creator",
      tagline: state.settings.creatorTagline || "",
      background: getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#080913",
      accent: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#9be7ff",
      language: state.settings.language
    });
    loadingManager?.updateTask("creator", { label: t("exportFinalizing", "Finalizing output…"), progress: 86 });
    if (share) {
      const shared = await ensureTemplateStudio().share(result);
      setText(ui.templateStatus, shared ? t("templateShared", "Creator template shared") : t("templateDownloaded", "Creator template downloaded"));
      toast(shared ? t("templateShared", "Creator template shared") : t("templateDownloaded", "Creator template downloaded"));
    } else {
      ensureTemplateStudio().download(result);
      setText(ui.templateStatus, t("templateDownloaded", "Creator template downloaded"));
      toast(t("templateDownloaded", "Creator template downloaded"));
    }
  } catch (error) {
    if (error?.name !== "AbortError") { console.error(error); setText(ui.templateStatus, t("templateFailed", "Creator template could not be created")); toast(t("templateFailed", "Creator template could not be created")); reportExportFailure(() => createCreatorTemplate(share)); }
  } finally {
    loadingManager?.endTask("creator");
    setCreatorBusy(false);
  }
}

function setAiBusy(busy, message = "") {
  state.aiBusy = Boolean(busy);
  [ui.generateAi, ui.checkAi, ui.downloadAiResult, ui.shareAiResult].filter(Boolean).forEach(button => { button.disabled = Boolean(busy); });
  if (message && ui.aiStatus) setText(ui.aiStatus, message);
  if (busy) loadingManager?.beginTask("ai", { label: message || t("progressPreparing", "Preparing…"), progress: 14, indeterminate: true });
  else loadingManager?.endTask("ai");
}

function closeAiResult() {
  if (ui.aiResultModal) ui.aiResultModal.hidden = true;
}

async function checkAiStudio() {
  if (!navigator.onLine) { reportAiFailure(new Error("offline")); return null; }
  setAiBusy(true, t("aiChecking", "Checking AI Studio…"));
  try {
    const health = await ensureAiStudio().health();
    const message = health.aiConfigured
      ? `${t("aiReady", "AI Studio is connected and ready.")} v${health.version || "?"}`
      : t("aiNotConfigured", "AI endpoint is live, but OPENAI_API_KEY and AIRDROW_AI_ENABLED=true are required in Vercel.");
    setText(ui.aiStatus, message);
    toast(health.aiConfigured ? t("aiReady", "AI Studio is connected and ready.") : t("aiNotConfiguredShort", "AI needs deployment setup"));
    return health;
  } catch (error) {
    console.warn(error);
    const message = t("aiUnavailable", "AI endpoint is unavailable. Deploy on Vercel, then check again.");
    setText(ui.aiStatus, message);
    toast(message);
    reportAiFailure(error);
    return null;
  } finally {
    setAiBusy(false);
  }
}

async function generateAiArtwork() {
  if (!navigator.onLine) { reportAiFailure(new Error("offline")); return; }
  if (!state.strokes.length) return toast(t("viralNeedDrawing", "Draw something first"));
  if (state.aiBusy) return;
  try {
    setAiBusy(true, t("aiGenerating", "Generating from your sketch…"));
    loadingManager?.updateTask("ai", { label: t("aiPreparingSketch", "Preparing sketch…"), progress: 24, indeterminate: false });
    const sourceCanvas = ensureExporter().buildCanvas({ preset: "square", transparent: false, maxSide: 768 });
    loadingManager?.updateTask("ai", { label: t("aiSending", "Sending to AI…"), progress: 52, indeterminate: true });
    const result = await ensureAiStudio().generate({
      sourceCanvas,
      preset: state.settings.aiPreset,
      size: state.settings.aiSize,
      direction: state.settings.aiDirection,
      projectTitle: state.projectTitle || "AIR-DROW",
      creatorName: state.settings.creatorName || ""
    });
    loadingManager?.updateTask("ai", { label: t("aiFinalizing", "Finalizing result…"), progress: 88, indeterminate: false });
    state.aiResult = result;
    if (ui.aiResultImage) ui.aiResultImage.src = result.dataUrl;
    if (ui.aiResultMeta) setText(ui.aiResultMeta, result.revisedPrompt ? `${result.provider} • ${t("aiPromptAdjusted", "Prompt refined")}` : result.provider);
    if (ui.aiResultModal) ui.aiResultModal.hidden = false;
    setText(ui.aiStatus, t("aiDone", "AI artwork is ready. Download or share it from the preview."));
    toast(t("aiDone", "AI artwork is ready. Download or share it from the preview."));
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.error(error);
      const message = aiFailureMessage(error);
      setText(ui.aiStatus, message);
      toast(message);
      reportAiFailure(error);
    }
  } finally {
    setAiBusy(false);
  }
}

async function downloadAiArtwork() {
  if (!state.aiResult) return;
  ensureAiStudio().downloadResult(state.aiResult);
  toast(t("aiDownloaded", "AI artwork downloaded"));
}

async function shareAiArtwork() {
  if (!state.aiResult) return;
  try {
    const shared = await ensureAiStudio().shareResult(state.aiResult);
    toast(shared ? t("aiShared", "AI artwork shared") : t("aiDownloaded", "AI artwork downloaded"));
  } catch (error) {
    if (error?.name !== "AbortError") { console.error(error); toast(t("aiFailed", "AI artwork could not be created")); }
  }
}

function resetView() {
  state.view = { x: 0, y: 0, scale: 1 };
  queueSave();
  render();
}

function ensureExporter() {
  if (exporter) return exporter;
  exporter = createExporter({
    getProject: serializeProject,
    getCanvasSize: () => { const { width, height } = canvasMetrics(); return { width, height }; },
    drawStroke,
    getBackground: () => getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#07101b"
  });
  return exporter;
}

function exportFormatLabel(format) {
  const normalized = String(format || "png").toLowerCase();
  return normalized === "airdrow" ? "AIR-DROW" : normalized.toUpperCase();
}

function setExportStatus(message, stateName = "ready") {
  if (!ui.exportStatus) return;
  ui.exportStatus.dataset.state = stateName;
  setText(ui.exportStatus, message);
}

async function prepareProjectOutput() {
  finishStroke();
  projectNameFromInput();
  await saveProject({ quiet: true });
}

function setExportBusy(busy, message = "", { progress = 14, indeterminate = false } = {}) {
  state.exportBusy = Boolean(busy);
  [ui.export, ui.share, ui.save].filter(Boolean).forEach(button => { button.disabled = Boolean(busy); button.setAttribute("aria-busy", String(Boolean(busy))); });
  if (busy) {
    setExportStatus(message || t("exportPreparing", "Preparing file…"), "working");
    loadingManager?.beginTask("export", { label: message || t("exportPreparing", "Preparing file…"), progress, indeterminate });
  } else loadingManager?.endTask("export");
}

async function exportCurrent() {
  if (state.exportBusy) return;
  const format = ui.exportFormat.value;
  try {
    setExportBusy(true, t("exportSaving", "Saving your project…"), { progress: 10 });
    await prepareProjectOutput();
    loadingManager?.updateTask("export", { label: t("exportPreparing", "Preparing file…"), progress: 42 });
    const result = await ensureExporter().exportFile({ format, preset: ui.exportPreset.value, transparent: ui.exportTransparent.checked, filenameBase: state.projectTitle || `air-drow-${Date.now()}` });
    const label = exportFormatLabel(result.format || format);
    loadingManager?.updateTask("export", { label: t("exportFinalizing", "Finalizing output…"), progress: 100 });
    setExportStatus(t("exportDone", "{format} is ready: {name}").replace("{format}", label).replace("{name}", result.filename), "success");
    toast(t("exportDoneShort", "{format} exported").replace("{format}", label));
  } catch (error) {
    console.error(error);
    const message = t("exportFailed", "Export failed");
    setExportStatus(message, "error");
    toast(message);
    reportExportFailure(() => exportCurrent());
  } finally { setExportBusy(false); }
}

async function shareCurrent() {
  if (state.exportBusy) return;
  try {
    setExportBusy(true, t("exportSaving", "Saving your project…"), { progress: 10 });
    await prepareProjectOutput();
    loadingManager?.updateTask("export", { label: t("sharePreparing", "Preparing share image…"), progress: 48 });
    const result = await ensureExporter().shareFile({ preset: ui.exportPreset.value === "current" ? "story" : ui.exportPreset.value, transparent: ui.exportTransparent.checked, filenameBase: state.projectTitle || `air-drow-${Date.now()}` });
    loadingManager?.updateTask("export", { label: t("exportFinalizing", "Finalizing output…"), progress: 100 });
    if (result.shared) { setExportStatus(t("shareSuccess", "Shared"), "success"); toast(t("shareSuccess", "Shared")); }
    else { setExportStatus(t("shareDownloaded", "Sharing is unavailable, so a PNG was downloaded."), "success"); toast(t("shareUnavailableDownload", "Share is unavailable — PNG downloaded")); }
  } catch (error) {
    if (error?.name === "AbortError") { setExportStatus(t("shareCancelled", "Sharing was cancelled"), "ready"); return; }
    console.error(error);
    const message = t("shareFailed", "Share failed");
    setExportStatus(message, "error");
    toast(message);
    reportExportFailure(() => shareCurrent());
  } finally { setExportBusy(false); }
}

function ensureReplayStudio() {
  if (!replayStudio) replayStudio = createReplayStudio();
  return replayStudio;
}

function ensureShareCardStudio() {
  if (!shareCardStudio) shareCardStudio = createShareCardStudio();
  return shareCardStudio;
}

function viralPayload() {
  return {
    strokes: state.strokes,
    title: state.projectTitle || "AIR-DROW",
    background: getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#080913",
    accent: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#9be7ff",
    language: state.settings.language
  };
}

function setViralBusy(busy, message = "") {
  state.replayBusy = Boolean(busy);
  [ui.replayExport, ui.replayShare, ui.storyExport, ui.storyShare, ui.challengeStart, ui.challengeScore, ui.remix].filter(Boolean).forEach(button => { button.disabled = Boolean(busy); });
  if (!busy) renderChallengeStatus();
  if (message && ui.viralStatus) setText(ui.viralStatus, message);
}

async function createAirReplay(share = false) {
  if (!state.strokes.length) return toast(t("viralNeedDrawing", "Draw something first"));
  if (state.replayBusy) return;
  try {
    setViralBusy(true, t("replayStarting", "Preparing replay…"));
    loadingManager?.beginTask("replay", { label: t("replayStarting", "Preparing replay…"), progress: 8 });
    const replay = await ensureReplayStudio().createReplay({
      ...viralPayload(),
      duration: Number(state.settings.replayDuration || 6),
      branded: state.settings.replayBrand !== false,
      onProgress: progress => {
        setText(ui.viralStatus, `${t("replayRendering", "Rendering replay")} ${Math.round(progress * 100)}%`);
        loadingManager?.updateTask("replay", { label: t("replayRendering", "Rendering replay"), progress: Math.max(8, Math.round(progress * 86)) });
      }
    });
    loadingManager?.updateTask("replay", { label: t("replayFinalizing", "Finalizing video…"), progress: 94 });
    if (share) {
      const shared = await ensureReplayStudio().shareReplay(replay);
      setText(ui.viralStatus, shared ? t("replayShared", "Replay shared") : t("replayDownloaded", "Replay downloaded"));
      toast(shared ? t("replayShared", "Replay shared") : t("replayDownloaded", "Replay downloaded"));
    } else {
      ensureReplayStudio().downloadReplay(replay);
      setText(ui.viralStatus, t("replayDownloaded", "Replay downloaded"));
      toast(t("replayDownloaded", "Replay downloaded"));
    }
  } catch (error) {
    if (error?.name !== "AbortError") { console.error(error); setText(ui.viralStatus, t("replayFailed", "Replay could not be created")); toast(t("replayFailed", "Replay could not be created")); reportExportFailure(() => createAirReplay(share)); }
  } finally {
    loadingManager?.endTask("replay");
    setViralBusy(false);
  }
}

async function createStoryCard(share = false) {
  if (!state.strokes.length) return toast(t("viralNeedDrawing", "Draw something first"));
  if (state.replayBusy) return;
  try {
    setViralBusy(true, t("cardPreparing", "Preparing story card…"));
    loadingManager?.beginTask("replay", { label: t("cardRendering", "Building story card…"), progress: 26, indeterminate: true });
    const card = await ensureShareCardStudio().createStoryCard(viralPayload());
    loadingManager?.updateTask("replay", { label: t("exportFinalizing", "Finalizing output…"), progress: 88, indeterminate: false });
    if (share) {
      const shared = await ensureShareCardStudio().shareCard(card);
      setText(ui.viralStatus, shared ? t("cardShared", "Story card shared") : t("cardDownloaded", "Story card downloaded"));
      toast(shared ? t("cardShared", "Story card shared") : t("cardDownloaded", "Story card downloaded"));
    } else {
      ensureShareCardStudio().downloadCard(card);
      setText(ui.viralStatus, t("cardDownloaded", "Story card downloaded"));
      toast(t("cardDownloaded", "Story card downloaded"));
    }
  } catch (error) {
    if (error?.name !== "AbortError") { console.error(error); setText(ui.viralStatus, t("cardFailed", "Story card could not be created")); toast(t("cardFailed", "Story card could not be created")); reportExportFailure(() => createStoryCard(share)); }
  } finally {
    loadingManager?.endTask("replay");
    setViralBusy(false);
  }
}

function renderChallengeStatus() {
  if (!challengeSession || !ui.challengeName) return;
  const copy = challengeText(challengeSession.challenge, state.settings.language);
  const record = challengeSession.record;
  setText(ui.challengeName, copy.title);
  setText(ui.challengePrompt, copy.hint);
  setText(ui.challengeTimer, `${String(challengeSession.secondsLeft()).padStart(2, "0")}s`);
  setText(ui.challengeBest, `${t("challengeBest", "Best")} ${record.best || 0}/100`);
  if (ui.challengeScore) ui.challengeScore.disabled = state.replayBusy || !record.startedAt || challengeSession.secondsLeft() <= 0;
}

function startDailyChallenge() {
  if (!challengeSession) challengeSession = createDailyChallengeSession();
  challengeSession.start(state.strokes.length);
  renderChallengeStatus();
  setText(ui.viralStatus, t("challengeStarted", "Challenge started — draw one new stroke"));
  toast(t("challengeStarted", "Challenge started — draw one new stroke"));
}

function scoreDailyChallenge() {
  if (!challengeSession) return;
  const record = challengeSession.record;
  const candidate = state.strokes.slice(record.strokeStart).at(-1);
  const result = challengeSession.score(candidate);
  if (!result.ok) { toast(t("challengeNeedStroke", result.message || "Draw a new stroke first")); renderChallengeStatus(); return; }
  const label = result.score >= 85 ? t("challengeLegend", "Legendary") : result.score >= 60 ? t("challengeGreat", "Great") : t("challengeTryAgain", "Try again");
  setText(ui.viralStatus, `${label}: ${result.score}/100 · ${result.reason}`);
  toast(`${label} ${result.score}/100`);
  renderChallengeStatus();
}

async function saveRemixCopy() {
  projectNameFromInput();
  const base = state.projectTitle || "AIR-DROW";
  state.projectTitle = `${t("remix", "Remix")} · ${base}`.slice(0, 72);
  if (ui.projectName) ui.projectName.value = state.projectTitle;
  await saveProjectToGallery();
  setText(ui.viralStatus, t("remixSaved", "Remix copy saved to your local gallery"));
}

function updateDismissKey(remote = pendingUpdate?.remote) {
  return `air-drow.update-dismissed:${remote?.buildId || remote?.version || "new"}`;
}

function presentDeferredUpdate() {
  if (!pendingUpdate || !ui.updateBanner || hasBlockingOverlay()) return;
  if (sessionStorage.getItem(updateDismissKey())) return;
  const { remote, apply } = pendingUpdate;
  const version = remote?.version || t("updateNewVersion", "new");
  setText(ui.updateLabel, t("updateReady", "Version {version} is ready. Your current project will be saved first.").replace("{version}", `v${version}`));
  ui.updateBanner.hidden = false;
  ui.updateApply.disabled = false;
  ui.updateDismiss.disabled = false;
  setText(ui.updateApply, t("updateApply", "Save & update"));
  ui.updateApply.onclick = async () => {
    ui.updateApply.disabled = true;
    ui.updateDismiss.disabled = true;
    setText(ui.updateApply, t("updateSaving", "Saving…"));
    await apply();
  };
}

function showUpdateBanner(remote, apply) {
  pendingUpdate = { remote, apply };
  if (!localStorage.getItem(QUICK_START_KEY) || hasBlockingOverlay()) return;
  presentDeferredUpdate();
}

function hideUpdateBanner() {
  if (!ui.updateBanner) return;
  sessionStorage.setItem(updateDismissKey(), "1");
  ui.updateBanner.hidden = true;
}

const WORKSPACES = ["draw", "shape", "create", "projects", "settings"];
const WORKSPACE_KEYS = {
  draw: "workspaceDraw",
  shape: "workspaceShape",
  create: "workspaceCreate",
  projects: "workspaceProjects",
  settings: "workspaceSettings"
};

function workspaceLabel(name) {
  const key = WORKSPACE_KEYS[name] || "workspaceStudio";
  return t(key, name);
}

function scrollOpenedSectionIntoView(section) {
  const scrollBox = ui?.drawerScroll;
  if (!section?.open || !scrollBox) return;
  const behavior = state.settings.reduceMotion ? "auto" : "smooth";
  const reveal = () => {
    if (!section.open || !scrollBox.isConnected) return;
    const sectionRect = section.getBoundingClientRect();
    const scrollRect = scrollBox.getBoundingClientRect();
    const topInset = 14;
    const bottomInset = Math.max(18, Math.round(scrollBox.clientHeight * .08));
    const visibleTop = scrollRect.top + topInset;
    const visibleBottom = scrollRect.bottom - bottomInset;
    let delta = 0;
    if (sectionRect.top < visibleTop) delta = sectionRect.top - visibleTop;
    else if (sectionRect.bottom > visibleBottom) {
      // Always keep the section header and the first controls visible. A very
      // tall card remains normally scrollable within the drawer afterwards.
      delta = sectionRect.top - visibleTop;
    }
    const maxTop = Math.max(0, scrollBox.scrollHeight - scrollBox.clientHeight);
    const target = Math.max(0, Math.min(maxTop, scrollBox.scrollTop + delta));
    scrollBox.scrollTo({ top: target, behavior });
  };
  // Android applies <details> layout after its toggle event; wait across two
  // frames and again after the disclosure transition has settled.
  requestAnimationFrame(() => requestAnimationFrame(reveal));
  window.setTimeout(reveal, state.settings.reduceMotion ? 0 : 220);
}

function setWorkspace(name, { resetPanels = true } = {}) {
  const workspace = WORKSPACES.includes(name) ? name : "draw";
  const previous = state.workspace;
  state.workspace = workspace;
  if (ui.drawer) ui.drawer.dataset.workspace = workspace;
  if (ui.workspaceTitle) setText(ui.workspaceTitle, workspaceLabel(workspace));

  const buttons = [...ui.workspaceTabs, ...ui.workspaceDock];
  buttons.forEach(button => {
    const active = button.dataset.workspaceNav === workspace;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });

  const sections = [...document.querySelectorAll(".settings-section[data-workspace-section]")];
  const visibleSections = sections.filter(section => section.dataset.workspaceSection === workspace);
  sections.forEach(section => { section.hidden = section.dataset.workspaceSection !== workspace; });

  // A destination opens with one focused card rather than a long, crowded stack.
  if (resetPanels && previous !== workspace) {
    visibleSections.forEach((section, index) => { section.open = index === 0; });
    requestAnimationFrame(() => ui.drawerScroll?.scrollTo({ top: 0, behavior: state.settings.reduceMotion ? "auto" : "smooth" }));
  }
}

function openSettings(forceOpen = true, workspace = null) {
  if (workspace) setWorkspace(workspace);
  const open = typeof forceOpen === "boolean" ? forceOpen : !ui.app.classList.contains("settings-open");
  ui.app.classList.toggle("settings-open", open);
  ui.drawer.setAttribute("aria-hidden", String(!open));
  ui.backdrop.hidden = !open;
  syncBodyScroll();
}

function openWorkspace(workspace) {
  setWorkspace(workspace);
  openSettings(true);
}

function applyControlChanges() {
  state.settings.brushSize = Number(ui.brush.value);
  state.settings.smoothing = Number(ui.smoothing.value);
  state.settings.color = ui.color.value;
  state.settings.brushStyle = normalizeBrush(ui.brushStyle?.value || "classic");
  state.settings.symmetry = Math.max(1, Math.min(12, Number(ui.symmetryCount?.value || 1)));
  state.settings.symmetryMirror = Boolean(ui.symmetryMirror?.checked);
  state.settings.shapeAssist = ui.shapeAssist?.checked !== false;
  state.settings.shapeSnapMode = ui.shapeSnapMode?.value === "suggest" ? "suggest" : "auto";
  state.settings.shapeIntent = ["line", "rectangle", "ellipse", "triangle"].includes(ui.shapeIntent?.value) ? ui.shapeIntent.value : "auto";
  state.settings.shapeConfidence = Math.max(78, Math.min(96, Number(ui.shapeConfidence?.value || 86)));
  state.settings.gestureShortcuts = Boolean(ui.gestureShortcuts?.checked);
  state.settings.replayDuration = Math.max(3, Math.min(10, Number(ui.replayDuration?.value || 6)));
  state.settings.replayBrand = ui.replayBrand?.checked !== false;
  state.settings.creatorName = String(ui.creatorName?.value || "").trim().slice(0, 72);
  state.settings.creatorTagline = String(ui.creatorTagline?.value || "").trim().slice(0, 96);
  state.settings.templatePack = ui.templatePack?.value || "poster";
  state.settings.aiPreset = ui.aiPreset?.value || "poster";
  state.settings.aiSize = ui.aiSize?.value || "1024x1024";
  state.settings.aiDirection = String(ui.aiDirection?.value || "").trim().slice(0, 280);
  state.settings.performanceMode = ui.performanceMode?.value || "auto";
  state.settings.handCalibration = normalizeHandCalibration(state.settings.handCalibration);
  state.settings.pressure = ui.pressure.checked;
  state.settings.eraserSize = Number(ui.eraserSize.value);
  state.settings.profile = ui.profile.value;
  state.settings.targetFps = [15, 24, 30].includes(Number(ui.trackingFps.value)) ? Number(ui.trackingFps.value) : 24;
  if (ui.performanceMode && document.activeElement === ui.performanceMode) {
    state.settings.targetFps = performanceTarget(state.settings.performanceMode);
    if (ui.trackingFps) ui.trackingFps.value = String(state.settings.targetFps);
  }
  state.settings.brightCamera = ui.bright.checked;
  state.settings.mirrorCamera = ui.mirror.checked;
  state.settings.cameraWidth = [480, 640, 960].includes(Number(ui.resolution.value)) ? Number(ui.resolution.value) : 480;
  state.settings.cameraView = ui.cameraView.value;
  state.settings.showHandGuide = ui.handGuide.checked;
  state.settings.safePinch = ui.safePinch.checked;
  state.settings.warmHandEngine = ui.warmEngine.checked;
  state.settings.grid = Number(ui.grid.value);
  state.settings.reduceMotion = ui.reduceMotion.checked;
  state.settings.theme = ui.themeMode.value;
  state.settings.cameraView = ui.cameraView.value;
  state.settings.apiUrl = ui.apiUrl.value.trim();
  applySettings();
  updatePerformanceStatus();
  queueSave();
}

async function checkApi() {
  await checkAiStudio();
}

function bindControls() {
  ui.manual.addEventListener("click", () => setMode("manual"));
  ui.eraser.addEventListener("click", () => setMode("eraser"));
  ui.handMode.addEventListener("pointerdown", warmHandEngineNow, { passive: true });
  ui.cameraButton.addEventListener("pointerdown", warmHandEngineNow, { passive: true });
  ui.handMode.addEventListener("click", () => setMode("hand"));
  ui.cameraButton.addEventListener("click", () => {
    if (state.stream) stopCamera();
    else openCameraConsent({ hand: true });
  });
  ui.theme.addEventListener("click", () => {
    state.settings.theme = resolvedTheme() === "dark" ? "light" : "dark";
    ui.themeMode.value = state.settings.theme;
    applySettings();
    queueSave();
  });
  ui.clearCancel.addEventListener("click", closeClearDialog);
  ui.clearConfirm.addEventListener("click", confirmClearCanvas);
  ui.clearDialog.addEventListener("click", event => {
    if (event.target === ui.clearDialog) closeClearDialog();
  });
  ui.resetSettings.addEventListener("click", openResetSettingsDialog);
  ui.openQuickStart?.addEventListener("click", () => openQuickStart({ remember: true }));
  ui.resetCancel.addEventListener("click", closeResetSettingsDialog);
  ui.resetConfirm.addEventListener("click", resetAllSettings);
  ui.resetDialog.addEventListener("click", event => {
    if (event.target === ui.resetDialog) closeResetSettingsDialog();
  });
  ui.skinChoices.forEach(button => button.addEventListener("click", () => {
    state.settings.skin = button.dataset.skin;
    applySettings();
    queueSave();
  }));
  ui.languageChoices.forEach(button => button.addEventListener("click", () => {
    state.settings.language = button.dataset.language === "en" ? "en" : "ku";
    applySettings();
    syncSettingsUI();
    queueSave();
  }));
  ui.colorSwatches.forEach(button => button.addEventListener("click", () => {
    state.settings.color = button.dataset.color;
    ui.color.value = state.settings.color;
    syncSettingsUI();
    applySettings();
    queueSave();
  }));
  document.querySelectorAll(".settings-section").forEach(section => {
    section.addEventListener("toggle", () => {
      if (!section.open) return;
      document.querySelectorAll(".settings-section").forEach(other => {
        if (other !== section) other.open = false;
      });
      scrollOpenedSectionIntoView(section);
    });
  });
  ui.consentClose.addEventListener("click", () => {
    closeCameraConsent();
    if (handCalibration?.current?.().active) cancelHandCalibration({ quiet: true });
    if (!state.stream && ["hand", "hand-eraser"].includes(state.mode)) {
      state.mode = "manual";
      updateModeButtons();
    }
  });
  ui.consent.addEventListener("click", event => {
    if (event.target === ui.consent) ui.consentClose.click();
  });
  ui.cameraModePicker.addEventListener("click", event => {
    const button = event.target.closest("[data-camera-view]");
    if (button) {
      selectCameraView(button.dataset.cameraView).catch(error => {
        console.warn("Camera choice failed.", error);
        if (error?.airdrowStage === "camera") reportCameraFailure(error);
        else if (error?.airdrowStage === "engine") reportHandEngineFailure(error);
      });
    }
  });
  ui.undo.addEventListener("click", undo);
  ui.redo.addEventListener("click", redo);
  ui.clear.addEventListener("click", clearCanvas);
  ui.settings.addEventListener("click", () => openWorkspace("settings"));
  [...ui.workspaceTabs, ...ui.workspaceDock].forEach(button => {
    button.addEventListener("click", () => openWorkspace(button.dataset.workspaceNav));
  });
  ui.closeSettings.addEventListener("click", () => openSettings(false));
  ui.backdrop.addEventListener("click", () => openSettings(false));

  ui.export.addEventListener("click", exportCurrent);
  ui.share.addEventListener("click", shareCurrent);
  ui.save.addEventListener("click", () => { projectNameFromInput(); void saveProject(); });
  ui.snapLast?.addEventListener("click", snapLastStroke);
  ui.saveGallery?.addEventListener("click", () => { void saveProjectToGallery(); });
  ui.importProject?.addEventListener("click", () => ui.importInput?.click());
  ui.importInput?.addEventListener("change", event => { const file = event.target.files?.[0]; void importProjectFile(file); event.target.value = ""; });
  ui.exportBackup?.addEventListener("click", () => { void exportBackupArchive(); });
  ui.importBackup?.addEventListener("click", () => ui.importBackupInput?.click());
  ui.importBackupInput?.addEventListener("change", event => { const file = event.target.files?.[0]; void restoreBackupArchive(file); event.target.value = ""; });
  ui.runStabilityCheck?.addEventListener("click", () => { void refreshStabilityStatus({ announce: true }); });
  ui.galleryList?.addEventListener("click", event => {
    const button = event.target.closest("[data-gallery-action]");
    if (!button) return;
    const id = button.dataset.galleryId;
    if (button.dataset.galleryAction === "load") void loadGalleryProject(id);
    if (button.dataset.galleryAction === "delete") {
      projectStore.deleteGalleryProject(id).then(renderProjectGallery).then(() => toast(t("projectDeleted", "Project deleted"))).catch(() => toast(t("projectDeleteFailed", "Delete failed")));
    }
  });
  ui.replayExport?.addEventListener("click", () => { void createAirReplay(false); });
  ui.replayShare?.addEventListener("click", () => { void createAirReplay(true); });
  ui.storyExport?.addEventListener("click", () => { void createStoryCard(false); });
  ui.storyShare?.addEventListener("click", () => { void createStoryCard(true); });
  ui.remix?.addEventListener("click", () => { void saveRemixCopy(); });
  ui.exportTemplate?.addEventListener("click", () => { void createCreatorTemplate(false); });
  ui.shareTemplate?.addEventListener("click", () => { void createCreatorTemplate(true); });
  ui.checkAi?.addEventListener("click", () => { void checkAiStudio(); });
  ui.generateAi?.addEventListener("click", () => { void generateAiArtwork(); });
  ui.closeAiResult?.addEventListener("click", closeAiResult);
  ui.aiResultModal?.addEventListener("click", event => { if (event.target === ui.aiResultModal) closeAiResult(); });
  ui.downloadAiResult?.addEventListener("click", () => { void downloadAiArtwork(); });
  ui.shareAiResult?.addEventListener("click", () => { void shareAiArtwork(); });
  ui.challengeStart?.addEventListener("click", startDailyChallenge);
  ui.challengeScore?.addEventListener("click", scoreDailyChallenge);
  ui.updateDismiss.addEventListener("click", hideUpdateBanner);
  ui.reset.addEventListener("click", resetView);
  ui.apiSave.addEventListener("click", () => {
    applyControlChanges();
    toast(t("apiSaved", "AI API URL saved locally"));
  });
  ui.apiCheck.addEventListener("click", checkApi);
  ui.calibrateHand?.addEventListener("click", () => { void startHandCalibration(); });
  ui.resetHandCalibration?.addEventListener("click", resetHandCalibration);
  ui.cancelCalibration?.addEventListener("click", () => cancelHandCalibration());
  ui.retryHand.addEventListener("click", async () => {
    state.landmarker?.close?.();
    state.landmarker = null;
    state.mediaPipeModule = null;
    state.mediaPipeWasmRoot = null;
    state.handDelegate = preferredHandDelegate();
    state.handEngineError = "";
    if (!state.stream) {
      openCameraConsent({ hand: true });
      return;
    }
    state.mode = "hand";
    updateModeButtons();
    await startHandTracker({ forceReload: true });
  });

  [ui.brush, ui.smoothing, ui.color, ui.brushStyle, ui.symmetryCount, ui.symmetryMirror, ui.shapeAssist, ui.shapeSnapMode, ui.shapeIntent, ui.shapeConfidence, ui.gestureShortcuts, ui.pressure, ui.eraserSize, ui.profile, ui.trackingFps, ui.bright, ui.mirror, ui.resolution, ui.cameraView, ui.handGuide, ui.safePinch, ui.warmEngine, ui.grid, ui.reduceMotion, ui.themeMode, ui.apiUrl, ui.replayDuration, ui.replayBrand, ui.creatorName, ui.creatorTagline, ui.templatePack, ui.aiPreset, ui.aiSize, ui.aiDirection, ui.performanceMode].filter(Boolean)
    .forEach(input => input.addEventListener("input", () => {
      applyControlChanges();
      if (input === ui.warmEngine && ui.warmEngine.checked) scheduleHandEngineWarmup();
    }));
  ui.resolution?.addEventListener("change", () => { void restartCameraCapture(); });
  ui.profile?.addEventListener("change", () => { void reloadHandEngineForProfile(); });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      if (!ui.quickStart?.hidden) closeQuickStart({ completed: true });
      else if (!ui.clearDialog.hidden) closeClearDialog();
      else if (!ui.resetDialog.hidden) closeResetSettingsDialog();
      else if (!ui.calibrationOverlay.hidden) cancelHandCalibration();
      else if (!ui.consent.hidden) closeCameraConsent();
      else if (!ui.aiResultModal.hidden) closeAiResult();
      else openSettings(false);
    }
    if (event.target.matches("input, select, textarea")) return;
    if (event.key.toLowerCase() === "m") setMode("manual");
    if (event.key.toLowerCase() === "e") setMode("eraser");
    if (event.key.toLowerCase() === "h") setMode("hand");
    if (event.key.toLowerCase() === "c") ui.cameraButton.click();
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) redo(); else undo();
      return;
    }
    if (event.key.toLowerCase() === "z") undo();
    if (event.key.toLowerCase() === "y") redo();
    if (event.key.toLowerCase() === "s") openWorkspace("settings");
    if (event.key.toLowerCase() === "x") clearCanvas();
    if (ui.app.classList.contains("settings-open") && /^[1-5]$/.test(event.key)) {
      openWorkspace(WORKSPACES[Number(event.key) - 1]);
    }
  });

  window.addEventListener("resize", scheduleViewportRefresh, { passive: true });
  window.visualViewport?.addEventListener("resize", scheduleViewportRefresh, { passive: true });
  window.addEventListener("orientationchange", scheduleViewportRefresh, { passive: true });
  window.addEventListener("online", () => {
    applyNetworkState({ announce: true });
    releaseManager?.check();
  });
  window.addEventListener("offline", () => applyNetworkState());
  window.addEventListener("pagehide", () => { void saveProject({ quiet: true }); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      void saveProject({ quiet: true });
      return;
    }
    if (performanceGovernor?.refreshEnvironment()) resizeCanvas();
    updatePerformanceStatus();
    render();
  });
}

function monitorRuntimeFps(now = performance.now()) {
  state.uiFrames += 1;
  if (now - state.uiFpsLast >= 750) {
    state.uiFps = Math.round((state.uiFrames * 1000) / (now - state.uiFpsLast));
    state.uiFrames = 0;
    state.uiFpsLast = now;
    if (performanceGovernor?.observeRuntimeFps(state.uiFps)) {
      resizeCanvas();
      updatePerformanceStatus();
    }
    updateLiveHud();
  }
  requestAnimationFrame(monitorRuntimeFps);
}

window.addEventListener("unhandledrejection", event => {
  const message = String(event.reason?.message || event.reason || "");
  if (/mediapipe|tasks-vision|dynamically imported module/i.test(message)) {
    event.preventDefault();
    console.warn("Handled MediaPipe load failure:", event.reason);
    setText(ui.handStatus, t("engineUnavailable", "Hand engine unavailable"));
    toast(t("engineFailureBody", "Touch drawing still works. You can reload the hand engine."));
    showRecovery({ kind: "camera", icon: "!", title: t("engineFailureTitle", "Hand engine is unavailable"), body: t("engineFailureBody", "Touch drawing still works. You can reload the hand engine."), actionLabel: t("engineTryAgain", "Reload engine"), action: () => ui.retryHand?.click() });
  }
});


async function loadLocalAssetManifest() {
  try {
    const response = await fetch("./assets/LOCAL_ASSETS_MANIFEST.json", { cache: "force-cache" });
    if (!response.ok) return;
    const manifest = await response.json();
    if (manifest?.version) state.localAssetsReady = true;
  } catch {
    state.localAssetsReady = false;
  }
}

async function boot() {
  ui = collectUi();
  drawCtx = ui.draw?.getContext?.("2d") || null;
  handCtx = ui.hand?.getContext?.("2d") || null;
  if (!drawCtx || !handCtx) throw new Error("AIR-DROW canvas contexts are unavailable");

  setupReliabilityCenter();
  loadingManager = createLoadingManager();
  performanceGovernor = createPerformanceGovernor({ mode: state.settings.performanceMode });
  backupManager = createBackupManager({ projectStore, appVersion: AIRDROW_RELEASE.version });
  finalStability = createFinalStability({ projectStore, release: AIRDROW_RELEASE });
  loadingManager.setBoot({ progress: 8, label: t("bootPreparing", "Preparing studio…") });
  updateLayoutClass();
  setWorkspace(state.workspace, { resetPanels: false });
  loadingManager.setBoot({ progress: 20, label: t("bootCanvas", "Setting up canvas…") });
  bindControls();
  bindPointerEvents();
  loadingManager.setBoot({ progress: 45, label: t("bootProject", "Opening local project…") });
  await loadProject();
  challengeSession = createDailyChallengeSession();
  renderChallengeStatus();
  setText(ui.templateStatus, t("templateHint", "Creator Pack is made locally on your device."));
  setText(ui.aiStatus, t("aiNotChecked", "AI Studio is ready to check."));
  clearInterval(state.challengeTimer);
  state.challengeTimer = setInterval(renderChallengeStatus, 500);
  applyNetworkState();
  releaseManager = createReleaseManager({
    release: AIRDROW_RELEASE,
    beforeApply: () => saveProject({ quiet: true }),
    onUpdateAvailable: showUpdateBanner,
    onError: (message, error) => console.warn(message, error)
  });
  loadingManager.setBoot({ progress: 72, label: t("bootAssets", "Preparing local assets…") });
  await loadLocalAssetManifest();
  await refreshStabilityStatus();
  void releaseManager.init();
  setGestureStatus("ready", t("gestureReady", "Ready"));
  updateHistoryControls();
  monitorRuntimeFps();
  if (isTouchLayout()) openSettings(false);
  else openSettings(true);
  await loadingManager.finishBoot({ label: t("bootReady", "Studio ready") });
  if (!localStorage.getItem(QUICK_START_KEY)) setTimeout(() => openQuickStart(), 420);
}

function showFatalBootFailure(error) {
  console.error("AIR-DROW boot failure:", error);
  const message = t("appStartFailed", "AIR-DROW could not start");

  if (loadingManager) {
    loadingManager.failBoot(message);
  } else {
    const boot = document.getElementById("appBoot");
    const label = document.getElementById("bootLabel");
    const percent = document.getElementById("bootPercent");
    const fill = document.getElementById("bootProgressFill");
    const retry = document.getElementById("bootRetryBtn");
    if (boot) boot.dataset.state = "failed";
    if (label) label.textContent = message;
    if (percent) percent.textContent = "!";
    if (fill) fill.style.setProperty("--progress", "100%");
    if (retry) {
      retry.hidden = false;
      retry.onclick = () => window.location.reload();
    }
  }

  if (ui?.toast) toast(message);
  if (reliabilityCenter) {
    showRecovery({
      kind: "notice",
      icon: "!",
      title: message,
      body: t("engineFailureBody", "Touch drawing still works. You can reload the hand engine."),
      actionLabel: t("quickStartFinish", "Start drawing"),
      action: () => window.location.reload()
    });
  }
}

boot().catch(showFatalBootFailure);
