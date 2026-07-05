// Service Worker für die BE-Berater PWA.
// Cacht die App-Shell, damit die App installierbar ist und offline startet.
// Analyse-Requests (POST /analyze) laufen immer live übers Netz.
const CACHE = "be-berater-v3";
const SHELL = [
  "/",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Nur GET cachen; POST /analyze immer direkt ans Netz.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    // Seite: erst Netz, bei Offline aus Cache.
    event.respondWith(
      fetch(request).catch(() => caches.match("/")),
    );
    return;
  }

  // Assets: erst Cache, sonst Netz (und nachladen).
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        }),
    ),
  );
});
