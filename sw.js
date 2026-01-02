const CACHE_VERSION = 'entropy-cache-v1';
const CACHE_ASSETS = [
    './',
    './index.html',
    './style.css',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './js/actions.js',
    './js/buildings.js',
    './js/classes.js',
    './js/config.js',
    './js/dom.js',
    './js/effects.js',
    './js/game.js',
    './js/input.js',
    './js/items.js',
    './js/main.js',
    './js/render.js',
    './js/state.js',
    './js/tech.js',
    './js/ui.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => cache.addAll(CACHE_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') {
        return;
    }
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) {
        return;
    }
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) {
                return cached;
            }
            return fetch(request).then((response) => {
                const copy = response.clone();
                caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
                return response;
            });
        })
    );
});
