const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const clean = require('xss-clean/lib/xss').clean;
const multer = require('multer');
const { isAuthenticated } = require('../middleware/auth');
const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');
const { confirmationTemplate, transmissionTemplate } = require('../templates/emailTemplates');

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
      const pendingClientsSnapshot = await db.collection('clients').where('statutClient', '==', 'en attente').get();
      res.locals.pendingClientsCount = pendingClientsSnapshot.size;
    } catch (error) {
      console.error('Erreur lors de la récupération des clients en attente:', error);
    }
  }
  next();
});

// Page d'accueil
router.get('/', isAuthenticated, async function(req, res, next) {
  res.render('index', { title: 'Accueil', pendingClientsCount: res.locals.pendingClientsCount, prenom: req.session.user?.prenom });
});

// Page pour ajouter un client
router.get('/ajouter-client', isAuthenticated, function(req, res, next) {
  res.render('add-clients', { title: 'Ajouter un client', success: req.query.success, pendingClientsCount: res.locals.pendingClientsCount });
});

router.post('/add-client', isAuthenticated, upload.array('photos', 10), async function(req, res, next) {
  const { type_client, raison_sociale, nom, prenom, adresse, ville, code_postal, type_renovation, notes, email, telephone, superficie, type_batiment } = clean(req.body);
  const photos = req.files.map(file => file.path); // Récupérer les chemins des fichiers téléchargés

  try {
    // Ajouter le client à Firestore
    await db.collection('clients').add({
      type_client,
      raison_sociale: type_client === 'professionnel' ? raison_sociale : null,
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
      statutClient: 'en attente',
      statutTravaux: 'premier contact',
      createdAt: new Date().toISOString(), // Stocker la date en format ISO
      idCommercial: req.session.userId, // Ajouter l'ID de l'utilisateur connecté
      emailCommercial: req.session.userEmail, // Ajouter l'email de l'utilisateur connecté
      telephoneCommercial: req.session.userPhone, // Ajouter l'email de l'utilisateur connecté
      nomCommercial: req.session.userDisplayName // Ajouter le nom de l'utilisateur connecté
    });
    res.render('add-clients', { success: true, pendingClientsCount: res.locals.pendingClientsCount });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du client:', error);
    res.render('add-clients', { success: false, pendingClientsCount: res.locals.pendingClientsCount, message: error.message });
  }
});

// Route de connexion
router.post('/login', async function(req, res, next) {
  const { email, password } = req.body;
  try {
    const userSnapshot = await db.collection('users').where('email', '==', email).get();
    if (userSnapshot.empty) {
      return res.render('login', { success: false, message: 'Email ou mot de passe incorrect.' });
    }
    const user = userSnapshot.docs[0].data();
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.render('login', { success: false, message: 'Email ou mot de passe incorrect.' });
    }
    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userDisplayName = user.displayName;
    req.session.isSuperUser = user.isSuperUser;
    // Redirection vers la page d'accueil après une connexion réussie
    return res.redirect('/');
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    return res.render('login', { success: false, message: 'Une erreur est survenue. Veuillez réessayer plus tard.' });
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
  const { date, time } = clean(req.body);
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
      html: confirmationTemplate(client, date, time),
    };

    // Envoi de l'email avec nodemailer
    transporter.sendMail(mailOptions, async (error, info) => {
      if (error) {
        console.error('Erreur lors de l\'envoi de l\'email:', error);
        return res.render('schedule', { client: client, success: false, pendingClientsCount: res.locals.pendingClientsCount, message: error });

      } else {
        console.log('Email envoyé : ' + info.response);
        // Mettre à jour le statutTravaux à "rendez-vous planifié" et ajouter la date de rendez-vous
        await db.collection('clients').doc(clientId).update({
          statutTravaux: 'rendez-vous planifié',
          date_rdv: new Date(`${date}T${time}`).toISOString() // Stocker la date de rendez-vous en format ISO
        });
        res.render('schedule', { client: client, success: true, pendingClientsCount: res.locals.pendingClientsCount });

      }
    });
  } catch (error) {
    console.error('Erreur lors de la programmation du rendez-vous:', error);
    res.render('schedule', { client: client, success: false, pendingClientsCount: res.locals.pendingClientsCount, message: error });

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
      to: process.env.USER_EMAIL_DDER,
      subject: `Transmission de la fiche client pour ${client.nom} ${client.prenom}`,
      html: transmissionTemplate(client),
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
          statutClient: 'Fiche transmise'
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
  const { nom, prenom, adresse, ville, code_postal, type_renovation, notes, email, telephone, superficie, type_batiment, statutClient, statutTravaux, raison_sociale } = clean(req.body);
  const photos = req.files.map(file => file.path); // Récupérer les chemins des fichiers téléchargés

  // Filtrer les valeurs undefined
  const updateData = {
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
    statutClient,
    statutTravaux,
    raison_sociale,
    updatedAt: new Date().toISOString() // Stocker la date en format ISO
  };

  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });

  try {
    // Mettre à jour le client dans Firestore
    await db.collection('clients').doc(clientId).update(updateData);
    console.log('Client mis à jour avec succès');
    // Récupérez les données mises à jour
    const updatedClientDoc = await db.collection('clients').doc(clientId).get();
    
    if (!updatedClientDoc.exists) {
      throw new Error(`Le client avec l'ID ${clientId} n'existe pas.`);
    }
    
    // Construit l'objet client à partir des données récupérées
    const client = { id: updatedClientDoc.id, ...updatedClientDoc.data() };


    res.render('client', { title: 'Fiche Client', client, isSuperUser: req.session.isSuperUser, success: req.query.success, pendingClientsCount: res.locals.pendingClientsCount });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du client:', error);
    res.render('client', { title: 'Fiche Client', client, isSuperUser: req.session.isSuperUser, success: req.query.success, pendingClientsCount: res.locals.pendingClientsCount, message:error });
  }
});

