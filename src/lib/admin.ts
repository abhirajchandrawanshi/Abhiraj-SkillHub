import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "@/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { getAdminDb, getAdminAuth } from "./firebase-admin";

// Admin user interface
export interface AdminUser {
  uid: string;
  email: string;
  role: "admin" | "superadmin";
  createdAt: Timestamp;
  lastLogin?: Timestamp;
}

// Course schema for Firestore
export interface Course {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  thumbnail?: string;
  category: string;
  instructor: string;
  duration: string;
  status: "published" | "draft";
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Course content fields
  details?: string;
  accessInfo?: string;
  // Additional metadata
  metaTitle?: string;
  metaDescription?: string;
}

// ---------------------------------------------------------------------------
// Server-side admin authentication using Firebase Admin SDK
// Verifies the Firebase ID token and checks admin email authorization
// ---------------------------------------------------------------------------
async function requireAdminAuth(idToken: string): Promise<any> {
  if (!idToken) {
    throw new Error("Unauthorized: No token provided");
  }

  const adminEmail = process.env['ADMIN_EMAIL'];
  if (!adminEmail) {
    throw new Error("Admin email not configured");
  }

  try {
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    if (decodedToken.email !== adminEmail) {
      throw new Error("Forbidden: Admin access required");
    }

    return decodedToken;
  } catch (error) {
    if (error instanceof Error && error.message.includes("Forbidden")) {
      throw error;
    }
    console.error("Token verification failed:", error);
    throw new Error("Unauthorized: Invalid or expired token");
  }
}

// ---------------------------------------------------------------------------
// Protected admin server functions
// All require a valid Firebase ID token from an admin user
// ---------------------------------------------------------------------------

// Get all courses (protected)
export const getCourses = createServerFn({ method: "GET" })
  .validator(z.object({ idToken: z.string() }))
  .handler(async ({ data }) => {
    await requireAdminAuth(data.idToken);
    try {
      const coursesRef = collection(db, "courses");
      const q = query(coursesRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      const courses = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Course[];

      return { success: true, courses };
    } catch (error) {
      console.error("Error fetching courses:", error);
      throw new Error("Failed to fetch courses");
    }
  });

// Get single course (protected)
export const getCourse = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string(), idToken: z.string() }))
  .handler(async ({ data }) => {
    await requireAdminAuth(data.idToken);
    try {
      const courseRef = doc(db, "courses", data.id);
      const snapshot = await getDoc(courseRef);

      if (!snapshot.exists()) {
        throw new Error("Course not found");
      }

      return {
        success: true,
        course: { id: snapshot.id, ...snapshot.data() } as Course,
      };
    } catch (error) {
      console.error("Error fetching course:", error);
      throw new Error("Failed to fetch course");
    }
  });

// Create course (protected)
export const createCourse = createServerFn({ method: "POST" })
  .validator(
    z.object({
      idToken: z.string(),
      title: z.string().min(1),
      subtitle: z.string().min(1),
      description: z.string().min(1),
      price: z.number().min(0),
      originalPrice: z.number().optional(),
      discount: z.number().optional(),
      thumbnail: z.string().optional(),
      category: z.string().min(1),
      instructor: z.string().min(1),
      duration: z.string().min(1),
      status: z.enum(["published", "draft"]),
      details: z.string().optional(),
      accessInfo: z.string().optional(),
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdminAuth(data.idToken);
    try {
      const { idToken, ...courseFields } = data;
      const coursesRef = collection(db, "courses");
      const newCourseRef = doc(coursesRef);

      const courseData: Omit<Course, "id"> = {
        ...courseFields,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
      };

      await setDoc(newCourseRef, courseData);

      return {
        success: true,
        course: { id: newCourseRef.id, ...courseData } as Course,
      };
    } catch (error) {
      console.error("Error creating course:", error);
      throw new Error("Failed to create course");
    }
  });

// Update course (protected)
export const updateCourse = createServerFn({ method: "POST" })
  .validator(
    z.object({
      idToken: z.string(),
      id: z.string(),
      title: z.string().min(1),
      subtitle: z.string().min(1),
      description: z.string().min(1),
      price: z.number().min(0),
      originalPrice: z.number().optional(),
      discount: z.number().optional(),
      thumbnail: z.string().optional(),
      category: z.string().min(1),
      instructor: z.string().min(1),
      duration: z.string().min(1),
      status: z.enum(["published", "draft"]),
      details: z.string().optional(),
      accessInfo: z.string().optional(),
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdminAuth(data.idToken);
    try {
      const { idToken, id, ...updateFields } = data;
      const courseRef = doc(db, "courses", id);

      await updateDoc(courseRef, {
        ...updateFields,
        updatedAt: serverTimestamp(),
      });

      return { success: true };
    } catch (error) {
      console.error("Error updating course:", error);
      throw new Error("Failed to update course");
    }
  });

// Delete course (protected)
export const deleteCourse = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), idToken: z.string() }))
  .handler(async ({ data }) => {
    await requireAdminAuth(data.idToken);
    try {
      // First check if course has any purchases
      const accessRef = collection(db, "courseAccess");
      const q = query(accessRef, where("courseId", "==", data.id));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        throw new Error(
          "Cannot delete course with existing purchases. Please unpublish instead.",
        );
      }

      const courseRef = doc(db, "courses", data.id);
      await deleteDoc(courseRef);

      return { success: true };
    } catch (error) {
      console.error("Error deleting course:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to delete course");
    }
  });

