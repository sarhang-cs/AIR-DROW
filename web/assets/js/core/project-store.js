const DB_NAME = "air-drow-studio";
const DB_VERSION = 2;
const STORE_NAME = "projects";
const CURRENT_PROJECT_KEY = "current-project";
const GALLERY_PREFIX = "gallery-";
const BACKUP_SCHEMA = "air-drow-backup";
const BACKUP_VERSION = 1;
const FALLBACK_KEY = "air-drow.project-store.recovery.v1";
const OPEN_TIMEOUT_MS = 8000;

let storageMode = "indexeddb";
let lastStorageError = "";
let memoryFallback = [];

function storageError(error) {
  return String(error?.message || error || "Browser project storage is unavailable");
}

function markFallback(error) {
  storageMode = "localstorage";
  lastStorageError = storageError(error);
}

function clone(value) {
  try { return structuredClone(value); } catch { return JSON.parse(JSON.stringify(value)); }
}

function fallbackRecords() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FALLBACK_KEY) || "[]");
    if (Array.isArray(parsed)) {
      memoryFallback = parsed.filter(record => record && typeof record.id === "string");
      return clone(memoryFallback);
    }
  } catch {}
  return clone(memoryFallback);
}

function writeFallback(records) {
  const next = records.filter(record => record && typeof record.id === "string");
  memoryFallback = clone(next);
  try {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(next));
    return true;
  } catch (error) {
    throw new Error(`Browser recovery storage is unavailable: ${storageError(error)}`);
  }
}

function updateFallbackRecord(record) {
  const records = fallbackRecords();
  const index = records.findIndex(item => item.id === record.id);
  if (index >= 0) records[index] = clone(record);
  else records.push(clone(record));
  writeFallback(records);
  return record;
}

function deleteFallbackRecord(id) {
  writeFallback(fallbackRecords().filter(record => record.id !== id));
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in globalThis)) {
      reject(new Error("IndexedDB is unavailable"));
      return;
    }

    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback(value);
    };
    const fail = error => finish(reject, error instanceof Error ? error : new Error(storageError(error)));
    const timeout = setTimeout(() => fail(new Error("IndexedDB did not respond in time")), OPEN_TIMEOUT_MS);

    let request;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (error) {
      fail(error);
      return;
    }

    request.onupgradeneeded = () => {
      try {
        const db = request.result;
        const transaction = request.transaction;
        if (!transaction) throw new Error("IndexedDB upgrade transaction is unavailable");
        const store = db.objectStoreNames.contains(STORE_NAME)
          ? transaction.objectStore(STORE_NAME)
          : db.createObjectStore(STORE_NAME, { keyPath: "id" });
        if (!store.indexNames.contains("recordType")) store.createIndex("recordType", "recordType", { unique: false });
        if (!store.indexNames.contains("savedAt")) store.createIndex("savedAt", "savedAt", { unique: false });
      } catch (error) {
        try { request.transaction?.abort(); } catch {}
        fail(error);
      }
    };
    request.onblocked = () => fail(new Error("IndexedDB is locked by another AIR-DROW tab"));
    request.onerror = () => fail(request.error || new Error("Could not open IndexedDB"));
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      if (settled) {
        db.close();
        return;
      }
      finish(resolve, db);
    };
  });
}

async function withStore(mode, run) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      let settled = false;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        callback(value);
      };
      let transaction;
      let request;
      try {
        transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        request = run(store);
      } catch (error) {
        finish(reject, error);
        return;
      }
      request.onsuccess = () => finish(resolve, request.result);
      request.onerror = () => finish(reject, request.error || new Error("IndexedDB request failed"));
      transaction.onabort = () => finish(reject, transaction.error || new Error("IndexedDB transaction was aborted"));
      transaction.onerror = () => finish(reject, transaction.error || new Error("IndexedDB transaction failed"));
    });
  } finally {
    db.close();
  }
}

async function getAllRecords() {
  if (storageMode === "localstorage") return fallbackRecords();
  try {
    const records = await withStore("readonly", store => store.getAll());
    return Array.isArray(records) ? records : [];
  } catch (error) {
    markFallback(error);
    return fallbackRecords();
  }
}

async function getRecord(id) {
  if (storageMode === "localstorage") return fallbackRecords().find(record => record.id === id) || null;
  try {
    return await withStore("readonly", store => store.get(id));
  } catch (error) {
    markFallback(error);
    return fallbackRecords().find(record => record.id === id) || null;
  }
}

async function putRecord(record) {
  if (storageMode === "localstorage") return updateFallbackRecord(record);
  try {
    await withStore("readwrite", store => store.put(record));
    return record;
  } catch (error) {
    markFallback(error);
    return updateFallbackRecord(record);
  }
}

async function removeRecord(id) {
  if (storageMode === "localstorage") return deleteFallbackRecord(id);
  try {
    await withStore("readwrite", store => store.delete(id));
  } catch (error) {
    markFallback(error);
    deleteFallbackRecord(id);
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
    const record = await getRecord(CURRENT_PROJECT_KEY);
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
    await putRecord(record);
    return record;
  },

  async clearCurrent() {
    await removeRecord(CURRENT_PROJECT_KEY);
  },

  async saveGalleryProject({ id, name, project, thumbnail = "" } = {}) {
    if (!validProject(project)) throw new Error("Project data is required");
    const now = new Date().toISOString();
    const recordId = id?.startsWith(GALLERY_PREFIX) ? id : idForGallery();
    const existing = id ? await getRecord(recordId) : null;
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
    await putRecord(record);
    return galleryView(record);
  },

  async listGalleryProjects() {
    const all = await getAllRecords();
    return all
      .filter(record => record?.recordType === "gallery" || String(record?.id || "").startsWith(GALLERY_PREFIX))
      .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")))
      .map(galleryView);
  },

  async loadGalleryProject(id) {
    if (!id) return null;
    const record = await getRecord(id);
    return record?.project || null;
  },

  async deleteGalleryProject(id) {
    if (!String(id || "").startsWith(GALLERY_PREFIX)) throw new Error("Invalid gallery project id");
    await removeRecord(id);
  },

  async createBackupArchive({ appVersion = "", title = "AIR-DROW" } = {}) {
    const records = await getAllRecords();
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

  /**
   * Non-invasive storage round-trip for the Feature Check panel.
   * Uses a private diagnostic record, never lists it in the gallery and
   * removes it in finally even when a browser falls back from IndexedDB.
   */
  async probeIntegrity() {
    const id = `diagnostic-feature-probe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const record = {
      id,
      recordType: "diagnostic",
      savedAt: new Date().toISOString(),
      project: { title: "AIR-DROW feature probe", strokes: [] }
    };
    try {
      await putRecord(record);
      const loaded = await getRecord(id);
      const ok = Boolean(loaded?.id === id && Array.isArray(loaded?.project?.strokes));
      return { ok, mode: storageMode, fallback: storageMode === "localstorage" };
    } catch (error) {
      return { ok: false, mode: storageMode, fallback: storageMode === "localstorage", error: storageError(error) };
    } finally {
      try { await removeRecord(id); } catch {}
    }
  },

  async getHealth() {
    const records = await getAllRecords();
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
      quota,
      mode: storageMode,
      fallback: storageMode === "localstorage"
    };
  },

  getStorageState() {
    return { mode: storageMode, fallback: storageMode === "localstorage", error: lastStorageError };
  }
};
