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

// Middleware pour ajouter les variables de session et le nombre de clients en attente aux vues
router.use(async (req, res, next) => {
  res.locals.session = req.session;
  res.locals.pendingClientsCount = 0; // Initialiser la variable
  if (req.session.isSuperUser) {
    try {
      const pendingClientsSnapshot = await db.collection('clients').where('status', '==', 'en attente').get();
      res.locals.pendingClientsCount = pendingClientsSnapshot.size;
    } catch (error) {
      console.error('Erreur lors de la récupération des clients en attente:', error);
    }
  }
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
      req.session.userEmail = user.email;
      req.session.userDisplayName = user.displayName;
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (userDoc.exists && userDoc.data().isSuperUser === true) {
        req.session.isSuperUser = true;
        req.session.userPhone = userDoc.data().telephone;
      } else {
        req.session.isSuperUser = false;
        req.session.userPhone = userDoc.data().telephone;
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
  const success = req.query.success;

  res.render('add-user', {success, pendingClientsCount: res.locals.pendingClientsCount });
});

// Route pour ajouter un utilisateur
router.post('/add-user', isAuthenticated, isSuperUser, async (req, res) => {
  const { nom, prenom, email, expirationDate, isSuperUser, telephone } = req.body;

  let userRecord = null; // Déclare userRecord dans un contexte global à la fonction

  try {
    // Créer un nouvel utilisateur Firebase Authentication
    userRecord = await admin.auth().createUser({
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
      telephone,
      expirationDate,
      isSuperUser: isSuperUser === 'true',
      createdAt: new Date().toISOString()
    };

    await db.collection('users').doc(userRecord.uid).set(userData);

    res.render('add-user', { success: true, pendingClientsCount: res.locals.pendingClientsCount, message: null });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'utilisateur:', error);

    // Si userRecord existe, supprime l'utilisateur créé dans Firebase Authentication
    if (userRecord) {
      try {
        await admin.auth().deleteUser(userRecord.uid);
        console.log(`Utilisateur ${userRecord.uid} supprimé après échec.`);
      } catch (deleteError) {
        console.error(`Erreur lors de la suppression de l'utilisateur ${userRecord.uid}:`, deleteError);
      }
    }

    res.render('add-user', { success: false, pendingClientsCount: res.locals.pendingClientsCount, message: error.message });
  }
});

// Déconnexion
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
});

module.exports = router;
