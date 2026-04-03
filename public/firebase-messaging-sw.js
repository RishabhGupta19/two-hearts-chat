importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCh16O9yRk67y2xkt-wMYqfbXgiZmgtOzQ",
  authDomain: "us-two-2cd86.firebaseapp.com",
  projectId: "us-two-2cd86",
  storageBucket: "us-two-2cd86.firebasestorage.app",
  messagingSenderId: "234836871171",
  appId: "1:234836871171:web:48d7864696f537fda2e636",
});

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

const messaging = firebase.messaging();
const recentNotificationKeys = new Map();

const makeDedupeKey = (payload, title, body) => {
  return (
    payload?.data?.message_id ||
    payload?.data?.notification_id ||
    payload?.data?.messageId ||
    payload?.messageId ||
    `${title || ''}::${body || ''}`
  );
};

const seenRecently = (key) => {
  if (!key) return false;
  const now = Date.now();
  const prev = recentNotificationKeys.get(key);
  if (prev && now - prev < 30000) return true;
  recentNotificationKeys.set(key, now);
  for (const [k, ts] of recentNotificationKeys.entries()) {
    if (now - ts > 120000) recentNotificationKeys.delete(k);
  }
  return false;
};

messaging.onBackgroundMessage(async (payload) => {
  // If browser auto-delivers a notification payload, do not render manually.
  if (payload?.notification) {
    return;
  }

  const title = payload.notification?.title || payload.data?.title || "New Message";
  const body = payload.notification?.body || payload.data?.body || "";
  const dedupeKey = makeDedupeKey(payload, title, body);
  if (seenRecently(dedupeKey)) {
    return;
  }

  const options = {
    body,
    icon: "/icon-192.png",
    tag: String(dedupeKey),
    renotify: false,
    data: {
      ...(payload.data || {}),
      url: payload.data?.url || '/#/chat',
    },
    badge: "/badge-72.png",
  };

  try {
    const existing = await self.registration.getNotifications({ tag: String(dedupeKey) });
    if (existing && existing.length) {
      existing.forEach((n) => n.close());
    }
  } catch (err) {
    console.warn('Error deduping existing notifications', err);
  }

  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/#/chat';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it and navigate.
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      // App not open: open a new window.
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});