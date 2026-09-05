/**
 * Server-side admin functions using Firebase Admin SDK
 * These functions have admin privileges and can bypass security rules
 * This file should only be imported in server-side code
 */

import { initializeFirebaseAdmin, getAdminDb } from "./firebase-admin";

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
  createdAt: any;
  updatedAt: any;
  details?: string;
  accessInfo?: string;
  metaTitle?: string;
  metaDescription?: string;
  pdfPath?: string;
  resources?: { label: string; url: string }[];
}

// Server-side course creation using Admin SDK
export async function createCourseServer(courseData: Omit<Course, "id" | "createdAt" | "updatedAt">): Promise<{ success: boolean; course: Course }> {
  try {
    const { db } = initializeFirebaseAdmin();
    
    const coursesRef = db.collection("courses");
    const newCourseRef = coursesRef.doc();
    
    const data = {
      ...courseData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await newCourseRef.set(data);
    
    return {
      success: true,
      course: { id: newCourseRef.id, ...data } as Course,
    };
  } catch (error) {
    console.error("Error creating course (server):", error);
    throw new Error(`Failed to create course: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Server-side course update using Admin SDK
export async function updateCourseServer(id: string, updateFields: Partial<Course>): Promise<{ success: boolean }> {
  try {
    const { db } = initializeFirebaseAdmin();
    
    const courseRef = db.collection("courses").doc(id);
    await courseRef.update({
      ...updateFields,
      updatedAt: new Date().toISOString(),
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error updating course (server):", error);
    throw new Error("Failed to update course");
  }
}

// Server-side course deletion using Admin SDK
export async function deleteCourseServer(id: string): Promise<{ success: boolean }> {
  try {
    const { db } = initializeFirebaseAdmin();
    
    // First check if course has any purchases
    const accessRef = db.collection("courseAccess");
    const snapshot = await accessRef.where("courseId", "==", id).get();
    
    if (!snapshot.empty) {
      throw new Error(
        "Cannot delete course with existing purchases. Please unpublish instead.",
      );
    }
    
    const courseRef = db.collection("courses").doc(id);
    await courseRef.delete();
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting course (server):", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to delete course");
  }
}

// Server-side get all courses using Admin SDK
export async function getAllCoursesServer(): Promise<{ success: boolean; courses: Course[] }> {
  try {
    const { db } = initializeFirebaseAdmin();
    
    const coursesRef = db.collection("courses");
    const snapshot = await coursesRef.get();
    
    const courses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Course[];
    
    return { success: true, courses };
  } catch (error) {
    console.error("Error fetching courses (server):", error);
    return { success: true, courses: [] };
  }
}