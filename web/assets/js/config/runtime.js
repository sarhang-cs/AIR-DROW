/**
 * AIR-DROW runtime configuration.
 * Centralizes release metadata, persistence keys and hand-engine defaults.
 */
import { HAND_CALIBRATION_DEFAULT } from "../features/hand-calibration.js";

export const STORAGE_KEY = "air-drow.v2.project-pointer";
// Calibration is also stored independently from the current canvas so a real
// completed hand setup survives project restores and gallery changes.
export const HAND_CALIBRATION_STORAGE_KEY = "air-drow.hand-calibration.v1";
export const LEGACY_HAND_CALIBRATION_STORAGE_KEYS = Object.freeze(["air-drow.v756.hand-calibration", "air-drow.v755.hand-calibration", "air-drow.v754.hand-calibration"]);
export const LEGACY_STORAGE_KEY = "air-drow.clean-canvas.v105";
export const OLD_MIRROR_KEY = "airdraw.phase22.reload-mirror";

// Use a .js bundle explicitly: Android Chrome and strict static hosts reliably
// expose it as JavaScript. The MediaPipe resolver itself adds the file name,
// so this base URL intentionally has NO trailing slash.
export const MEDIAPIPE_MODULE_URLS = [new URL("../../../vendor/mediapipe/vision_bundle.js", import.meta.url).href];
export const MEDIAPIPE_WASM_URLS = [new URL("../../../vendor/mediapipe/wasm", import.meta.url).href];
export const HAND_MODEL = new URL("../../../vendor/models/hand_landmarker.task?model=v840-hand-input-reliability", import.meta.url).href;

export const APP_RELEASE = Object.freeze({ version: "8.4.0", buildId: "air-drow-v840-hand-input-reliability" });
export const QUICK_START_KEY = "air-drow.quick-start.v1";
export const LEGACY_QUICK_START_KEYS = Object.freeze(["air-drow.v756.quick-start.complete", "air-drow.v755.quick-start.complete", "air-drow.v754.quick-start.complete"]);

export const PROFILE_RULES = Object.freeze({
  sensitive: Object.freeze({ start: .39, stop: .54, smooth: .34, confidence: .50, enterFrames: 3, exitFrames: 2, stableFrames: 4, armFrames: 4, intentFrames: 2, intentTravel: .009, maxJump: .58, lostFrames: 3, minPalm: .030, minIndexReach: .30, minThumbReach: .09, maxTipDepth: 1.85, minIndexAngle: 16, minPalmAspect: .36, maxPalmAspect: 4.6, minFingerSpan: .32, minWristReach: .48 }),
  balanced: Object.freeze({ start: .31, stop: .47, smooth: .40, confidence: .56, enterFrames: 4, exitFrames: 3, stableFrames: 5, armFrames: 5, intentFrames: 2, intentTravel: .011, maxJump: .42, lostFrames: 4, minPalm: .036, minIndexReach: .38, minThumbReach: .12, maxTipDepth: 1.62, minIndexAngle: 22, minPalmAspect: .42, maxPalmAspect: 4.0, minFingerSpan: .42, minWristReach: .62 }),
  stable: Object.freeze({ start: .27, stop: .43, smooth: .54, confidence: .64, enterFrames: 5, exitFrames: 4, stableFrames: 6, armFrames: 6, intentFrames: 3, intentTravel: .012, maxJump: .34, lostFrames: 5, minPalm: .044, minIndexReach: .45, minThumbReach: .15, maxTipDepth: 1.38, minIndexAngle: 28, minPalmAspect: .50, maxPalmAspect: 3.5, minFingerSpan: .50, minWristReach: .70 })
});

export function createDefaultSettings() {
  return {
    brushSize: 8, smoothing: 42, color: "#7fd8ff", pressure: true, profile: "balanced", targetFps: 24,
    brightCamera: true, mirrorCamera: true, cameraWidth: 480, grid: 3, reduceMotion: false, eraserSize: 24,
    theme: "dark", skin: "violet", language: "ku", warmHandEngine: false, safePinch: true, cameraView: "board",
    // Guide feedback is visible by default and remains wholly separate from the
    // artwork canvas. File, export and destructive actions still require a
    // trusted physical UI tap; the only optional hand shortcut is two-finger eraser.
    showHandGuide: true, handGuideOpacity: 68, handGuideThickness: 2.6, gestureShortcuts: false, inputSafetyVersion: 5, apiUrl: "", brushStyle: "classic", symmetry: 1, symmetryMirror: false, shapeAssist: true,
    shapeSnapMode: "auto", shapeIntent: "auto", shapeConfidence: 86, exportScale: 1, exportLayout: "fit", exportQuality: 92, exportTransparent: false, exportCameraComposite: false, replayDuration: 6,
    replayBrand: true, creatorName: "", creatorTagline: "", templatePack: "poster", performanceMode: "auto",
    handCalibration: { ...HAND_CALIBRATION_DEFAULT }, aiPreset: "poster", aiSize: "1024x1024", aiDirection: ""
  };
}
