/* Respire 100% : cache pour fonctionner hors ligne.
   Quand tu modifies l'app, change le numéro de version ci-dessous (v1 -> v2). */
const CACHE = 'respire-100-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'chart.umd.js', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);

  // La page : réseau d'abord (pour recevoir les mises à jour), cache si hors ligne.
  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r).then(res => {
        if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put('index.html', cp)); }
        return res;
      }).catch(() => caches.match('index.html'))
    );
    return;
  }

  // Fichiers de l'app : cache d'abord.
  if (u.origin === location.origin) {
    e.respondWith(
      caches.match(r).then(m => m || fetch(r).then(res => {
        if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); }
        return res;
      }))
    );
    return;
  }

  // Polices Google : on garde une copie pour l'hors ligne.
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(CACHE).then(c => c.match(r).then(m => {
        const net = fetch(r).then(res => { c.put(r, res.clone()); return res; }).catch(() => m);
        return m || net;
      }))
    );
  }
});
