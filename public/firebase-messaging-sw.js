// importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
// importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

// firebase.initializeApp({
//   apiKey: "AIzaSyCh16O9yRk67y2xkt-wMYqfbXgiZmgtOzQ",
//   authDomain: "us-two-2cd86.firebaseapp.com",
//   projectId: "us-two-2cd86",
//   storageBucket: "us-two-2cd86.firebasestorage.app",
//   messagingSenderId: "234836871171",
//   appId: "1:234836871171:web:48d7864696f537fda2e636",
// });

// self.addEventListener('install', () => {
//   self.skipWaiting();
// });

// self.addEventListener('activate', (event) => {
//   event.waitUntil(clients.claim());
// });

// const messaging = firebase.messaging();
// const recentNotificationKeys = new Map();

// const makeDedupeKey = (payload, title, body) => {
//   return (
//     payload?.messageId ||
//     payload?.data?.message_id ||
//     payload?.data?.notification_id ||
//     payload?.data?.messageId ||
//     payload?.messageId ||
//     `${title || ''}::${body || ''}`
//   );
// };

// const seenRecently = (key) => {
//   if (!key) return false;
//   const now = Date.now();
//   const prev = recentNotificationKeys.get(key);
//   if (prev && now - prev < 30000) return true;
//   recentNotificationKeys.set(key, now);
//   for (const [k, ts] of recentNotificationKeys.entries()) {
//     if (now - ts > 120000) recentNotificationKeys.delete(k);
//   }
//   return false;
// };

// messaging.onBackgroundMessage(async (payload) => {

//   // If browser auto-delivers a notification payload, do not render manually.
//   if (payload?.notification) {
//     return;
//   }

//   const visibleClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
//   const hasVisibleClient = visibleClients.some((c) => c.visibilityState === 'visible');

//   if (hasVisibleClient) {
//     return;
//   }


//   const title = payload.notification?.title || payload.data?.title || "New Message";
//   const body = payload.notification?.body || payload.data?.body || "";
//   const dedupeKey = makeDedupeKey(payload, title, body);
//   if (seenRecently(dedupeKey)) {
//     return;
//   }

//   const options = {
//     body,
//     icon: "/icon-192.png",
//     tag: String(dedupeKey),
//     renotify: false,
//     data: {
//       ...(payload.data || {}),
//       url: payload.data?.url || '/#/chat',
//     },
//     badge: "/badge-72.png",
//   };

//   try {
//     const existing = await self.registration.getNotifications({ tag: String(dedupeKey) });
//     if (existing && existing.length) {
//       existing.forEach((n) => n.close());
//     }
//   } catch (err) {
//     console.warn('Error deduping existing notifications', err);
//   }

//   self.registration.showNotification(title, options);
// });

// // Ensure we display notifications when the browser emits a 'push' event directly.
// // Some FCM payloads arrive as raw push events and may contain a notification/data
// // structure that the compat layer doesn't auto-show in all cases.
// self.addEventListener('push', (event) => {
//   if (!event.data) return;

//   event.waitUntil((async () => {
//     let data = {};
//     try {
//       data = event.data.json();
//     } catch (e) {
//       try { data = { notification: { body: String(event.data) } }; } catch (_) { data = {}; }
//     }

//     // FCM payloads are handled by messaging.onBackgroundMessage.
//     // Handling them again here can produce duplicate notifications.
//     if (data?.from || data?.fcmMessageId || data?.messageId || data?.data?.notification_id || data?.data?.message_id) {
//       return;
//     }

//     // For notification payloads, browsers/FCM can auto-display system notifications.
//     // Showing another one manually here can cause duplicates.
//     if (data?.notification) return;

//     const notification = data.notification || {};
//     const payload = data.data || {};
//     const title = notification.title || payload.title || 'Solace';
//     const body = notification.body || payload.body || '';

//     const dedupeKey = makeDedupeKey({ data: payload, messageId: data?.messageId }, title, body);
//     if (seenRecently(dedupeKey)) return;

