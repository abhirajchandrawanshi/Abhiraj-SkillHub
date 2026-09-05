import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { useEffect, useState, type ReactNode } from "react";

import { getAuthInstance, initializationError, initializeFirebase } from "@/firebase";
import { AuthContext, type AuthContextValue } from "@/hooks/use-auth";
import { migrateGuestPurchasesToAccount } from "@/lib/access";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextValue["user"]>(null);
  const [loading, setLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState<Error | null>(initializationError);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;
    let isSubscribed = true;

    const setupAuth = async () => {
      try {
        // Wait for Firebase to initialize
        await initializeFirebase();
        
        if (!isSubscribed) return;

        if (firebaseError) {
          console.error("Firebase not available:", firebaseError);
          setLoading(false);
          return;
        }

        const auth = getAuthInstance();
        if (!auth) {
          console.error("Firebase auth not initialized");
          setLoading(false);
          return;
        }

        void setPersistence(auth, browserLocalPersistence).catch(() => undefined);
        unsubscribe = onAuthStateChanged(auth, (nextUser) => {
          if (!isSubscribed) return;
          
          setUser(nextUser);
          
          // Migrate guest purchases when user logs in
          if (nextUser?.email) {
            void migrateGuestPurchasesToAccount(nextUser.uid, nextUser.email);
          }
          
          setLoading(false);
        });
      } catch (error) {
        console.error("Error setting up auth:", error);
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    setupAuth();

    return () => {
      isSubscribed = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [firebaseError, mounted]);

  const value: AuthContextValue = {
    user,
    loading,
    signUp: async (email, password) => {
      const auth = getAuthInstance();
      if (!auth) throw new Error("Firebase auth not initialized");
      return (await createUserWithEmailAndPassword(auth, email, password)).user;
    },
    signIn: async (email, password) => {
      const auth = getAuthInstance();
      if (!auth) throw new Error("Firebase auth not initialized");
      return (await signInWithEmailAndPassword(auth, email, password)).user;
    },
    signInWithGoogle: async () => {
      const auth = getAuthInstance();
      if (!auth) throw new Error("Firebase auth not initialized");
      return (await signInWithPopup(auth, new GoogleAuthProvider())).user;
    },
    sendResetEmail: (email) => {
      const auth = getAuthInstance();
      if (!auth) throw new Error("Firebase auth not initialized");
      return sendPasswordResetEmail(auth, email);
    },
    signOutUser: () => {
      const auth = getAuthInstance();
      if (!auth) throw new Error("Firebase auth not initialized");
      return signOut(auth);
    },
    sendPhoneCode: (phoneNumber, verifier) => {
      const auth = getAuthInstance();
      if (!auth) throw new Error("Firebase auth not initialized");
      return signInWithPhoneNumber(auth, phoneNumber, verifier);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
