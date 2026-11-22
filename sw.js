const CACHE = "scent-rules-v8";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json?v=8",
  "./icon-192.png?v=8",
  "./icon-512.png?v=8"
];
const XLSX_URL = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    // Excel export is part of the app, so save its library for offline use too.
    // A CDN failure must not discard an otherwise usable offline app shell.
    try {
      const response = await fetch(XLSX_URL, { mode: "cors", cache: "no-store" });
      if (response.ok && response.type !== "opaque") {
        await cache.put(XLSX_URL, response);
      }
    } catch (error) {
      // The next manual update check can retry this required support file.
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
