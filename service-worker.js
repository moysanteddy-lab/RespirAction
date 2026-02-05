const CACHE_NAME = 'breathflow-v20';

// Service worker minimal - pas de cache pour éviter les problèmes
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Supprimer tous les anciens caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    })
  );
});

self.addEventListener('fetch', event => {
  // Toujours aller chercher sur le réseau, pas de cache
  event.respondWith(fetch(event.request));
});
