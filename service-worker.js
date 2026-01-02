/* service-worker.js */
const CACHE_NAME = "time-logger-v2";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./index.css",
  "./manifest.json",
  "./img/icon-192.png",
  "./img/icon-512.png",
  "./img/icon-512-maskable.png"
];


// インストール：最低限をキャッシュ
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    for (const url of CORE_ASSETS) {
      try {
        await cache.add(url);
      } catch (e) {
        console.error("[SW] Failed to cache:", url, e);
        // ここで止めたくないなら continue（ただしオフライン耐性は落ちる）
        throw e;
      }
    }
  })());

  self.skipWaiting();
});


// アクティベート：古いキャッシュ掃除
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key === CACHE_NAME ? null : caches.delete(key))))
    )
  );
  self.clients.claim();
});

// フェッチ：基本は “ネット優先” + 失敗したらキャッシュ
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // GET 以外は触らない（安全）
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 同一オリジンだけ扱う（CDN等は無視）
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        // 成功したレスポンスはキャッシュ更新
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("./")))
  );
});
