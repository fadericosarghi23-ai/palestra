/* starfit+ — service worker: l'app funziona anche senza rete.
   Attivo solo su HTTPS (o localhost): su http://192.168... il browser non lo avvia. */
// La versione cambia da sola: node tools/sw-version.mjs (calcolata dai file dell'app). Prima del push viene controllata.
const VERSION = 'fit-190cc56ee9';
const SHELL = ['./', './index.html', './splash-1170x2532.png', './anim.js', './data.js', './videos.js', './timer.js', './food.js', './library.js', './account.js', './app.js', './progress.js', './body.js', './daily.js', './foodplus.js', './season.js', './news.js', './streak.js',
  './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];
const RUNTIME = 'fit-runtime-v1';
const SHELL_PATHS = new Set(SHELL.map(u => new URL(u, self.location).pathname));

self.addEventListener('install', e => {
  // cache: 'reload' = prende i file nuovi dal sito, non copie vecchie del browser
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
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
  // File dell'app: sempre dalla copia salvata sul telefono, senza riscaricarli a ogni apertura.
  // Una versione nuova arriva con un nuovo service worker (VERSION diversa), che scarica tutti i file insieme.
  if (url.origin === self.location.origin) {
    e.respondWith(caches.open(VERSION).then(c => c.match(req, { ignoreSearch: true }).then(hit => hit ||
      fetch(req).then(res => { if (res.ok && SHELL_PATHS.has(url.pathname)) c.put(req, res.clone()); return res; })
        .catch(() => caches.match('./index.html')))));
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

// Notifiche (promemoria di starfit+): arrivano anche sull'Apple Watch quando l'iPhone è bloccato
self.addEventListener('push', e => {
  let m = {};
  try { m = e.data ? e.data.json() : {}; } catch (err) { m = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(m.title || 'starfit+', {
    body: m.body || '', tag: m.tag || 'starfit', icon: './icon-192.png', badge: './icon-192.png', data: { url: m.url || '#oggi' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = new URL('./' + ((e.notification.data && e.notification.data.url) || '#oggi'), self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if (c.url.startsWith(self.registration.scope)) { c.navigate(target).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(target);
  }));
});
