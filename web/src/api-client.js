export class ApiError extends Error {
  constructor(message, { status = 0, code = "API_ERROR", body = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

export class ApiClient {
  constructor({ baseUrl = "", token = "", timeoutMs = 8000 } = {}) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.timeoutMs = timeoutMs;
  }

  configure({ baseUrl, token }) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
    this.token = token || "";
  }

  origin() {
    if (!this.baseUrl) throw new ApiError("API base URL is empty", { code: "NO_BASE_URL" });
    const url = new URL(this.baseUrl);
    if (!["http:", "https:"].includes(url.protocol)) throw new ApiError("API base must use http or https", { code: "BAD_PROTOCOL" });
    return url.href.replace(/\/$/, "");
  }

  headers(extra = {}) {
    return {
      "Accept": "application/json",
      ...(this.token ? { "Authorization": `Bearer ${this.token}` } : {}),
      ...extra
    };
  }

  async request(path, { method = "GET", body = undefined, retrySafe = false } = {}) {
    const url = new URL(path, `${this.origin()}/`).href;
    const attempts = retrySafe && ["GET", "HEAD"].includes(method) ? 2 : 1;
    let lastError = null;

    for (let attempt = 0; attempt < attempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await fetch(url, {
          method,
          headers: this.headers(body === undefined ? {} : { "Content-Type": "application/json" }),
          body: body === undefined ? undefined : JSON.stringify(body),
          cache: "no-store",
          signal: controller.signal
        });
        const text = await response.text();
        let parsed = null;
        try { parsed = text ? JSON.parse(text) : null; } catch {}
        if (!response.ok) {
          throw new ApiError(parsed?.detail || parsed?.message || `HTTP ${response.status}`, {
            status: response.status,
            code: parsed?.code || "HTTP_ERROR",
            body: parsed
          });
        }
        return parsed;
      } catch (error) {
        lastError = error instanceof ApiError ? error : new ApiError(
          error?.name === "AbortError" ? "Request timed out" : (error?.message || "Network request failed"),
          { code: error?.name === "AbortError" ? "TIMEOUT" : "NETWORK" }
        );
        if (attempt + 1 < attempts) await new Promise(resolve => setTimeout(resolve, 350 * (attempt + 1)));
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError;
  }

  health() {
    return this.request("/api/health", { retrySafe: true });
  }

  getProject(projectId) {
    return this.request(`/api/projects/${encodeURIComponent(projectId)}`, { retrySafe: true });
  }

  putProject(projectId, { project, baseRevision, updatedAt }) {
    // Never automatically retry writes; a timed-out write may have reached the server.
    return this.request(`/api/projects/${encodeURIComponent(projectId)}`, {
      method: "PUT",
      body: { project, base_revision: baseRevision, updated_at: updatedAt },
      retrySafe: false
    });
  }

  webSocketUrl(room) {
    const base = new URL(this.origin());
    base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
    base.pathname = `/ws/${encodeURIComponent(room)}`;
    if (this.token) base.searchParams.set("token", this.token);
    return base.href;
  }
}
