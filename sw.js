// 챙김 service worker — 앱 화면 캐시 + 푸시 알림
const CACHE = 'chaenggim-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/badge-96.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// 앱 화면은 네트워크 우선(항상 최신), 안 되면 캐시
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data.json(); } catch { d = { title: '챙김', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || '챙김', {
    body: d.body || '',
    tag: d.tag || 'chaenggim',
    renotify: true,
    requireInteraction: true,
    icon: './icons/icon-192.png',
    badge: './icons/badge-96.png',
    vibrate: [200, 100, 200, 100, 200],
    data: { url: d.url || './', taskId: d.taskId || null },
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const { url, taskId } = e.notification.data || {};
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if ('focus' in c) {
        await c.focus();
        if (taskId) c.postMessage({ type: 'open-task', id: taskId });
        return;
      }
    }
    return self.clients.openWindow(new URL(url || './', self.registration.scope).href);
  })());
});
