declare module "../firebase/config" {
    import { Auth, GoogleAuthProvider } from "firebase/auth";
    import { FirebaseApp } from "firebase/app";
  
    export const auth: Auth;
    export const provider: GoogleAuthProvider;
    export const firebaseApp: FirebaseApp;
  }
  