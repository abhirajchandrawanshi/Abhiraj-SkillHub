import { createContext, useContext } from "react";
import type { ApplicationVerifier, ConfirmationResult, User } from "firebase/auth";

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<User>;
  signIn: (email: string, password: string) => Promise<User>;
  signInWithGoogle: () => Promise<User>;
  sendResetEmail: (email: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  sendPhoneCode: (
    phoneNumber: string,
    verifier: ApplicationVerifier,
  ) => Promise<ConfirmationResult>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
