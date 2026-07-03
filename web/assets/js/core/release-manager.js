function noStoreFetch(url) {
  const urlWithCacheKey = new URL(url, location.href);
  urlWithCacheKey.searchParams.set("ts", Date.now().toString());
  return fetch(urlWithCacheKey, {
    cache: "no-store",
    headers: { "Cache-Control": "no-store, no-cache, max-age=0", Pragma: "no-cache" }
  });
}

export function createReleaseManager({ release, onUpdateAvailable, beforeApply, onError = console.warn }) {
  let registration = null;
  let pendingRelease = null;
  let applying = false;
  let timer = 0;

  async function readRemoteRelease() {
    if (!navigator.onLine) return null;
    const response = await noStoreFetch("./release.json");
    if (!response.ok) return null;
    return response.json();
  }

  async function presentUpdate(remote) {
    if (!remote?.buildId || remote.buildId === release.buildId) return false;
    pendingRelease = remote;
    onUpdateAvailable?.(remote, apply);
    return true;
  }

  async function check() {
    if (applying) return;
    try {
      const remote = await readRemoteRelease();
      if (remote) await presentUpdate(remote);
      await registration?.update?.();
      if (registration?.waiting && !pendingRelease) {
        pendingRelease = { version: "New", buildId: "service-worker-update" };
        onUpdateAvailable?.(pendingRelease, apply);
      }
    } catch (error) {
      onError("AIR-DROW release check failed", error);
    }
  }

  async function apply() {
    if (applying) return false;
    applying = true;
    try {
      const saved = await beforeApply?.();
      if (saved && saved.saved === false) throw new Error("The current project was not saved before the update.");
      const targetBuild = pendingRelease?.buildId || release.buildId;
      sessionStorage.setItem(`air-drow-apply-release:${targetBuild}`, "1");
      const activeRegistration = registration || await navigator.serviceWorker?.getRegistration();
      // Only the waiting worker is promoted here. The new worker clears obsolete
      // caches during activation, so its own freshly prepared cache is never deleted.
      activeRegistration?.waiting?.postMessage({ type: "AIRDROW_SKIP_WAITING" });
      await activeRegistration?.update?.();
      // The current app stays usable until the new worker takes control. If there is
      // no waiting worker, a cache-busted navigation still fetches the release fresh.
      window.setTimeout(() => {
        const url = new URL(location.href);
        url.searchParams.set("build", targetBuild);
        url.searchParams.set("fresh", Date.now().toString());
        location.replace(url.toString());
      }, 160);
      return true;
    } catch (error) {
      applying = false;
      onError("AIR-DROW update could not be applied", error);
      throw error;
    }
  }

  async function init() {
    if (!("serviceWorker" in navigator)) {
      await check();
      return;
    }
    try {
      registration = await navigator.serviceWorker.register(`./sw.js?build=${encodeURIComponent(release.buildId)}`, {
        scope: "./",
        updateViaCache: "none"
      });
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            pendingRelease ||= { version: "New", buildId: "service-worker-update" };
            onUpdateAvailable?.(pendingRelease, apply);
          }
        });
      });
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!applying) return;
        const targetBuild = pendingRelease?.buildId || release.buildId;
        const key = `air-drow-controller-reload:${targetBuild}`;
        if (sessionStorage.getItem(key) === "done") return;
        sessionStorage.setItem(key, "done");
        const url = new URL(location.href);
        url.searchParams.set("build", targetBuild);
        url.searchParams.set("fresh", Date.now().toString());
        location.replace(url.toString());
      });
    } catch (error) {
      onError("AIR-DROW service worker registration failed", error);
    }

    const checkNow = () => void check();
    window.addEventListener("focus", checkNow);
    window.addEventListener("online", checkNow);
    window.addEventListener("pageshow", checkNow);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) checkNow(); });
    await check();
    window.clearInterval(timer);
    timer = window.setInterval(checkNow, 30 * 60 * 1000);
  }

  return { init, check, apply, get pendingRelease() { return pendingRelease; } };
}
