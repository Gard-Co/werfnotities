// Fotonotities service worker.
// Met internet: altijd eerst de nieuwste versie ophalen (max. 3 s wachten).
// Zonder internet of bij traag netwerk: de bewaarde versie gebruiken.
const CACHE = 'werfnotities-v41';
const FILES = ['./', './index.html', './style.css', './app.js', './lib.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request, { cache: 'no-cache' }).then(r => { if (r.ok) cache.put(e.request, r.clone()); return r; });
    if (!cached) return net;
    const timeout = new Promise(res => setTimeout(() => res(cached), 3000));
    return Promise.race([net.catch(() => cached), timeout]);
  })());
});
