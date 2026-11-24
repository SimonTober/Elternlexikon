/* Service Worker: hält die App offline verfügbar.
 * Bei jeder neuen Version von wissen.js oder der App VERSION hochzählen. */
var VERSION = "elternlexikon-v81";
var DATEIEN = ["./", "index.html", "styles.css?v=42", "fonts/fraunces-latin.woff2", "fonts/inter-latin.woff2", "app.js?v=53", "suche.js?v=24", "wissen.js", "folgen.js", "icon.svg", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "manifest.webmanifest", "impressum.html", "datenschutz.html"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(DATEIEN.map(function (u) { return new Request(u, { cache: "reload" }); })); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// Erst Netz (damit Updates ankommen), sonst Cache
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: "no-cache" }).then(function (res) {
      var kopie = res.clone();
      caches.open(VERSION).then(function (c) { c.put(e.request, kopie); });
      return res;
    }).catch(function () {
      return caches.match(e.request, { ignoreSearch: true }).then(function (r) { return r || caches.match("index.html"); });
    })
  );
});
