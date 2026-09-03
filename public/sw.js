const CACHE_NAME = 'cosmora-shell-v10-2';
const APP_SHELL = [
  '/',
  '/explore',
  '/marketplace',
  '/marketplace/raiden-shogun-cosplay',
  '/events',
  '/events/lucca-comics-2026',
  '/community',
  '/sell',
  '/seller',
  '/inbox',
  '/inbox/ana-spain',
  '/inbox/lucas-brazil',
  '/inbox/yuki-japan',
  '/inbox/mangavault',
  '/profile/stardust-atelier',
  '/cart',
  '/rental-safety',
  '/cosmora-hero-mobile.jpg',
  '/mobile-category-cosplay.jpg',
  '/mobile-category-manga.jpg',
  '/mobile-category-figures.jpg',
  '/mobile-category-cards.jpg',
  '/mobile-category-gaming.jpg',
  '/mobile-category-artist.jpg',
  '/reference-events-mobile.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(url.pathname).then((cached) => {
        const refresh = fetch(request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(url.pathname, response.clone()));
          }
          return response;
        });
        return cached || refresh;
      }),
    );
    return;
  }

  if (['image', 'font', 'style', 'script'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
            }
            return response;
          }),
      ),
    );
  }
});
