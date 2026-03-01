// AJÚA BPM — Service Worker v1.0
// Estrategia: Cache-first para assets, Network-first para datos

const CACHE_NAME = 'ajua-bpm-v1';
const OFFLINE_URL = '/';

// Assets a cachear en instalación
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// ── Instalación: precachear assets críticos ──────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activación: limpiar caches viejos ────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Cache-first con fallback a red ─────────────────────────
self.addEventListener('fetch', event => {
  // Solo interceptar GET requests del mismo origen
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  // Firebase y gstatic — siempre desde red
  if (event.request.url.includes('firebase') ||
      event.request.url.includes('gstatic') ||
      event.request.url.includes('googleapis')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          // Cachear respuesta válida
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Sin red y sin cache — devolver index.html para navegación
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
        });
    })
  );
});

// ── Mensaje para forzar actualización ────────────────────────────
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
