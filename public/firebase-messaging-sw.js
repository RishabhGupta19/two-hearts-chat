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
messaging.onBackgroundMessage((payload) => {
  console.log("Background message:", payload);

  const title =
    payload.notification?.title || payload.data?.title || "New Message";

  const body =
    payload.notification?.body || payload.data?.body || "";

  self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
  });
});