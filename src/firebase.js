import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyCh16O9yRk67y2xkt-wMYqfbXgiZmgtOzQ",
  authDomain: "us-two-2cd86.firebaseapp.com",
  projectId: "us-two-2cd86",
  storageBucket: "us-two-2cd86.firebasestorage.app",
  messagingSenderId: "234836871171",
  appId: "1:234836871171:web:48d7864696f537fda2e636",
  measurementId: "G-XFHP2Z4KKT"
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => resolve(payload));
  });

// Subscribe to foreground messages. Pass a callback that receives the payload.
export const subscribeToForegroundMessages = (cb) => {
  try {
    return onMessage(messaging, (payload) => cb(payload));
  } catch (err) {
    console.error('Failed to subscribe to foreground messages', err);
    return () => {};
  }
};
  export const requestNotificationPermission = async (api, userId = null) => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );

    await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey: "BEnQ3_LMLjr2lWnpM09GORQ5YuGN0C6dHV6JRurIzRJUcG6viwif4-5FFGDU1nj-m2-S0CtJ2SNZ61n21EEfbDg",
      serviceWorkerRegistration: registration,
    });

      console.log('FCM token retrieved (frontend):', token);
      console.log('Service worker registration used for token:', registration?.scope || registration);

    if (token) {
      console.log('Sending FCM token to backend:', token, 'userId:', userId);
      // Include user id in the payload when available so backend can
      // accurately associate the device token with the correct user.
      const payload = { fcm_token: token };
      if (userId) payload.user_id = userId;
      const resp = await api.post("/auth/fcm-token", payload);
      console.log('Backend response saving token:', resp?.data || resp);
      console.log("FCM token saved (server acknowledged)");
    }
  } catch (err) {
    console.error("Notification setup failed:", err);
  }
};
