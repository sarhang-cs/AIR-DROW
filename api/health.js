export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "GET") return res.status(405).json({ ok: false, message: "Method not allowed" });
  const configured = process.env.AIRDROW_AI_ENABLED === "true" && Boolean(process.env.OPENAI_API_KEY);
  return res.status(200).json({
    ok: true,
    version: "7.6.2",
    provider: "AIR-DROW optional AI",
    aiConfigured: configured,
    enabled: configured,
    privacy: "The browser sends only the explicit AI reference image when generation is requested. Camera video is never sent by AIR-DROW."
  });
}
