// Service Worker za BakovicApp PWA

const CACHE_NAME = 'bakovicapp-v1';
const RUNTIME_CACHE = 'bakovicapp-runtime-v1';

// Lista verzije aplikacije - trebam ažurirati ovo sa svakim deploymentom
const APP_VERSION = '1.0.0';

// Datoteke za cache pri instalaciji
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Instalacija
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker installed');
        self.skipWaiting(); // Odmah aktiviraj novi SW
      })
  );
});

// Aktivacija
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
            return null;
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Ne cache-iraj API zahtjeve
  if (url.pathname.includes('/wp-json/') || url.hostname !== location.hostname) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(event.request, cloned);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Za statičke assets - cache first
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        
        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }
            
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, cloned);
            });
            
            return response;
          })
          .catch(() => {
            // Fallback - ako offline i nema u cache-u
            return new Response('Offline - nema dostupne stranice', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Poslušaj za poruke od klijenta
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
