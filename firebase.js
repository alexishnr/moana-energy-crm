const { initializeApp, getApps } = require("firebase/app");
const { getFirestore } = require("firebase/firestore");
const admin = require('firebase-admin');
require('firebase/auth');

// Votre configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAzM4hveUxF80ecMQQNYfuxIEsgRDiUWLs",
  authDomain: "moanaenergy-crm-363ec.firebaseapp.com",
  projectId: "moanaenergy-crm-363ec",
  storageBucket: "moanaenergy-crm-363ec.firebasestorage.app",
  messagingSenderId: "317633318260",
  appId: "1:317633318260:web:0cf56b51e19827a0b8b021",
  measurementId: "G-7HZ6CVYES3"
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