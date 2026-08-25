import { db } from "@/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
} from "firebase/firestore";

// ===== COURSE ACCESS MANAGEMENT =====

/**
 * Get a course access record from Firestore by email and courseId
 */
export async function getCourseAccess(email: string, courseId: string) {
  try {
    const accessRef = collection(db, "courseAccess");
    const q = query(accessRef, where("email", "==", email), where("courseId", "==", courseId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const docData = snapshot.docs[0].data();
    return {
      id: snapshot.docs[0].id,
      ...docData,
    };
  } catch (error) {
    console.error("Error reading course access from Firestore:", error);
    return null;
  }
}

/**
 * Save or update a course access record to Firestore
 */
export async function saveCourseAccess(
  email: string,
  courseId: string,
  paymentId: string,
  orderId: string
) {
  try {
    const accessRef = collection(db, "courseAccess");
    const q = query(accessRef, where("email", "==", email), where("courseId", "==", courseId));
    const snapshot = await getDocs(q);

    const accessData = {
      email,
      courseId,
      paymentId,
      orderId,
      grantedAt: new Date().toISOString(),
    };

    if (!snapshot.empty) {
      // Update existing record
      const docRef = doc(db, "courseAccess", snapshot.docs[0].id);
      await setDoc(docRef, accessData, { merge: true });
      return {
        id: snapshot.docs[0].id,
        ...accessData,
      };
    } else {
      // Create new record
      const docRef = await addDoc(accessRef, accessData);
      return {
        id: docRef.id,
        ...accessData,
      };
    }
  } catch (error) {
    console.error("Error saving course access to Firestore:", error);
    throw error;
  }
}

/**
 * Check if user has access to a course (using local storage or Firestore)
 */
export async function hasCourseAccess(email: string, courseId: string) {
  const access = await getCourseAccess(email, courseId);
  return !!access;
}

/**
 * Get course access by email and course ID for the UI
 */
export async function getCourseAccessByEmailAndCourse(email: string, courseId: string) {
  return await getCourseAccess(email, courseId);
}

/**
 * Create initial enrollment record (for backward compatibility)
 */
export async function createEnrollment(email: string, courseId: string, paymentId: string, orderId: string) {
  try {
    const enrollmentRef = collection(db, "enrollments");
    const enrollmentData = {
      userId: email, // Using email as userId for compatibility
      courseId,
      paymentId,
      orderId,
      purchasedAt: new Date().toISOString(),
    };

    const docRef = await addDoc(enrollmentRef, enrollmentData);
    return {
      id: docRef.id,
      ...enrollmentData,
    };
  } catch (error) {
    console.error("Error creating enrollment in Firestore:", error);
    throw error;
  }
}