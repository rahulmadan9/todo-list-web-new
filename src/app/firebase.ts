import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBLylwSN-dud6Vmld8LjyxgavaSKPqIjbA",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "to-do-list-app-5a6a4.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "to-do-list-app-5a6a4",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "to-do-list-app-5a6a4.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "943371571489",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:943371571489:web:394dff31b12faa4ec2ee60"
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

// Log successful initialization (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log("Firebase Auth and Firestore initialized");
} 