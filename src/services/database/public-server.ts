import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAdminFirestore } from "./admin-firestore";

// In-memory cache for published courses
let cachedCourses: any[] | null = null;
let coursesCacheTimestamp = 0;
const COURSES_CACHE_TTL = 30 * 1000; // 30 seconds - reduced for faster admin updates

/**
 * Securely fetches published courses and strips out private data
 * before sending it to the client.
 */
export const getPublishedCoursesServer = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const now = Date.now();
      if (cachedCourses && (now - coursesCacheTimestamp) < COURSES_CACHE_TTL) {
        return cachedCourses;
      }

      const db = await getAdminFirestore();
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
          pdfPath: data.pdfPath, 
        };
        coursesMap.set(doc.id, publicCourseData);
      };

      snapshot.docs.forEach(processDoc);
      legacySnapshot.docs.forEach(processDoc);

      const result = Array.from(coursesMap.values());
      cachedCourses = result;
      coursesCacheTimestamp = now;

      return result;
    } catch (error) {
      console.error("Failed to fetch published courses on server:", error);
      return [];
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
    const db = await getAdminFirestore();

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
      // Check primary courseAccess collection by userId
      const accessRef = db.collection("courseAccess");
      const accessSnap = await accessRef
        .where("userId", "==", data.userId)
        .where("courseId", "==", data.courseId)
        .get();

      let hasValidAccess = false;

      if (!accessSnap.empty) {
        const docData = accessSnap.docs[0]?.data();
        if (docData?.expiresAt) {
          hasValidAccess = new Date() <= new Date(docData.expiresAt);
        } else {
          hasValidAccess = true;
        }
      }

      // If not found yet, also check by email (for guest purchases or email-based userId)
      if (!hasValidAccess) {
        const emailSnap = await accessRef
          .where("email", "==", data.userId)
          .where("courseId", "==", data.courseId)
          .get();

        if (!emailSnap.empty) {
          const docData = emailSnap.docs[0]?.data();
          if (docData?.expiresAt) {
            hasValidAccess = new Date() <= new Date(docData.expiresAt);
          } else {
            hasValidAccess = true;
          }
        }
      }

      // Check legacy collections if still not found
      if (!hasValidAccess) {
        const purchaseRef = db.collection("users")
          .doc(data.userId)
          .collection("purchases")
          .doc(data.courseId);
        const purchaseSnap = await purchaseRef.get();

        const legacyAccessRef = db.collection("course_access")
          .where("userId", "==", data.userId)
          .where("courseId", "==", data.courseId);
        const legacySnap = await legacyAccessRef.get();

        hasValidAccess = purchaseSnap.exists || !legacySnap.empty;
      }

      if (!hasValidAccess) {
        throw new Error("Unauthorized: You do not have access to this course's private resources.");
      }
    }

    // 3. Return ONLY the private details
    return {
      resources: courseData?.resources || "",
      accessInfo: courseData?.accessInfo || "",
    };
  });
