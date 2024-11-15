require('dotenv').config(); // Charger les variables d'environnement depuis le fichier .env
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const session = require('express-session');
const admin = require('firebase-admin');

// Vérifiez si l'application Firebase a déjà été initialisée
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
require("dotenv").config();
console.log(process.env.PORT); // Affiche la valeur de PORT définie dans .env
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Permet de gérer les formulaires
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Configuration du middleware de session
app.use(session({
  secret: 'alexis',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 3600000, // 1 heure
    secure: process.env.NODE_ENV === 'production', // Utiliser des cookies sécurisés en production
    httpOnly: true // Empêcher l'accès aux cookies via JavaScript
  }
}));

const ntpClient = require('ntp-client');

ntpClient.getNetworkTime("pool.ntp.org", 123, (err, date) => {
  if (err) {
    console.error("Erreur de connexion au serveur NTP:", err);
    return;
  }
  console.log("Heure exacte:", date);
});

app.use((req, res, next) => {
  if (req.session) {
    console.log('Session:', req.session);
  }
  next();
});

app.use('/auth', authRouter);

// Middleware pour vérifier si l'utilisateur est connecté
function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    req.session._garbage = Date();
    req.session.touch();
    return next();
  }
  res.redirect('/auth/login'); // Assurez-vous que la redirection est correcte
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