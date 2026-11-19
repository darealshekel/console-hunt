const CACHE = "console-hunt-7";
const FILES = [
  "./",
  "index.html",
  "play.html",
  "style.css",
  "src/main.js",
  "src/engine.js",
  "src/combat.js",
  "src/levels.js",
  "src/render.js",
  "src/audio.js",
  "src/hero-animation.js",
  "src/boss-animation.js",
  "assets/hero-animation.png",
  "assets/hero-punch.png",
  "assets/boss-animation.png",
  "assets/level-1-ad.png",
  "assets/icon.svg",
  "assets/rubik-hebrew.woff2",
  "assets/amatic-hebrew.woff2",
  "manifest.webmanifest",
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) =>
        c.addAll(FILES.map((file) => new Request(file, { cache: "reload" }))),
      )
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("console-hunt-") && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  event.respondWith(
    caches
      .match(event.request, { ignoreSearch: true })
      .then((cached) => cached || fetch(event.request)),
  );
});
