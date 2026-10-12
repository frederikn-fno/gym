'use strict';
/* Service worker: cacher appen, så den virker offline/på dårligt signal
   (omklædningsrum, bane).
   - Egne sider, CSS og JS: netværk først med 3 sek. timeout, ellers cache. Du får
     altid nyeste version, når der er forbindelse, men appen hænger ikke på dårligt signal.
   - Skrifttyper og ikoner: cache først (ændrer sig aldrig).
   - Eksterne requests går direkte til netværket.
   Bump CACHE-versionen, når filer tilføjes/omdøbes. */
const CACHE = 'gk8-v7';
const FONTS = ['Barlow-400', 'Barlow-500', 'Barlow-600', 'Barlow-700', 'BarlowCondensed-600', 'BarlowCondensed-700', 'BarlowCondensed-800'].map(f => `./fonts/${f}.woff2`);
const ASSETS = [
  './', './index.html', './app.css', './app.js', './manifest.webmanifest',
  './icon.svg', './icon-152.png', './icon-167.png', './icon-180.png', './icon-192.png', './icon-512.png', './icon-maskable-512.png',
  ...FONTS
];
const NETWORK_TIMEOUT = 3000;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function fromNetwork(req) {
  return fetch(req).then(res => {
    if (res && res.ok) {
      const copy = res.clone(); // klones synkront, før body'en bruges
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => { });
    }
    return res;
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const isStatic = /\.(woff2|png|svg)$/.test(url.pathname);
  if (isStatic) {
    e.respondWith(caches.match(req).then(hit => hit || fromNetwork(req)));
    return;
  }

  e.respondWith((async () => {
    const cached = () => caches.match(req, { ignoreSearch: true });
    try {
      return await Promise.race([
        fromNetwork(req),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), NETWORK_TIMEOUT))
      ]);
    } catch (err) {
      const hit = await cached();
      if (hit) return hit;
      if (req.mode === 'navigate') { const idx = await caches.match('./index.html'); if (idx) return idx; }
      return fetch(req);
    }
  })());
});
