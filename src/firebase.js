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

export const requestNotificationPermission = async (api) => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const token = await getToken(messaging, {
      vapidKey: "BEnQ3_LMLjr2lWnpM09GORQ5YuGN0C6dHV6JRurIzRJUcG6viwif4-5FFGDU1nj-m2-S0CtJ2SNZ61n21EEfbDg",
    });

    if (token) {
      await api.post('/auth/fcm-token', { fcm_token: token });
      console.log('FCM token saved');
    }
  } catch (err) {
    console.error('Notification setup failed:', err);
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => resolve(payload));
  });
