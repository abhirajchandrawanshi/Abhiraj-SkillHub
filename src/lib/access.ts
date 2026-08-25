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
import { COURSE_ID, INTERNSHIP_ID } from "@/lib/course";

export type CourseAccess = {
  email: string;
  paymentId: string;
  orderId: string;
  grantedAt: string;
  courseId: string;
};

const ACCESS_KEY = `course-access:${COURSE_ID}`;
const EMAIL_KEY = `course-access-email:${COURSE_ID}`;
const PROGRESS_KEY = `course-progress:${COURSE_ID}`;
export const COURSE_ACCESS_EVENT = "course-access-changed";

const INTERNSHIP_ACCESS_KEY = `course-access:${INTERNSHIP_ID}`;
const INTERNSHIP_EMAIL_KEY = `course-access-email:${INTERNSHIP_ID}`;
const INTERNSHIP_PROGRESS_KEY = `course-progress:${INTERNSHIP_ID}`;
export const INTERNSHIP_ACCESS_EVENT = "internship-access-changed";

/** Check local storage for access (legacy/fallback support) */
export function readCourseAccess(courseId: string = COURSE_ID): CourseAccess | null {
  if (typeof window === "undefined") return null;
  const accessKey = courseId === INTERNSHIP_ID ? INTERNSHIP_ACCESS_KEY : ACCESS_KEY;
  const emailKey = courseId === INTERNSHIP_ID ? INTERNSHIP_EMAIL_KEY : EMAIL_KEY;
  
  const raw = window.localStorage.getItem(accessKey);
  if (!raw) return null;
  if (raw === "verified") {
    return {
      email: window.localStorage.getItem(emailKey) ?? "",
      paymentId: "",
      orderId: "",
      grantedAt: "",
      courseId,
    };
  }
  try {
    const parsed = JSON.parse(raw) as CourseAccess;
    if (parsed && typeof parsed.email === "string") return parsed;
  } catch {
    return null;
  }
  return null;
}

export function hasCourseAccess(courseId: string = COURSE_ID) {
  return readCourseAccess(courseId) !== null;
}

export function grantCourseAccess(access: CourseAccess) {
  const accessKey = access.courseId === INTERNSHIP_ID ? INTERNSHIP_ACCESS_KEY : ACCESS_KEY;
  const emailKey = access.courseId === INTERNSHIP_ID ? INTERNSHIP_EMAIL_KEY : EMAIL_KEY;
  const event = access.courseId === INTERNSHIP_ID ? INTERNSHIP_ACCESS_EVENT : COURSE_ACCESS_EVENT;
  
  window.localStorage.setItem(accessKey, JSON.stringify(access));
  window.localStorage.setItem(emailKey, access.email);
  window.dispatchEvent(new Event(event));
}

/** Check Firestore for course access (primary source of truth) */
export async function checkFirestoreAccess(email: string, courseId: string = COURSE_ID) {
  try {
    const accessRef = collection(db, "courseAccess");
    const q = query(accessRef, where("email", "==", email), where("courseId", "==", courseId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const docData = snapshot.docs[0].data() as CourseAccess & { courseId: string };
    return docData;
  } catch (error) {
    console.error("Error checking Firestore access:", error);
    return null;
  }
}

/** Grant access in Firestore (called after successful payment verification) */
export async function grantFirestoreAccess(
  access: CourseAccess,
  courseId: string = COURSE_ID
) {
  try {
    console.log("Granting Firestore access:", { email: access.email, courseId, paymentId: access.paymentId });
    
    const accessRef = collection(db, "courseAccess");
    const q = query(accessRef, where("email", "==", access.email), where("courseId", "==", courseId));
    const snapshot = await getDocs(q);

    const accessData = {
      ...access,
      courseId,
      grantedAt: new Date().toISOString(),
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
    const event = courseId === INTERNSHIP_ID ? INTERNSHIP_ACCESS_EVENT : COURSE_ACCESS_EVENT;
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
  const q = query(accessRef, where("email", "==", userId), where("courseId", "==", courseId));
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
    } else {
      const docs = snapshot.docs[0].data() as CourseAccess & { courseId: string };
      callback({
        email: docs.email,
        paymentId: docs.paymentId,
        orderId: docs.orderId,
        grantedAt: docs.grantedAt,
      });
    }
  });
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
