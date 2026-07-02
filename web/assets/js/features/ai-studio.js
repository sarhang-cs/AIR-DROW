function safeFileBase(value) {
  return String(value || "air-drow-ai").trim().toLowerCase().replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "air-drow-ai";
}

function endpoint(base, path) {
  const clean = String(base || "").trim().replace(/\/+$/, "");
  return clean ? `${clean}${path}` : path;
}

function canvasToBlob(canvas, type = "image/png") {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Sketch image could not be created")), type, .94));
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("Sketch encoding failed"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(value) {
  const [head, body] = String(value || "").split(",", 2);
  if (!head || !body) throw new Error("AI result is malformed");
  const mime = head.match(/^data:([^;]+);base64$/i)?.[1] || "image/png";
  const bytes = atob(body);
  const output = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) output[index] = bytes.charCodeAt(index);
  return new Blob([output], { type: mime });
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1600);
}

function timeoutSignal(milliseconds = 110000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), milliseconds);
  return { signal: controller.signal, close: () => clearTimeout(timer) };
}

export function createAiStudio({ getApiBase = () => "" } = {}) {
  async function health() {
    const controller = timeoutSignal(9000);
    try {
      const response = await fetch(endpoint(getApiBase(), "/api/health"), { cache: "no-store", signal: controller.signal });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || `HTTP ${response.status}`);
      return data;
    } finally {
      controller.close();
    }
  }

  async function generate({ sourceCanvas, preset = "poster", direction = "", size = "1024x1024", projectTitle = "AIR-DROW", creatorName = "" } = {}) {
    if (!sourceCanvas) throw new Error("Draw something before using AI Studio");
    const sourceBlob = await canvasToBlob(sourceCanvas);
    const referenceImage = await blobToDataUrl(sourceBlob);
    const controller = timeoutSignal(110000);
    try {
      const response = await fetch(endpoint(getApiBase(), "/api/ai/generate"), {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceImage, preset, direction, size, projectTitle, creatorName })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || data?.error || `AI request failed (${response.status})`);
      if (!data?.image || !String(data.image).startsWith("data:image/")) throw new Error("AI did not return an image");
      const filename = `${safeFileBase(projectTitle)}-${safeFileBase(preset)}-ai.png`;
      return { dataUrl: data.image, blob: dataUrlToBlob(data.image), filename, revisedPrompt: data.revisedPrompt || "", provider: data.provider || "AI" };
    } finally {
      controller.close();
    }
  }

  function downloadResult(result) {
    if (!result?.blob) throw new Error("AI result is missing");
    download(result.blob, result.filename || "air-drow-ai.png");
  }

  async function shareResult(result) {
    if (!result?.blob) throw new Error("AI result is missing");
    const file = new File([result.blob], result.filename || "air-drow-ai.png", { type: result.blob.type || "image/png" });
    const payload = { title: "AIR-DROW AI", text: "Made from my AIR-DROW sketch", files: [file] };
    if (navigator.share && (!navigator.canShare || navigator.canShare(payload))) {
      await navigator.share(payload);
      return true;
    }
    downloadResult(result);
    return false;
  }

  return { health, generate, downloadResult, shareResult };
}
