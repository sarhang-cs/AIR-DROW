function outputFor(template) {
  if (template === "story") return { width: 1080, height: 1920 };
  if (template === "logo") return { width: 1080, height: 1080 };
  return { width: 1080, height: 1350 };
}

function normalizeTemplate(value) {
  return ["poster", "hoodie", "story", "logo"].includes(value) ? value : "poster";
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

async function render({ source, template, title, creator, tagline, background, accent }) {
  const normalized = normalizeTemplate(template);
  const { width, height } = outputFor(normalized);
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const bitmap = await createImageBitmap(source);
  const base = background || "#080913";
  const color = accent || "#9be7ff";

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, base);
  gradient.addColorStop(1, "#02040a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(width * .22, height * .16, 0, width * .22, height * .16, Math.max(width, height) * .8);
  glow.addColorStop(0, `${color}55`);
  glow.addColorStop(.6, `${color}10`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,255,255,.62)";
  ctx.font = "700 24px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText((creator || "AIR-DROW CREATOR").toUpperCase().slice(0, 32), 68, 76);
  ctx.textAlign = "right";
  ctx.fillText("AIR-DROW / CREATOR PACK", width - 68, 76);

  if (normalized === "hoodie") {
    ctx.fillStyle = "#11131d";
    drawRoundedRect(ctx, 120, 195, width - 240, height - 300, 44);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.14)";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(width * .34, 240); ctx.lineTo(width * .42, 145); ctx.lineTo(width * .58, 145); ctx.lineTo(width * .66, 240);
    ctx.stroke();
    ctx.drawImage(bitmap, 230, 330, width - 460, width - 460);
    ctx.fillStyle = "rgba(255,255,255,.86)";
    ctx.textAlign = "center";
    ctx.font = "900 56px system-ui, sans-serif";
    ctx.fillText((title || "AIR-DROW").slice(0, 26).toUpperCase(), width / 2, height - 120);
  } else {
    const artSize = normalized === "story" ? 860 : 790;
    const x = (width - artSize) / 2;
    const y = normalized === "story" ? 360 : 238;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 42;
    ctx.drawImage(bitmap, x, y, artSize, artSize);
    ctx.restore();

    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = normalized === "logo" ? "900 66px system-ui, sans-serif" : "900 78px system-ui, sans-serif";
    ctx.fillText((title || "AIR-DROW").slice(0, 28).toUpperCase(), width / 2, normalized === "story" ? 1450 : 1120);
    ctx.fillStyle = "rgba(255,255,255,.7)";
    ctx.font = "500 28px system-ui, sans-serif";
    const line = (tagline || (normalized === "logo" ? "AIR-DROW MARK" : "DRAWN IN THE AIR")).slice(0, 72);
    ctx.fillText(line, width / 2, normalized === "story" ? 1515 : 1175);
  }
  bitmap.close?.();
  return canvas.convertToBlob({ type: "image/png" });
}

self.addEventListener("message", async event => {
  const { id } = event.data || {};
  try {
    const blob = await render(event.data || {});
    self.postMessage({ id, blob });
  } catch (error) {
    self.postMessage({ id, error: String(error?.message || "Template rendering failed") });
  }
});
