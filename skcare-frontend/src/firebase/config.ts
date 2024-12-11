import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, onSnapshot, Firestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDSMrdy3c0le_PUqns3nMQSRzcFpq-h_CM",
  authDomain: "skcare-c15e6.firebaseapp.com",
  projectId: "skcare-c15e6",
  storageBucket: "skcare-c15e6.firebasestorage.app",
  messagingSenderId: "717960674805",
  appId: "1:717960674805:web:d65211839baf7a9eb574bc"
};

// Initialize Firebase
const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);
const auth: Auth = getAuth(firebaseApp);
const provider: GoogleAuthProvider = new GoogleAuthProvider();
const db: Firestore = getFirestore(firebaseApp);

export { firebaseApp, auth, provider, db };