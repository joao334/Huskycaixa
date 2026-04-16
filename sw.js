const CACHE_NAME = 'husky-caixa-v9';
const APP_SHELL = [
  './',
  'index.html',
  'home.html',
  'vendas.html',
  'produtos.html',
  'estoque.html',
  'despesas.html',
  'clientes.html',
  'comprovantes.html',
  'relatorios.html',
  'configuracoes.html',
  'manifest.webmanifest',
  'css/style.css',
  'css/responsive.css',
  'css/husky-premium.css',
  'js/app.js',
  'js/auth.js',
  'js/config.js',
  'js/cloud-sync.js',
  'js/comprovantes.js',
  'js/vendas.js',
  'js/home.js',
  'js/produtos.js',
  'js/estoque.js',
  'js/despesas.js',
  'js/clientes.js',
  'js/relatorios.js',
  'js/env.js',
  'js/supabase-init.js',
  'js/husky-premium.js',
  'assets/img/logo-husky.png',
  'assets/img/avatar-user.png',
  'assets/img/pattern-husky.svg',
  'assets/img/icon-192.png',
  'assets/img/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => null)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        return response;
      });
    })
  );
});
