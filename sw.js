// Service Worker CPF IA — cache + notifications
const CACHE = 'cpf-ia-v1';
const ASSETS = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return k!==CACHE}).map(function(k){return caches.delete(k)}));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  // Network first pour les appels Apps Script, cache first pour le reste
  if(e.request.url.includes('script.google.com')) {
    e.respondWith(fetch(e.request).catch(function(){ return new Response('{}'); }));
  } else {
    e.respondWith(caches.match(e.request).then(function(r){ return r || fetch(e.request); }));
  }
});

// Réception des notifications push
self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data.json(); } catch(err) { data = {title:'CPF IA', body:e.data ? e.data.text() : 'Nouvelle mise à jour'}; }
  e.waitUntil(
    self.registration.showNotification(data.title || 'CPF IA', {
      body: data.body || 'Tu as une nouvelle information',
      icon: './icon-192.png',
      badge: './icon-192.png',
      vibrate: [100, 50, 100]
    })
  );
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(clients.openWindow('./index.html'));
});
