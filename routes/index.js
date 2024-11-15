const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const clean = require('xss-clean/lib/xss').clean;
const axios = require('axios');
const multer = require('multer');
const { isAuthenticated } = require('../middleware/auth');
const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');

// Vérifiez si l'application Firebase a déjà été initialisée
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: process.env.FIREBASE_TYPE,
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
}

const db = getFirestore();
// const bucket = admin.storage().bucket();

// Configuration de multer pour les téléchargements de fichiers
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

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

// Page d'accueil
router.get('/', isAuthenticated, async function(req, res, next) {
  res.render('index', { title: 'Accueil', pendingClientsCount: res.locals.pendingClientsCount });
});

// Page pour ajouter un client
router.get('/ajouter-client', isAuthenticated, function(req, res, next) {
  res.render('add-clients', { title: 'Ajouter un client', success: req.query.success, pendingClientsCount: res.locals.pendingClientsCount });
});

router.post('/add-client', isAuthenticated, upload.array('photos', 10), async function(req, res, next) {
  const { nom, prenom, adresse, ville, code_postal, type_renovation, notes, email, telephone, superficie, type_batiment, status, workStatus } = req.body;
  const photos = req.files.map(file => file.path); // Récupérer les chemins des fichiers téléchargés

  try {
    // Ajouter le client à Firestore
    await db.collection('clients').add({
      nom,
      prenom,
      idCommercial: req.session.userId, // Ajouter l'ID de l'utilisateur connecté
      emailCommercial: req.session.userEmail, // Ajouter l'email de l'utilisateur connecté
      adresse,
      ville,
      code_postal,
      type_renovation,
      notes,
      email,
      telephone,
      superficie,
      type_batiment,
      photos,
      status: 'en attente',
      workStatus: 'premier contact',
      createdAt: new Date().toISOString() // Stocker la date en format ISO
    });
    res.redirect('/ajouter-client?success=true');
  } catch (error) {
    console.error('Erreur lors de l\'ajout du client:', error);
    res.redirect('/ajouter-client?success=false');
  }
});

// Page pour afficher la liste des clients
router.get('/clients', isAuthenticated, async function(req, res, next) {
  try {
    let clientsSnapshot;
    if (req.session.isSuperUser) {
      clientsSnapshot = await db.collection('clients').get();
    } else {
      clientsSnapshot = await db.collection('clients').where('idCommercial', '==', req.session.userId).get();
    }
    const clients = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.render('clients', { title: 'Liste des clients', clients: clients, pendingClientsCount: res.locals.pendingClientsCount });
  } catch (error) {
    console.error('Erreur lors de la récupération des clients:', error);
    res.status(500).send('Erreur lors de la récupération des clients');
  }
});

// Page pour afficher les détails d'un client spécifique
router.get('/client/:id', isAuthenticated, async function(req, res, next) {
  const clientId = req.params.id;
  try {
    const clientDoc = await db.collection('clients').doc(clientId).get();
    if (!clientDoc.exists) {
      return res.status(404).send('Client non trouvé');
    }
    const client = { id: clientDoc.id, ...clientDoc.data() };
    res.render('client', { title: 'Fiche Client', client: client, isSuperUser: req.session.isSuperUser, success: req.query.success, pendingClientsCount: res.locals.pendingClientsCount });
  } catch (error) {
    console.error('Erreur lors de la récupération du client:', error);
    res.status(500).send('Erreur lors de la récupération du client');
  }
});

// Route pour afficher la page de programmation de rendez-vous
router.get('/client/:id/schedule', isAuthenticated, async function(req, res, next) {
  const clientId = req.params.id;
  try {
    const clientDoc = await db.collection('clients').doc(clientId).get();
    if (!clientDoc.exists) {
      return res.status(404).send('Client non trouvé');
    }
    const client = { id: clientDoc.id, ...clientDoc.data() };
    res.render('schedule', { client: client, success: req.query.success, pendingClientsCount: res.locals.pendingClientsCount });
  } catch (error) {
    console.error('Erreur lors de la récupération du client:', error);
    res.status(500).send('Erreur lors de la récupération du client');
  }
});

