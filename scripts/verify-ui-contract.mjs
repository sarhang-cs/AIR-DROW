import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(root, "web/index.html"), "utf8");
const app = readFileSync(resolve(root, "web/assets/js/app.js"), "utf8");
const registry = readFileSync(resolve(root, "web/assets/js/ui/registry.js"), "utf8");
const ids = [...registry.matchAll(/\$\("([A-Za-z0-9_-]+)"\)/g)].map(match => match[1]);
const missing = [...new Set(ids)].filter(id => !html.includes(`id="${id}"`));
if (missing.length) throw new Error(`UI contract broken. Missing IDs in index.html:\n${missing.map(id => `- ${id}`).join("\n")}`);
for (const feature of [
  "redoBtn", "exportFormat", "exportPreset", "exportTransparent", "shareBtn", "updateBanner", "updateApplyBtn", "updateDismissBtn",
  "brushStyle", "symmetryCount", "shapeAssistToggle", "shapeSnapMode", "shapeIntent", "shapeConfidence", "shapeConfidenceOut", "snapLastShapeBtn", "projectName", "saveGalleryBtn", "importProjectBtn", "importProjectInput", "galleryList", "gestureShortcutsToggle",
  "viralStudioSection", "startChallengeBtn", "scoreChallengeBtn", "challengeName", "challengePrompt", "challengeTimer", "challengeBest", "replayDuration", "replayBrandToggle", "exportReplayBtn", "shareReplayBtn", "exportStoryCardBtn", "shareStoryCardBtn", "saveRemixBtn", "viralStatus",
  "creatorPackSection", "creatorNameInput", "creatorTaglineInput", "templatePackSelect", "exportTemplateBtn", "shareTemplateBtn", "templateStatus",
  "aiStudioSection", "aiPresetSelect", "aiSizeSelect", "aiDirectionInput", "checkAiBtn", "generateAiBtn", "aiStatus", "aiResultModal", "aiResultImage", "downloadAiResultBtn", "shareAiResultBtn", "performanceMode", "performanceStatus", "workspaceDock", "workspaceTabs", "workspaceTitle", "appBoot", "bootLabel", "bootPercent", "bootProgressFill", "routeProgress", "routeProgressFill", "exportProgress", "galleryProgress", "replayProgress", "aiProgress", "handCalibrationOverlay", "handCalibrationTarget", "handCalibrationTitle", "handCalibrationHint", "handCalibrationStep", "handCalibrationMeterFill", "cancelHandCalibrationBtn", "handCalibrationStatus", "handTrackingHealth", "handTrackingMeterFill", "calibrateHandBtn", "resetHandCalibrationBtn", "recoveryNotice", "recoveryActionBtn", "recoveryDismissBtn", "quickStartOverlay", "quickStartNextBtn", "quickStartSkipBtn", "openQuickStartBtn"
]) {
  if (!html.includes(`id="${feature}"`)) throw new Error(`AIR-DROW UI control missing: ${feature}`);
}
console.log(`AIR-DROW Polish & Reliability UI contract verified: ${new Set(ids).size} app controls are present.`);
