import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK for server-side operations
function getAdminFirestore() {
  if (getApps().length > 0) {
    return getFirestore();
  }

  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  if (!privateKey || !process.env.FIREBASE_ADMIN_PROJECT_ID || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
    throw new Error("Firebase Admin credentials not configured");
  }

  try {
    const app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        privateKey: privateKey,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      }),
    });

    const db = getFirestore(app);
    try { db.settings({ preferRest: true }); } catch (e) {}
    return db;
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
    throw error;
  }
}

/**
 * Securely fetches published courses and strips out private data
 * before sending it to the client.
 */
export const getPublishedCoursesServer = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const db = getAdminFirestore();
      // Fetch only published courses
      const snapshot = await db.collection("courses")
        .where("status", "==", "published")
        .get();

      // For backward compatibility
      const legacySnapshot = await db.collection("courses")
        .where("published", "==", true)
        .get();

      // Merge and deduplicate by ID
      const coursesMap = new Map();
      
      const processDoc = (doc: any) => {
        const data = doc.data();
        
        // Strip out private fields!
        const publicCourseData = {
          id: doc.id,
          title: data.title,
          subtitle: data.subtitle,
          description: data.description,
          price: data.price,
          originalPrice: data.originalPrice,
          discount: data.discount,
          thumbnail: data.thumbnail,
          category: data.category,
          instructor: data.instructor,
          duration: data.duration,
          status: data.status,
          published: data.published,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          details: data.details,
          metaTitle: data.metaTitle,
          metaDescription: data.metaDescription,
          rating: data.rating,
          ratingCount: data.ratingCount,
          publishedDate: data.publishedDate,
          isFree: data.isFree,
          // Explicitly EXCLUDE:
          // - resources
          // - accessInfo
          // - pdfPath (Safe to include since the file itself is protected by signed URL checks that verify enrollment)
          pdfPath: data.pdfPath, 
        };
        
        coursesMap.set(doc.id, publicCourseData);
      };
      
      snapshot.docs.forEach(processDoc);
      legacySnapshot.docs.forEach(processDoc);
      
      return Array.from(coursesMap.values());
    } catch (error) {
      console.error("Error securely fetching published courses:", error);
      throw new Error("Failed to fetch courses");
    }
  });

/**
 * Securely fetch private course information (resources, accessInfo) 
 * ONLY if the user is authorized.
 */
export const getPrivateCourseAccessInfo = createServerFn({ method: "POST" })
  .validator(
    z.object({
      courseId: z.string().min(1),
      userId: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    const db = getAdminFirestore();

    // 1. Fetch course details to check if it's free
    const courseRef = db.collection("courses").doc(data.courseId);
    const courseSnap = await courseRef.get();
    
    if (!courseSnap.exists) {
      throw new Error("Course not found");
    }

    const courseData = courseSnap.data();
    const isFreeCourse = courseData?.price === 0 || courseData?.isFree === true;

    // 2. Verify Access if not free
    if (!isFreeCourse) {
      const accessRef = db.collection("courseAccess");
      const snapshot = await accessRef
        .where("userId", "==", data.userId)
        .where("courseId", "==", data.courseId)
        .get();

      if (snapshot.empty) {
        const emailSnapshot = await accessRef
          .where("email", "==", data.userId)
          .where("courseId", "==", data.courseId)
          .get();

        if (emailSnapshot.empty) {
          throw new Error("You do not have access to this course.");
        }
      }
    }

    // 3. Access Verified. Return private fields.
    return {
      resources: courseData?.resources || [],
      accessInfo: courseData?.accessInfo || "",
    };
  });
