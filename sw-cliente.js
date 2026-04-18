const CACHE_NAME = 'husky-cliente-v1';
const APP_SHELL = [
  './',
  'app-cliente.html',
  'cliente-manifest.webmanifest',
  'css/app-cliente.css',
  'js/app-cliente.js',
  'js/env.js',
  'assets/img/logo-husky.png',
  'assets/img/mascote-3d.png',
  'assets/img/pattern-husky.svg',
  'assets/img/icon-192.png',
  'assets/img/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => null));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      const cloned = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
      return response;
    }))
  );
});
