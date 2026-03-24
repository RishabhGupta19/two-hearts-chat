import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyDvc_-aH6XEUuoU-HtXUX_IU1-i5MMgwl4",
  authDomain: "us-two-2cd86.firebaseapp.com",
  projectId: "us-two-2cd86",
  storageBucket: "us-two-2cd86.firebasestorage.app",
  messagingSenderId: "234836871171",
  appId: "1:234836871171:web:48d7864696f537fda2e636",
  measurementId: "G-XFHP2Z4KKT",
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

export const requestNotificationPermission = async (api) => {
  try {
    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    if (permission !== 'granted') return null;

    // Ensure the service worker is registered and ready before requesting a token
    let registration = null;
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        registration = await navigator.serviceWorker.ready;
        console.log('Service worker ready for FCM:', registration);
      } catch (swErr) {
        console.warn('Service worker registration/ready failed:', swErr);
      }
    }

    let token = null;
    try {
      const options = {
        vapidKey: "BEnQ3_LMLjr2lWnpM09GORQ5YuGN0C6dHV6JRurIzRJUcG6viwif4-5FFGDU1nj-m2-S0CtJ2SNZ61n21EEfbDg",
      };
      if (registration) options.serviceWorkerRegistration = registration;
      token = await getToken(messaging, options);
    } catch (getErr) {
      console.error('getToken error:', getErr);
    }

    console.log('FCM token value:', token);
    if (token) {
      await api.post('/auth/fcm-token', { fcm_token: token });
      console.log('FCM token saved');
    } else {
      console.error('FCM token is empty — verify Firebase config, VAPID key, and browser console for errors.');
    }
    return token;
  } catch (err) {
    console.error('Notification setup failed:', err);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => resolve(payload));
  });
