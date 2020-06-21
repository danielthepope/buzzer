const OFFLINE_URL = '/offline.html';

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open('buzz')
            .then(function (cache) {
                return cache.addAll([
                    OFFLINE_URL,
                    '/style.css',
                    '/buzzer.mp3',
                    '/favicon.ico'
                ]);
            })
            .then(self.skipWaiting())
    );
});

self.addEventListener('fetch', function (event) {
    if (event.request.mode === 'navigate' || event.request.method === 'GET') {
        if (event.request.headers.get('accept').includes('text/html')) {
            event.respondWith(
                fetch(event.request).catch(function (error) {
                    return caches.match(OFFLINE_URL);
                })
            );
        } else {
            event.respondWith(
                fetch(event.request).catch(function (error) {
                    return caches.match(event.request);
                })
            );
        }
    }
});
