import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, type User } from "firebase/auth";
import { getAuthInstance, initializeFirebase } from "@/firebase";

export type AdminContextValue = {
  isAdmin: boolean;
  adminUser: { uid: string; email: string } | null;
  adminData: { uid: string; email: string; role: string } | null;
  loading: boolean;
  adminLogin: (email: string, password: string) => Promise<void>;
  adminLogout: () => Promise<void>;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState<{ uid: string; email: string } | null>(null);
  const [adminData, setAdminData] = useState<{
    uid: string;
    email: string;
    role: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
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

        const auth = getAuthInstance();
        if (!auth) {
          console.error("Firebase auth not initialized");
          setLoading(false);
          return;
        }

        unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
          if (!isSubscribed) return;
          
          if (user) {
            // Check if the user is the admin user
            const adminEmail = "va7058060@gmail.com";
            
            if (user.email === adminEmail) {
              setAdminUser({ uid: user.uid, email: user.email! });
              setAdminData({
                uid: user.uid,
                email: user.email!,
                role: "superadmin",
              });
              setIsAdmin(true);
            } else {
              // User is authenticated but not the admin
              setAdminUser(null);
              setAdminData(null);
              setIsAdmin(false);
            }
          } else {
            setAdminUser(null);
            setAdminData(null);
            setIsAdmin(false);
          }
          setLoading(false);
        });
      } catch (error) {
        console.error("Error setting up admin auth:", error);
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
  }, [mounted]);

  const adminLogin = async (email: string, password: string) => {
    try {
      const auth = getAuthInstance();
      if (!auth) {
        throw new Error("Firebase auth not initialized");
      }
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Verify this is the admin user
      const adminEmail = "va7058060@gmail.com";
      if (user.email !== adminEmail) {
        await signOut(auth);
        throw new Error("Access denied. Admin account required.");
      }
    } catch (error) {
      console.error("Firebase auth error:", error);
      throw error;
    }
  };

  const adminLogout = async () => {
    try {
      const auth = getAuthInstance();
      if (!auth) {
        throw new Error("Firebase auth not initialized");
      }
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
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