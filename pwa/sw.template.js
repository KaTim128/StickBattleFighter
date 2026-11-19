/* Stickman Arena service worker: makes the game playable with no connection (owner, 21/11/2026).
 * The version and file list below are filled in by the build (vite.config.ts, plugin `offline-service-worker`):
 * every built file except source maps is stored on first load, so after one online visit the whole game
 * (menus, fights, audio, physics engine) runs from the device. Nothing here touches game state. */
const VERSION = '__VERSION__';
const CACHE = `stickman-arena-${VERSION}`;
const PRECACHE = __PRECACHE__;
const scope = self.registration.scope;
const url = (path) => new URL(path, scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map(url)))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith('stickman-arena-') && k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(scope)) return;
  if (request.mode === 'navigate') {
    // Pages: the network when there is one (so updates arrive), the stored copy when there is not. The query string
    // (?mute, ?scene=...) never changes the page, so it is ignored when matching.
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request, { ignoreSearch: true }).then((hit) => hit ?? caches.match(url('index.html'))),
        ),
    );
    return;
  }
  // Built files carry a content hash in their name, so the stored copy is always the right one.
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(
      (hit) =>
        hit ??
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
