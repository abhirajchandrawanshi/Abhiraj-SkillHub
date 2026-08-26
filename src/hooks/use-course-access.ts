import { useEffect, useState } from "react";

import { 
  COURSE_ACCESS_EVENT, 
  INTERNSHIP_ACCESS_EVENT,
  hasCourseAccess, 
  readCourseAccess, 
  restoreAccessFromFirestore,
  isAccessExpired,
  type CourseAccess 
} from "@/lib/access";
import { useAuth } from "@/hooks/use-auth";
import { COURSE_ID, INTERNSHIP_ID, TESTING_ID } from "@/lib/course";

export function useCourseAccess(courseId: string = COURSE_ID) {
  const [access, setAccess] = useState<CourseAccess | null>(null);
  const [ready, setReady] = useState(false);
  const { user } = useAuth();
  const event = courseId === INTERNSHIP_ID ? INTERNSHIP_ACCESS_EVENT : COURSE_ACCESS_EVENT;

  useEffect(() => {
    const sync = () => {
      const localAccess = readCourseAccess(courseId);
      
      // Check if access has expired (for guest purchases)
      if (localAccess && isAccessExpired(localAccess)) {
        console.log("Local access has expired, clearing:", localAccess);
        // Clear expired access from localStorage
        const accessKey = courseId === INTERNSHIP_ID ? `course-access:${INTERNSHIP_ID}` : `course-access:${COURSE_ID}`;
        localStorage.removeItem(accessKey);
        setAccess(null);
      } else {
        setAccess(localAccess);
      }
      
      setReady(true);
    };
    
    // Initial sync from localStorage
    sync();
    
    // Restore from Firestore (works for both authenticated users and guest purchases)
    const restoreFromFirestore = async () => {
      let userId = user?.uid;
      
      // For guest users, try to get userId from localStorage
      if (!userId) {
        const localAccess = readCourseAccess(courseId);
        userId = localAccess?.userId;
      }
      
      if (userId) {
        console.log("Restoring access from Firestore for user:", userId);
        const restored = await restoreAccessFromFirestore(userId, courseId);
        if (restored) {
          // If access was restored, update state (restoreAccessFromFirestore already checks expiry)
          sync();
        }
      }
      setReady(true);
    };
    
    restoreFromFirestore();
    
    // Listen for events
    window.addEventListener(event, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(event, sync);
      window.removeEventListener("storage", sync);
    };
  }, [user?.uid, courseId, event]);

  return { access, ready, enrolled: hasCourseAccess(courseId) && access !== null && !isAccessExpired(access) };
}