// Route pour programmer un rendez-vous
router.post('/client/:id/schedule', isAuthenticated, async function(req, res, next) {
  const clientId = req.params.id;
  const { date, time } = req.body;
  try {
    const clientDoc = await db.collection('clients').doc(clientId).get();
    if (!clientDoc.exists) {
      return res.status(404).send('Client non trouvé');
    }
    const client = { id: clientDoc.id, ...clientDoc.data() };

    // Configuration de Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.USER_EMAIL, // Remplacez par votre adresse email
        pass: process.env.USER_PWD  // Mot de passe ou App password
      }
    });

    const mailOptions = {
      from: process.env.USER_EMAIL,
      to: client.email,
      subject: `Confirmation de rendez-vous avec Moana Energy`,
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Confirmation de rendez-vous</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f7f7f7;
            }
            .container {
              width: 100%;
              max-width: 600px;
              margin: 20px auto;
              background-color: #ffffff;
              border-radius: 8px;
              box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
              padding: 20px;
            }
            .header {
              background-color: #0D47A1;
              color: white;
              padding: 10px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              padding: 20px;
            }
            .content h3 {
              color: #0D47A1;
            }
            .footer {
              text-align: center;
              padding: 10px;
              font-size: 12px;
              color: #777;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Confirmation de rendez-vous</h2>
            </div>
            <div class="content">
              <p>Bonjour ${client.prenom} ${client.nom},</p>
              <p>Nous vous confirmons votre rendez-vous avec Moana Energy.</p>
              <p><strong>Date :</strong> ${date}</p>
              <p><strong>Heure :</strong> ${time}</p>
              <p>Adresse : ${client.adresse}, ${client.ville} ${client.code_postal}</p>
              <p>Nous restons à votre disposition pour toute information complémentaire.</p>
              <p>Cordialement,</p>
              <p>L'équipe Moana Energy</p>
            </div>
            <div class="footer">
              <p>Ce message vous a été envoyé via le système de gestion de rendez-vous de Moana Energy.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    // Envoi de l'email avec nodemailer
    transporter.sendMail(mailOptions, async (error, info) => {
      if (error) {
        console.error('Erreur lors de l\'envoi de l\'email:', error);
        return res.redirect(`/client/${clientId}/schedule?success=false`);
      } else {
        console.log('Email envoyé : ' + info.response);
        // Mettre à jour le workStatus à "rendez-vous planifié"
        await db.collection('clients').doc(clientId).update({
          workStatus: 'rendez-vous planifié'
        });
        res.redirect(`/client/${clientId}/schedule?success=true`);
      }
    });
  } catch (error) {
    console.error('Erreur lors de la programmation du rendez-vous:', error);
    res.redirect(`/client/${clientId}/schedule?success=false`);
  }
});

