const DB_NAME = "air-drow-studio";
const DB_VERSION = 2;
const STORE_NAME = "projects";
const CURRENT_PROJECT_KEY = "current-project";
const GALLERY_PREFIX = "gallery-";
const BACKUP_SCHEMA = "air-drow-backup";
const BACKUP_VERSION = 1;

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in globalThis)) return reject(new Error("IndexedDB is unavailable"));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.objectStoreNames.contains(STORE_NAME)
        ? request.transaction.objectStore(STORE_NAME)
        : db.createObjectStore(STORE_NAME, { keyPath: "id" });
      if (!store.indexNames.contains("recordType")) store.createIndex("recordType", "recordType", { unique: false });
      if (!store.indexNames.contains("savedAt")) store.createIndex("savedAt", "savedAt", { unique: false });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open IndexedDB"));
  });
}

async function withStore(mode, run) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      const store = transaction.objectStore(STORE_NAME);
      const request = run(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("IndexedDB request failed"));
      transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed"));
    });
  } finally {
    db.close();
  }
}

function idForGallery() {
  if (globalThis.crypto?.randomUUID) return `${GALLERY_PREFIX}${globalThis.crypto.randomUUID()}`;
  return `${GALLERY_PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeName(value) {
  const trimmed = String(value || "").trim().replace(/\s+/g, " ");
  return trimmed.slice(0, 72) || `AIR-DROW ${new Date().toLocaleDateString()}`;
}

function validProject(project) {
  return Boolean(project && typeof project === "object" && Array.isArray(project.strokes));
}

function galleryView(record) {
  if (!record) return null;
  return {
    id: record.id,
    name: record.name || "Untitled",
    savedAt: record.savedAt,
    createdAt: record.createdAt || record.savedAt,
    thumbnail: record.thumbnail || "",
    strokeCount: Number(record.strokeCount || record.project?.strokes?.length || 0),
    appVersion: record.project?.appVersion || ""
  };
}

function archiveRecords(records) {
  return records
    .filter(record => record && (record.id === CURRENT_PROJECT_KEY || record.recordType === "gallery" || String(record.id || "").startsWith(GALLERY_PREFIX)))
    .map(record => ({
      id: record.id,
      recordType: record.id === CURRENT_PROJECT_KEY ? "current" : "gallery",
      name: safeName(record.name || record.project?.title || "Untitled"),
      createdAt: record.createdAt || record.savedAt || new Date().toISOString(),
      savedAt: record.savedAt || new Date().toISOString(),
      thumbnail: typeof record.thumbnail === "string" ? record.thumbnail : "",
      project: record.project
    }))
    .filter(record => validProject(record.project));
}

function byteSize(value) {
  try { return new Blob([JSON.stringify(value)]).size; } catch { return 0; }
}

export const projectStore = {
  async loadCurrent() {
    const record = await withStore("readonly", store => store.get(CURRENT_PROJECT_KEY));
    return record?.project || null;
  },

  async saveCurrent(project) {
    if (!validProject(project)) throw new Error("Project data is required");
    const record = {
      id: CURRENT_PROJECT_KEY,
      recordType: "current",
      savedAt: new Date().toISOString(),
      project
    };
    await withStore("readwrite", store => store.put(record));
    return record;
  },

  async clearCurrent() {
    await withStore("readwrite", store => store.delete(CURRENT_PROJECT_KEY));
  },

  async saveGalleryProject({ id, name, project, thumbnail = "" } = {}) {
    if (!validProject(project)) throw new Error("Project data is required");
    const now = new Date().toISOString();
    const recordId = id?.startsWith(GALLERY_PREFIX) ? id : idForGallery();
    const existing = id ? await withStore("readonly", store => store.get(recordId)) : null;
    const record = {
      id: recordId,
      recordType: "gallery",
      name: safeName(name),
      createdAt: existing?.createdAt || now,
      savedAt: now,
      thumbnail: typeof thumbnail === "string" ? thumbnail : "",
      strokeCount: Array.isArray(project.strokes) ? project.strokes.length : 0,
      project
    };
    await withStore("readwrite", store => store.put(record));
    return galleryView(record);
  },

  async listGalleryProjects() {
    const all = await withStore("readonly", store => store.getAll());
    return all
      .filter(record => record?.recordType === "gallery" || String(record?.id || "").startsWith(GALLERY_PREFIX))
      .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")))
      .map(galleryView);
  },

  async loadGalleryProject(id) {
    if (!id) return null;
    const record = await withStore("readonly", store => store.get(id));
    return record?.project || null;
  },

  async deleteGalleryProject(id) {
    if (!String(id || "").startsWith(GALLERY_PREFIX)) throw new Error("Invalid gallery project id");
    await withStore("readwrite", store => store.delete(id));
  },

  async createBackupArchive({ appVersion = "", title = "AIR-DROW" } = {}) {
    const records = await withStore("readonly", store => store.getAll());
    const archive = {
      schema: BACKUP_SCHEMA,
      version: BACKUP_VERSION,
      app: "AIR-DROW",
      appVersion: String(appVersion || ""),
      title: safeName(title),
      exportedAt: new Date().toISOString(),
      records: archiveRecords(records)
    };
    archive.summary = {
      currentProject: archive.records.some(record => record.recordType === "current"),
      galleryProjects: archive.records.filter(record => record.recordType === "gallery").length,
      bytes: byteSize(archive)
    };
    return archive;
  },

  async restoreBackupArchive(archive, { restoreCurrent = false } = {}) {
    if (!archive || typeof archive !== "object" || archive.schema !== BACKUP_SCHEMA || Number(archive.version) !== BACKUP_VERSION || !Array.isArray(archive.records)) {
      throw new Error("This is not a supported AIR-DROW backup");
    }
    const records = archiveRecords(archive.records);
    if (!records.length) throw new Error("The backup does not contain any valid projects");

    let restoredGallery = 0;
    let restoredCurrent = false;
    let preservedCurrent = false;
    const current = records.find(record => record.recordType === "current");
    if (current?.project) {
      if (restoreCurrent) {
        await this.saveCurrent(current.project);
        restoredCurrent = true;
      } else {
        await this.saveGalleryProject({
          name: `${safeName(current.name || current.project.title)} — restored canvas`,
          project: current.project,
          thumbnail: current.thumbnail || ""
        });
        restoredGallery += 1;
        preservedCurrent = true;
      }
    }

    for (const record of records.filter(item => item.recordType === "gallery")) {
      await this.saveGalleryProject({
        name: record.name,
        project: record.project,
        thumbnail: record.thumbnail || ""
      });
      restoredGallery += 1;
    }
    return { restoredGallery, restoredCurrent, preservedCurrent, sourceVersion: archive.appVersion || "" };
  },

  async getHealth() {
    const records = await withStore("readonly", store => store.getAll());
    const valid = archiveRecords(records);
    let usage = 0;
    let quota = 0;
    try {
      const estimate = await navigator.storage?.estimate?.();
      usage = Number(estimate?.usage || 0);
      quota = Number(estimate?.quota || 0);
    } catch {}
    return {
      currentProject: valid.some(record => record.recordType === "current"),
      galleryProjects: valid.filter(record => record.recordType === "gallery").length,
      recordBytes: byteSize(valid),
      usage,
      quota
    };
  }
};
