const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();

async function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    const userDoc = await db.collection('users').doc(req.session.userId).get();
    if (userDoc.exists) {
      const user = userDoc.data();
      const today = new Date();

      if (user.isSuperUser || new Date(user.expirationDate) >= today) {
        console.log("authenticated");
        req.session._garbage = Date();
        req.session.touch();
        return next();
      } else {
        console.log("account expired");
        return res.redirect('/auth/login?message=Votre compte a expiré.');
      }
    }
  }
  console.log("not authenticated");
  res.redirect('/auth/login');
}

async function isSuperUser(req, res, next) {
  if (req.session && req.session.userId) {
    try {
      const userDoc = await db.collection('users').doc(req.session.userId).get();
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