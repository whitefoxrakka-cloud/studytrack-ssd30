/* Service worker StudyTrack — cache sederhana, versi dinaikkan tiap rilis. */
const VERSI = "st-v1";
const ASET = [
  "./",
  "index.html",
  "assets/css/app.css",
  "assets/js/dataset.js",
  "assets/js/kmeans.js",
  "assets/js/grafik.js",
  "assets/js/app.js",
  "manifest.webmanifest",
  "assets/ikon.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSI).then((c) => c.addAll(ASET)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((kunci) => Promise.all(kunci.filter((k) => k !== VERSI).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) {
        /* perbarui diam-diam */
        fetch(req).then((res) => res.ok && caches.open(VERSI).then((c) => c.put(req, res.clone()))).catch(() => {});
        return hit;
      }
      return fetch(req)
        .then((res) => {
          if (res.ok) caches.open(VERSI).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => caches.match("index.html"));
    })
  );
});