// Route pour transmettre la fiche à DDER
router.get('/client/:id/send-to-dder', isAuthenticated, async function(req, res, next) {
  const clientId = req.params.id;
  try {
    const clientDoc = await db.collection('clients').doc(clientId).get();
    if (!clientDoc.exists) {
      return res.status(404).send('Client non trouvé');
    }
    const client = { id: clientDoc.id, ...clientDoc.data() };

    // Configuration de Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.USER_EMAIL, // Remplacez par votre adresse email
        pass: process.env.USER_PWD  // Mot de passe ou App password
      }
    });

    const mailOptions = {
      from: process.env.USER_EMAIL,
      to: process.env.USER_EMAIL,
      subject: `Transmission de la fiche client pour ${client.nom} ${client.prenom}`,
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Transmission de la fiche client</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f7f7f7;
            }
            .container {
              width: 100%;
              max-width: 600px;
              margin: 20px auto;
              background-color: #ffffff;
              border-radius: 8px;
              box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
              padding: 20px;
            }
            .header {
              background-color: #0D47A1;
              color: white;
              padding: 10px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              padding: 20px;
            }
            .content h3 {
              color: #0D47A1;
            }
            .footer {
              text-align: center;
              padding: 10px;
              font-size: 12px;
              color: #777;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Transmission de la fiche client</h2>
            </div>
            <div class="content">
              <p>Bonjour,</p>
              <p>Veuillez trouver ci-dessous les informations du client :</p>
              <p><strong>Nom :</strong> ${client.nom}</p>
              <p><strong>Prénom :</strong> ${client.prenom}</p>
              <p><strong>Adresse :</strong> ${client.adresse}, ${client.ville} ${client.code_postal}</p>
              <p><strong>Email :</strong> ${client.email}</p>
              <p><strong>Téléphone :</strong> ${client.telephone}</p>
              <p><strong>Superficie :</strong> ${client.superficie}</p>
              <p><strong>Type de bâtiment :</strong> ${client.type_batiment}</p>
              <p><strong>Type de rénovation :</strong> ${client.type_renovation}</p>
              <p><strong>Notes :</strong> ${client.notes}</p>
              <p><strong>Statut :</strong> ${client.status}</p>
              <p><strong>Statut des travaux :</strong> ${client.workStatus}</p>
              <div>
                <strong>Photos :</strong>
                ${client.photos.map(photo => `<img src="${photo}" alt="Photo du client" style="max-width: 100px;">`).join('')}
              </div>
              <p><strong>Commercial :</strong> ${client.emailCommercial}</p>
              <p><strong>Date de création :</strong> ${new Date(client.createdAt).toLocaleDateString('fr-FR')}</p>
            </div>
            <div class="footer">
              <p>Ce message vous a été envoyé via le système de gestion de Moana Energy.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    // Envoi de l'email avec nodemailer
    transporter.sendMail(mailOptions, async (error, info) => {
      if (error) {
        console.error('Erreur lors de l\'envoi de l\'email:', error);
        return res.redirect(`/client/${clientId}?success=false`);
      } else {
        console.log('Email envoyé : ' + info.response);
        // Mettre à jour le statut à "transmise"
        await db.collection('clients').doc(clientId).update({
          status: 'transmise'
        });
        res.redirect(`/client/${clientId}?success=true`);
      }
    });
  } catch (error) {
    console.error('Erreur lors de la transmission de la fiche client:', error);
    res.redirect(`/client/${clientId}?success=false`);
  }
});

// Route pour modifier un client
router.post('/client/:id/edit', isAuthenticated, isSuperUser, upload.array('photos', 10), async function(req, res, next) {
  const clientId = req.params.id;
  const { nom, prenom, adresse, ville, code_postal, type_renovation, notes, email, telephone, superficie, type_batiment, status, workStatus } = req.body;
  const photos = req.files.map(file => file.path); // Récupérer les chemins des fichiers téléchargés
  try {
    // Mettre à jour le client dans Firestore
    await db.collection('clients').doc(clientId).update({
      nom,
      prenom,
      adresse,
      ville,
      code_postal,
      type_renovation,
      notes,
      email,
      telephone,
      superficie,
      type_batiment,
      photos,
      status,
      workStatus,
      updatedAt: new Date().toISOString() // Stocker la date en format ISO
    });
    res.redirect(`/client/${clientId}?success=true`);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du client:', error);
    res.redirect(`/client/${clientId}?success=false`);
  }
});

// Middleware pour vérifier si l'utilisateur est un super utilisateur
async function isSuperUser(req, res, next) {
  if (req.session && req.session.userId) {
    try {
      const userDoc = await db.collection('super-users').doc(req.session.userEmail).get();
      if (userDoc.exists && userDoc.data().isSuperUser) {
        return next();
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du super utilisateur:', error);
    }
  }
  res.status(403).send('Accès refusé');
}

// Page pour afficher la liste des clients en attente
router.get('/clients-en-attente', isAuthenticated, isSuperUser, async function(req, res, next) {
  try {
    const clientsSnapshot = await db.collection('clients').where('status', '==', 'en attente').get();
    const clients = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    
    res.render('clients-en-attente', { title: 'Clients en attente', clients: clients, pendingClientsCount: res.locals.pendingClientsCount });
  } catch (error) {
    console.error('Erreur lors de la récupération des clients en attente:', error);
    res.status(500).send('Erreur lors de la récupération des clients en attente');
  }
});

router.get('/add-user', isAuthenticated, isSuperUser, async function(req, res, next) {
    res.render('add-user', { success: req.query.success, pendingClientsCount: res.locals.pendingClientsCount });
});

module.exports = router;