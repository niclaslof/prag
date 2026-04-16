/// Service Worker for Walli Prag – aggressive offline caching.
///
/// Strategy:
///  - INSTALL: precache the app shell (/, icons, manifest)
///  - Place photos (/images/places/*): cache-first, permanent
///  - Next.js static assets (/_next/static/*): cache-first (immutable hashes)
///  - HTML navigations: network-first → fall back to cached /
///  - Everything else same-origin: stale-while-revalidate
///
/// The "Download for offline" button in the UI sends a
/// { type: "PRECACHE_IMAGES", urls: [...] } message to warm the photo cache.

const CACHE_NAME = "walliprag-v2";

const PRECACHE = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Listen for messages from the app (e.g. "download all images for offline")
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "PRECACHE_IMAGES") {
    const urls = event.data.urls || [];
    event.waitUntil(
      caches.open(CACHE_NAME).then(async (cache) => {
        for (const url of urls) {
          try {
            const existing = await cache.match(url);
            if (!existing) {
              await cache.add(url);
            }
          } catch {
            // Silently skip failed fetches
          }
        }
        // Notify all clients that prefetch is done
        const clients = await self.clients.matchAll();
        for (const client of clients) {
          client.postMessage({ type: "PRECACHE_DONE", count: urls.length });
        }
      })
    );
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) {
    // Cache Google Maps tiles for offline viewing
    // Tiles the user has already viewed get stored and served from cache
    if (
      url.hostname.includes("googleapis.com") &&
      (url.pathname.includes("/vt") ||
        url.pathname.includes("/kh") ||
        url.pathname.includes("/maps/") ||
        url.pathname.includes("/tile"))
    ) {
      event.respondWith(
        caches.match(request).then(
          (cached) =>
            cached ||
            fetch(request).then((res) => {
              if (res.ok) {
                const clone = res.clone();
                caches.open(CACHE_NAME).then((c) => c.put(request, clone));
              }
              return res;
            }).catch(() => cached || new Response("", { status: 503 }))
        )
      );
      return;
    }
    return;
  }

  // 1. Place photos – cache-first (big files, don't re-download)
  if (url.pathname.startsWith("/images/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(request, clone));
            }
            return res;
          })
      )
    );
    return;
  }

  // 2. Next.js immutable static assets – cache-first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(request, clone));
            }
            return res;
          })
      )
    );
    return;
  }

  // 3. Navigation (HTML pages) – network-first, fall back to cached /
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() =>
          caches.match(request).then((r) => r || caches.match("/"))
        )
        .then((r) => r || new Response("Offline – open the app while online first.", { status: 503 }))
    );
    return;
  }

  // 4. Everything else – stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fresh = fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(() => cached || new Response("", { status: 503 }));
      return cached || fresh;
    })
  );
});
