// public/sw.js
// Service Worker for ResQSampark — caches app routes, static assets, and Next.js JS chunks
// so full page navigations work even when network sockets are completely offline.

const CACHE_NAME = "sahaylink-cache-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Only intercept GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Ignore non-http/https schemes (e.g. chrome-extension://, ws://)
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // DO NOT cache API requests — apiOrQueue.ts and sync.ts handle API offline queueing
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache successful page/chunk responses on the fly
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // If network fails (or DevTools Offline is active), serve from cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // Fallback for HTML navigations to main page if specific path isn't cached
        if (event.request.mode === "navigate") {
          const fallback = await caches.match("/incidents");
          if (fallback) return fallback;
        }

        return new Response("Offline page asset not in cache", {
          status: 503,
          statusText: "Service Unavailable",
        });
      })
  );
});
