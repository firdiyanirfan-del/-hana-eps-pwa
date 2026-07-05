const CACHE = 'eps-hana-v3';

const PRECACHE = [
  './',
  './index.html',
  './style.css',
  './ubt-theme.css',
  './manifest.json',
  './data-beginner.js',
  './data-normal.js',
  './data-pro.js',
  './vocab-bank.js',
  './utils.js',
  './ai-chat.js',
  './mini-games.js',
  './dictation.js',
  './app.js',
  './story-mode.js',
  './quiz-engine.js',
  './analytics.js',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // External — network only
  if (url.hostname !== self.location.hostname) return;

  // index.html — network first (always fresh from server)
  if (url.pathname === '/' || url.pathname.endsWith('index.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Semua .js — network first (biar update langsung kena)
  if (url.pathname.endsWith('.js')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Other local assets — stale-while-revalidate
  // Return cached immediately, update cache in background for next load
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchAndUpdate = fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchAndUpdate;
    })
  );
});
