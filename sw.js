const CACHE = 'eps-hana-v2';

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

  // Groq API — network only
  if (url.hostname === 'api.groq.com') return;

  // FormSubmit — network only
  if (url.hostname === 'formsubmit.co') return;

  // CDN assets — network first, fallback cache
  if (url.hostname.includes('cdn.') || url.hostname.includes('unpkg.com') || url.hostname.includes('fonts.') || url.hostname === 'illustrations.popsy.co') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Local assets — cache first, network fallback + update cache
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
