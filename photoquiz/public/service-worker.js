/* eslint-disable no-restricted-globals */
/**
 * Service Worker — fully offline PWA cache.
 * No external resources. Everything is pre-cached on install.
 */

const CACHE_NAME    = 'photoquiz-offline-v1';
const RUNTIME_CACHE = 'photoquiz-runtime-v1';

const PRECACHE_URLS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  const keep = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys()
      .then(names => names.filter(n => !keep.includes(n)))
      .then(toDelete => Promise.all(toDelete.map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  // Static assets: cache-first
  if (event.request.url.includes('/static/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return caches.open(RUNTIME_CACHE).then(cache =>
          fetch(event.request).then(resp => {
            cache.put(event.request, resp.clone());
            return resp;
          })
        );
      })
    );
    return;
  }

  // Navigation: network-first, fallback to shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }
});
