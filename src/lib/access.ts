import { db } from "@/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";
import { COURSE_ID, INTERNSHIP_ID, TESTING_ID } from "@/lib/course";

export type CourseAccess = {
  userId: string;
  email: string;
  paymentId: string;
  orderId: string;
  grantedAt: string;
  expiresAt?: string; // ISO timestamp for guest purchases (optional for permanent access)
  courseId: string;
};

/** Check if guest access has expired */
export function isAccessExpired(access: CourseAccess): boolean {
  if (!access.expiresAt) {
    return false; // Permanent access (logged-in users)
  }
  const expiryDate = new Date(access.expiresAt);
  const now = new Date();
  return now > expiryDate;
}

const ACCESS_KEY = `course-access:${COURSE_ID}`;
const EMAIL_KEY = `course-access-email:${COURSE_ID}`;
const PROGRESS_KEY = `course-progress:${COURSE_ID}`;
export const COURSE_ACCESS_EVENT = "course-access-changed";

const INTERNSHIP_ACCESS_KEY = `course-access:${INTERNSHIP_ID}`;
const INTERNSHIP_EMAIL_KEY = `course-access-email:${INTERNSHIP_ID}`;
const INTERNSHIP_PROGRESS_KEY = `course-progress:${INTERNSHIP_ID}`;
export const INTERNSHIP_ACCESS_EVENT = "internship-access-changed";

const TESTING_ACCESS_KEY = `course-access:${TESTING_ID}`;
const TESTING_EMAIL_KEY = `course-access-email:${TESTING_ID}`;
const TESTING_PROGRESS_KEY = `course-progress:${TESTING_ID}`;
export const TESTING_ACCESS_EVENT = "testing-access-changed";

