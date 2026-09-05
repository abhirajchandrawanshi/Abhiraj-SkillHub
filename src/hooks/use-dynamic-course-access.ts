import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getAuthInstance, initializeFirebase } from "@/firebase";
import { checkFirestoreAccess, readCourseAccess } from "@/lib/access";

export function useDynamicCourseAccess(courseId: string) {
  const [access, setAccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;
    let isSubscribed = true;

    const setupAuth = async () => {
      try {
        await initializeFirebase();
        
        if (!isSubscribed) return;

        const auth = getAuthInstance();
        if (!auth) {
          console.error("Firebase auth not initialized");
          setLoading(false);
          return;
        }

        unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (!isSubscribed) return;
          
          if (user) {
            try {
              const hasAccess = await checkFirestoreAccess(user.uid, courseId);
              setAccess(hasAccess !== null);
            } catch (error) {
              console.error("Error checking dynamic course access:", error);
              setAccess(false);
            }
          } else {
            // Check localStorage for guest access
            const guestAccess = readCourseAccess(courseId);
            setAccess(guestAccess !== null);
          }
          setLoading(false);
        });
      } catch (error) {
        console.error("Error setting up dynamic course access:", error);
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    setupAuth();

    return () => {
      isSubscribed = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [courseId, mounted]);

  // Listen for access changes (separate effect to avoid hook order issues)
  useEffect(() => {
    if (!mounted) return;

    const handleAccessChange = () => {
      const currentAccess = readCourseAccess(courseId);
      setAccess(currentAccess !== null);
    };

    const event = `course-access-changed-${courseId}`;
    window.addEventListener(event, handleAccessChange);

    return () => {
      window.removeEventListener(event, handleAccessChange);
    };
  }, [courseId, mounted]);

  return { access, loading };
}