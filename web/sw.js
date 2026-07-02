const BUILD_ID = "air-drow-v523-release-verification-recovery-fix";
const CACHE_PREFIX = "air-drow-runtime-";
const STATIC_CACHE = `${CACHE_PREFIX}${BUILD_ID}`;
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/release.json",
  "/assets/fonts/noto-kufi-arabic/NotoKufiArabic-VariableFont_wght.ttf",
  "/assets/css/app.css",
  "/assets/css/visual-system.css",
  "/assets/icons/toolbar/redo.svg",
  "/assets/css/drawer-layout.css",
  "/assets/css/icon-system.css",
  "/assets/js/config/runtime.js",
  "/assets/js/config/appearance.js",
  "/assets/js/i18n/translations.js",
  "/assets/js/ui/registry.js",
  "/assets/js/core/loading-manager.js",
  "/assets/js/core/performance-governor.js",
  "/assets/js/features/hand-calibration.js",
  "/assets/js/features/hand-tracking-engine.js",
  "/assets/js/features/hand-engine-bootstrap.js",
  "/assets/js/features/onboarding-flow.js",
  "/assets/js/core/reliability-center.js",
  "/assets/js/core/backup-manager.js",
  "/assets/js/core/final-stability.js",
  "/assets/js/app.js",
  "/assets/js/core/project-store.js",
  "/assets/js/core/release-manager.js",
  "/assets/js/core/font-kit.js",
  "/assets/js/features/exporter.js",
  "/assets/js/features/brush-lab.js",
  "/assets/js/features/shape-engine.js",
  "/assets/js/features/gesture-shortcuts.js",
  "/assets/js/features/replay-engine.js",
  "/assets/js/features/share-card.js",
  "/assets/js/features/air-challenge.js",
  "/assets/js/features/template-studio.js",
  "/assets/js/features/ai-studio.js",
  "/vendor/models/hand_landmarker.task",
  "/vendor/mediapipe/vision_bundle.js",
  "/vendor/mediapipe/wasm/vision_wasm_internal.js",
  "/vendor/mediapipe/wasm/vision_wasm_internal.wasm",
  "/vendor/mediapipe/wasm/vision_wasm_module_internal.js",
  "/vendor/mediapipe/wasm/vision_wasm_module_internal.wasm",
  "/vendor/mediapipe/wasm/vision_wasm_nosimd_internal.js",
  "/vendor/mediapipe/wasm/vision_wasm_nosimd_internal.wasm"
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

async function networkFresh(request, fallbackPath) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const response = await fetch(new Request(request, { cache: "no-store" }));
    if (response?.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    const fallback = fallbackPath ? await cache.match(fallbackPath) : null;
    if (cached || fallback) return cached || fallback;
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const network = fetch(new Request(request, { cache: "no-store" })).then(response => {
    if (response?.ok) cache.put(request, response.clone());
    return response;
  });
  return cached || network;
}

self.addEventListener("install", event => {
  // Do not call skipWaiting here: the app shows a user-controlled update banner.
  // A failed optional vendor/model pre-cache must never prevent the worker from
  // installing. The app can fetch that asset on demand, while the shell stays
  // recoverable on constrained Android connections.
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await Promise.all(APP_SHELL.map(async asset => {
      try {
        const response = await fetch(new Request(asset, { cache: "no-store" }));
        if (response?.ok) await cache.put(asset, response.clone());
      } catch (error) {
        console.warn("AIR-DROW optional pre-cache skipped", asset, error);
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
  if (url.origin !== self.location.origin) return;

  const freshPaths = ["/", "/index.html", "/release.json", "/sw.js", "/manifest.webmanifest"];
  const isNavigation = event.request.mode === "navigate";
  const isFresh = isNavigation || freshPaths.includes(url.pathname) || url.pathname.startsWith("/assets/js/") || url.pathname.startsWith("/assets/icons/toolbar/");

  if (isFresh) {
    // Never return index.html as a fallback for JavaScript modules. An HTML
    // response for app.js causes a silent module MIME failure and leaves the
    // branded boot shell at its initial 7% state.
    event.respondWith(networkFresh(event.request, isNavigation ? "/index.html" : undefined));
    return;
  }
  if (url.pathname.startsWith("/vendor/") || url.pathname.startsWith("/assets/")) {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});
