const CACHE = 'dog-trial-ref-v3';
const MUST_CACHE = [
  './',
  './index.html',
  './manifest.json'
];
const TRY_CACHE = [
  './icon-192.png',
  './icon-512.png',
  './icon-1024.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(async c => {
      // Must succeed — these are the core files
      await c.addAll(MUST_CACHE);
      // Nice to have — don't fail install if missing
      for (const url of TRY_CACHE) {
        await c.add(url).catch(() => console.warn('SW: could not cache', url));
      }
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request)
      .then(r => r || fetch(e.request))
      .catch(() => caches.match('./index.html'))
  );
});
