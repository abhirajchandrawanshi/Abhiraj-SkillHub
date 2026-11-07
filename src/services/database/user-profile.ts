import { getDb } from "@/services/database/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

function getDbSafe() {
  const db = getDb();
  if (!db) {
    throw new Error("Firestore is not initialized. Make sure you are on the client side.");
  }
  return db;
}

export type UserProfile = {
  uid: string;
  email?: string;
  name?: string;
  notificationsEnabled: boolean;
};

export async function getUserProfile(uid: string): Promise<UserProfile> {
  const db = getDbSafe();
  const docRef = doc(db, "userProfiles", uid);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    // Default profile if not created yet.
    // NOTE: ensureUserProfileExists (server fn) creates the real doc with true on sign-in.
    // We default to true here so the profile page shows the correct value before the
    // server document is written.
    return {
      uid,
      notificationsEnabled: true,
    };
  }

  return {
    uid,
    ...(snap.data() as Omit<UserProfile, "uid">),
  };
}


export async function updateUserNotificationPreference(uid: string, email: string, enabled: boolean): Promise<void> {
  const db = getDbSafe();
  const docRef = doc(db, "userProfiles", uid);
  await setDoc(docRef, { email, notificationsEnabled: enabled }, { merge: true });
}

export async function updateUserProfileName(uid: string, name: string): Promise<void> {
  const db = getDbSafe();
  const docRef = doc(db, "userProfiles", uid);
  await setDoc(docRef, { name }, { merge: true });
}
