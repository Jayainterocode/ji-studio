// Service worker JI Studio: cache-first untuk aset sendiri, tidak menyimpan apa pun dari luar.
// VERSION dan ASSETS ditulis ulang otomatis oleh tools/release.py. Jangan edit manual.
const VERSION = 'b4ff3abbf4';
const ASSETS = ['./core/account.js', './core/app.css', './core/auth.js', './core/boot.js', './core/device.js', './core/export.js', './core/install.js', './core/modules.js', './core/mux.js', './core/save.js', './core/shell.js', './core/store.js', './fonts/montserrat.woff2', './img/icon-180.png', './img/icon-192.png', './img/icon-512.png', './img/icon-maskable-512.png', './', './index.html', './login.html', './m/story/', './m/story/index.html', './m/story/overlay.js', './m/story/story.js', './m/users/', './m/users/index.html', './m/users/users.js', './manifest.webmanifest', './reset.html', './setup.html'];
const CACHE = 'ji-' + VERSION;
const SCOPE = new URL('./', self.location).href;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(a => new Request(a, { cache: 'reload' })))));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('ji-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(SCOPE)) return; // blob: dan domain lain: lewat
  if (req.url.startsWith(SCOPE + 'api/')) return;                   // data server: selalu ke jaringan, tidak pernah di-cache
  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true, cacheName: CACHE });
    if (hit) return hit;
    try { return await fetch(req); }
    catch (err) {
      if (req.mode === 'navigate') {
        const home = await caches.match('./', { cacheName: CACHE });
        if (home) return home;
      }
      throw err;
    }
  })());
});
