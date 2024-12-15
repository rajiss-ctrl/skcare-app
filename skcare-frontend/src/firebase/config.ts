import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGEBUCKET,
  messagingSenderId: import.meta.env.MSG_SENDER_ID,
  appId: import.meta.env.VITE_API_ID
};

// Initialize Firebase
const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);
const auth: Auth = getAuth(firebaseApp);
const provider: GoogleAuthProvider = new GoogleAuthProvider();
const db: Firestore = getFirestore(firebaseApp);

export { firebaseApp, auth, provider, db };