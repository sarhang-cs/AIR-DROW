const CACHE_NAME = "airdraw-phase23-motion-skin-v1";
const APP_SHELL = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/assets/airdraw-logo-lottie.json"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("airdraw-phase") && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event?.data?.type === "CLEAR_APP_CACHE") {
    event.waitUntil(
      caches.keys()
        .then(keys => Promise.all(keys.filter(key => key.startsWith("airdraw-phase23-")).map(key => caches.delete(key))))
        .then(() => event.ports?.[0]?.postMessage({ ok: true }))
        .catch(error => event.ports?.[0]?.postMessage({ ok: false, error: String(error) }))
    );
  }
  if (event?.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Project API data is live only. Do not cache private project responses.
  if (url.pathname.startsWith("/api/")) return;

  // Do not proxy/cache CDN packages, MediaPipe assets, or other external resources.
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          caches.open(CACHE_NAME).then(cache => cache.put("/index.html", response.clone()));
          return response;
        })
        .catch(async () => (await caches.match("/index.html")) || caches.match("/offline.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        const cacheControl = response.headers.get("Cache-Control") || "";
        if (response.ok && !/no-store/i.test(cacheControl)) {
          caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
        }
        return response;
      });
    })
  );
});
