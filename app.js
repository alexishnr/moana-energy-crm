require('dotenv').config(); // Charger les variables d'environnement depuis le fichier .env
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const session = require('express-session');
const admin = require('firebase-admin');

// Initialisation de Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
    }),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
  });
}
const db = admin.firestore();

var indexRouter = require('./routes/index');
var authRouter = require('./routes/auth');

var app = express();
const ejsLayout = require("express-ejs-layouts");

// Configuration du moteur de vue
app.use(ejsLayout);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

console.log(process.env.PORT); // Vérifiez que la variable PORT est définie
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Permet de gérer les formulaires
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Configuration pour les proxys (ex. : Heroku)
app.set('trust proxy', 1); // Nécessaire pour que les cookies sécurisés fonctionnent derrière un proxy (Heroku)

app.use(session({
  secret: process.env.SESSION_SECRET || 'votre_secret_de_session', // Utilisez un secret robuste
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Utilisé uniquement en production
    httpOnly: true, // Empêche les scripts JavaScript d'accéder aux cookies
    sameSite: process.env.NODE_ENV === 'production' ? "none" : "lax", // 'none' pour cross-origin
    domain: process.env.NODE_ENV === 'production' ? '.moanaenergy.com' : undefined, // Appliqué uniquement en prod
    maxAge: 24 * 60 * 60 * 1000, // Durée de vie : 1 jour,
    sameSite: 'lax'
  }
}));

// Synchronisation avec NTP (facultatif, utile pour le débogage)
const ntpClient = require('ntp-client');
ntpClient.getNetworkTime("pool.ntp.org", 123, (err, date) => {
  if (err) {
    console.error("Erreur de connexion au serveur NTP:", err);
    return;
  }
  console.log("Heure exacte:", date);
});

// Vérification des sessions pour le débogage
app.use((req, res, next) => {
  if (req.session) {
    // console.log('Session actuelle:', req.session);
  }
  next();
});

// Routes
app.use('/auth', authRouter);

// Middleware pour vérifier si l'utilisateur est authentifié
function isAuthenticated(req, res, next) {
if (req.session && req.session.userId) {
    // Maintenir la session active
    req.session.touch();
    return next();
  }
  res.redirect('/auth/login'); // Redirection vers la page de connexion
}

app.use('/', isAuthenticated, indexRouter);

// Gestion des erreurs 404
app.use(function(req, res, next) {
  next(createError(404));
});

// Gestionnaire d'erreurs
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;