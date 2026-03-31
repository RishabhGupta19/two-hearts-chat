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

const messaging = firebase.messaging();
messaging.onBackgroundMessage(async (payload) => {
  console.log("Background message:", payload);
  const title = payload.notification?.title || payload.data?.title || "New Message";
  const body = payload.notification?.body || payload.data?.body || "";
  const messageId = payload?.data?.message_id || payload?.data?.messageId || payload?.messageId || Date.now().toString();

  const options = {
    body,
    icon: "/icon-192.png",
    tag: messageId,
    renotify: false,
    // badge can be provided for platforms that support it
    badge: "/badge-72.png",
  };

  // Close any existing notifications with the same tag before showing
  try {
    const existing = await self.registration.getNotifications({ tag: messageId });
    if (existing && existing.length) {
      console.log(`Closing ${existing.length} existing notification(s) with tag ${messageId}`);
      existing.forEach((n) => n.close());
    }
  } catch (err) {
    console.warn('Error checking existing notifications for dedupe', err);
  }

  self.registration.showNotification(title, options);
});