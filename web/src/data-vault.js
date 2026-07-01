const DB_NAME = "airdraw-phase22-data-vault";
const DB_VERSION = 1;
const PROJECTS = "projects";
const META = "meta";
const OUTBOX = "outbox";

export function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

async function hashText(text) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || !globalThis.TextEncoder) return { algorithm: "Unavailable", value: null };
  const bytes = new TextEncoder().encode(text);
  const digest = await subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  return { algorithm: "SHA-256", value: hex };
}

export class DataVault {
  constructor() {
    this.dbPromise = null;
    this.saveChain = Promise.resolve();
    this.mirrorKey = "airdraw.phase22.reload-mirror";
    this.maxMirrorBytes = 1_500_000;
  }

  open() {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PROJECTS)) db.createObjectStore(PROJECTS, { keyPath: "id" });
        if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: "id" });
        if (!db.objectStoreNames.contains(OUTBOX)) db.createObjectStore(OUTBOX, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return this.dbPromise;
  }

  async read(storeName, id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const request = tx.objectStore(storeName).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async write(storeName, record) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async delete(storeName, id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async list(storeName) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const request = tx.objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  validateProject(project) {
    return Boolean(
      project &&
      typeof project === "object" &&
      Array.isArray(project.strokes) &&
      project.settings &&
      typeof project.revision === "number"
    );
  }

  async verifyRecord(record) {
    if (!record?.project || !this.validateProject(record.project)) return { ok: false, reason: "Project shape is invalid" };
    if (!record.integrity?.value || record.integrity.algorithm !== "SHA-256") {
      return { ok: true, verified: false, reason: "Web Crypto hash unavailable" };
    }
    const actual = await hashText(stableStringify(record.project));
    const ok = actual.value === record.integrity.value;
    return { ok, verified: true, reason: ok ? "SHA-256 verified" : "SHA-256 mismatch" };
  }

  mirror(record) {
    try {
      const raw = JSON.stringify(record);
      const bytes = new Blob([raw]).size;
      if (bytes > this.maxMirrorBytes) return { ok: false, reason: `Skipped: ${Math.ceil(bytes / 1024)} KB exceeds mirror limit` };
      localStorage.setItem(this.mirrorKey, raw);
      return { ok: true, reason: `Stored: ${Math.ceil(bytes / 1024)} KB` };
    } catch (error) {
      return { ok: false, reason: error?.name || "localStorage unavailable" };
    }
  }

  readMirror() {
    try {
      const raw = localStorage.getItem(this.mirrorKey);
      if (!raw) return null;
      const record = JSON.parse(raw);
      return record?.project ? record : null;
    } catch {
      return null;
    }
  }

  async saveProject(project, { projectId = "current-project", checkpoint = true } = {}) {
    this.saveChain = this.saveChain.then(async () => {
      if (!this.validateProject(project)) throw new Error("Project shape is invalid");
      const integrity = await hashText(stableStringify(project));
      const savedAt = new Date().toISOString();
      const record = { id: projectId, project, integrity, savedAt };
      const checkpointRecord = { id: "recovery-checkpoint", project, integrity, savedAt };

      const db = await this.open();
      await new Promise((resolve, reject) => {
        const stores = checkpoint ? [PROJECTS, META] : [PROJECTS];
        const tx = db.transaction(stores, "readwrite");
        tx.objectStore(PROJECTS).put(record);
        if (checkpoint) tx.objectStore(META).put(checkpointRecord);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });

      const mirror = this.mirror(record);
      return { record, mirror };
    });
    return this.saveChain;
  }

  async loadBest(projectId = "current-project") {
    const [primary, checkpoint, mirror] = await Promise.all([
      this.read(PROJECTS, projectId).catch(() => null),
      this.read(META, "recovery-checkpoint").catch(() => null),
      Promise.resolve(this.readMirror())
    ]);

    const candidates = [primary, checkpoint, mirror].filter(Boolean);
    const ranked = candidates.sort((a, b) => (Date.parse(b.savedAt || "") || 0) - (Date.parse(a.savedAt || "") || 0));
    for (const record of ranked) {
      const verification = await this.verifyRecord(record);
      if (verification.ok) return { record, verification };
    }
    return { record: null, verification: { ok: false, reason: candidates.length ? "No valid integrity record found" : "No local project record found" } };
  }

  async restoreCheckpoint() {
    const checkpoint = await this.read(META, "recovery-checkpoint");
    const verification = await this.verifyRecord(checkpoint);
    if (!verification.ok) throw new Error(verification.reason);
    return { record: checkpoint, verification };
  }

  async enqueueOutbox(entry) {
    const record = {
      id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
      ...entry
    };
    await this.write(OUTBOX, record);
    return record;
  }

  async outboxItems() {
    const items = await this.list(OUTBOX);
    return items.sort((a, b) => (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0));
  }

  async storageEstimate() {
    return navigator.storage?.estimate?.() || null;
  }

  async requestPersistence() {
    if (!navigator.storage?.persist) return { supported: false, granted: false };
    const granted = await navigator.storage.persist();
    return { supported: true, granted };
  }
}
