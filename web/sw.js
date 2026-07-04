const BUILD_ID = "air-drow-v830-export-preview-save-polish";
const CACHE_PREFIX = "air-drow-runtime-";
const STATIC_CACHE = `${CACHE_PREFIX}${BUILD_ID}`;

/* Only the light application shell is installed up front. The 7.8 MB hand
 * model and MediaPipe WASM are intentionally excluded: they are requested
 * only after the person opens Camera, then cached on demand. This keeps first
 * load and install practical on low-memory Android phones. */
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest?v=830",
  "/favicon.svg",
  "/assets/fonts/noto-kufi-arabic/NotoKufiArabic-VariableFont_wght.ttf",
  "/assets/icons/toolbar/toolbar-icons.css?v=830",
  "/assets/css/app.css?v=830",
  "/assets/css/visual-system.css?v=830",
  "/assets/css/icon-system.css?v=830",
  "/assets/css/drawer-layout.css?v=830",
  "/assets/css/production-ui.css?v=830"
];

async function clearAirDrawCaches({ keepCurrent = false } = {}) {
  const keys = await caches.keys();
  await Promise.all(keys
    .filter(key => key.startsWith(CACHE_PREFIX) || key.startsWith("workbox-precache"))
    .filter(key => !(keepCurrent && key === STATIC_CACHE))
    .map(key => caches.delete(key)));
}

async function announce(type = "AIRDROW_RELEASE_ACTIVE") {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  clients.forEach(client => client.postMessage({ type, buildId: BUILD_ID }));
}

async function networkFirst(request, fallbackPath) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const response = await fetch(new Request(request, { cache: "no-store" }));
    if (response?.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    const fallback = fallbackPath ? await cache.match(fallbackPath) : null;
    if (cached || fallback) return cached || fallback;
    throw error;
  }
}

async function cacheFirstOnDemand(request, event) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const refresh = fetch(request).then(async response => {
    if (response?.ok) await cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  if (cached) {
    event.waitUntil(refresh);
    return cached;
  }
  const response = await refresh;
  if (response) return response;
  throw new Error(`AIR-DROW asset is unavailable: ${new URL(request.url).pathname}`);
}

self.addEventListener("install", event => {
  /* Do not skipWaiting: AIR-DROW displays a user-controlled update banner. */
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await Promise.all(APP_SHELL.map(async asset => {
      try {
        const response = await fetch(new Request(asset, { cache: "no-store" }));
        if (response?.ok) await cache.put(asset, response.clone());
      } catch (error) {
        console.warn("AIR-DROW core shell asset skipped", asset, error);
      }
    }));
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    await clearAirDrawCaches({ keepCurrent: true });
    await self.clients.claim();
    await announce();
  })());
});

self.addEventListener("message", event => {
  const type = event.data?.type;
  if (type === "AIRDROW_SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
    return;
  }
  if (type === "AIRDROW_PURGE_RELEASE_CACHE" || type === "AIRDROW_CLEAR_OLD_CACHES") {
    event.waitUntil((async () => {
      await clearAirDrawCaches();
      await announce("AIRDROW_RELEASE_PURGED");
    })());
  }
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  const isNavigation = event.request.mode === "navigate";
  const isMutable = isNavigation || ["/", "/index.html", "/release.json", "/sw.js", "/manifest.webmanifest"].includes(url.pathname) || url.pathname.startsWith("/assets/js/");
  if (isMutable) {
    /* Never use index.html as a fallback for a JavaScript module. */
    event.respondWith(networkFirst(event.request, isNavigation ? "/index.html" : undefined));
    return;
  }

  /* MediaPipe, the hand model, fonts, icons and images are cached only after
   * they are actually needed. No camera asset is part of the install payload. */
  if (url.pathname.startsWith("/vendor/") || url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirstOnDemand(event.request, event));
  }
});
