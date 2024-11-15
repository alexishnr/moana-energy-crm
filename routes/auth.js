const express = require('express');
const router = express.Router();
const { getFirestore } = require('firebase-admin/firestore');
const { initializeApp, getApps } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const firebaseConfig = require('../firebase'); // Assurez-vous que le fichier de configuration Firebase est correctement importé

// Initialiser Firebase
let firebaseApp;
if (!getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApps()[0];
}
const db = getFirestore(); // Initialiser Firestore

// Middleware pour ajouter les variables de session aux vues
router.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// Page de connexion
router.get('/login', (req, res) => {
  res.render('login', { title: 'Connexion' });
});

// Connexion
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const auth = getAuth(firebaseApp);

  signInWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => {
      
      // Signed in
      var user = userCredential.user;
      req.session.userId = user.uid;

      const userDoc = await db.collection('super-users').doc(user.email).get();
      if (userDoc.exists && userDoc.data().superUser) {
        req.session.isSuperUser = true;
        req.session.userEmail = user.email;
      } else {
        req.session.isSuperUser = false;
      }
      res.redirect('/');
    })
    .catch((error) => {
      var errorCode = error.code;
      var errorMessage = error.message;
      console.error('Erreur lors de la connexion de l\'utilisateur:', errorMessage);
      res.render('login', { title: 'Connexion', error: errorMessage });
    });
});

// Déconnexion
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
});

module.exports = router;
