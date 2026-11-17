/* Dziennik Minerva - service worker: powiadomienia push + zapasowa kopia strony */
const CACHE = 'minerva-v2';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('minerva-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => clients.claim())
));

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || r.mode !== 'navigate') return;
  e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(CACHE).then(ca => ca.put(r, c)); return res; })
    .catch(() => caches.match(r).then(m => m || caches.match('./'))));
});

const bget = async () => { const r = await (await caches.open('badge')).match('n'); return r ? +(await r.text()) || 0 : 0; };
const bset = async n => {
  await (await caches.open('badge')).put('n', new Response(String(n)));
  try { n > 0 ? await self.navigator.setAppBadge(n) : await self.navigator.clearAppBadge(); } catch (e) {}
};
self.addEventListener('message', e => { if (e.data && e.data.type === 'badge') e.waitUntil(bset(+e.data.n || 0)); });

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data.json(); } catch { d = { body: e.data ? e.data.text() : '' }; }

  const title = d.title || 'Dziennik Minerva';
  const full = {
    body: d.body || '',
    icon: 'icons/icon-192.png',
    badge: 'icons/badge-96.png',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    lang: 'pl',
    data: { url: d.url || './' }
  };

  // Powiadomienie ma pierwszeństwo. Gdyby urządzenie odrzuciło opcje (badge/renotify/tag),
  // pokazujemy wersję minimalną, żeby powiadomienie na pewno doszło.
  const show = self.registration.showNotification(title, full).catch(err => {
    console.error('showNotification failed, retry minimal', err);
    return self.registration.showNotification(title, { body: full.body, data: full.data });
  }).catch(err => console.error('showNotification minimal failed', err));

  // Licznik na ikonie nie może zablokować ani zepsuć powiadomienia.
  const badge = bget().then(n => bset(n + 1)).catch(() => {});

  e.waitUntil(Promise.all([show, badge]));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if (c.url.startsWith(self.registration.scope)) { c.focus(); return 'navigate' in c ? c.navigate(url) : undefined; }
    return clients.openWindow(url);
  }));
});
