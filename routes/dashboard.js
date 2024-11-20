const express = require('express');
const router = express.Router();
const { isAuthenticated, isSuperUser } = require('../middleware/auth');
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();


// Middleware pour ajouter les variables de session et le nombre de clients en attente aux vues
router.use(async (req, res, next) => {
  res.locals.session = req.session;
  res.locals.pendingClientsCount = 0; // Initialiser la variable
  if (req.session.isSuperUser) {
    try {
      const pendingClientsSnapshot = await db.collection('clients').where('statutClient', '==', 'en attente').get();
      res.locals.pendingClientsCount = pendingClientsSnapshot.size;
    } catch (error) {
      console.error('Erreur lors de la récupération des clients en attente:', error);
    }
  }
  next();
});



router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    // Récupérer les statistiques du commercial
    const stats = {
        communication : await db.collection('communication').orderBy('createdAt', 'desc').limit(1).get().then(snapshot => snapshot.docs.map(doc => doc.data())),
        totalClients : await db.collection('clients').where('idCommercial', '==', userId).get().then(snapshot => snapshot.docs.map(doc => doc.data())),
        totalClientsValidated : await db.collection('clients').where('idCommercial', '==', userId).where('clientStatus', '==', 'validée').get().then(snapshot => snapshot.docs.map(doc => doc.data())),
        totalClientsSent : await db.collection('clients').where('idCommercial', '==', userId).where('clientStatus', '==', 'fiche transmise').get().then(snapshot => snapshot.docs.map(doc => doc.data())),
        totalClientsDone : await db.collection('clients').where('idCommercial', '==', userId).where('statutTravaux', '==', 'travaux complétés').get().then(snapshot => snapshot.docs.map(doc => doc.data())),
        appointments : await db.collection('clients').where('idCommercial', '==', userId).where('statutTravaux', '==', 'rendez-vous planifié').get().then(snapshot => snapshot.docs.map(doc => doc.data())),
        tasks : await db.collection('users').doc(userId).collection('tasks').get().then(snapshot => snapshot.docs.map(doc => doc.data()))
    };

    res.render('dashboard', { title: 'Mon Dashboard', userData, stats });
  } catch (error) {
    console.error('Erreur lors de la récupération des données du tableau de bord:', error);
    res.status(500).send('Erreur serveur');
  }
});

// Route pour afficher le formulaire de communication
router.get('/communication', isAuthenticated, isSuperUser, (req, res) => {
  res.render('communication', { title: 'Communication' });
});

// Route pour enregistrer les consignes et objectifs
router.post('/communication', isAuthenticated, isSuperUser, async (req, res) => {
  const { consignes, objectifs } = req.body;
  try {
    await db.collection('communication').add({
      consignes,
      objectifs,
      createdAt: new Date().toISOString()
    });

    res.render('communication', { title: 'Communication', success: true, message: 'Consignes et objectifs enregistrés avec succès.' });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement des consignes et objectifs:', error);
    res.render('communication', { title: 'Communication', success: false, message: 'Erreur lors de l\'enregistrement des consignes et objectifs.' });
  }
});

// Route pour enregistrer une nouvelle tâche
router.post('/add-task', isAuthenticated, async (req, res) => {
  const { title, dueDate, priority } = req.body;
  const userId = req.session.userId;

  try {
    const docRef = await db.collection('users').doc(userId).collection('tasks').add({
      title,
      dueDate,
      priority,
      status: 'Pending',
      assignedTo: userId,
      createdAt: new Date().toISOString()
    });
    docRef.update({ id: docRef.id });

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la tâche:', error);
    res.redirect('/dashboard');
  }
});

// Route pour supprimer une tâche
router.post('/delete-task', isAuthenticated, async (req, res) => {
  const { taskId } = req.body;
  const userId = req.session.userId;

  try {
    await db.collection('users').doc(userId).collection('tasks').doc(taskId).delete();
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Erreur lors de la suppression de la tâche:', error);
    res.redirect('/dashboard');
  }
});

module.exports = router;