import { initializeApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBLylwSN-dud6Vmld8LjyxgavaSKPqIjbA",
  authDomain: "to-do-list-app-5a6a4.firebaseapp.com",
  projectId: "to-do-list-app-5a6a4",
  storageBucket: "to-do-list-app-5a6a4.appspot.com",
  messagingSenderId: "943371571489",
  appId: "1:943371571489:web:394dff31b12faa4ec2ee60"
};

// Initialize Firebase (prevent re-initialization in dev)
let app;
try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
  throw error;
}

// Export the Auth and Firestore instances
export const auth = getAuth(app);
export const db = getFirestore(app);

// Log successful initialization
console.log("Firebase Auth and Firestore initialized"); 