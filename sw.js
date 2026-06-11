/* ミソ帳 Service Worker
   方針: network-first。
   - HTMLや資産は毎回まずネットワークから取得 → 成功したらキャッシュを更新
   - オフライン時だけキャッシュから返す
   これにより「開き直すだけで最新版」になり、ホーム画面からの
   削除→再追加（＝localStorageが消える操作）は不要になる。

   更新時はこの CACHE_VERSION の数字だけ上げること。
   ファイル名 sw.js は変更しない。 */

const CACHE_VERSION = "misocho-v1";

self.addEventListener("install", (event) => {
  // 待機せず即座に新しいSWへ入れ替える
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 古いバージョンのキャッシュを掃除
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      );
      // 開いているページも即座に新SWの管理下に置く
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    (async () => {
      try {
        // まずネットワーク
        const response = await fetch(event.request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_VERSION);
          cache.put(event.request, response.clone());
        }
        return response;
      } catch (e) {
        // オフライン時はキャッシュから
        const cached = await caches.match(event.request);
        if (cached) return cached;
        throw e;
      }
    })()
  );
});