/** Check local storage for access (legacy/fallback support) */
export function readCourseAccess(courseId: string = COURSE_ID): CourseAccess | null {
  if (typeof window === "undefined") return null;
  const accessKey = courseId === INTERNSHIP_ID ? INTERNSHIP_ACCESS_KEY : courseId === TESTING_ID ? TESTING_ACCESS_KEY : ACCESS_KEY;
  const emailKey = courseId === INTERNSHIP_ID ? INTERNSHIP_EMAIL_KEY : courseId === TESTING_ID ? TESTING_EMAIL_KEY : EMAIL_KEY;
  
  const raw = window.localStorage.getItem(accessKey);
  if (!raw) return null;
  if (raw === "verified") {
    return {
      userId: window.localStorage.getItem(emailKey) ?? "", // Use email as userId for backward compatibility
      email: window.localStorage.getItem(emailKey) ?? "",
      paymentId: "",
      orderId: "",
      grantedAt: "",
      courseId,
    };
  }
  try {
    const parsed = JSON.parse(raw) as CourseAccess;
    // Handle backward compatibility: if userId is missing, use email as userId
    if (parsed && typeof parsed.email === "string") {
      if (!parsed.userId) {
        parsed.userId = parsed.email;
      }
      // Check if access has expired before returning
      if (parsed.expiresAt) {
        const expiryDate = new Date(parsed.expiresAt);
        const now = new Date();
        if (now > expiryDate) {
          console.log("Expired access found in localStorage, ignoring");
          return null;
        }
      }
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export function hasCourseAccess(courseId: string = COURSE_ID) {
  return readCourseAccess(courseId) !== null;
}

export function grantCourseAccess(access: CourseAccess) {
  const accessKey = access.courseId === INTERNSHIP_ID ? INTERNSHIP_ACCESS_KEY : access.courseId === TESTING_ID ? TESTING_ACCESS_KEY : ACCESS_KEY;
  const emailKey = access.courseId === INTERNSHIP_ID ? INTERNSHIP_EMAIL_KEY : access.courseId === TESTING_ID ? TESTING_EMAIL_KEY : EMAIL_KEY;
  const event = access.courseId === INTERNSHIP_ID ? INTERNSHIP_ACCESS_EVENT : access.courseId === TESTING_ID ? TESTING_ACCESS_EVENT : COURSE_ACCESS_EVENT;
  
  window.localStorage.setItem(accessKey, JSON.stringify(access));
  window.localStorage.setItem(emailKey, access.email);
  window.dispatchEvent(new Event(event));
}

/** Check Firestore for course access (primary source of truth) */
export async function checkFirestoreAccess(userId: string, courseId: string = COURSE_ID) {
  try {
    const accessRef = collection(db, "courseAccess");
    const q = query(accessRef, where("userId", "==", userId), where("courseId", "==", courseId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const docData = snapshot.docs[0].data() as CourseAccess & { courseId: string };
    
    // Check if access has expired (for guest purchases)
    if (docData.expiresAt) {
      const expiryDate = new Date(docData.expiresAt);
      const now = new Date();
      if (now > expiryDate) {
        console.log("Access has expired for guest purchase:", { userId, courseId, expiresAt: docData.expiresAt });
        return null;
      }
    }
    
    return docData;
  } catch (error) {
    console.error("Error checking Firestore access:", error);
    return null;
  }
}

/** Grant access in Firestore (called after successful payment verification) */
export async function grantFirestoreAccess(
  access: CourseAccess,
  courseId: string = COURSE_ID,
  isGuest: boolean = false
) {
  try {
    console.log("Granting Firestore access:", { userId: access.userId, email: access.email, courseId, paymentId: access.paymentId, isGuest });
    
    const accessRef = collection(db, "courseAccess");
    const q = query(accessRef, where("userId", "==", access.userId), where("courseId", "==", courseId));
    const snapshot = await getDocs(q);

    // Calculate expiry for guest purchases (7 days from now)
    const expiresAt = isGuest ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : undefined;

    const accessData = {
      ...access,
      courseId,
      grantedAt: new Date().toISOString(),
      expiresAt, // Only set for guest purchases
    };

    if (!snapshot.empty) {
      // Update existing record
      const docRef = doc(db, "courseAccess", snapshot.docs[0].id);
      await setDoc(docRef, accessData, { merge: true });
      console.log("Updated existing access record");
    } else {
      // Create new record
      const docRef = doc(accessRef);
      await setDoc(docRef, accessData);
      console.log("Created new access record");
    }

    // Dispatch the correct event based on courseId
    const event = courseId === INTERNSHIP_ID ? INTERNSHIP_ACCESS_EVENT : courseId === TESTING_ID ? TESTING_ACCESS_EVENT : COURSE_ACCESS_EVENT;
    window.dispatchEvent(new Event(event));
    
    // Also update localStorage for immediate UI updates
    grantCourseAccess(access);
    
    console.log("Access granted successfully, dispatched event:", event);
    return true;
  } catch (error) {
    console.error("Error granting Firestore access:", error);
    // Fallback to localStorage if Firestore fails
    console.log("Falling back to localStorage access");
    grantCourseAccess(access);
    return true;
  }
}

/** Check if user is enrolled in Firestore */
export async function checkEnrollment(userId: string, courseId: string = COURSE_ID) {
  try {
    const enrollmentsRef = collection(db, "enrollments");
    const q = query(
      enrollmentsRef,
      where("userId", "==", userId),
      where("courseId", "==", courseId)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data();
  } catch (error) {
    console.error("Error checking enrollment:", error);
    return null;
  }
}

/** Save enrollment to Firestore */
export async function saveEnrollment(
  userId: string,
  courseId: string,
  paymentId: string,
  orderId: string
) {
  try {
    const enrollmentsRef = collection(db, "enrollments");
    const docRef = doc(enrollmentsRef);
    await setDoc(docRef, {
      userId,
      courseId,
      paymentId,
      orderId,
      purchasedAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving enrollment:", error);
    throw error;
  }
}

/** Listen for access changes in Firestore */
export function onAccessChange(
  userId: string,
  courseId: string,
  callback: (access: CourseAccess | null) => void
) {
  const accessRef = collection(db, "courseAccess");
  const q = query(accessRef, where("userId", "==", userId), where("courseId", "==", courseId));
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
    } else {
      const docs = snapshot.docs[0].data() as CourseAccess & { courseId: string };
      
      // Check if access has expired
      if (docs.expiresAt) {
        const expiryDate = new Date(docs.expiresAt);
        const now = new Date();
        if (now > expiryDate) {
          console.log("Access has expired in Firestore, clearing:", { userId, courseId });
          callback(null);
          return;
        }
      }
      
      const accessData = {
        userId: docs.userId || docs.email, // Fallback to email for backward compatibility
        email: docs.email,
        paymentId: docs.paymentId,
        orderId: docs.orderId,
        grantedAt: docs.grantedAt,
        expiresAt: docs.expiresAt,
      };
      // Also update localStorage when Firestore changes
      grantCourseAccess(accessData);
      callback(accessData);
    }
  });
}

/** Restore access from Firestore for a given user */
export async function restoreAccessFromFirestore(userId: string, courseId: string = COURSE_ID) {
  try {
    console.log("Restoring access from Firestore for user:", userId, "course:", courseId);
    const access = await checkFirestoreAccess(userId, courseId);
    
    if (access) {
      console.log("Found existing access in Firestore, restoring:", access);
      grantCourseAccess(access);
      return true;
    } else {
      console.log("No existing access found in Firestore for user:", userId);
      return false;
    }
  } catch (error) {
    console.error("Error restoring access from Firestore:", error);
    return false;
  }
}

/** Migrate guest purchases to Firebase account when user logs in */
export async function migrateGuestPurchasesToAccount(firebaseUid: string, email: string) {
  try {
    console.log("Checking for guest purchases to migrate for:", email);
    
    const accessRef = collection(db, "courseAccess");
    // Find guest purchases by email that don't have a Firebase UID
    const q = query(
      accessRef, 
      where("email", "==", email),
      where("userId", "==", email) // Guest purchases use email as userId
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log("No guest purchases found for email:", email);
      return;
    }

    console.log(`Found ${snapshot.docs.length} guest purchases to migrate for ${email}`);

    // Migrate each guest purchase to the Firebase account
    for (const doc of snapshot.docs) {
      const accessData = doc.data() as CourseAccess;
      
      // Update the record with Firebase UID and remove expiry (make permanent)
      const updatedAccess = {
        ...accessData,
        userId: firebaseUid, // Replace email userId with Firebase UID
        expiresAt: null, // Remove expiry - make it permanent
      };

      await setDoc(doc.ref, updatedAccess, { merge: true });
      console.log("Migrated guest purchase to Firebase account:", {
        courseId: accessData.courseId,
        paymentId: accessData.paymentId,
        fromUserId: email,
        toUserId: firebaseUid,
      });
    }

    console.log("Successfully migrated all guest purchases to Firebase account");
  } catch (error) {
    console.error("Error migrating guest purchases:", error);
  }
}

export function readCompletedLessons(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PROGRESS_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function toggleLessonComplete(lessonId: string) {
  const next = new Set(readCompletedLessons());
  if (next.has(lessonId)) next.delete(lessonId);
  else next.add(lessonId);
  window.localStorage.setItem(PROGRESS_KEY, JSON.stringify([...next]));
  return [...next];
}