//     // If any app window is visible, foreground onMessage handler will show notification.
//     // Skip here to avoid duplicate notifications for the same message.
//     const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
//     const hasVisibleClient = clientList.some((client) => client.visibilityState === 'visible');
//     if (hasVisibleClient) return;

//     const options = {
//       body,
//       icon: '/icon-192.png',
//       badge: '/badge-72.png',
//       data: {
//         ...(payload || {}),
//         url: payload.url || '/#/chat',
//       },
//       tag: String(dedupeKey || 'solace-message'),
//       renotify: false,
//       vibrate: [200, 100, 200],
//     };

//     await self.registration.showNotification(title, options);
//   })());
// });

// self.addEventListener('notificationclick', (event) => {
//   event.notification.close();

//   const urlToOpen = event.notification.data?.url || '/#/chat';

//   event.waitUntil(
//     clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
//       // If app is already open, focus it and navigate.
//       for (const client of clientList) {
//         if (client.url.includes(self.location.origin) && 'focus' in client) {
//           client.focus();
//           client.navigate(urlToOpen);
//           return;
//         }
//       }
//       // App not open: open a new window.
//       if (clients.openWindow) {
//         return clients.openWindow(urlToOpen);
//       }
//     })
//   );
// });

//   // Suppress Chrome's automatic "This site has been updated in the background"
//   // toast by responding to a skipWaiting message sent from the page.
//   self.addEventListener('message', (event) => {
//     try {
//       if (!event || !event.data) return;
//       if (event.data === 'skipWaiting') {
//         self.skipWaiting();
//       }
//     } catch (err) {
//       // Guard against unexpected message payloads
//       console.warn('SW message handler error', err);
//     }
//   });



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

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

// Heartbeat flag for pages to signal they're active (more reliable on mobile PWAs)
let appIsActive = false;
let appActiveTimer = null;

self.addEventListener('message', (event) => {
  try {
    if (!event || !event.data) return;
    if (event.data === 'skipWaiting') {
      self.skipWaiting();
      return;
    }

    if (event.data?.type === 'APP_ACTIVE') {
      appIsActive = true;
      if (appActiveTimer) clearTimeout(appActiveTimer);
      // Auto-expire in case the page closes without sending APP_INACTIVE
      appActiveTimer = setTimeout(() => { appIsActive = false; }, 20000);
      return;
    }

    if (event.data?.type === 'APP_INACTIVE') {
      appIsActive = false;
      if (appActiveTimer) { clearTimeout(appActiveTimer); appActiveTimer = null; }
      return;
    }
  } catch (err) {
    console.warn('SW message handler error', err);
  }
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(async (payload) => {
  // Skip if browser auto-displays (has notification block)
  if (payload?.notification) return;

  // ✅ Use heartbeat flag — more reliable than clients.matchAll on mobile PWA
  if (appIsActive) return;

  // ✅ Fallback: also check clients.matchAll (sometimes works)
  try {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (allClients.length > 0) return;
  } catch (e) {
    // ignore matchAll errors
  }

  const title = payload.data?.title || 'New message 💬';
  const body = payload.data?.body || '';
  const tag = payload.data?.message_id
    || payload.data?.notification_id
    || payload.data?.messageId
    || `${title}::${body}`;

  // Close ALL existing notifications before showing — nuclear dedup
  const allNotifications = await self.registration.getNotifications();
  allNotifications.forEach((n) => n.close());

  await self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: String(tag),
    renotify: false,
    data: {
      url: payload.data?.url || '/#/chat',
      ...(payload.data || {}),
    },
  });
});

// ✅ Block push event entirely — onBackgroundMessage is the only display path
self.addEventListener('push', (event) => {
  event.waitUntil(Promise.resolve());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = event.notification.data?.url || '/#/chat';
  // Ensure we open an absolute URL so the SPA router mounts correctly.
  const url = new URL(rawUrl, self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});