/**
 * Central typography policy for AIR-DROW.
 * Noto Kufi Arabic is loaded by the document stylesheet for Kurdish UI.
 * Canvas work is intentionally routed through this module so exports match
 * the language users see in the editor.
 */
export const KURDISH_FONT_FAMILY = '"Noto Kufi Arabic", "Noto Sans Arabic", Tahoma, Arial, sans-serif';
export const ENGLISH_FONT_FAMILY = '"Avenir Next", "Segoe UI Variable", "Segoe UI", Arial, sans-serif';

export function hasKurdishScript(value) {
  return /[\u0600-\u06FF]/u.test(String(value || ""));
}

export function shouldUseKurdishTypography({ language = "", title = "", creator = "", tagline = "" } = {}) {
  return language === "ku" || [title, creator, tagline].some(hasKurdishScript);
}

export function canvasFont(weight, size, useKurdish = false) {
  const safeWeight = Math.max(100, Math.min(900, Number(weight) || 400));
  const safeSize = Math.max(8, Math.round(Number(size) || 16));
  return `${safeWeight} ${safeSize}px ${useKurdish ? KURDISH_FONT_FAMILY : ENGLISH_FONT_FAMILY}`;
}

export function setCanvasTextDirection(ctx, useKurdish = false) {
  if ("direction" in ctx) ctx.direction = useKurdish ? "rtl" : "ltr";
}

let KurdishFontPromise = null;
export function ensureKurdishFont() {
  if (typeof document === "undefined" || !document.fonts?.load) return Promise.resolve(true);
  if (!KurdishFontPromise) {
    KurdishFontPromise = Promise.all([
      document.fonts.load('400 16px "Noto Kufi Arabic"'),
      document.fonts.load('600 16px "Noto Kufi Arabic"'),
      document.fonts.load('700 16px "Noto Kufi Arabic"'),
      document.fonts.load('800 16px "Noto Kufi Arabic"')
    ]).then(() => document.fonts.check('400 16px "Noto Kufi Arabic"')).catch(() => false);
  }
  return KurdishFontPromise;
}
