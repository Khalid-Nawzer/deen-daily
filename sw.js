const CACHE = 'deen-daily-v1';
const AUDIO_CACHE = 'deen-daily-audio-v1';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './azan.mp3'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  self.clients.claim();
});

function isRecitationAudio(url){
  return url.hostname.includes('cdn.islamic.network') || /\.(mp3)$/i.test(url.pathname);
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Quran recitation audio: cache-first, and save a copy the first time it's
  // played online so it works offline (no data cost) on every replay after.
  if(isRecitationAudio(url) && !url.pathname.endsWith('azan.mp3')){
    e.respondWith(
      caches.open(AUDIO_CACHE).then(async (cache) => {
        const cached = await cache.match(e.request);
        if(cached) return cached;
        try{
          const res = await fetch(e.request);
          if(res.ok) cache.put(e.request, res.clone());
          return res;
        }catch(err){
          return cached || Response.error();
        }
      })
    );
    return;
  }

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
