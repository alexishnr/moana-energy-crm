const express = require('express');
const router = express.Router();
const { getFirestore } = require('firebase-admin/firestore');
const { initializeApp, getApps } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const firebaseConfig = require('../firebase'); // Assurez-vous que le fichier de configuration Firebase est correctement importé
const admin = require('firebase-admin');
const { isAuthenticated, isSuperUser } = require('../middleware/auth');

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
      if (userDoc.exists && userDoc.data().isSuperUser) {
        req.session.isSuperUser = true;
        req.session.userEmail = user.email;
      } else {
        req.session.isSuperUser = false;
        req.session.userEmail = user.email;
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

// Route pour afficher le formulaire d'ajout d'utilisateur
router.get('/add-user', isAuthenticated, isSuperUser, (req, res) => {
  res.render('add-user', { title: 'Ajouter un utilisateur', success: req.query.success });
});

// Route pour ajouter un utilisateur
router.post('/add-user', isAuthenticated, isSuperUser, async (req, res) => {
  const { nom, prenom, email, expirationDate, isSuperUser } = req.body;
  try {
    // Créer un nouvel utilisateur Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: email,
      emailVerified: false,
      password: 'defaultPassword123', // Vous pouvez générer un mot de passe aléatoire ou demander à l'utilisateur de le définir
      displayName: `${prenom} ${nom}`,
      disabled: false
    });

    // Ajouter l'utilisateur à Firestore
    const userData = {
      nom,
      prenom,
      email,
      expirationDate,
      isSuperUser: isSuperUser === 'true',
      createdAt: new Date().toISOString()
    };

    await db.collection('users').doc(userRecord.uid).set(userData);
    if (isSuperUser === 'true') {
      await db.collection('super-users').doc(email).set(userData);
    }
    res.redirect('/add-user?success=true');
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'utilisateur:', error);
    res.redirect('/add-user?success=false');
  }
});

// Déconnexion
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
});

module.exports = router;
