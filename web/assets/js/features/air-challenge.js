const STORAGE_KEY = "air-drow.v220.daily-challenge";

const CHALLENGES = [
  { id: "circle", ku: "بازنەی پەڕاو", en: "Perfect Circle", hintKu: "بە یەک هێڵ بازنەیەکی داخراو بکێشە", hintEn: "Draw one closed circle in a single stroke" },
  { id: "heart", ku: "دڵی هەوا", en: "Air Heart", hintKu: "دڵێک بە یەک هێڵ بکێشە", hintEn: "Draw a heart in one continuous stroke" },
  { id: "star", ku: "ئەستێرەی خێرا", en: "Quick Star", hintKu: "ئەستێرەیەکی پێنج گوێ بکێشە", hintEn: "Draw a five-point star" },
  { id: "lightning", ku: "بروسکە", en: "Lightning Bolt", hintKu: "هێڵێکی بروسکەیی تیز بکێشە", hintEn: "Draw a sharp lightning bolt" },
  { id: "spiral", ku: "سپیڕال", en: "Air Spiral", hintKu: "سپیڕالێک لە دەرەوە بۆ ناوەوە بکێشە", hintEn: "Draw a spiral from outside to inside" }
];

function dateKey(date = new Date()) { return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-"); }
function hash(value) { return [...String(value)].reduce((sum, char) => ((sum << 5) - sum + char.charCodeAt(0)) | 0, 0) >>> 0; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function bounds(points) {
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  return { minX, maxX, minY, maxY, width: Math.max(.0001, maxX - minX), height: Math.max(.0001, maxY - minY) };
}
function turning(points) {
  let total = 0, sharp = 0;
  for (let i = 2; i < points.length; i += 1) {
    const a = points[i - 2], b = points[i - 1], c = points[i];
    const abx = a.x - b.x, aby = a.y - b.y, cbx = c.x - b.x, cby = c.y - b.y;
    const denom = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
    if (!denom) continue;
    const angle = Math.acos(clamp((abx * cbx + aby * cby) / denom, -1, 1));
    total += angle;
    if (angle > .6) sharp += 1;
  }
  return { total, sharp };
}
function scoreStroke(id, stroke, language = "ku") {
  const points = stroke?.points || [];
  if (points.length < 4) return { score: 0, reason: language === "ku" ? "هێڵێکی درێژتر بکێشە" : "Draw a longer stroke" };
  const box = bounds(points), diagonal = Math.hypot(box.width, box.height), close = 1 - clamp(distance(points[0], points.at(-1)) / Math.max(.0001, diagonal), 0, 1);
  const ratio = Math.min(box.width, box.height) / Math.max(box.width, box.height);
  const turns = turning(points);
  let score = 0;
  if (id === "circle") score = 38 * close + 42 * ratio + 20 * clamp(points.length / 35, 0, 1);
  if (id === "heart") {
    const top = points.filter(point => point.y < (box.minY + box.height * .45)).length / points.length;
    const notch = points.slice(0, Math.floor(points.length * .35)).reduce((min, point) => Math.min(min, point.y), 1);
    score = 30 * close + 28 * clamp(top * 2.4, 0, 1) + 22 * clamp(turns.sharp / 3, 0, 1) + 20 * clamp((box.height / box.width) / 1.18, 0, 1) + (notch < box.minY + box.height * .32 ? 8 : 0);
  }
  if (id === "star") score = 34 * close + 38 * clamp(turns.sharp / 5, 0, 1) + 28 * clamp(points.length / 18, 0, 1);
  if (id === "lightning") score = 50 * clamp(turns.sharp / 3, 0, 1) + 25 * clamp(box.height / box.width, 0, 1) + 25 * clamp(points.length / 10, 0, 1);
  if (id === "spiral") score = 42 * clamp(turns.total / (Math.PI * 4), 0, 1) + 34 * clamp(points.length / 32, 0, 1) + 24 * clamp((1 - close) * 1.3, 0, 1);
  return { score: Math.round(clamp(score, 0, 100)), reason: close > .72 ? (language === "ku" ? "کۆتایی پاک" : "Clean finish") : (language === "ku" ? "جوڵەکە بە نرمی بەردەوام بکە" : "Keep the motion smooth") };
}
function readStore() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {}; } catch { return {}; } }
function saveStore(value) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch {} }

export function getDailyChallenge(date = new Date()) { return CHALLENGES[hash(dateKey(date)) % CHALLENGES.length]; }
export function challengeText(challenge, language = "ku") { return language === "en" ? { title: challenge.en, hint: challenge.hintEn } : { title: challenge.ku, hint: challenge.hintKu }; }

export function createDailyChallengeSession() {
  const day = dateKey();
  let record = readStore();
  if (record.day !== day) record = { day, best: 0, completed: false, startedAt: 0, strokeStart: 0, attempts: 0, lastScore: 0 };
  const challenge = getDailyChallenge();
  const persist = () => saveStore(record);
  return {
    get challenge() { return challenge; },
    get record() { return { ...record }; },
    start(strokeStart = 0) { record.startedAt = Date.now(); record.strokeStart = Number(strokeStart) || 0; record.attempts += 1; persist(); return { ...record }; },
    secondsLeft() { if (!record.startedAt) return 60; return clamp(60 - Math.floor((Date.now() - record.startedAt) / 1000), 0, 60); },
    score(stroke, language = "ku") {
      if (!record.startedAt) return { ok: false, message: language === "ku" ? "سەرەتا چالاکییەکە دەست پێبکە" : "Start the challenge first" };
      if (this.secondsLeft() <= 0) return { ok: false, message: language === "ku" ? "کات تەواو بوو — دوبارە دەست پێبکە" : "Time is up — start again" };
      const result = scoreStroke(challenge.id, stroke, language);
      record.lastScore = result.score; record.best = Math.max(record.best || 0, result.score); record.completed = record.completed || result.score >= 60; persist();
      return { ok: true, ...result, best: record.best, completed: record.completed };
    }
  };
}
