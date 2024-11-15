const { initializeApp, getApps } = require("firebase/app");
const { getFirestore } = require("firebase/firestore");
const admin = require('firebase-admin');
require('firebase/auth');

// Votre configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAYzP4T6vz7OoHdbQQIJqBL0YW7kREHe6s",
  authDomain: "moana-energy-crm.firebaseapp.com",
  projectId: "moana-energy-crm",
  storageBucket: "moana-energy-crm.firebasestorage.app",
  messagingSenderId: "360119980712",
  appId: "1:360119980712:web:dc283555d61f4bf32b289d",
  measurementId: "G-G7V6KLPZ3P"
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