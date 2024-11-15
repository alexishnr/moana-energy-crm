const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();

async function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    req.session._garbage = Date();
    req.session.touch();
    return next();
  }
  res.redirect('/auth/login');
}

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

module.exports = { isAuthenticated, isSuperUser };