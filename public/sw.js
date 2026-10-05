// Deliberately cache only a generic offline page, never the shop or customer data.
const CACHE_PREFIX = 'likedzy-pwa-';
const CACHE_NAME = `${CACHE_PREFIX}offline-v1`;
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  // Auth redirects, APIs, assets and all writes keep their normal network behavior.
  if (request.method !== 'GET' || request.mode !== 'navigate' || url.origin !== self.location.origin || url.pathname.startsWith('/__/')) return;
  event.respondWith((async () => {
    try {
      return await fetch(request, { cache: 'no-store' });
    } catch {
      return (await caches.match(OFFLINE_URL, { cacheName: CACHE_NAME }))
        || new Response('Internet connection required. Please reconnect and reload.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});