// Route pour supprimer un client
router.delete('/client/:id/delete', isAuthenticated, isSuperUser, async function(req, res, next) {
  const clientId = req.params.id;

  try {
    // Supprimer le client de Firestore
    await db.collection('clients').doc(clientId).delete();
    res.status(200).send('Client supprimé avec succès.');
  } catch (error) {
    console.error('Erreur lors de la suppression du client:', error);
    res.status(500).send('Erreur lors de la suppression du client.');
  }
});

// Middleware pour vérifier si l'utilisateur est un super utilisateur
async function isSuperUser(req, res, next) {
  if (req.session && req.session.userId) {
    try {
      const userDoc = await db.collection('users').doc(req.session.userId).get();
      if (userDoc.exists && userDoc.data().isSuperUser === true) {
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
    const clientsSnapshot = await db.collection('clients').where('statutClient', '==', 'en attente').get();
    const clients = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    
    res.render('clients-en-attente', { title: 'Clients en attente', clients: clients, pendingClientsCount: res.locals.pendingClientsCount });
  } catch (error) {
    console.error('Erreur lors de la récupération des clients en attente:', error);
    res.status(500).send('Erreur lors de la récupération des clients en attente');
  }
});

router.get('/add-user', isAuthenticated, isSuperUser, async function(req, res, next) {
  console.log(req);
  console.log(typeof req.query.success);

    res.render('add-user', { success: req.query.success, pendingClientsCount: res.locals.pendingClientsCount });
});

// Route pour la FAQ
router.get('/faq', function(req, res, next) {
  res.render('faq', { title: 'FAQ - Dashboard Moana Energy' });
});

// Route pour le chatbot
router.post('/chatbot', async function(req, res) {
  const userMessage = req.body.message.toLowerCase();

  try {
    // Vérifiez si la question de l'utilisateur correspond à une question de la FAQ
    let faqResponse = null;
    Object.keys(siteContent).forEach(sectionKey => {
      const section = siteContent[sectionKey];
      section.sections.forEach(subSection => {
        if (subSection.content && subSection.content[0].faq) {
          subSection.content[0].faq.forEach(faqItem => {
            if (userMessage.includes(faqItem.question.toLowerCase())) {
              faqResponse = faqItem.answer;
            }
          });
        }
      });
    });

    if (faqResponse) {
      return res.json({ response: faqResponse });
    }

    // Si aucune réponse FAQ n'est trouvée, utilisez l'API OpenAI
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "user", content: userMessage },
        { role: "system", content: `use as much as you can the Site Content: ${JSON.stringify(siteContent)}` },
        {
          "role": "system",
          "content": "Vous êtes un assistant dédié au dashboard de Moana Energy. Vous répondez uniquement aux questions sur les fonctionnalités suivantes : ajouter des clients, suivre les fiches, utiliser les filtres, transmettre une fiche, et planifier un rendez-vous. Si une question est hors sujet, répondez : 'Je suis désolé, je ne peux répondre qu'aux questions concernant le dashboard de Moana Energy.'"
        }
      ],
      model: "gpt-3.5-turbo",
      max_tokens: 200
    });

    const botResponse = completion.choices[0].message.content.trim();
    res.json({ response: botResponse });
  } catch (error) {
    console.error('Erreur lors de la communication avec l\'API de ChatGPT:', error.response ? error.response.data : error.message);
    res.json({ response: "Je suis désolé, je ne comprends pas votre demande." });
  }
});

module.exports = router;