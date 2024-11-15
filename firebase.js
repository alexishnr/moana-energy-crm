const { initializeApp, getApps } = require("firebase/app");
const { getFirestore } = require("firebase/firestore");
const admin = require('firebase-admin');
require('firebase/auth');

// Votre configuration Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};


// Initialiser Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}
const db = getFirestore(app);

// Initialiser Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// Initialiser Firebase Analytics uniquement si l'environnement le supporte
let analytics;
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const { getAnalytics, isSupported } = require("firebase/analytics");
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

module.exports = { db, analytics, admin };