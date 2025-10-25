// LecoSolar PWA Service Worker
const CACHE_NAME = "lecosolar-v1.0.1";

// Detect if we're on GitHub Pages
const isGitHubPages = location.hostname === 'san-cyclops.github.io';
const basePath = isGitHubPages ? '/lecosolar-pwa' : '';

const urlsToCache = [
  `${basePath}/`,
  `${basePath}/index.html`,
  `${basePath}/styles.css`,
  `${basePath}/app.js`,
  `${basePath}/manifest.json`,
  `${basePath}/icons/icon-72x72.png`,
  `${basePath}/icons/icon-96x96.png`,
  `${basePath}/icons/icon-128x128.png`,
  `${basePath}/icons/icon-144x144.png`,
  `${basePath}/icons/icon-152x152.png`,
  `${basePath}/icons/icon-192x192.png`,
  `${basePath}/icons/icon-384x384.png`,
  `${basePath}/icons/icon-512x512.png`,
  `${basePath}/icons/leco-logo.png`,
  `${basePath}/icons/favicon-16x16.png`,
  `${basePath}/icons/favicon-32x32.png`,
];

// Install event - cache resources
self.addEventListener("install", (event) => {
  console.log("Service Worker: Install event");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: Caching app shell");
        return cache.addAll(
          urlsToCache.map((url) => {
            return new Request(url, { cache: "reload" });
          })
        );
      })
      .catch((error) => {
        console.log("Service Worker: Cache failed", error);
      })
  );

  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activate event");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Service Worker: Deleting old cache", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // Ensure the service worker takes control immediately
  self.clients.claim();
});

// Fetch event - serve cached content when offline
self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Handle API requests differently
  if (event.request.url.includes("solar.leco.lk")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If we got a valid response, clone it and store in cache
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try to get from cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return a fallback response for API failures
            return new Response(
              JSON.stringify({
                error: "Network unavailable",
                message: "Please check your internet connection and try again.",
                cached: true,
              }),
              {
                headers: {
                  "Content-Type": "application/json",
                },
                status: 503,
              }
            );
          });
        })
    );
    return;
  }

  // Handle regular requests with cache-first strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached version if available
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise fetch from network
      return fetch(event.request)
        .then((response) => {
          // Don't cache if not a valid response
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Add to cache
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Network failed, return fallback for HTML pages
          if (event.request.headers.get("accept").includes("text/html")) {
            return caches.match("/index.html");
          }

          // For other resources, return a generic error
          return new Response("Resource not available offline", {
            status: 503,
            statusText: "Service Unavailable",
          });
        });
    })
  );
});

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  if (event.tag === "background-status-sync") {
    event.waitUntil(
      // Perform background status sync when network is available
      syncOfflineActions()
    );
  }
});

// Push notification handling
self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "New update from LecoSolar",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: "explore",
        title: "View Details",
        icon: "/icons/icon-72x72.png",
      },
      {
        action: "close",
        title: "Close",
        icon: "/icons/icon-72x72.png",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification("LecoSolar", options));
});

// Notification click handling
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "explore") {
    // Open or focus the app
    event.waitUntil(
      clients.matchAll().then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow("/");
      })
    );
  }
});

// Handle offline status sync
async function syncOfflineActions() {
  try {
    // Check if there are any offline actions to sync
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();

    // Filter for pending actions
    const offlineActions = requests.filter((request) =>
      request.url.includes("offline-action")
    );

    // Process offline actions
    for (const action of offlineActions) {
      try {
        // Attempt to replay the action
        await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body,
        });

        // Remove from cache if successful
        await cache.delete(action);
      } catch (error) {
        console.log("Failed to sync offline action:", error);
      }
    }

    console.log("Background sync completed");
  } catch (error) {
    console.error("Background sync failed:", error);
  }
}

// Periodic background sync (if supported)
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "status-update") {
    event.waitUntil(
      // Fetch latest status updates
      fetchStatusUpdates()
    );
  }
});

async function fetchStatusUpdates() {
  try {
    // This would normally fetch from the LECO API
    console.log("Performing periodic status update check");

    // Update cache with latest data if available
    const response = await fetch("/api/status");
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put("/api/status", response);
    }
  } catch (error) {
    console.log("Periodic sync failed:", error);
  }
}

// Message handling for communication with main thread
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        console.log("Cache cleared by user request");
      })
    );
  }
});

console.log("LecoSolar Service Worker loaded successfully");
