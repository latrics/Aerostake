// Firebase Cloud Messaging & Web Push Service Worker for Aerostake
/* eslint-disable no-restricted-globals */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let notificationTitle = 'Aerostake Mission Alert';
  let notificationOptions = {
    body: 'You have a new update in Aerostake.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      url: '/',
    },
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      if (payload.notification) {
        notificationTitle = payload.notification.title || notificationTitle;
        notificationOptions.body = payload.notification.body || notificationOptions.body;
      }
      if (payload.data) {
        notificationOptions.data = payload.data;
      }
    } catch (e) {
      notificationOptions.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
