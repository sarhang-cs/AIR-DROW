const BACKUP_SCHEMA = "air-drow-backup";
const BACKUP_VERSION = 1;

function safeStamp(date = new Date()) {
  const pad = value => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function safeFilename(value) {
  return String(value || "AIR-DROW")
    .trim()
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42) || "AIR-DROW";
}

function triggerDownload(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  // Android downloads can start after the current navigation task; keep the URL alive long enough.
  window.setTimeout(() => URL.revokeObjectURL(url), 20_000);
}

export function createBackupManager({ projectStore, appVersion = "4.0.0" } = {}) {
  if (!projectStore) throw new Error("Project store is required for backups");

  async function createArchive({ title = "AIR-DROW" } = {}) {
    return projectStore.createBackupArchive({ appVersion, title });
  }

  async function download({ title = "AIR-DROW" } = {}) {
    const archive = await createArchive({ title });
    const body = `${JSON.stringify(archive, null, 2)}\n`;
    const blob = new Blob([body], { type: "application/json;charset=utf-8" });
    const name = `${safeFilename(title)}-backup-${safeStamp()}.airdrow-backup.json`;
    triggerDownload(blob, name);
    return { archive, bytes: blob.size, name };
  }

  async function readFile(file) {
    if (!file) throw new Error("Backup file is required");
    if (file.size > 32 * 1024 * 1024) throw new Error("Backup file is larger than 32 MB");
    const text = await file.text();
    let archive;
    try { archive = JSON.parse(text); } catch { throw new Error("Backup file is not valid JSON"); }
    return archive;
  }

  async function restore(file, { restoreCurrent = false } = {}) {
    const archive = await readFile(file);
    return projectStore.restoreBackupArchive(archive, { restoreCurrent });
  }

  async function health() {
    return projectStore.getHealth();
  }

  return { createArchive, download, readFile, restore, health };
}
