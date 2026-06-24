// Service worker per l'uso offline (app local-first).
// Strategia: network-first per le NAVIGAZIONI, con `cache: "reload"` per scavalcare
// la cache HTTP del browser → l'HTML servito è sempre l'ultimo deployato (e quindi
// punta agli ultimi bundle con hash). Cache-first solo per gli asset con hash (immutabili).
// All'attivazione di una nuova versione: ripulisce le cache vecchie e RICARICA le schede
// aperte, così l'app si aggiorna da sola senza svuotare cache a mano.
// IMPORTANTE: alzare CACHE a ogni cambio significativo del service worker.
const CACHE = "cruscotto-shell-v3";
const SHELL = ["./", "./manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      // Ricarica le finestre aperte sull'ultima versione (preserva i dati in localStorage).
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((clients) => clients.forEach((c) => { try { c.navigate(c.url); } catch { /* ignora */ } }))
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // lascia passare il cross-origin

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req, { cache: "reload" })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match("./")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});
