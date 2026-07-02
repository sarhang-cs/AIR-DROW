const WINDOW_MS = 60_000;
const REQUEST_LIMIT = 3;
const requestLog = new Map();
const PRESETS = {
  poster: "a premium editorial poster composition with strong hierarchy, polished lighting, refined typography space and a social-ready 4:5 composition",
  logo: "a clean distinctive logo-mark presentation on a minimal artboard, preserving the central silhouette and avoiding copied brand marks or readable trademark text",
  hoodie: "a premium streetwear hoodie front-print concept, centered print placement, production-aware contrast and clean apparel mockup presentation",
  colorize: "a polished colorized illustration that preserves the original sketch composition, adds thoughtful materials, depth, contrast and controlled detail"
};
const SIZES = new Set(["1024x1024", "1024x1536", "1536x1024"]);

function clientKey(req) {
  return String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "anonymous").split(",")[0].trim().slice(0, 120);
}

function rateLimited(req) {
  const key = clientKey(req);
  const now = Date.now();
  const previous = (requestLog.get(key) || []).filter(value => now - value < WINDOW_MS);
  if (previous.length >= REQUEST_LIMIT) return true;
  previous.push(now);
  requestLog.set(key, previous);
  return false;
}

function cleanText(value, max = 280) {
  return String(value || "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function parseImage(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/(?:png|webp|jpeg));base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) throw new Error("Reference image must be PNG, WebP or JPEG data");
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > 3_500_000) throw new Error("Reference image is too large");
  return { mime: match[1].toLowerCase(), buffer };
}

function promptFor({ preset, direction, projectTitle, creatorName }) {
  const goal = PRESETS[preset] || PRESETS.poster;
  const title = cleanText(projectTitle, 72) || "AIR-DROW sketch";
  const creator = cleanText(creatorName, 72);
  const extra = cleanText(direction, 280);
  return [
    "Use the supplied AIR-DROW hand-drawn sketch as the essential visual reference.",
    `Transform it into ${goal}.`,
    "Preserve the main silhouette, placement, line intent and recognizable motif from the sketch; do not replace it with an unrelated idea.",
    "Do not use copyrighted characters, trademark logos or deceptive brand references.",
    "Make the result original, visually coherent, high contrast and ready for a professional creator portfolio.",
    `Project label: ${title}.${creator ? ` Creator: ${creator}.` : ""}`,
    extra ? `Creative direction from the creator: ${extra}.` : ""
  ].filter(Boolean).join(" ");
}

function json(res, status, body) {
  res.status(status).setHeader("Cache-Control", "no-store, max-age=0").json(body);
}

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { ok: false, message: "Method not allowed" });
  if (process.env.AIRDROW_AI_ENABLED !== "true" || !process.env.OPENAI_API_KEY) {
    return json(res, 503, { ok: false, message: "AI Studio is not enabled on this deployment. Add OPENAI_API_KEY and AIRDROW_AI_ENABLED=true in Vercel Environment Variables." });
  }
  if (rateLimited(req)) return json(res, 429, { ok: false, message: "AI Studio limit reached. Please wait one minute before trying again." });

  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const preset = Object.hasOwn(PRESETS, body.preset) ? body.preset : "poster";
    const size = SIZES.has(body.size) ? body.size : "1024x1024";
    const { mime, buffer } = parseImage(body.referenceImage);
    const form = new FormData();
    form.append("model", process.env.AIRDROW_AI_MODEL || "gpt-image-2");
    form.append("prompt", promptFor({ preset, direction: body.direction, projectTitle: body.projectTitle, creatorName: body.creatorName }));
    form.append("size", size);
    form.append("quality", process.env.AIRDROW_AI_QUALITY || "low");
    form.append("output_format", "png");
    form.append("moderation", "auto");
    form.append("image", new Blob([buffer], { type: mime }), "airdrow-sketch.png");

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.data?.[0]?.b64_json) {
      const code = response.status || 502;
      const detail = cleanText(payload?.error?.message || "Image generation did not complete", 180);
      return json(res, code >= 400 && code < 600 ? code : 502, { ok: false, message: detail });
    }

    return json(res, 200, {
      ok: true,
      provider: "OpenAI GPT Image",
      preset,
      image: `data:image/png;base64,${payload.data[0].b64_json}`,
      revisedPrompt: payload.data[0].revised_prompt || ""
    });
  } catch (error) {
    console.error("AIR-DROW AI generation error", error);
    return json(res, 500, { ok: false, message: "AI Studio could not finish this request. Check your deployment settings and try again." });
  }
}
