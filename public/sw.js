const CACHE_NAME = 'lingua-v1.0';

const NETWORK_FIRST = ['/', '/index.html', '/app.js', '/styles.css', '/manifest.json', '/sw.js'];
const CACHE_FIRST = ['/icon-192.png', '/icon-512.png'];
const NEVER_CACHE = ['/api/chat'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll([...NETWORK_FIRST, ...CACHE_FIRST])
    )
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  if (NEVER_CACHE.some(p => url.pathname.startsWith(p))) return;

  if (CACHE_FIRST.some(p => url.pathname === p)) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      }))
    );
    return;
  }

  e.respondWith(
    fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      return res;
    }).catch(() => caches.match(e.request))
  );
});
