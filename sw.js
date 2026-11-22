const CACHE = "scent-rules-v9";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json?v=9",
  "./icon-192.png?v=9",
  "./icon-512.png?v=9"
];
const XLSX_URL = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    // Preserve a previously cached Excel library without making installation
    // wait on a CDN. A first-time install must finish using local app files alone.
    const oldCaches = await caches.keys();
    for (const key of oldCaches) {
      if (!key.startsWith("scent-rules-") || key === CACHE) continue;
      const previous = await caches.open(key);
      const savedXlsx = await previous.match(XLSX_URL);
      if (savedXlsx) {
        await cache.put(XLSX_URL, savedXlsx);
        break;
      }
    }
  })());
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith("scent-rules-") && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const isXlsx = url.href === XLSX_URL;
  if (url.origin !== self.location.origin && !isXlsx) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Resolve app navigation from the saved shell before attempting any network request.
    if (request.mode === "navigate") {
      const shell = await cache.match("./index.html");
      if (shell) return shell;
    }
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok && (url.origin === self.location.origin || response.type !== "opaque")) {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      if (request.mode === "navigate") {
        const shell = await cache.match("./index.html");
        if (shell) return shell;
      }
      throw error;
    }
  })());
});
