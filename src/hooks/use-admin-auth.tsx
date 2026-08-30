import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "@/firebase";

export type AdminContextValue = {
  isAdmin: boolean;
  adminUser: User | null;
  adminData: { uid: string; email: string | null; role: string } | null;
  loading: boolean;
  adminLogin: (email: string, password: string) => Promise<void>;
  adminLogout: () => Promise<void>;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [adminData, setAdminData] = useState<{
    uid: string;
    email: string | null;
    role: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && adminEmail && user.email === adminEmail) {
        // User is authenticated and is the admin
        setAdminUser(user);
        setAdminData({
          uid: user.uid,
          email: user.email,
          role: "superadmin",
        });
        setIsAdmin(true);
      } else {
        // User is either not logged in or is not admin
        // Do NOT sign them out — they may be a regular user
        setAdminUser(null);
        setAdminData(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const adminLogin = async (email: string, password: string) => {
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;

    // Authenticate with Firebase Auth (client-side)
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );

    // Check if the user is authorized as admin
    if (userCredential.user.email !== adminEmail) {
      await firebaseSignOut(auth);
      throw new Error("Access denied. User is not authorized as admin.");
    }

    // onAuthStateChanged will automatically update state
  };

  const adminLogout = async () => {
    await firebaseSignOut(auth);
    // onAuthStateChanged will automatically clear state
  };

  const value: AdminContextValue = {
    isAdmin,
    adminUser,
    adminData,
    loading,
    adminLogin,
    adminLogout,
  };

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminContext);
  if (!context)
    throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return context;
}