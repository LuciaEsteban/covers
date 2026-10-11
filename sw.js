const CACHE = "covers-v22";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];

// La app se guarda para poder usarla sin conexión, pero index.html y sw.js se piden
// siempre saltándose la caché del navegador, para que las actualizaciones se vean al momento.
const fresh = u => new Request(u, { cache: "reload" });
const isShell = url => url.pathname.endsWith("/") || /\.(html|js|webmanifest)$/.test(url.pathname);

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(fresh))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Red primero para recibir actualizaciones; si no hay conexión, se usa la copia guardada.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const go = isShell(url) ? fetch(url.href, { cache: "reload", credentials: "same-origin" }) : fetch(req);
  e.respondWith(
    go.then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    })
    .catch(() => caches.match(req).then(r => r || caches.match("index.html")))
  );
});
