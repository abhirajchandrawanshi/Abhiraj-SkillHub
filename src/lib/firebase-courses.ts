import { getDb } from "@/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  query,
  where,
} from "firebase/firestore";

// Helper function to get db instance safely
function getDbSafe() {
  const db = getDb();
  if (!db) {
    throw new Error("Firestore is not initialized. Make sure you are on the client side.");
  }
  return db;
}

// Course type matching the Firestore structure (compatible with admin Course type)
export type Course = {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  thumbnail?: string;
  category?: string;
  instructor?: string;
  duration?: string;
  status?: "published" | "draft";
  published?: boolean; // Legacy field for backward compatibility
  slug?: string; // Legacy field for backward compatibility
  createdAt?: any;
  updatedAt?: any;
  details?: string;
  accessInfo?: string;
  metaTitle?: string;
  metaDescription?: string;
  // Course PDF (stored in Supabase Storage `course-pdfs` bucket)
  pdfPath?: string;
  // External resource links (YouTube, GitHub, docs, etc.)
  resources?: { label: string; url: string }[];
  rating?: number;
  ratingCount?: number;
  publishedDate?: string;
};

// Course metadata details (from course.ts)
export type CourseDetails = {
  duration: string;
  mode: string;
  certificate: string;
  language: string;
};

export type Lesson = {
  id: string;
  title: string;
  minutes: number;
  preview?: boolean;
  body: string[];
};

export type Module = {
  id: string;
  week: string;
  title: string;
  desc: string;
  lessons: Lesson[];
};

// ===== COURSE OPERATIONS =====

/**
 * Get a course by slug
 */
export async function getCourseBySlug(slug: string): Promise<Course | null> {
  const db = getDbSafe();
  const coursesCollection = collection(db, "courses");
  const q = query(coursesCollection, where("slug", "==", slug));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as Course;
}

/**
 * Get course by ID
 */
export async function getCourseById(courseId: string): Promise<Course | null> {
  const db = getDbSafe();
  const docRef = doc(db, "courses", courseId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    return null;
  }

  return {
    id: snap.id,
    ...snap.data(),
  } as Course;
}

/**
 * Get all published courses
 */
export async function getPublishedCourses(): Promise<Course[]> {
  const db = getDbSafe();
  const coursesCollection = collection(db, "courses");
  const q = query(coursesCollection, where("status", "==", "published"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as Course));
}

/**
 * Set a course (used for initial setup or adding new courses)
 */
export async function setCourse(course: Course): Promise<void> {
  const db = getDbSafe();
  const coursesCollection = collection(db, "courses");
  const docRef = doc(coursesCollection, course.id);
  await setDoc(docRef, {
    ...course,
    createdAt: new Date().toISOString(),
  });
}

// ===== ENROLLMENT OPERATIONS =====

/**
 * Enroll a user in a course
 */
export async function enrollUser(
  userId: string,
  courseId: string,
  paymentId: string
): Promise<string> {
  const db = getDbSafe();
  const enrollmentsCollection = collection(db, "enrollments");
  const enrollmentData = {
    userId,
    courseId,
    paymentId,
    purchasedAt: new Date().toISOString(),
  };

  const docRef = await addDoc(enrollmentsCollection, enrollmentData);
  return docRef.id;
}

/**
 * Check if a user is enrolled in a course
 */
export async function isUserEnrolled(userId: string, courseId: string): Promise<boolean> {
  const db = getDbSafe();
  const enrollmentsCollection = collection(db, "enrollments");
  const q = query(
    enrollmentsCollection,
    where("userId", "==", userId),
    where("courseId", "==", courseId)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

/**
 * Get user's enrollments
 */
export async function getUserEnrollments(userId: string): Promise<any[]> {
  const db = getDbSafe();
  const enrollmentsCollection = collection(db, "enrollments");
  const q = query(enrollmentsCollection, where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Get enrollment by user and course
 */
export async function getEnrollment(
  userId: string,
  courseId: string
): Promise<any | null> {
  const db = getDbSafe();
  const enrollmentsCollection = collection(db, "enrollments");
  const q = query(
    enrollmentsCollection,
    where("userId", "==", userId),
    where("courseId", "==", courseId)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data(),
  };
}