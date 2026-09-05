import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app = null;
let auth = null;
let db = null;
let initializationError = null;
let isInitialized = false;
let initPromise: Promise<void> | null = null;

function initializeFirebase(): Promise<void> {
  if (isInitialized) {
    return Promise.resolve();
  }
  
  if (initPromise) {
    return initPromise;
  }
  
  // Only initialize on client side
  if (typeof window === 'undefined') {
    console.log("Skipping Firebase initialization on server side");
    isInitialized = true;
    return Promise.resolve();
  }

  initPromise = (async () => {
    try {
      if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        throw new Error("Firebase configuration is missing required fields");
      }

      app = initializeApp(firebaseConfig);
      console.log("Firebase app initialized");

      auth = getAuth(app);
      console.log("Firebase auth initialized");

      db = getFirestore(app);
      console.log("Firebase Firestore initialized");
      
      isInitialized = true;
    } catch (error) {
      console.error("Firebase initialization error:", error);
      initializationError = error;
      isInitialized = true;
    }
  })();

  return initPromise;
}

// Export a function to get the db instance safely
export function getDb() {
  if (!db) {
    console.warn("Firestore db not initialized, returning null");
    return null;
  }
  return db;
}

// Export a function to get the auth instance safely
export function getAuthInstance() {
  if (!auth) {
    console.warn("Firebase auth not initialized, returning null");
    return null;
  }
  return auth;
}

export { auth, db, initializationError, initializeFirebase };
