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

import { auth } from "@/firebase";
import { AuthContext, type AuthContextValue } from "@/hooks/use-auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextValue["user"]>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void setPersistence(auth, browserLocalPersistence).catch(() => undefined);
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    signUp: async (email, password) =>
      (await createUserWithEmailAndPassword(auth, email, password)).user,
    signIn: async (email, password) =>
      (await signInWithEmailAndPassword(auth, email, password)).user,
    signInWithGoogle: async () => (await signInWithPopup(auth, new GoogleAuthProvider())).user,
    sendResetEmail: (email) => sendPasswordResetEmail(auth, email),
    signOutUser: () => signOut(auth),
    sendPhoneCode: (phoneNumber, verifier) => signInWithPhoneNumber(auth, phoneNumber, verifier),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
