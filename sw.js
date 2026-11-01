/* HabitFlow service worker
 * - Pages (index.html) are NETWORK-FIRST: a new upload reaches everyone on their next open,
 *   and the cached copy is only used when offline.
 * - Static files / CDN libraries are served from cache and refreshed in the background.
 * - Firebase API traffic (login, Firestore) is never touched.
 * Paths are relative, so this works on /habitflow/ or on a custom domain without edits.
 */
const CACHE = 'habitflow-v4';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './logo-mark.png', './logo-mark-white.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.allSettled(SHELL.map(url => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isFirebaseApi(url) {
  const h = url.hostname;
  return (h.endsWith('googleapis.com') && h !== 'fonts.googleapis.com') ||
         h.endsWith('firebaseapp.com') || h.endsWith('firebaseio.com');
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!url.protocol.startsWith('http') || isFirebaseApi(url)) return;   // let the browser handle it

  // App page: network first, fall back to cache when offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req.url, { cache: 'no-cache' })
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
          return res;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Everything else: cache first, refresh in background (stale-while-revalidate)
  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
