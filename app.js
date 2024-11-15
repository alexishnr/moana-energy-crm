var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const session = require('express-session');
const admin = require('firebase-admin');
const serviceAccount = require('./config/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

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