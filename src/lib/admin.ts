import { getDb, initializeFirebase } from "@/firebase";
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
  Timestamp,
} from "firebase/firestore";

// Helper function to get db instance safely
function getDbSafe() {
  const db = getDb();
  if (!db) {
    throw new Error("Firestore is not initialized. Make sure you are on the client side.");
  }
  return db;
}

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
  category?: string;
  instructor: string;
  duration?: string;
  status: "published" | "draft";
  createdAt: Timestamp | string; // Handle both Firestore Timestamp and ISO string
  updatedAt: Timestamp | string; // Handle both Firestore Timestamp and ISO string
  // Course content fields
  details?: string;
  accessInfo?: string;
  // Additional metadata
  metaTitle?: string;
  metaDescription?: string;
  // Course PDF (stored in Supabase Storage `course-pdfs` bucket)
  pdfPath?: string;
  // External resource links (YouTube, GitHub, docs, etc.)
  resources?: { label: string; url: string }[];
}

// Client-side admin functions (direct Firebase access)
// These functions bypass server functions and work directly with Firebase

export async function getCoursesClient(): Promise<{ success: boolean; courses: Course[] }> {
  try {
    const db = getDbSafe();
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
    return { success: true, courses: [] };
  }
}

export async function getCourseClient(id: string): Promise<{ success: boolean; course: Course }> {
  try {
    const db = getDbSafe();
    const courseRef = doc(db, "courses", id);
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
}

export async function createCourseClient(courseData: any): Promise<{ success: boolean; course: Course }> {
  try {
    console.log("Creating course with data:", courseData);
    const db = getDbSafe();
    
    const coursesRef = collection(db, "courses");
    const newCourseRef = doc(coursesRef);

    // Remove any existing timestamp fields and add fresh ones
    const { createdAt, updatedAt, id, ...cleanData } = courseData;
    
    const data: Omit<Course, "id"> = {
      ...cleanData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log("Writing to Firestore:", data);
    await setDoc(newCourseRef, data);
    console.log("Course created successfully with ID:", newCourseRef.id);

    return {
      success: true,
      course: { id: newCourseRef.id, ...data } as Course,
    };
  } catch (error) {
    console.error("Error creating course:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    throw new Error(`Failed to create course: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function updateCourseClient(id: string, updateFields: Partial<Course>): Promise<{ success: boolean }> {
  try {
    const db = getDbSafe();
    const courseRef = doc(db, "courses", id);

    await updateDoc(courseRef, {
      ...updateFields,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating course:", error);
    throw new Error("Failed to update course");
  }
}

export async function deleteCourseClient(id: string): Promise<{ success: boolean }> {
  try {
    const db = getDbSafe();
    // First check if course has any purchases
    const accessRef = collection(db, "courseAccess");
    const q = query(accessRef, where("courseId", "==", id));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      throw new Error(
        "Cannot delete course with existing purchases. Please unpublish instead.",
      );
    }

    const courseRef = doc(db, "courses", id);
    await deleteDoc(courseRef);

    return { success: true };
  } catch (error) {
    console.error("Error deleting course:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to delete course");
  }
}

export async function toggleCourseStatusClient(id: string, status: "published" | "draft"): Promise<{ success: boolean }> {
  try {
    const db = getDbSafe();
    const courseRef = doc(db, "courses", id);

    await updateDoc(courseRef, {
      status: status,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating course status:", error);
    throw new Error("Failed to update course status");
  }
}

export async function getDashboardStatsClient(): Promise<{ success: boolean; stats: any }> {
  try {
    console.log("Fetching dashboard stats...");
    const db = getDbSafe();
    
    const coursesRef = collection(db, "courses");
    const coursesSnapshot = await getDocs(coursesRef);
    const totalCourses = coursesSnapshot.size;
    console.log("Total courses found:", totalCourses);

    // Get published courses
    const publishedCourses = coursesSnapshot.docs.filter(
      (d: any) => d.data()["status"] === "published",
    ).length;
    console.log("Published courses:", publishedCourses);

    // Get total users (from courseAccess collection, unique users)
    const accessRef = collection(db, "courseAccess");
    let accessSnapshot;
    try {
      accessSnapshot = await getDocs(accessRef);
    } catch (accessError) {
      console.error("Error fetching courseAccess (admin permissions issue):", accessError);
      // If admin can't read courseAccess, return zero for user stats
      const stats = {
        totalCourses,
        publishedCourses,
        totalUsers: 0,
        totalPurchases: 0,
        totalRevenue: 0,
      };
      return {
        success: true,
        stats,
      };
    }
    
    const uniqueUsers = new Set(
      accessSnapshot.docs.map((d: any) => d.data()["userId"]),
    ).size;
    console.log("Unique users:", uniqueUsers);

    // Get total purchases
    const totalPurchases = accessSnapshot.size;
    console.log("Total purchases:", totalPurchases);

    // Calculate total revenue (would need order data; returning 0 for now)
    const totalRevenue = 0;

    const stats = {
      totalCourses,
      publishedCourses,
      totalUsers: uniqueUsers,
      totalPurchases,
      totalRevenue,
    };
    
    console.log("Dashboard stats:", stats);
    return {
      success: true,
      stats,
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    // Return mock data instead of throwing error to prevent UI breaking
    return {
      success: true,
      stats: {
        totalCourses: 0,
        publishedCourses: 0,
        totalUsers: 0,
        totalPurchases: 0,
        totalRevenue: 0,
      },
    };
  }
}

// Public functions (no auth required)
export async function getPublishedCoursesClient(): Promise<{ success: boolean; courses: Course[] }> {
  try {
    const db = getDbSafe();
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
    return { success: true, courses: [] };
  }
}

export async function getPublishedCourseClient(id: string): Promise<{ success: boolean; course: Course }> {
  try {
    const db = getDbSafe();
    const courseRef = doc(db, "courses", id);
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
}