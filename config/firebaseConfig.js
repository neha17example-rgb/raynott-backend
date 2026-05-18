const admin = require('firebase-admin');

// Only initialize if it hasn't been done already
if (!admin.apps.length) {
  const serviceAccount = require('../serviceAccountKey.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://raynott-98db5-default-rtdb.firebaseio.com"
  });
}

// These can be used anywhere in your app
const db = admin.database();
// const db = admin.firestore();
// const bucket = admin.storage().bucket();

module.exports = { admin, db };