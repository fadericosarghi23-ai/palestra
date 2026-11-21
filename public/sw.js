/* starfit+ — service worker: l'app funziona anche senza rete.
   Attivo solo su HTTPS (o localhost): su http://192.168... il browser non lo avvia. */
const VERSION = 'fit-v7';
const SHELL = ['./', './index.html', './splash-1170x2532.png', './anim.js', './data.js', './videos.js', './timer.js', './food.js', './account.js', './app.js',
  './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];
const RUNTIME = 'fit-runtime-v1';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== RUNTIME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Gli account (/api) vanno sempre in rete e non vengono mai salvati in cache
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return;
  // File dell'app: prima la rete (così vedi subito gli aggiornamenti), se manca la rete la copia salvata
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
    return;
  }
  // Font e anteprime dei video: copia salvata subito, aggiornata in background
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) || url.hostname === 'i.ytimg.com') {
    e.respondWith(caches.open(RUNTIME).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
  // I video YouTube restano sempre online
});
