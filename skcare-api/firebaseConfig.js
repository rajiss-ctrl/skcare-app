const firebaseAdmin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');//Development
// const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);//Production





firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount)
});



module.exports = firebaseAdmin;
