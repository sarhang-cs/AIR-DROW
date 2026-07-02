function formatBytes(value, language = "en") {
  const number = Number(value || 0);
  if (!number) return language === "ku" ? "زانیاری بەردەست نییە" : "No estimate available";
  const units = ["B", "KB", "MB", "GB"];
  let size = number;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) { size /= 1024; index += 1; }
  return `${size >= 10 || index === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[index]}`;
}

export function createFinalStability({ projectStore, release, root = document } = {}) {
  if (!projectStore) throw new Error("Project store is required");

  async function snapshot({ language = "en" } = {}) {
    const health = await projectStore.getHealth();
    const fontReady = Boolean(root.fonts?.check?.('12px "Noto Kufi Arabic"'));
    const serviceWorkerReady = Boolean(navigator.serviceWorker?.controller);
    const deviceMemory = Number(navigator.deviceMemory || 0);
    const cores = Number(navigator.hardwareConcurrency || 0);
    const quotaPercent = health.quota ? Math.round((health.usage / health.quota) * 100) : 0;
    const checks = [
      { id: "projects", ok: true },
      { id: "font", ok: fontReady || !root.fonts },
      { id: "pwa", ok: serviceWorkerReady || !("serviceWorker" in navigator) },
      { id: "storage", ok: !health.quota || quotaPercent < 92 }
    ];
    const failed = checks.filter(item => !item.ok).map(item => item.id);
    return {
      release: release?.version || "",
      stable: failed.length === 0,
      checks,
      failed,
      health,
      deviceMemory,
      cores,
      quotaPercent,
      text: {
        projects: `${health.galleryProjects} ${language === "ku" ? "پڕۆژەی گالەری" : "gallery projects"}`,
        storage: health.quota ? `${formatBytes(health.usage, language)} / ${formatBytes(health.quota, language)}` : formatBytes(health.recordBytes, language),
        device: `${deviceMemory || "?"} GB · ${cores || "?"} CPU`,
        worker: serviceWorkerReady ? (language === "ku" ? "PWA ئامادەیە" : "PWA ready") : (language === "ku" ? "PWA لە کاتی ئامادەبووندایە" : "PWA starting")
      }
    };
  }

  return { snapshot };
}