// Toggle publish status (protected)
export const toggleCourseStatus = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      status: z.enum(["published", "draft"]),
      idToken: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdminAuth(data.idToken);
    try {
      const courseRef = doc(db, "courses", data.id);

      await updateDoc(courseRef, {
        status: data.status,
        updatedAt: serverTimestamp(),
      });

      return { success: true };
    } catch (error) {
      console.error("Error updating course status:", error);
      throw new Error("Failed to update course status");
    }
  });

// Get dashboard statistics (protected)
export const getDashboardStats = createServerFn({ method: "GET" })
  .validator(z.object({ idToken: z.string() }))
  .handler(async ({ data }) => {
    await requireAdminAuth(data.idToken);
    try {
      // Use Firebase Admin SDK for admin-level access (bypasses Firestore rules)
      const adminDb = getAdminDb();

      // Get total courses
      const coursesSnapshot = await adminDb.collection("courses").get();
      const totalCourses = coursesSnapshot.size;

      // Get published courses
      const publishedCourses = coursesSnapshot.docs.filter(
        (d: any) => d.data()["status"] === "published",
      ).length;

      // Get total users (from courseAccess collection, unique users)
      const accessSnapshot = await adminDb.collection("courseAccess").get();
      const uniqueUsers = new Set(
        accessSnapshot.docs.map((d: any) => d.data()["userId"]),
      ).size;

      // Get total purchases
      const totalPurchases = accessSnapshot.size;

      // Calculate total revenue (would need order data; returning 0 for now)
      const totalRevenue = 0;

      return {
        success: true,
        stats: {
          totalCourses,
          publishedCourses,
          totalUsers: uniqueUsers,
          totalPurchases,
          totalRevenue,
        },
      };
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      throw new Error("Failed to fetch dashboard statistics");
    }
  });

// ---------------------------------------------------------------------------
// Public server functions (no auth required)
// ---------------------------------------------------------------------------

// Get published courses for public frontend
export const getPublishedCourses = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const coursesRef = collection(db, "courses");
      const q = query(
        coursesRef,
        where("status", "==", "published"),
        orderBy("createdAt", "desc"),
      );
      const snapshot = await getDocs(q);

      const courses = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Course[];

      return { success: true, courses };
    } catch (error) {
      console.error("Error fetching published courses:", error);
      // Return empty array instead of throwing error to prevent UI breaking
      return { success: true, courses: [] };
    }
  },
);

// Get single published course by ID
export const getPublishedCourse = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    try {
      const courseRef = doc(db, "courses", data.id);
      const snapshot = await getDoc(courseRef);

      if (!snapshot.exists()) {
        throw new Error("Course not found");
      }

      const courseData = snapshot.data() as Course;

      // Only return if published
      if (courseData.status !== "published") {
        throw new Error("Course not available");
      }

      return {
        success: true,
        course: { id: snapshot.id, ...courseData } as Course,
      };
    } catch (error) {
      console.error("Error fetching course:", error);
      throw new Error("Failed to fetch course");
    }
  });