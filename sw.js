const CACHE = 'deen-daily-v1';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './azan.mp3'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// ---- Real push notifications (fire even if the app/tab is fully closed) ----
self.addEventListener('push', e => {
  let data = { title: 'Deen Daily', body: 'You have an update.' };
  try{ data = e.data.json(); }catch(err){}
  e.waitUntil(
    self.registration.showNotification(data.title || 'Deen Daily', {
      body: data.body || '',
      icon: './icon-192.png',
      badge: './icon-192.png',
      vibrate: [120, 60, 120]
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for(const client of windowClients){
        if('focus' in client) return client.focus();
      }
      if(clients.openWindow) return clients.openWindow('./');
    })
  );
});
