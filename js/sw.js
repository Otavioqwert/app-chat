// sw.js - Service Worker para PWA
const CACHE_VERSION = 'v1';
const CACHE_NAME = `chat-app-${CACHE_VERSION}`;

// Arquivos a serem cacheados na instalação
const STATIC_ASSETS = [
    '/',
'/index.html',
'/js/app.js',
'/js/chat.js',
'/js/config.js',
'/js/models.js',
'/js/api.js',
'/js/notifications.js',
'/js/markdown.js',
'/js/pwa.js',
'/src/scss/style.scss',
'/manifest.json',
'https://cdn.jsdelivr.net/npm/marked/marked.min.js'
];

// Instalação: cache dos assets estáticos
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then((cache) => {
            console.log('[SW] Cacheando assets estáticos');
            return cache.addAll(STATIC_ASSETS);
        })
        .then(() => self.skipWaiting())
    );
});

// Ativação: limpar caches antigos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Removendo cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Interceptação de requisições: estratégia "stale-while-revalidate"
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Ignorar requisições para API (backend)
    if (url.pathname.startsWith('/api')) {
        return;
    }

    // Ignorar requisições para extensões e analytics
    if (url.hostname.includes('google') || url.hostname.includes('chrome')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
        .then((cachedResponse) => {
            // Se tiver no cache, retorna e atualiza em background
            const fetchPromise = fetch(event.request)
            .then((networkResponse) => {
                // Atualiza o cache com a resposta da rede
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // Se falhar, retorna o que tiver no cache (ou fallback)
                return cachedResponse;
            });

            // Se tiver cache, retorna ele imediatamente (stale)
            // e atualiza em segundo plano (revalidate)
            if (cachedResponse) {
                return cachedResponse;
            }

            // Se não tiver cache, espera a rede
            return fetchPromise;
        })
    );
});
